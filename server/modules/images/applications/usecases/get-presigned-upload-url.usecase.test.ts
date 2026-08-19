import { faker } from '@faker-js/faker';
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { UnsupportedMediaTypeError } from '@/server/lib/http-error.factory';

import type { IBlobStorageRepository } from '../../../../gateway/blob-storage/applications/ports/blob-storage.repository';
import {
  ALLOWED_MIME_TYPES,
  GetPresignedUploadUrlUseCase,
  type IGetPresignedUploadUrlUsecaseQuery,
} from './get-presigned-upload-url.usecase';

describe('GetPresignedUploadUrlUseCase', () => {
  const blobStorageRepository = mock<IBlobStorageRepository>();
  const useCase = new GetPresignedUploadUrlUseCase(blobStorageRepository);

  const mockPresignedUrl = () => faker.internet.url();
  const createQuery = (contentType: string): IGetPresignedUploadUrlUsecaseQuery => ({
    contentType,
  });
  const assertKeyFormat = (key: string, extension: string) =>
    expect(key).toMatch(new RegExp(`^images/[0-9a-f-]+\\.${extension}$`));

  const jpegMimeTypeCase = { contentType: 'image/jpeg', extension: 'jpg' };
  const pngMimeTypeCase = { contentType: 'image/png', extension: 'png' };
  const webpMimeTypeCase = { contentType: 'image/webp', extension: 'webp' };
  const gifMimeTypeCase = { contentType: 'image/gif', extension: 'gif' };
  const validMimeTypeTestCases = [
    jpegMimeTypeCase,
    pngMimeTypeCase,
    webpMimeTypeCase,
    gifMimeTypeCase,
  ];

  describe('execute', () => {
    it('should return presigned url and key for image/jpeg', async () => {
      const presignedUrl = mockPresignedUrl();
      blobStorageRepository.getPresignedUploadUrl.mockResolvedValue(presignedUrl);
      const query = createQuery('image/jpeg');
      const expectedOptions = { contentType: 'image/jpeg' };

      const actual = await useCase.execute(query);

      expect(actual.presignedUrl).toBe(presignedUrl);
      assertKeyFormat(actual.key, 'jpg');
      const expectedPresignedUploadParamsForJpeg = {
        fullPath: actual.key,
        options: expectedOptions,
      };
      expect(blobStorageRepository.getPresignedUploadUrl).toHaveBeenCalledWith(
        expectedPresignedUploadParamsForJpeg,
      );
    });

    describe.each(validMimeTypeTestCases)(
      'for valid mime type: $contentType',
      ({ contentType, extension }) => {
        it('should generate key with correct extension', async () => {
          blobStorageRepository.getPresignedUploadUrl.mockResolvedValue(mockPresignedUrl());
          const query = createQuery(contentType);
          const expectedOptions = { contentType };

          const actual = await useCase.execute(query);

          assertKeyFormat(actual.key, extension);
          const expectedPresignedUploadParamsForValidMime = {
            fullPath: actual.key,
            options: expectedOptions,
          };
          expect(blobStorageRepository.getPresignedUploadUrl).toHaveBeenCalledWith(
            expectedPresignedUploadParamsForValidMime,
          );
        });
      },
    );

    it('should throw UnsupportedMediaTypeError for unsupported content type', async () => {
      const query = createQuery('application/pdf');

      await expect(useCase.execute(query)).rejects.toThrow(UnsupportedMediaTypeError);
    });

    it('should map all declared MIME types to a known extension', () => {
      const expectedExtensions = ['.jpg', '.png', '.webp', '.gif'];

      const actualExtensions = Object.values(ALLOWED_MIME_TYPES);

      expect(actualExtensions).toEqual(expectedExtensions);
    });
  });
});
