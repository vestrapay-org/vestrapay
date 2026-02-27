# VestraPay API

> `@vestrapay/api` — Backend API service for the VestraPay platform.

## Stack

| Technology     | Version  |
| -------------- | -------- |
| NestJS         | v11.x    |
| TypeScript     | v5.9.x   |
| Prisma ORM     | v6.19.x  |
| PostgreSQL     | v17.x    |
| Redis          | v8.x     |
| BullMQ         | latest   |
| Node.js        | v24.11.x |
| Docker Compose | v2.x     |

## Features

- **JWT Authentication** — ES256 (access tokens) and ES512 (refresh tokens) with JWKS rotation
- **Two-Factor Authentication** — TOTP-based 2FA with backup recovery codes
- **RBAC with CASL** — Fine-grained role and permission system (superadmin, admin, user)
- **Stateful Sessions** — Redis-backed sessions with token revocation
- **API Key Protection** — Secure external API access via `x-api-key` header
- **Feature Flags** — Dynamic feature rollout per environment
- **Background Jobs** — BullMQ queue system for async processing
- **AWS S3 & SES** — File storage with presigned URLs and transactional email
- **Swagger/OpenAPI** — Interactive API documentation at `/docs`
- **Database Seeding** — Commander-based seed/rollback scripts
- **Health Checks** — System monitoring endpoints
- **i18n Support** — Multi-language responses via `x-custom-lang` header
- **Rate Limiting** — Configurable request throttling
- **Error Tracking** — Sentry integration for monitoring

## Quick Start

### Prerequisites

- Node.js >= 24.11.0
- pnpm
- Docker & Docker Compose

### 1. Environment Setup

```bash
cd services/api
cp .env.example .env
```

### 2. Generate JWT Key Pairs

The API uses ES256 (access tokens) and ES512 (refresh tokens). Keys must be in **DER (binary) format**, base64-encoded for the `.env` file.

```bash
mkdir -p keys

# ES256 key pair (access tokens)
openssl ecparam -genkey -name prime256v1 -noout -out keys/access-private.pem
openssl ec -in keys/access-private.pem -pubout -out keys/access-public.pem

# ES512 key pair (refresh tokens)
openssl ecparam -genkey -name secp521r1 -noout -out keys/refresh-private.pem
openssl ec -in keys/refresh-private.pem -pubout -out keys/refresh-public.pem

# Convert to DER/PKCS8 format (required by the API)
openssl pkcs8 -topk8 -nocrypt -in keys/access-private.pem -outform DER -out keys/access-private.der
openssl ec -in keys/access-private.pem -pubout -outform DER -out keys/access-public.der
openssl pkcs8 -topk8 -nocrypt -in keys/refresh-private.pem -outform DER -out keys/refresh-private.der
openssl ec -in keys/refresh-private.pem -pubout -outform DER -out keys/refresh-public.der
```

Then base64-encode the DER files and set in `.env`:

```bash
# macOS
echo "AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY=$(base64 -i keys/access-private.der)"
echo "AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY=$(base64 -i keys/access-public.der)"
echo "AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY=$(base64 -i keys/refresh-private.der)"
echo "AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY=$(base64 -i keys/refresh-public.der)"

# Linux
echo "AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY=$(base64 -w 0 keys/access-private.der)"
echo "AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY=$(base64 -w 0 keys/access-public.der)"
echo "AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY=$(base64 -w 0 keys/refresh-private.der)"
echo "AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY=$(base64 -w 0 keys/refresh-public.der)"
```

Copy each output value into the corresponding `.env` variable.

### 3. Start Infrastructure

```bash
docker compose up -d postgres redis jwks-server
```

> **Note:** If port 5432 is already in use (e.g. a local PostgreSQL installation), update the port mapping in `docker-compose.yml` (e.g. `5434:5432`) and update `DATABASE_URL` in `.env` accordingly.

### 4. Install Dependencies

```bash
# From monorepo root
pnpm install

# Or from services/api directly
pnpm install
```

### 5. Generate Prisma Client & Push Schema

```bash
pnpm db:generate
pnpm db:migrate
```

### 6. Seed Database

```bash
pnpm migration:seed
```

This creates default roles (superadmin, admin, user), test users, API keys, and feature flags.

### 7. Run Development Server

```bash
pnpm start:dev
```

The API will be available at `http://localhost:3000` and Swagger docs at `http://localhost:3000/docs`.

## Default Credentials

After running seeds, the following accounts are available:

| Role       | Email                  | Password   |
| ---------- | ---------------------- | ---------- |
| Superadmin | superadmin@mail.com    | aaAA@123   |
| Admin      | admin@mail.com         | aaAA@123   |
| User       | user@mail.com          | aaAA@123   |

### Default API Keys (local environment)

| Name            | Type    | Key                         | Secret                                             |
| --------------- | ------- | --------------------------- | -------------------------------------------------- |
| Api Key Default | default | local_fyFGb7ywyM37TqDY8nuhAmGW5 | qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP |
| Api Key System  | system  | local_UTDH0fuDMAbd1ZVnwnyrQJd8Q | qbp7LmCxYUTHFwKvHnxGW1aTyjSNU6ytN21etK89MaP2Dj2KZP |

Use in Swagger: Click **Authorize**, paste the key under **xApiKey** in the format `{key}:{secret}`.

## Scripts

| Script               | Description                          |
| -------------------- | ------------------------------------ |
| `pnpm start:dev`     | Start in development mode (hot reload) |
| `pnpm build`         | Build for production                 |
| `pnpm start:prod`    | Start production server              |
| `pnpm db:generate`   | Generate Prisma client               |
| `pnpm db:migrate`    | Push schema changes to database      |
| `pnpm migration:seed`| Seed database with initial data      |
| `pnpm lint`          | Run ESLint                           |
| `pnpm test`          | Run tests                            |

## Documentation

Detailed documentation is available in the [docs/](docs/) directory:

- [Installation](docs/installation.md)
- [Configuration](docs/configuration.md)
- [Environment Variables](docs/environment.md)
- [Project Structure](docs/project-structure.md)
- [Authentication](docs/authentication.md)
- [Authorization](docs/authorization.md)
- [Database](docs/database.md)
- [Two-Factor Auth](docs/two-factor.md)
- [API Documentation](docs/doc.md)
- [Feature Flags](docs/feature-flag.md)
- [Queue System](docs/queue.md)
- [File Upload](docs/file-upload.md)
- [Caching](docs/cache.md)

## License

[MIT](LICENSE.md)
