-- Remy — initial schema migration.
-- Generated from prisma schema; extended with triggers and constraints
-- Prisma won't produce on its own (append-only credit ledger, balance checks).

-- ===========================================================================
-- Enums
-- ===========================================================================

CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

CREATE TYPE "CreditTransactionKind" AS ENUM (
  'purchase',
  'subscription_grant',
  'usage_reserve',
  'usage_charge',
  'usage_refund',
  'adjustment',
  'bonus',
  'expiry'
);

CREATE TYPE "CreditTransactionStatus" AS ENUM ('pending', 'applied', 'cancelled');

CREATE TYPE "PlanId" AS ENUM ('free', 'starter', 'pro', 'scale');

CREATE TYPE "SubscriptionStatus" AS ENUM (
  'active', 'past_due', 'canceled', 'paused', 'unpaid', 'incomplete'
);

CREATE TYPE "InvoiceStatus" AS ENUM (
  'draft', 'open', 'paid', 'uncollectible', 'void'
);

CREATE TYPE "DatasetStatus" AS ENUM ('pending', 'processing', 'ready', 'failed');

CREATE TYPE "LoraStatus" AS ENUM ('pending', 'training', 'ready', 'failed');

CREATE TYPE "TrendSourceKind" AS ENUM (
  'tiktok_creator', 'tiktok_hashtag', 'category'
);

CREATE TYPE "JobKind" AS ENUM (
  'lora_training',
  'outfit_analysis',
  'reference_image',
  'outfit_image',
  'video_generation',
  'video_regeneration',
  'trend_ingest',
  'trend_analysis'
);

CREATE TYPE "JobStatus" AS ENUM (
  'queued', 'reserved', 'preparing', 'running', 'rendering',
  'uploading', 'completed', 'failed', 'cancelled', 'refunded'
);

CREATE TYPE "GenerationDecision" AS ENUM (
  'pending', 'approved', 'discarded', 'regenerated'
);

CREATE TYPE "WebhookSource" AS ENUM ('stripe', 'modal', 'ai', 'tiktok');

-- ===========================================================================
-- Tables
-- ===========================================================================

CREATE TABLE "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "supabase_user_id" UUID UNIQUE NOT NULL,
  "email" TEXT UNIQUE NOT NULL,
  "name" TEXT,
  "avatar_url" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'user',
  "onboarded_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archived_at" TIMESTAMP(3)
);
CREATE INDEX "users_email_idx" ON "users"("email");

CREATE TABLE "credit_balances" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "current_balance" INTEGER NOT NULL DEFAULT 0 CHECK ("current_balance" >= 0),
  "pending_balance" INTEGER NOT NULL DEFAULT 0 CHECK ("pending_balance" >= 0),
  "lifetime_granted" INTEGER NOT NULL DEFAULT 0,
  "lifetime_spent" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "credit_transactions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "kind" "CreditTransactionKind" NOT NULL,
  "status" "CreditTransactionStatus" NOT NULL DEFAULT 'applied',
  "amount" INTEGER NOT NULL,
  "reason" TEXT,
  "reference_kind" TEXT,
  "reference_id" UUID,
  "metadata" JSONB DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "credit_transactions_user_created_idx" ON "credit_transactions"("user_id", "created_at" DESC);
CREATE INDEX "credit_transactions_ref_idx" ON "credit_transactions"("status", "reference_id");

CREATE TABLE "subscriptions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "plan" "PlanId" NOT NULL DEFAULT 'free',
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
  "stripe_customer_id" TEXT UNIQUE,
  "stripe_subscription_id" TEXT UNIQUE,
  "current_period_start" TIMESTAMP(3),
  "current_period_end" TIMESTAMP(3),
  "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "invoices" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "stripe_invoice_id" TEXT UNIQUE NOT NULL,
  "status" "InvoiceStatus" NOT NULL,
  "amount_due" INTEGER NOT NULL,
  "amount_paid" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'usd',
  "credits_granted" INTEGER NOT NULL DEFAULT 0,
  "hosted_invoice_url" TEXT,
  "pdf_url" TEXT,
  "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paid_at" TIMESTAMP(3)
);
CREATE INDEX "invoices_user_issued_idx" ON "invoices"("user_id", "issued_at");

CREATE TABLE "character_datasets" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "character_id" UUID NOT NULL,
  "face_image_key" TEXT NOT NULL,
  "reference_image_keys" TEXT[] NOT NULL,
  "image_count" INTEGER NOT NULL,
  "status" "DatasetStatus" NOT NULL DEFAULT 'pending',
  "processed_keys" TEXT[] NOT NULL DEFAULT '{}',
  "error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "lora_models" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "character_id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "weights_key" TEXT,
  "status" "LoraStatus" NOT NULL DEFAULT 'pending',
  "metrics" JSONB DEFAULT '{}'::jsonb,
  "trained_on" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("character_id", "version")
);

CREATE TABLE "characters" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "dataset_id" UUID REFERENCES "character_datasets"("id") ON DELETE SET NULL,
  "active_lora_id" UUID REFERENCES "lora_models"("id") ON DELETE SET NULL,
  "archived" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "characters_user_created_idx" ON "characters"("user_id", "created_at" DESC);

ALTER TABLE "character_datasets"
  ADD CONSTRAINT "character_datasets_character_fk"
  FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE;

ALTER TABLE "lora_models"
  ADD CONSTRAINT "lora_models_character_fk"
  FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE;

