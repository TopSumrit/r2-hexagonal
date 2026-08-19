import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { dbEnv } from '@/server/lib/env';
import * as schema from './schema';

const pool = new Pool({
  connectionString: dbEnv.url,
});

export const db = drizzle(pool, { schema });
