import { inject, injectable } from 'tsyringe';

import {
  type IBlobStorageRepository,
  blobStorageRepositoryToken,
} from '@/server/gateway/blob-storage/applications/ports/blob-storage.repository';
import { NotFoundError } from '@/server/lib/http-error.factory';
import {
  type IImageRepository,
  imageRepositoryToken,
} from '../ports/image.repository';

export interface IGetImageUsecaseQuery {
  id: number;
}

export interface IGetImageUsecaseReturnType {
  imageUrl: string | null;
}

@injectable()
export class GetImageUseCase {
  constructor(
    @inject(imageRepositoryToken)
    private readonly repository: IImageRepository,
    @inject(blobStorageRepositoryToken)
    private readonly blobStorageRepository: IBlobStorageRepository,
  ) {}

  async execute(query: IGetImageUsecaseQuery): Promise<IGetImageUsecaseReturnType> {
    const entity = await this.repository.findById(query.id);
    if (!entity) throw new NotFoundError();

    const imageUrl = entity.imagePath
      ? await this.blobStorageRepository.getPresignedDownloadUrl({
          fullPath: entity.imagePath,
        })
      : null;

    return { imageUrl };
  }
}
