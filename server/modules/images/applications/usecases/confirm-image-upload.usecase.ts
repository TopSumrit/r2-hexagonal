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

export interface IConfirmImageUploadUsecaseCommand {
  id: number;
  newImagePath: string;
}

@injectable()
export class ConfirmImageUploadUseCase {
  constructor(
    @inject(imageRepositoryToken)
    private readonly repository: IImageRepository,
    @inject(blobStorageRepositoryToken)
    private readonly blobStorageRepository: IBlobStorageRepository,
  ) {}

  async execute(command: IConfirmImageUploadUsecaseCommand) {
    const existing = await this.repository.findById(command.id);
    if (!existing) throw new NotFoundError();

    const imagePath = command.newImagePath;
    const updated = await this.repository.update(command.id, { imagePath });

    const hasPreviousImage = existing.imagePath && existing.imagePath !== imagePath;
    if (hasPreviousImage) {
      await this.blobStorageRepository.deleteObject(existing.imagePath as string);
    }

    return updated;
  }
}
