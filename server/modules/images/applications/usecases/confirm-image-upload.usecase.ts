import { inject, injectable } from 'tsyringe';

import {
  type IBlobStorageRepository,
  blobStorageRepositoryToken,
} from '@/server/gateway/blob-storage/applications/ports/blob-storage.repository';
import { NotFoundError } from '@/server/lib/errors';
import {
  type IImageRepository,
  imageRepositoryToken,
} from '../ports/image.repository';

@injectable()
export class ConfirmImageUploadUseCase {
  constructor(
    @inject(imageRepositoryToken)
    private readonly repository: IImageRepository,
    @inject(blobStorageRepositoryToken)
    private readonly blobStorageRepository: IBlobStorageRepository,
  ) {}

  async execute(command: { id: number; newImagePath: string }) {
    const existing = await this.repository.findById(command.id);
    if (!existing) throw new NotFoundError();

    const updated = await this.repository.update(command.id, {
      imagePath: command.newImagePath,
    });

    if (existing.imagePath && existing.imagePath !== command.newImagePath) {
      await this.blobStorageRepository.deleteObject(existing.imagePath);
    }

    return updated;
  }
}
