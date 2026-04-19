import { FacilityContext } from "../context/facility-context";
import {
  ATTACHMENT_SOURCES_FACILITY_EXPLICIT_ONLY,
  ATTACHMENT_SOURCES_WITH_DB_PARENT,
  type AttachmentSourceType,
} from "../constants/attachment-sources";
import {
  getAttachmentAllowedContentTypes,
  getAttachmentMaxBytes,
} from "../config/attachment-storage";
import { HTTP_STATUS } from "../config/constants";
import { AttachmentRepository } from "../repositories/attachment.repository";
import { FamilyPlanningRepository } from "../repositories/family-planning.repository";
import { PatientRepository } from "../repositories/patient.repository";
import { VisitRepository } from "../repositories/visit.repository";
import { resolveDbParentToFacilityId } from "./attachment-source-registry";
import { isS3StorageConfigured, S3StorageService } from "./s3-storage.service";
import { AppError } from "../utils/app-error";
import {
  buildAttachmentObjectKey,
  isAttachmentKeyForFacility,
  safeFileExtension,
} from "../utils/attachment-keys";
import type {
  AttachmentCreateInput,
  AttachmentGenerateUploadUrlInput,
} from "../validations/attachment.validation";

export class AttachmentService {
  private attachmentRepository: AttachmentRepository;
  private visitRepository: VisitRepository;
  private familyPlanningRepository: FamilyPlanningRepository;
  private patientRepository: PatientRepository;

  constructor(private readonly context: FacilityContext) {
    this.attachmentRepository = new AttachmentRepository(context);
    this.visitRepository = new VisitRepository(context);
    this.familyPlanningRepository = new FamilyPlanningRepository(context);
    this.patientRepository = new PatientRepository(context);
  }

  private s3(): S3StorageService {
    if (!isS3StorageConfigured()) {
      throw new AppError(
        "Attachment storage is not configured",
        HTTP_STATUS.SERVICE_UNAVAILABLE,
      );
    }
    return new S3StorageService();
  }

  /**
   * DB: `varchar` only. Code: union via {@link ATTACHMENT_SOURCES} + Zod.
   * Parent rows: Visit / FamilyPlanning / Patient. Facility-only (until tables exist):
   * Laboratory / Radiology / StaffIdentity — require `facilityId` === JWT facility.
   */
  private async resolveFacilityIdForAttachment(input: {
    sourceType: AttachmentSourceType;
    sourceId: string;
    facilityId?: string;
  }): Promise<string> {
    const explicit = input.facilityId?.trim();

    const st = input.sourceType;

    if (ATTACHMENT_SOURCES_WITH_DB_PARENT.has(st)) {
      const resolved = await resolveDbParentToFacilityId(
        st as "Visit" | "FamilyPlanning" | "Patient",
        input.sourceId,
        this.context,
        {
          visit: this.visitRepository,
          familyPlanning: this.familyPlanningRepository,
          patient: this.patientRepository,
        },
      );
      if (!resolved) {
        throw new AppError(
          "Source not found or not in this facility",
          HTTP_STATUS.NOT_FOUND,
        );
      }
      if (explicit && explicit !== resolved) {
        throw new AppError(
          "facilityId does not match the resolved source record",
          HTTP_STATUS.BAD_REQUEST,
        );
      }
      return resolved;
    }

    if (ATTACHMENT_SOURCES_FACILITY_EXPLICIT_ONLY.has(st)) {
      if (explicit && explicit === this.context.facilityId) {
        return explicit;
      }
      throw new AppError(
        "facilityId (your facility) is required for this source type",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    throw new Error(
      `Unhandled attachment source type: ${String(st)} — add it to ATTACHMENT_SOURCES and the parent / explicit-only sets.`,
    );
  }

  public async generateUploadUrl(input: AttachmentGenerateUploadUrlInput) {
    const facilityId = await this.resolveFacilityIdForAttachment({
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      facilityId: input.facilityId,
    });

    const allowed = getAttachmentAllowedContentTypes();
    const mime = input.fileType.trim().toLowerCase();
    if (!allowed.has(mime)) {
      throw new AppError("File type not allowed", HTTP_STATUS.BAD_REQUEST);
    }

    const maxBytes = getAttachmentMaxBytes();
    if (input.fileSize !== undefined && input.fileSize > maxBytes) {
      throw new AppError(
        `File exceeds maximum size of ${maxBytes} bytes`,
        HTTP_STATUS.PAYLOAD_TOO_LARGE,
      );
    }

    const ext = safeFileExtension(input.fileName);
    const key = buildAttachmentObjectKey(facilityId, ext);
    const s3 = this.s3();
    const { uploadUrl, expiresIn } = await s3.presignPutObject({
      key,
      contentType: input.fileType.trim(),
      ...(input.fileSize !== undefined
        ? { contentLength: input.fileSize }
        : {}),
    });

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    return {
      uploadUrl,
      fileUrl: key,
      expiresIn,
      expiresAt,
    };
  }

  public async confirmUpload(input: AttachmentCreateInput) {
    const facilityId = await this.resolveFacilityIdForAttachment({
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      facilityId: input.facilityId,
    });

    if (!isAttachmentKeyForFacility(input.fileUrl, facilityId)) {
      throw new AppError(
        "Invalid file path for this facility",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const allowed = getAttachmentAllowedContentTypes();
    const mime = input.fileType.trim().toLowerCase();
    if (!allowed.has(mime)) {
      throw new AppError("File type not allowed", HTTP_STATUS.BAD_REQUEST);
    }

    const maxBytes = getAttachmentMaxBytes();

    const s3 = this.s3();
    let head;
    try {
      head = await s3.headObject(input.fileUrl);
    } catch {
      throw new AppError(
        "Object not found in storage. Upload the file before confirming.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const size = Number(head.ContentLength ?? 0);
    if (size > maxBytes) {
      throw new AppError(
        `Uploaded object exceeds maximum size of ${maxBytes} bytes`,
        HTTP_STATUS.PAYLOAD_TOO_LARGE,
      );
    }

    if (
      input.fileSize !== undefined &&
      input.fileSize !== null &&
      input.fileSize !== size
    ) {
      throw new AppError(
        "File size does not match uploaded object",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const headMime = head.ContentType?.split(";")[0]?.trim().toLowerCase();
    if (headMime && headMime !== mime) {
      throw new AppError(
        "File type does not match uploaded object",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    return this.attachmentRepository.create({
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      facilityId,
      name: input.name,
      fileUrl: input.fileUrl,
      fileSize: size,
      fileType: mime,
      createdBy: this.context.userId,
      updatedBy: this.context.userId,
    });
  }

  public async listBySource(
    sourceType: AttachmentSourceType,
    sourceId: string,
    facilityId?: string,
  ) {
    await this.resolveFacilityIdForAttachment({
      sourceType,
      sourceId,
      facilityId,
    });
    return this.attachmentRepository.findBySource({
      sourceType,
      sourceId,
    });
  }

  public async getDownloadUrl(attachmentId: string) {
    const row = await this.attachmentRepository.findById(attachmentId);
    if (!row) {
      throw new AppError("Attachment not found", HTTP_STATUS.NOT_FOUND);
    }
    const s3 = this.s3();
    const { downloadUrl, expiresIn } = await s3.presignGetObject({
      key: row.fileUrl,
    });
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    return {
      downloadUrl,
      expiresIn,
      expiresAt,
      fileName: row.name,
      fileType: row.fileType,
    };
  }
}
