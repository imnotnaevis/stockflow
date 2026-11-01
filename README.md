# StockFlow AI

A personal Adobe Stock AI-portfolio management web application designed for high-compliance stock content production, perceptual deduplication, and automated Adobe metadata formatting. Deployed seamlessly to Vercel with Neon Serverless Postgres, Vercel Blob, and Google Gemini AI.

---

## Tech Stack & Architecture

- **Framework**: [Next.js 14+ App Router](https://nextjs.org/) (TypeScript strict mode)
- **Design System & UX**: Soft pastel modern SaaS dashboard theme with warm off-white canvas (`#F4F4F1`), rounded pure white cards (`20-24px`), diffuse shadows, and WCAG AA accessible contrast
- **Typography**: [Urbanist](https://fonts.google.com/specimen/Urbanist) (geometric rounded sans with Plus Jakarta Sans and Outfit fallbacks)
- **Palette**: Lavender (`#E3D6EE`), Baby Blue (`#C7D8EA`), Butter Yellow (`#F8DA7A`), Sage (`#D2E7D6`), Peach (`#FAD5C0`), Blush (`#F5D3D8`), and Charcoal (`#2B2B2B`)
- **Database & ORM**: [Neon Postgres Serverless](https://neon.tech/) via `@neondatabase/serverless` & [Drizzle ORM](https://orm.drizzle.team/)
- **Storage**: [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) (client uploads, zero server disk bottlenecks)
- **Image Processing & Perceptual Hashing**: [Sharp](https://sharp.pixelplumbing.com/) computing 64-bit perceptual hashes stored as signed `BIGINT` via `BigInt.asIntN(64)`
- **AI Engine**: `@google/genai` (Google Gemini) for asset metadata generation & automated QC
- **Validation**: [Zod](https://zod.dev/) schemas enforcing strict Adobe Stock compliance
- **Testing**: [Vitest](https://vitest.dev/) unit test suite

---

## Core Business Guardrails & Rules

All business rules reside centralized in [`lib/config.ts`](./lib/config.ts):
1. **Title Length**: Maximum 70 characters (internal SEO optimization limit).
2. **Filename**: Maximum 30 characters (alphanumeric, hyphens, and underscores only).
3. **Keywords**: Strictly 15 to 35 keywords (well within Adobe's allowable 5–49 boundary).
4. **Zero AI Platform Mentions**: Terms such as *"generative AI"*, *"midjourney"*, *"dall-e"*, *"firefly"*, or model names are strictly filtered out (Adobe requires checking the generative AI checkbox in the portal instead).
5. **CSV Batch Export**: Maximum 5,000 rows or 1 MB, UTF-8 without BOM, headers: `Filename,Title,Keywords,Category`.
6. **Zero Background Workers**: Long-running jobs process one asset per request (`maxDuration: 60`), driven client-side by the browser queue.
7. **Asset Lifecycle Statuses**: `idea` &rarr; `qc_pending` &rarr; `qc_failed` &rarr; `ready` &rarr; `submitted` &rarr; `approved` &rarr; `rejected`. Status changes always log to `asset_status_history` in the same transaction.

---

## Step-by-Step Vercel Deployment Guide

### Step 1: Push Repository to GitHub
Ensure all code is committed (note: `.env.local` is ignored) and push to your private GitHub repository:
```bash
git init
git add .
git commit -m "feat: StockFlow AI Phase 1 scaffold"
git branch -M main
git remote add origin https://github.com/<your-username>/stockflow-ai.git
git push -u origin main
```

---

### Step 2: Import into Vercel
1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** &rarr; **Project**.
3. Select your GitHub repository (`stockflow-ai`) and click **Import**.
4. Set Framework Preset to **Next.js** (Root Directory: `./` or `stock_flow`).

---

### Step 3: Attach Neon Postgres via Vercel Marketplace
1. In your Vercel Project Dashboard, navigate to the **Storage** tab.
2. Under "Connect Store", select **Neon** from the Marketplace.
3. Choose your region (e.g., `us-east-1` or closest to your target audience) and link it to the project.
4. Vercel automatically injects the `DATABASE_URL` environment variable for Production, Preview, and Development.

---

### Step 4: Attach Vercel Blob Store
1. In the **Storage** tab, click **Create Database** / **Create Store**.
2. Select **Blob** &rarr; Name your store (e.g. `stockflow-assets`).
3. Click **Create** & link to your project.
4. Vercel automatically provisions and injects `BLOB_READ_WRITE_TOKEN`.

---

### Step 5: Configure Remaining Environment Variables
In your Vercel Project &rarr; **Settings** &rarr; **Environment Variables**, verify or add:

| Variable | Description | Example / Note |
|---|---|---|
| `DATABASE_URL` | Neon Postgres Connection String | Automatically populated by Neon integration |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob Token | Automatically populated by Blob integration |
| `GEMINI_API_KEY` | Google Gemini API Key | Get from Google AI Studio |
| `GEMINI_MODEL` | Gemini Model identifier | e.g. `gemini-1.5-flash` |
| `APP_PASSWORD` | Master password for password gate | e.g. `YourStrongAppPassword2026!` |
| `SESSION_SECRET` | 32+ character random secret for JWT signing | e.g. `openssl rand -hex 32` |

---

### Step 6: Run Drizzle Database Migrations & Seeds
You can push migrations directly from your local terminal targeting the Neon database:

```bash
# Push schema tables to Neon
npm run db:push

# (Optional) Seed standard Adobe rejection taxonomies
npm run db:seed
```

Alternatively, you can apply SQL migrations in `drizzle/0000_numerous_annihilus.sql` via the Neon Web Console SQL editor.

---

### Step 7: Deploy and Verify
1. Trigger a deployment by clicking **Deploy** in Vercel.
2. Visit your deployed URL (e.g., `https://stockflow-ai.vercel.app`).
3. You will be greeted by the **Password Gate**. Enter your `APP_PASSWORD`.
4. Upon authentication, you will access the dark SaaS dashboard with KPI metrics, Recharts analytics, seasonal calendar, prompt templates engine, asset QC inspector, and CSV export engine.

---

## Design System & UX Tokens

StockFlow AI features a centralized design-token layer implemented across CSS custom properties (`app/globals.css`) and Tailwind theme extensions (`tailwind.config.ts`):

- **Warm Canvas**: Full edge-to-edge `#F4F4F1` base page background without outer margin or blue-grey backdrop containers.
- **Card Radius & Elevation**: White (`#FFFFFF`) and warm white (`#FAFAF8`) cards with `rounded-2xl` (20px) or `rounded-3xl` (24px), subtle 1px border (`#ECECE8`), and diffuse soft shadows (`shadow-soft`).
- **Pastel Palette**:
  - Weekly Production Target KPI: Soft Lavender (`#E3D6EE` / `#4A3B69`)
  - Seasonal Lead-Time Alerts KPI: Baby Blue (`#C7D8EA` / `#2C4866`)
  - Portfolio Health Score KPI: Butter Yellow (`#F8DA7A` / `#614E14`)
  - Status Indicators: Semantic pastel chips with accessible contrast (Ready/Approved in Sage `#E3F9ED`, Pending in Peach `#FFF3E6`, Rejected in Blush `#FCE8E8`).
- **Collapsible Sidebar Rail UX**:
  - **Collapsed by default**: Slim 72px vertical rail with soft lavender-to-blue gradient (`#DCD3EC` to `#D0DEEE`), rounded 28px corners, and circular active item icons.
  - **Expand on Hover**: Expands smoothly to 240px with a springy overshoot animation (`cubic-bezier(0.34, 1.56, 0.64, 1)`, 250ms), gently floating over content without layout shifts.
  - **Accessibility**: Expands on keyboard focus (`focus-within`), includes full ARIA labels and tooltips, mobile tap toggle drawer, and automatically falls back to smooth fade animations when `prefers-reduced-motion` is detected.
- **Contextual Right Drawer**: Light grey slide-in panel (`#EBEBE8`) with `rounded-l-[28px]`, circular pastel quick action pills, and white cards for Gemini QC inspections and live metadata validators.

---

## Production Deployment Checklist

Before taking your StockFlow AI instance live, verify each item:

- [x] **Password Gate Active**: `APP_PASSWORD` and `SESSION_SECRET` (32+ chars) set in Vercel environment variables.
- [x] **Zero Secrets in Client**: All API keys (`GEMINI_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `DATABASE_URL`) are strictly server-side; no `NEXT_PUBLIC_` prefixes leak secrets.
- [x] **Database Connectivity**: Neon Serverless connected with connection pooling.
- [x] **Vercel Blob Client Uploads**: `BLOB_READ_WRITE_TOKEN` configured, enabling direct large file uploads without server body-size limits.
- [x] **Serverless Function Duration**: `maxDuration: 60` configured on all asset-processing API routes to prevent timeouts.
- [x] **Client-Side Queue Architecture**: Long tasks (multi-file ingest, sequential Gemini QC) driven by client queues, completely avoiding background worker dynos.
- [x] **Adobe Stock CSV Compliance**: UTF-8 without BOM, strict 5,000 row / 1 MB partition splits, and mandatory AI-origin reminders.
- [x] **Subquery Aggregation for Sales**: Earnings CSV import aggregates per asset in a subquery before joining to avoid duplicate rows.

---

## Local Development & Testing

```bash
# Install dependencies
npm install

# Run Vitest test suite (42 unit tests)
npm run test

# Run TypeScript typecheck (0 errors)
npm run typecheck

# Build and start clean production server
npm run serve
# Or double-click start-clean.bat on Windows
```

