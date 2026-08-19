import { inject, injectable } from 'tsyringe';

import {
  type IBlobStorageRepository,
  blobStorageRepositoryToken,
} from '@/server/gateway/blob-storage/applications/ports/blob-storage.repository';
import { UnsupportedMediaTypeError } from '@/server/lib/http-error.factory';

export interface IGetPresignedUploadUrlUsecaseQuery {
  contentType: string;
}

export interface IGetPresignedUploadUrlReturnType {
  presignedUrl: string;
  key: string;
}

export const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

@injectable()
export class GetPresignedUploadUrlUseCase {
  constructor(
    @inject(blobStorageRepositoryToken)
    private readonly blobStorageRepository: IBlobStorageRepository,
  ) {}

  async execute(query: IGetPresignedUploadUrlUsecaseQuery): Promise<IGetPresignedUploadUrlReturnType> {
    const ext = this.getExtensionFromMimeType(query.contentType);
    const key = `images/${crypto.randomUUID()}${ext}`;
    const uploadOptions = { contentType: query.contentType };

    const presignedUrl = await this.blobStorageRepository.getPresignedUploadUrl({
      fullPath: key,
      options: uploadOptions,
    });

    return { presignedUrl, key };
  }

  private getExtensionFromMimeType(contentType: string): string {
    const ext = ALLOWED_MIME_TYPES[contentType];
    if (!ext) throw new UnsupportedMediaTypeError();
    return ext;
  }
}
