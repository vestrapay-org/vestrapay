# Vestrapay

Enabling businesses to accept card and alternative payments.

---

## Tech Stack

| Layer                 | Technology                                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Framework**         | [Next.js 16](https://nextjs.org/) (App Router, Turbopack)                                                                     |
| **Language**          | [TypeScript 5.9](https://www.typescriptlang.org/) (strict mode)                                                               |
| **Monorepo**          | [Turborepo 2.8](https://turborepo.dev/) + [pnpm Workspaces](https://pnpm.io/workspaces)                                       |
| **Styling**           | [Tailwind CSS 4](https://tailwindcss.com/) (PostCSS plugin)                                                                   |
| **Component Library** | [shadcn/ui](https://ui.shadcn.com/)                                                                                           |
| **Linting**           | [ESLint 9](https://eslint.org/) (flat config) + [typescript-eslint](https://typescript-eslint.io/)                            |
| **Formatting**        | [Prettier](https://prettier.io/) + [prettier-plugin-tailwindcss](https://github.com/tailwindlabs/prettier-plugin-tailwindcss) |
| **Package Manager**   | [pnpm 10](https://pnpm.io/)                                                                                                   |

## Project Structure

```
vestrapay/
├── apps/
│   ├── web/            # Marketing website          (port 3000)
│   ├── app/            # Main application dashboard (port 3001)
│   ├── admin/          # Admin dashboard            (port 3002)
│   └── checkout/       # Checkout flow              (port 3003)
├── packages/
│   ├── ui/             # Shared UI components (shadcn/ui, Tailwind theme)
│   ├── typescript-config/  # Shared tsconfig presets
│   └── eslint-config/      # Shared ESLint configurations
├── services/           # Backend services
├── turbo.json          # Turborepo task pipeline
├── pnpm-workspace.yaml # Workspace definitions
└── package.json        # Root scripts & devDependencies
```

### Apps

| App             | Package Name          | Port | Purpose                     |
| --------------- | --------------------- | ---- | --------------------------- |
| `apps/web`      | `@vestrapay/web`      | 3000 | Public marketing website    |
| `apps/app`      | `@vestrapay/app`      | 3001 | Main user-facing dashboard  |
| `apps/admin`    | `@vestrapay/admin`    | 3002 | Internal admin panel        |
| `apps/checkout` | `@vestrapay/checkout` | 3003 | Payment checkout experience |

### Packages

| Package                      | Name                           | Purpose                                                                   |
| ---------------------------- | ------------------------------ | ------------------------------------------------------------------------- |
| `packages/ui`                | `@vestrapay/ui`                | Shared React components, hooks, utilities, and Tailwind theme (shadcn/ui) |
| `packages/typescript-config` | `@vestrapay/typescript-config` | Shared `tsconfig.json` presets (`base`, `nextjs`, `react-library`)        |
| `packages/eslint-config`     | `@vestrapay/eslint-config`     | Shared ESLint flat configs (`base`, `next`, `react-internal`)             |

### Services

The `services/` directory is reserved for backend microservices (e.g. NestJS). It is already registered as a pnpm workspace.

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 10

## Getting Started

```bash
# 1. Clone the repository
git clone <repo-url> && cd vestrapay

# 2. Install dependencies
pnpm install

# 3. Copy environment template
cp .env.example .env.local

# 4. Start all apps in development
pnpm dev
```

## Scripts

All commands are run from the monorepo root.

### Global

| Command                 | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `pnpm dev`              | Start all apps in development mode               |
| `pnpm build`            | Build all apps and packages                      |
| `pnpm lint`             | Lint all workspaces                              |
| `pnpm type-check`       | Type-check all workspaces                        |
| `pnpm format`           | Format all files with Prettier                   |
| `pnpm format:check`     | Check formatting without writing                 |
| `pnpm clean`            | Clean build artifacts in all workspaces          |
| `pnpm clean:workspaces` | Deep clean — removes `node_modules` and `.turbo` |

### Filtered (per-app)

| Command               | Description                          |
| --------------------- | ------------------------------------ |
| `pnpm dev:web`        | Dev server for `@vestrapay/web`      |
| `pnpm dev:app`        | Dev server for `@vestrapay/app`      |
| `pnpm dev:admin`      | Dev server for `@vestrapay/admin`    |
| `pnpm dev:checkout`   | Dev server for `@vestrapay/checkout` |
| `pnpm build:web`      | Build `@vestrapay/web`               |
| `pnpm build:app`      | Build `@vestrapay/app`               |
| `pnpm build:admin`    | Build `@vestrapay/admin`             |
| `pnpm build:checkout` | Build `@vestrapay/checkout`          |
| `pnpm lint:web`       | Lint `@vestrapay/web`                |
| `pnpm lint:app`       | Lint `@vestrapay/app`                |
| `pnpm lint:admin`     | Lint `@vestrapay/admin`              |
| `pnpm lint:checkout`  | Lint `@vestrapay/checkout`           |
| `pnpm lint:ui`        | Lint `@vestrapay/ui`                 |

You can also run any Turbo filter manually:

```bash
pnpm turbo run <task> --filter=@vestrapay/<package>
```

## Adding shadcn/ui Components

Components are installed into the shared `packages/ui` package and are available to all apps.

```bash
# From any app directory (e.g. apps/web)
cd apps/web
pnpm dlx shadcn@latest add button
```

Then import in any app:

```tsx
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
```

## Editor Setup

The repo includes VS Code settings (`.vscode/`) that enable:

- **Format on save** via Prettier
- **Auto-fix ESLint** issues on save
- **Tailwind CSS IntelliSense** with CVA/cx class detection

Recommended extensions are listed in `.vscode/extensions.json` — VS Code will prompt to install them automatically.

## License

Private — All rights reserved.
