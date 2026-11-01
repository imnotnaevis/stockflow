CREATE TABLE IF NOT EXISTS "asset_earnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"downloads" integer DEFAULT 0 NOT NULL,
	"revenue_usd" numeric(10, 4) DEFAULT '0.0000' NOT NULL,
	"period_date" date,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asset_keywords" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"keyword" varchar(100) NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asset_metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"title" varchar(70) NOT NULL,
	"description" text,
	"category_id" integer NOT NULL,
	"release_status" varchar(100) DEFAULT 'none_required' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asset_metadata_asset_id_unique" UNIQUE("asset_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asset_rejections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"taxonomy_id" uuid NOT NULL,
	"notes" text,
	"rejected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asset_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"theme_id" uuid,
	"title" varchar(255) NOT NULL,
	"max_quota" integer DEFAULT 50 NOT NULL,
	"current_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asset_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"from_status" varchar(50),
	"to_status" varchar(50) NOT NULL,
	"reason" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adobe_content_id" varchar(100),
	"filename" varchar(30) NOT NULL,
	"blob_url" text NOT NULL,
	"thumbnail_url" text,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"phash" bigint NOT NULL,
	"status" varchar(50) DEFAULT 'idea' NOT NULL,
	"series_id" uuid,
	"template_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gemini_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid,
	"model" varchar(100) NOT NULL,
	"prompt_version" varchar(50) NOT NULL,
	"raw" jsonb NOT NULL,
	"scores" jsonb,
	"tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(10, 6) DEFAULT '0.000000' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "production_themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"season" varchar(50),
	"target_quarter" varchar(20),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prompt_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"prompt_text" text NOT NULL,
	"negative_prompt" text,
	"version" integer DEFAULT 1 NOT NULL,
	"parent_id" uuid,
	"is_latest" boolean DEFAULT true NOT NULL,
	"parameters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rejection_taxonomies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(100) NOT NULL,
	"label" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rejection_taxonomies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_earnings" ADD CONSTRAINT "asset_earnings_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_keywords" ADD CONSTRAINT "asset_keywords_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_metadata" ADD CONSTRAINT "asset_metadata_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_rejections" ADD CONSTRAINT "asset_rejections_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_rejections" ADD CONSTRAINT "asset_rejections_taxonomy_id_rejection_taxonomies_id_fk" FOREIGN KEY ("taxonomy_id") REFERENCES "public"."rejection_taxonomies"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_series" ADD CONSTRAINT "asset_series_theme_id_production_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."production_themes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_status_history" ADD CONSTRAINT "asset_status_history_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assets" ADD CONSTRAINT "assets_series_id_asset_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."asset_series"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assets" ADD CONSTRAINT "assets_template_id_prompt_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."prompt_templates"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gemini_runs" ADD CONSTRAINT "gemini_runs_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_earnings_asset" ON "asset_earnings" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_keywords_asset" ON "asset_keywords" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_keywords_asset_pos" ON "asset_keywords" USING btree ("asset_id","position");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_metadata_asset" ON "asset_metadata" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_asset_rejections_asset" ON "asset_rejections" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_status_history_asset" ON "asset_status_history" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_status_history_changed_at" ON "asset_status_history" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assets_status" ON "assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assets_series" ON "assets" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assets_adobe_id" ON "assets" USING btree ("adobe_content_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gemini_runs_asset" ON "gemini_runs" USING btree ("asset_id");