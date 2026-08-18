export interface PresignedUploadOptions {
  contentType?: string;
  expiresInSeconds?: number;
}
export interface PresignedDownloadOptions {
  expiresInSeconds?: number;
}

export interface IGetPresignedUploadUrl {
  fullPath: string;
  options?: PresignedUploadOptions;
}
export interface IGetPresignedDownloadUrl {
  fullPath: string;
  options?: PresignedDownloadOptions;
}

export interface IBlobStorageRepository {
  deleteObject(fullPath: string): Promise<void>;
  getPresignedDownloadUrl(args: IGetPresignedDownloadUrl): Promise<string>;
  getPresignedUploadUrl(args: IGetPresignedUploadUrl): Promise<string>;
}

const blobStorageRepositoryTokenSymbol: unique symbol = Symbol('BlobStorageRepository');
export const blobStorageRepositoryToken = blobStorageRepositoryTokenSymbol.toString();
