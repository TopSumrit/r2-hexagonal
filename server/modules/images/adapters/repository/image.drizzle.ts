import { eq } from 'drizzle-orm';
import { injectable } from 'tsyringe';

import { db } from '@/server/database';
import { images } from '@/server/database/schema';
import type {
  IImage,
  IImageRepository,
  IImageUpdateInput,
} from '../../applications/ports/image.repository';

@injectable()
export class ImageDrizzleRepository implements IImageRepository {
  async findById(id: number): Promise<IImage | null> {
    const [row] = await db.select().from(images).where(eq(images.id, id));
    return row ?? null;
  }

  async update(id: number, input: IImageUpdateInput): Promise<IImage> {
    const [row] = await db.update(images).set(input).where(eq(images.id, id)).returning();
    if (!row) throw new Error('Image not found');
    return row;
  }
}
