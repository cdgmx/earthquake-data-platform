# Earthquake Monorepo

A Turborepo-powered monorepo for earthquake monitoring and visualization with Next.js, React 19, TypeScript 5, and Tailwind CSS 4.

## 📦 Structure

\`\`\`
earthquake-monorepo/
├── apps/
│   └── web/              # Next.js 15 earthquake monitoring app
├── packages/
│   ├── ui/               # Shared UI components (shadcn/ui based)
│   ├── utils/            # Shared utility functions
│   └── earthquakes/      # Earthquake domain logic, API clients, schemas
├── turbo.json            # Turborepo pipeline configuration
├── pnpm-workspace.yaml   # pnpm workspace configuration
└── package.json          # Root workspace manifest
\`\`\`

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ 
- pnpm 10.18.2+

### Installation

\`\`\`bash
# Install dependencies
pnpm install

# Start development server (all apps)
pnpm dev

# Start dev server for specific app
cd apps/web && pnpm dev
\`\`\`

### Building

\`\`\`bash
# Build all apps and packages
pnpm build

# Build specific app
cd apps/web && pnpm build
\`\`\`

## 📝 Scripts

Available at the root level (runs across all packages via Turbo):

\`\`\`bash
pnpm dev         # Start development servers
pnpm build       # Build all apps and packages
pnpm lint        # Run Biome linter (with auto-fix)
pnpm format      # Format code with Biome
pnpm check       # Run Biome checks (CI mode, no fixes)
pnpm test        # Run all tests
pnpm test:watch  # Run tests in watch mode
pnpm test:ui     # Run tests with UI
pnpm coverage    # Generate test coverage reports
pnpm clean       # Remove build artifacts and node_modules
\`\`\`

## 📂 Workspace Packages

### Apps

- **\`@earthquake/web\`** (\`apps/web/\`)  
  Next.js 15 app router application for earthquake monitoring. Uses Turbopack for fast dev builds. Consumes shared packages from the monorepo.

### Packages

- **\`@earthquake/ui\`** (\`packages/ui/\`)  
  Shared React UI components built with shadcn/ui, Radix UI primitives, and Tailwind CSS. Components are consumed directly as source (transpiled by Next.js).

- **\`@earthquake/utils\`** (\`packages/utils/\`)  
  Shared utility functions (e.g., \`cn\` for className merging with clsx and tailwind-merge).

- **\`@earthquake/earthquakes\`** (\`packages/earthquakes/\`)  
  Domain-specific logic for earthquake data:
  - API clients (USGS feed integration)
  - Data schemas (Zod)
  - Normalization and filtering logic
  - React hooks for earthquake data management

## 🏗️ Turborepo Pipeline

Configured in \`turbo.json\`:

- **\`build\`**: Builds apps/packages. Outputs: \`.next/**\`, \`dist/**\`
- **\`dev\`**: Runs development servers (not cached, persistent)
- **\`lint\`**: Lints code with Biome
- **\`test\`**: Runs tests with Vitest. Outputs: \`coverage/**\`
- **\`format\`**: Formats code (not cached)

### Caching

Turborepo automatically caches build outputs locally. Remote caching is disabled by default but can be enabled:

\`\`\`bash
# Link to Vercel for remote caching (optional)
turbo login
turbo link
\`\`\`

## 🧪 Testing

Tests are run with Vitest. Currently located in \`apps/web/__tests__/\`.

\`\`\`bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm coverage
\`\`\`

## �� Code Style

- **Linter/Formatter**: Biome (configured via \`biome.json\`)
- **TypeScript**: Strict mode enabled
- **Import Strategy**: 
  - \`@earthquake/*\` for workspace packages
  - \`@/*\` for app-local imports (apps/web only)

## 🔧 Development Notes

### Adding a New Package

1. Create directory under \`packages/\`
2. Add \`package.json\` with:
   \`\`\`json
   {
     "name": "@earthquake/your-package",
     "version": "0.0.0",
     "private": true,
     "exports": { ".": "./src/index.ts" }
   }
   \`\`\`
3. Run \`pnpm install\` from root to link
4. Import in apps: \`import { ... } from "@earthquake/your-package"\`

### Adding a New App

1. Create directory under \`apps/\`
2. Add \`package.json\` with workspace dependencies:
   \`\`\`json
   {
     "dependencies": {
       "@earthquake/ui": "workspace:*"
     }
   }
   \`\`\`
3. Configure in \`turbo.json\` if custom pipeline needed

### Transpiling Packages in Next.js

Shared packages are consumed as source (not pre-built) and transpiled by Next.js via the \`transpilePackages\` option in \`next.config.ts\`:

\`\`\`ts
transpilePackages: ["@earthquake/ui", "@earthquake/earthquakes"]
\`\`\`

This avoids the need to build packages during development.

## 📊 Quality Gates

| Gate | Command | Status |
|------|---------|--------|
| **Build** | \`pnpm build\` | ✅ PASS |
| **Lint** | \`pnpm lint\` | ✅ PASS |
| **Tests** | \`pnpm test\` | ✅ PASS |

## 🔮 Future Improvements

- [ ] **Remote Caching**: Set up Vercel or self-hosted remote caching for CI/CD speedup
- [ ] **Package Publishing**: Add build scripts (tsup/tsc) to compile packages to \`dist/\` for publishing
- [ ] **Storybook**: Add Storybook for UI component development and documentation
- [ ] **E2E Tests**: Add Playwright or Cypress for end-to-end testing
- [ ] **Changesets**: Implement changeset-based versioning and release workflow
- [ ] **Docker**: Add Dockerfile for production deployment (using \`turbo prune\`)
- [ ] **CI/CD**: Add GitHub Actions workflow for automated testing and deployment
- [ ] **Pre-commit Hooks**: Add Husky/lint-staged for automated linting before commits

## 📚 Resources

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Biome](https://biomejs.dev/)

## 🤝 Contributing

1. Install dependencies: \`pnpm install\`
2. Create a feature branch: \`git checkout -b feature/your-feature\`
3. Make changes and test: \`pnpm test && pnpm build\`
4. Run linter: \`pnpm lint\`
5. Commit and push changes
6. Open a pull request

## 📄 License

Private project. All rights reserved.
