import type { IImageDomain } from '@/server/domains/image.domain';

export interface IImageUpdateInput {
  imagePath: string;
}

export interface IImageRepository {
  findById(id: number): Promise<IImageDomain | null>;
  update(id: number, input: IImageUpdateInput): Promise<IImageDomain>;
}

const imageRepositoryTokenSymbol: unique symbol = Symbol('ImageRepository');
export const imageRepositoryToken = imageRepositoryTokenSymbol.toString();
