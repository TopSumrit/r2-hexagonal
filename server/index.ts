import 'reflect-metadata';

import { Elysia } from 'elysia';
import { openapi } from '@elysia/openapi';
import { container } from 'tsyringe';

import '@/server/database';
import '@/server/gateway/blob-storage/blob-storage.module';
import { ImageController } from '@/server/modules/images/adapters/controllers/image.controller';
import '@/server/modules/images/images.module';
import { NotFoundError } from '@/server/lib/errors';

const app = new Elysia()
  .use(
    openapi({
      documentation: {
        info: {
          title: 'r2-hex API',
          version: '1.0.0',
        },
      },
    }),
  )
  .onError(({ error, set, code }) => {
    if (error instanceof NotFoundError || code === 'NOT_FOUND') {
      set.status = 404;
      return { message: error instanceof Error ? error.message : 'NOT_FOUND' };
    }
    throw error;
  })
  .use(container.resolve(ImageController).routes());

app.listen(process.env.PORT ?? 3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