CREATE TABLE "trend_sources" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "kind" "TrendSourceKind" NOT NULL,
  "handle" TEXT NOT NULL,
  "label" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "last_ingest_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("user_id", "kind", "handle")
);

CREATE TABLE "suggested_videos" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "source_id" UUID NOT NULL REFERENCES "trend_sources"("id") ON DELETE CASCADE,
  "platform_id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "thumbnail_url" TEXT,
  "creator_handle" TEXT,
  "caption" TEXT,
  "duration_seconds" INTEGER,
  "like_count" INTEGER,
  "view_count" INTEGER,
  "share_count" INTEGER,
  "comment_count" INTEGER,
  "engagement_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "simplicity_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "rank_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "published_at" TIMESTAMP(3),
  "ingested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("source_id", "platform_id")
);
CREATE INDEX "suggested_videos_rank_idx" ON "suggested_videos"("rank_score" DESC);

CREATE TABLE "jobs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "character_id" UUID REFERENCES "characters"("id") ON DELETE CASCADE,
  "kind" "JobKind" NOT NULL,
  "status" "JobStatus" NOT NULL DEFAULT 'queued',
  "reserved_credits" INTEGER NOT NULL DEFAULT 0,
  "charged_credits" INTEGER NOT NULL DEFAULT 0,
  "refunded_credits" INTEGER NOT NULL DEFAULT 0,
  "reservation_tx_id" UUID REFERENCES "credit_transactions"("id") ON DELETE SET NULL,
  "input" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "output" JSONB DEFAULT '{}'::jsonb,
  "progress" JSONB DEFAULT '{"percent": 0, "stage": "queued"}'::jsonb,
  "error" TEXT,
  "external_job_id" TEXT,
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "jobs_user_created_idx" ON "jobs"("user_id", "created_at" DESC);
CREATE INDEX "jobs_status_kind_idx" ON "jobs"("status", "kind");

CREATE TABLE "generations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "character_id" UUID NOT NULL REFERENCES "characters"("id") ON DELETE CASCADE,
  "job_id" UUID UNIQUE NOT NULL REFERENCES "jobs"("id") ON DELETE CASCADE,
  "suggested_video_id" UUID REFERENCES "suggested_videos"("id") ON DELETE SET NULL,
  "reference_video_url" TEXT,
  "output_video_key" TEXT,
  "output_thumbnail_key" TEXT,
  "duration_seconds" INTEGER NOT NULL,
  "resolution" TEXT NOT NULL,
  "outfit_prompt" TEXT,
  "seed" BIGINT,
  "decision" "GenerationDecision" NOT NULL DEFAULT 'pending',
  "decided_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "generations_user_created_idx" ON "generations"("user_id", "created_at" DESC);
CREATE INDEX "generations_character_created_idx" ON "generations"("character_id", "created_at" DESC);

CREATE TABLE "webhook_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "source" "WebhookSource" NOT NULL,
  "event_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),
  "payload" JSONB NOT NULL,
  "error" TEXT,
  UNIQUE ("source", "event_id")
);
CREATE INDEX "webhook_events_source_received_idx" ON "webhook_events"("source", "received_at");

-- ===========================================================================
-- Append-only enforcement on credit_transactions
-- ===========================================================================

CREATE OR REPLACE FUNCTION enforce_ct_append_only()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'credit_transactions is append-only; DELETE is forbidden';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    -- allow status to move pending -> applied or pending -> cancelled only
    IF OLD.kind <> NEW.kind
       OR OLD.amount <> NEW.amount
       OR OLD.user_id <> NEW.user_id
       OR OLD.created_at <> NEW.created_at THEN
      RAISE EXCEPTION 'credit_transactions columns (kind, amount, user_id, created_at) are immutable';
    END IF;
    IF OLD.status = 'applied' AND NEW.status <> 'applied' THEN
      RAISE EXCEPTION 'credit_transactions: cannot transition out of applied';
    END IF;
    IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN
      RAISE EXCEPTION 'credit_transactions: cannot transition out of cancelled';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER credit_transactions_append_only
  BEFORE UPDATE OR DELETE ON "credit_transactions"
  FOR EACH ROW EXECUTE FUNCTION enforce_ct_append_only();

-- ===========================================================================
-- Auto-create User + CreditBalance + Subscription from auth.users
-- (Supabase runs auth in the `auth` schema; we mirror via a trigger)
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_supabase_user()
RETURNS TRIGGER AS $$
DECLARE
  _user_id UUID;
BEGIN
  INSERT INTO public.users (supabase_user_id, email, name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email))
    ON CONFLICT (supabase_user_id) DO NOTHING
    RETURNING id INTO _user_id;

  IF _user_id IS NULL THEN
    SELECT id INTO _user_id FROM public.users WHERE supabase_user_id = NEW.id;
  END IF;

  INSERT INTO public.credit_balances (user_id, current_balance, lifetime_granted)
    VALUES (_user_id, 30, 30)
    ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.credit_transactions (user_id, kind, status, amount, reason)
    VALUES (_user_id, 'bonus', 'applied', 30, 'Signup bonus')
    ON CONFLICT DO NOTHING;

  INSERT INTO public.subscriptions (user_id, plan, status)
    VALUES (_user_id, 'free', 'active')
    ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create the trigger if the auth schema exists (Supabase).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_supabase_user();
  END IF;
END $$;
