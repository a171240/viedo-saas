# VideoFly - AI Video Generation Platform

## Project Overview

VideoFly is a SaaS platform for AI-powered video generation. It's built on top of the SaaSfly template with significant enhancements for AI video generation capabilities.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Runtime**: React 19
- **Language**: TypeScript
- **Database**: PostgreSQL with Kysely (query builder)
- **Auth**: Better Auth
- **Styling**: Tailwind CSS + shadcn/ui
- **Monorepo**: Turborepo + pnpm

## Project Structure

```
saasfly/
├── apps/
│   ├── nextjs/              # Main Next.js application
│   │   ├── src/
│   │   │   ├── app/         # Next.js App Router pages
│   │   │   │   ├── api/     # API Routes
│   │   │   │   │   └── v1/  # Versioned REST API
│   │   │   │   └── [lang]/  # i18n pages
│   │   │   ├── components/  # React components
│   │   │   ├── lib/         # Utilities and helpers
│   │   │   └── trpc/        # tRPC configuration
│   │   └── public/          # Static assets
│   └── docs/                # Documentation site
│
├── packages/
│   ├── auth/                # Better Auth configuration
│   ├── common/              # Shared business logic
│   │   ├── src/
│   │   │   ├── ai/          # AI provider abstraction
│   │   │   ├── config/      # Configuration (credits, etc.)
│   │   │   ├── services/    # Business services
│   │   │   └── utils/       # Utility functions
│   ├── db/                  # Database schema and Kysely setup
│   ├── ui/                  # UI component library
│   ├── video-generator/     # Video generator input component
│   ├── api/                 # tRPC API routers
│   └── stripe/              # Stripe integration
│
├── docs/
│   └── ai-video-plan/       # Implementation documentation
│
└── tooling/                 # Shared tooling configs
```

## Core Modules

### 1. AI Provider Layer (`packages/common/src/ai/`)

Unified abstraction for multiple AI video generation providers.

**Supported Providers:**
- **evolink.ai** - Supports image-to-video generation
- **kie.ai** - Text-to-video generation only

**Key Files:**
- `types.ts` - Interface definitions
- `providers/evolink.ts` - Evolink.ai implementation
- `providers/kie.ts` - Kie.ai implementation
- `index.ts` - Provider factory

**Usage:**
```typescript
import { getProvider } from "@videofly/common/ai";
const provider = getProvider("evolink");
const task = await provider.createTask({ prompt, duration, aspectRatio });
```

### 2. Credit System (`packages/common/src/services/credit.ts`)

FIFO-based credit management with freeze/settle/release pattern.

**Features:**
- Credit packages with expiration dates
- Freeze credits during video generation
- Settle on success, release on failure
- Transaction history tracking

**Key Methods:**
- `getBalance(userId)` - Get available/frozen/used credits
- `freeze({ userId, credits, videoUuid })` - Freeze credits for task
- `settle(holdId, actualCredits)` - Confirm credit consumption
- `release(holdId)` - Release frozen credits on failure
- `recharge({ userId, credits, orderNo })` - Add credits from purchase

### 3. Video Service (`packages/common/src/services/video.ts`)

Handles video generation lifecycle.

**Flow:**
1. `generate()` - Create task, freeze credits, call AI API
2. AI provider processes asynchronously
3. `handleCallback()` - Receive completion webhook
4. `tryCompleteGeneration()` - Download video, upload to R2, settle credits

**Key Methods:**
- `generate(params)` - Start video generation
- `handleCallback(provider, payload)` - Process AI callback
- `refreshStatus(uuid, userId)` - Poll status for frontend
- `listVideos(userId, options)` - Get user's videos

### 4. Storage (`packages/common/src/storage.ts`)

R2/S3-compatible storage for video files.

**Features:**
- Presigned upload URLs
- Download from AI provider and re-upload to R2
- Public URL generation

## API Routes

### REST API (`/api/v1/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/user/me` | GET | Get current user info |
| `/api/v1/credit/balance` | GET | Get credit balance |
| `/api/v1/credit/history` | GET | Get credit transactions |
| `/api/v1/video/generate` | POST | Start video generation |
| `/api/v1/video/list` | GET | List user's videos |
| `/api/v1/video/[uuid]` | GET/DELETE | Get/delete video |
| `/api/v1/video/[uuid]/status` | GET | Poll video status |
| `/api/v1/video/callback/[provider]` | POST | AI provider webhook |
| `/api/v1/upload/presign` | POST | Get presigned upload URL |
| `/api/v1/config/models` | GET | Get available models |

### Auth API (`/api/auth/`)

Handled by Better Auth - includes login, register, session management.

### tRPC API (`/api/trpc/`)

Legacy tRPC endpoints for existing features (K8s, Stripe subscriptions).

## Database Schema

### Key Tables

```sql
-- Video generation records
videos (
  id, uuid, user_id, prompt, model, provider,
  status, video_url, thumbnail_url, duration,
  aspect_ratio, parameters, credits_used,
  error_message, created_at, updated_at
)

-- Credit packages (FIFO consumption)
credit_packages (
  id, user_id, order_no, credits, used_credits,
  trans_type, expires_at, created_at
)

-- Credit transaction history
credit_transactions (
  id, user_id, credits, balance_after,
  trans_type, video_uuid, remark, created_at
)
```

### Enums

- `VideoStatus`: PENDING, GENERATING, UPLOADING, COMPLETED, FAILED
- `CreditTransType`: ORDER_PAY, SUBSCRIPTION, ADMIN_ADJUST, VIDEO_GENERATE, VIDEO_REFUND

## Frontend Pages

| Path | Description |
|------|-------------|
| `/[lang]/demo` | Video generator demo page |
| `/[lang]/dashboard` | User dashboard |
| `/[lang]/dashboard/videos` | Video history |
| `/[lang]/pricing` | Pricing page |

## Key Components

- `VideoGeneratorInput` - Main input component (from @videofly/video-generator)
- `VideoStatusCard` - Shows generation progress
- `VideoCard` - Video card for history list

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Auth
BETTER_AUTH_SECRET=...

# Storage (R2/S3)
STORAGE_ENDPOINT=...
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...
STORAGE_BUCKET=...
STORAGE_DOMAIN=...

# AI Providers
EVOLINK_API_KEY=...
KIE_API_KEY=...
AI_CALLBACK_URL=https://your-domain.com/api/v1/video/callback
AI_CALLBACK_SECRET=...

# Payment (Creem - pending)
CREEM_API_KEY=...
CREEM_WEBHOOK_SECRET=...
```

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Database migrations
pnpm db:migrate

# Type checking
pnpm typecheck
```

## Implementation Status

### Completed (Phase 1-5)
- [x] Infrastructure upgrade (Next.js 15, React 19)
- [x] Database schema with Kysely
- [x] Credit system (freeze/settle/release)
- [x] AI provider abstraction
- [x] Video generation service
- [x] REST API endpoints
- [x] Frontend pages (demo, video history)

### Pending (Phase 6)
- [ ] Creem payment integration
- [ ] Subscription management
- [ ] Pricing page with checkout

## Architecture Decisions

1. **Kysely over Prisma Client** - Better TypeScript inference, lighter runtime
2. **REST API over tRPC for new features** - Simpler for webhook integrations
3. **FIFO credit consumption** - Fair expiration handling
4. **Callback-based AI integration** - Async generation with webhook completion
5. **R2 storage** - Cost-effective video storage with CDN
