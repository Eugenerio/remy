-- Apply the Prisma-generated app schema.
-- This is a one-time bootstrap; ongoing migrations are managed by Prisma
-- and applied via `prisma migrate deploy` in the Node API Dockerfile.
-- See apps/api/prisma/migrations/20260420000000_init/migration.sql for the
-- authoritative migration; here we just reference it.
select 'prisma_managed'::text as status;
