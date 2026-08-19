import { cors } from '@elysiajs/cors';
import { openapi } from '@elysiajs/openapi';
import { Elysia } from 'elysia';
import 'reflect-metadata';
import { container } from 'tsyringe';

import './gateway/blob-storage/blob-storage.module';
import { handleAppError } from './lib/app-error-handler';
import { ImageController } from './modules/images/adapters/controllers/image.controller';
import './modules/images/images.module';

const imageController = container.resolve(ImageController);

export const app = new Elysia({ prefix: '/api' })
  .onError(handleAppError)
  .use(cors())
  .use(openapi())
  .use(imageController.getRoutes());

export type App = typeof app;
