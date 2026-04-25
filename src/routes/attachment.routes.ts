import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { AttachmentController } from "../modules/attachments/attachment.controller";
import {
  CLINICAL_READ_ROLES,
  CLINICAL_WRITE_ROLES,
} from "../constants/rbac";

const router = Router();
const attachmentController = new AttachmentController();

/**
 * @openapi
 * /attachments/generate-upload-url:
 *   post:
 *     tags:
 *       - Attachments
 *     summary: Issue a presigned S3 PUT URL for a new attachment
 *     operationId: generateAttachmentUploadUrl
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/generate-upload-url",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  attachmentController.generateUploadUrl,
);

/**
 * @openapi
 * /attachments:
 *   get:
 *     tags:
 *       - Attachments
 *     summary: List attachments for a polymorphic source (e.g. Visit)
 *     operationId: listAttachments
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  attachmentController.listAttachments,
);

/**
 * @openapi
 * /attachments/{attachmentId}/download-url:
 *   get:
 *     tags:
 *       - Attachments
 *     summary: Issue a presigned S3 GET URL for an attachment
 *     operationId: getAttachmentDownloadUrl
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:attachmentId/download-url",
  authMiddleware,
  authorize([...CLINICAL_READ_ROLES]),
  attachmentController.getDownloadUrl,
);

/**
 * @openapi
 * /attachments:
 *   post:
 *     tags:
 *       - Attachments
 *     summary: Confirm an upload and save attachment metadata
 *     operationId: createAttachment
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/",
  authMiddleware,
  authorize([...CLINICAL_WRITE_ROLES]),
  attachmentController.createAttachment,
);

export default router;
