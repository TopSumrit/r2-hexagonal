import { t } from 'elysia';

export const presignedUploadBody = t.Object({
  contentType: t.String(),
});

export const confirmUploadParams = t.Object({
  id: t.Numeric(),
});

export const confirmUploadBody = t.Object({
  key: t.String(),
});

export const getImageParams = t.Object({
  id: t.Numeric(),
});
