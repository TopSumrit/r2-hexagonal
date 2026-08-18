import { container } from 'tsyringe';

import { ImageDrizzleRepository } from './adapters/repository/image.drizzle';
import { imageRepositoryToken } from './applications/ports/image.repository';

container.registerSingleton(imageRepositoryToken, ImageDrizzleRepository);

export default container;
