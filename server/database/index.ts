import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { dbEnv } from '@/server/lib/env';
import * as schema from './schema';

const queryClient = postgres(dbEnv.url);

export const db = drizzle(queryClient, { schema });
