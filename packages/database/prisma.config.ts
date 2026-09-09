import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

loadEnv({ path: ['.env', 'prisma/.env'], quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: process.env.DATABASE_URL ? { url: process.env.DATABASE_URL } : undefined,
});
