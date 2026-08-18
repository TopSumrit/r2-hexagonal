import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { injectable } from 'tsyringe';

import { r2Env } from '@/server/lib/env';
import type {
  IBlobStorageRepository,
  IGetPresignedDownloadUrl,
  IGetPresignedUploadUrl,
} from '../../applications/ports/blob-storage.repository';

const UPLOAD_URL_EXPIRES_IN_SECONDS = 60 * 5;
const DOWNLOAD_URL_EXPIRES_IN_SECONDS = 30;

@injectable()
export class BlobStorageAwsRepository implements IBlobStorageRepository {
  private readonly s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      region: r2Env.region,
      endpoint: r2Env.endpoint,
      credentials: r2Env.credentials,
    });
  }

  async getPresignedUploadUrl({ fullPath, options }: IGetPresignedUploadUrl): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: r2Env.bucketName,
      Key: fullPath,
      ContentType: options?.contentType,
    });
    return getSignedUrl(this.s3Client, command, {
      expiresIn: options?.expiresInSeconds ?? UPLOAD_URL_EXPIRES_IN_SECONDS,
    });
  }

  async getPresignedDownloadUrl({ fullPath, options }: IGetPresignedDownloadUrl): Promise<string> {
    const { expiresInSeconds, ...restOptions } = options ?? {};

    const command = new GetObjectCommand({
      Bucket: r2Env.bucketName,
      Key: fullPath,
      ...restOptions,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds ?? DOWNLOAD_URL_EXPIRES_IN_SECONDS,
    });
  }

  async deleteObject(fullPath: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: r2Env.bucketName,
      Key: fullPath,
    });

    await this.s3Client.send(command);
  }
}
