import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface StorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicDomain?: string;
}

export class Storage {
  private client: S3Client;
  private bucket: string;
  private publicDomain?: string;

  constructor(config: StorageConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.bucket = config.bucket;
    this.publicDomain = config.publicDomain;
  }

  /**
   * 上传文件到 R2/S3
   */
  async uploadFile(params: {
    key: string;
    body: Buffer | Uint8Array;
    contentType?: string;
  }): Promise<{ url: string; key: string }> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType || "application/octet-stream",
      })
    );

    const url = this.publicDomain
      ? `${this.publicDomain}/${params.key}`
      : `https://${this.bucket}.r2.cloudflarestorage.com/${params.key}`;

    return { url, key: params.key };
  }

  /**
   * 从 URL 下载文件并上传到 R2/S3
   */
  async downloadAndUpload(params: {
    sourceUrl: string;
    key: string;
    contentType?: string;
  }): Promise<{ url: string; key: string }> {
    const response = await fetch(params.sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType =
      params.contentType ||
      response.headers.get("content-type") ||
      "video/mp4";

    return this.uploadFile({
      key: params.key,
      body: buffer,
      contentType,
    });
  }

  /**
   * 获取预签名上传 URL
   */
  async getSignedUploadUrl(params: {
    key: string;
    contentType: string;
    expiresIn?: number;
  }): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      ContentType: params.contentType,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: params.expiresIn || 3600,
    });
  }

  /**
   * 获取公开 URL
   */
  getPublicUrl(key: string): string {
    return this.publicDomain
      ? `${this.publicDomain}/${key}`
      : `https://${this.bucket}.r2.cloudflarestorage.com/${key}`;
  }
}

// 单例工厂
let storageInstance: Storage | null = null;

export function getStorage(): Storage {
  if (!storageInstance) {
    const endpoint = process.env.STORAGE_ENDPOINT;
    const accessKeyId = process.env.STORAGE_ACCESS_KEY;
    const secretAccessKey = process.env.STORAGE_SECRET_KEY;
    const bucket = process.env.STORAGE_BUCKET;

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error(
        "Storage configuration missing. Required: STORAGE_ENDPOINT, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY, STORAGE_BUCKET"
      );
    }

    storageInstance = new Storage({
      endpoint,
      region: process.env.STORAGE_REGION || "auto",
      accessKeyId,
      secretAccessKey,
      bucket,
      publicDomain: process.env.STORAGE_DOMAIN,
    });
  }
  return storageInstance;
}
