import Elysia from 'elysia';
import { inject, injectable } from 'tsyringe';

import { ConfirmImageUploadUseCase } from '../../applications/usecases/confirm-image-upload.usecase';
import { GetImageUseCase } from '../../applications/usecases/get-image.usecase';
import { GetPresignedUploadUrlUseCase } from '../../applications/usecases/get-presigned-upload-url.usecase';
import {
  confirmUploadBody,
  confirmUploadParams,
  getImageParams,
  presignedUploadBody,
} from './schemas/image.schema';

@injectable()
export class ImageController {
  constructor(
    @inject(GetPresignedUploadUrlUseCase)
    private readonly getPresignedUploadUrlUseCase: GetPresignedUploadUrlUseCase,
    @inject(ConfirmImageUploadUseCase)
    private readonly confirmImageUploadUseCase: ConfirmImageUploadUseCase,
    @inject(GetImageUseCase)
    private readonly getImageUseCase: GetImageUseCase,
  ) {}

  registerRoutes(server: Elysia) {
    return server
      .group('/uploads', (app) =>
        app.post(
          '/presigned-upload',
          async ({ body }) => {
            return this.getPresignedUploadUrlUseCase.execute({
              contentType: body.contentType,
            });
          },
          { body: presignedUploadBody },
        ),
      )
      .group('/images', (app) =>
        app
          .post(
            '/:id/confirm-upload',
            async ({ params, body }) => {
              return this.confirmImageUploadUseCase.execute({
                id: params.id,
                newImagePath: body.key,
              });
            },
            { params: confirmUploadParams, body: confirmUploadBody },
          )
          .get(
            '/:id/image',
            async ({ params }) => this.getImageUseCase.execute({ id: params.id }),
            { params: getImageParams },
          ),
      );
  }

  getRoutes() {
    return this.registerRoutes(new Elysia({ tags: ['Images'] }));
  }
}
