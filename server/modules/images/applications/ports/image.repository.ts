export interface IImage {
  id: number;
  refId: number | null;
  imagePath: string | null;
}

export interface IImageUpdateInput {
  imagePath: string;
}

export interface IImageRepository {
  findById(id: number): Promise<IImage | null>;
  update(id: number, input: IImageUpdateInput): Promise<IImage>;
}

const imageRepositoryTokenSymbol: unique symbol = Symbol('ImageRepository');
export const imageRepositoryToken = imageRepositoryTokenSymbol.toString();
