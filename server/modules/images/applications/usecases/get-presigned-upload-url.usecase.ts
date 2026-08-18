import { inject, injectable } from 'tsyringe';

import {
  type IBlobStorageRepository,
  blobStorageRepositoryToken,
} from '@/server/gateway/blob-storage/applications/ports/blob-storage.repository';

export interface IGetPresignedUploadUrlReturnType {
  presignedUrl: string;
  key: string;
}

const ALLOWED_MIME_TYPES: Record<string, string> = {
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

  async execute(query: { contentType: string }): Promise<IGetPresignedUploadUrlReturnType> {
    const ext = this.getExtensionFromMimeType(query.contentType);
    const key = `images/${crypto.randomUUID()}${ext}`;

    const presignedUrl = await this.blobStorageRepository.getPresignedUploadUrl({
      fullPath: key,
      options: { contentType: query.contentType },
    });

    return { presignedUrl, key };
  }

  private getExtensionFromMimeType(contentType: string): string {
    const ext = ALLOWED_MIME_TYPES[contentType];
    if (!ext) throw new Error('UnsupportedMediaType');
    return ext;
  }
}
