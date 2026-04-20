import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3AttachmentsBucket } from "../../config/attachment-storage";

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
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      ContentType: params.contentType,
      ...(params.contentLength !== undefined
        ? { ContentLength: params.contentLength }
        : {}),
    });
    const uploadUrl = await getSignedUrl(getClient(), cmd, {
      expiresIn: UPLOAD_EXPIRES_SEC,
    });
    return { uploadUrl, expiresIn: UPLOAD_EXPIRES_SEC };
  }

  public async presignGetObject(params: {
    key: string;
  }): Promise<{ downloadUrl: string; expiresIn: number }> {
    const cmd = new GetObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
    });
    const downloadUrl = await getSignedUrl(getClient(), cmd, {
      expiresIn: DOWNLOAD_EXPIRES_SEC,
    });
    return { downloadUrl, expiresIn: DOWNLOAD_EXPIRES_SEC };
  }

  public async headObject(key: string) {
    return getClient().send(
      new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
}

export function isS3StorageConfigured(): boolean {
  return Boolean(getS3AttachmentsBucket());
}
