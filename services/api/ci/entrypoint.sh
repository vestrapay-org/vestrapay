#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma db push --accept-data-loss --skip-generate

echo "Running seeders..."
node dist/migration.js apiKey --type seed || true
node dist/migration.js featureFlag --type seed || true
node dist/migration.js role --type seed || true
node dist/migration.js user --type seed || true
node dist/migration.js merchant --type seed || true
node dist/migration.js template-email --type seed || true

echo "Starting application..."
exec pnpm start:prod
