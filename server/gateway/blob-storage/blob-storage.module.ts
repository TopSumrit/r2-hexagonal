import { container } from 'tsyringe';

import { BlobStorageAwsRepository } from './adapters/repository/blob-storage.aws.repository';
import { blobStorageRepositoryToken } from './applications/ports/blob-storage.repository';

container.registerSingleton(blobStorageRepositoryToken, BlobStorageAwsRepository);

export default container;
