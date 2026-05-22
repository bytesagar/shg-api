import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3AttachmentsBucket } from "../../config/attachment-storage";
import { logger } from "../../utils/logger";

const UPLOAD_EXPIRES_SEC = 15 * 60;
const DOWNLOAD_EXPIRES_SEC = 5 * 60;

function createClient(): S3Client {
  const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
  return new S3Client({
    region: process.env.AWS_REGION ?? "us-east-1",
    endpoint,
    forcePathStyle: Boolean(endpoint),
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    }
  });
}

let clientSingleton: S3Client | null = null;

function getClient(): S3Client {
  if (!clientSingleton) clientSingleton = createClient();
  return clientSingleton;
}

export class S3StorageService {
  private readonly bucket: string;

  constructor() {
    const bucket = getS3AttachmentsBucket();
    if (!bucket) {
      throw new Error("S3_ATTACHMENTS_BUCKET is not set");
    }
    this.bucket = bucket;
  }

  public async presignPutObject(params: {
    key: string;
    contentType: string;
    contentLength?: number;
  }): Promise<{ uploadUrl: string; expiresIn: number }> {
    const startedAt = Date.now();
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      ContentType: params.contentType,
      ...(params.contentLength !== undefined
        ? { ContentLength: params.contentLength }
        : {}),
    });
    try {
      const uploadUrl = await getSignedUrl(getClient(), cmd, {
        expiresIn: UPLOAD_EXPIRES_SEC,
      });
      logger.debug("s3.presign_put.ok", {
        key: params.key,
        durationMs: Date.now() - startedAt,
      });
      return { uploadUrl, expiresIn: UPLOAD_EXPIRES_SEC };
    } catch (err) {
      logger.error("s3.presign_put.failed", {
        key: params.key,
        durationMs: Date.now() - startedAt,
        err,
      });
      throw err;
    }
  }

  public async presignGetObject(params: {
    key: string;
  }): Promise<{ downloadUrl: string; expiresIn: number }> {
    const startedAt = Date.now();
    const cmd = new GetObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
    });
    try {
      const downloadUrl = await getSignedUrl(getClient(), cmd, {
        expiresIn: DOWNLOAD_EXPIRES_SEC,
      });
      logger.debug("s3.presign_get.ok", {
        key: params.key,
        durationMs: Date.now() - startedAt,
      });
      return { downloadUrl, expiresIn: DOWNLOAD_EXPIRES_SEC };
    } catch (err) {
      logger.error("s3.presign_get.failed", {
        key: params.key,
        durationMs: Date.now() - startedAt,
        err,
      });
      throw err;
    }
  }

  public async getObjectInfo(
    key: string,
  ): Promise<{ exists: boolean; size: number }> {
    const startedAt = Date.now();
    try {
      const result = await getClient().send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: key,
          MaxKeys: 1,
        }),
      );
      const match = (result.Contents ?? []).find((obj) => obj.Key === key);
      logger.debug("s3.object_info.ok", {
        key,
        exists: Boolean(match),
        durationMs: Date.now() - startedAt,
      });
      return {
        exists: Boolean(match),
        size: Number(match?.Size ?? 0),
      };
    } catch (err) {
      logger.warn("s3.object_info.failed", {
        key,
        durationMs: Date.now() - startedAt,
        err,
      });
      throw err;
    }
  }

  public async headObject(key: string) {
    logger.warn("attachment.head_attempt", {
      fileUrl: key,
      bucket: this.bucket,
    });
    const startedAt = Date.now();
    try {
      const result = await getClient().send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      logger.debug("s3.head.ok", {
        key,
        durationMs: Date.now() - startedAt,
      });
      return result;
    } catch (err) {
      logger.warn("s3.head.failed", {
        key,
        durationMs: Date.now() - startedAt,
        err,
      });
      throw err;
    }
  }

  /** Permanently removes the object. S3 DeleteObject is idempotent (no error
   * if the key is already gone). */
  public async deleteObject(key: string): Promise<void> {
    const startedAt = Date.now();
    try {
      await getClient().send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      logger.debug("s3.delete.ok", { key, durationMs: Date.now() - startedAt });
    } catch (err) {
      logger.warn("s3.delete.failed", {
        key,
        durationMs: Date.now() - startedAt,
        err,
      });
      throw err;
    }
  }
}

export function isS3StorageConfigured(): boolean {
  return Boolean(getS3AttachmentsBucket());
}
