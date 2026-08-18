const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? '';
const accountId = process.env.R2_ACCOUNT_ID ?? '';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? '';
const bucketName = process.env.R2_BUCKET_NAME ?? '';

export const r2Env = {
  accessKeyId,
  accountId,
  bucketName,
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  region: 'auto',
  secretAccessKey,
  credentials: { accessKeyId, secretAccessKey },
};

export const dbEnv = {
  url: process.env.DATABASE_URL ?? '',
};
