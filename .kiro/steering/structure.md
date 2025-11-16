# Project Structure

## Directory Organization

```
cursed-code-reviewer/
├── frontend/              # React application
│   ├── src/
│   │   ├── components/   # React components
│   │   │   ├── ui/       # Reusable UI components (Button, Card, etc.)
│   │   │   └── __tests__/ # Component tests
│   │   ├── hooks/        # Custom React hooks
│   │   ├── pages/        # Page components (Dashboard, Scanner, History)
│   │   ├── lib/          # Utilities (api-client)
│   │   ├── config/       # Configuration (amplify)
│   │   ├── types/        # TypeScript type definitions
│   │   └── test/         # Test setup and utilities
│   ├── public/           # Static assets
│   └── dist/             # Build output (gitignored)
│
├── backend/              # Lambda functions
│   ├── src/
│   │   ├── lambdas/      # Lambda handler functions
│   │   │   └── __tests__/ # Lambda tests
│   │   ├── services/     # Business logic services
│   │   └── types/        # TypeScript type definitions
│   ├── dist/             # Compiled JavaScript (gitignored)
│   └── lambda-package/   # Packaged Lambda deployment artifacts
│
└── infrastructure/       # AWS CDK code
    ├── lib/              # CDK stack definitions
    ├── bin/              # CDK app entry point
    ├── cdk.out/          # CDK synthesis output (gitignored)
    └── dist/             # Compiled JavaScript (gitignored)
```

## Code Organization Patterns

### Frontend Components

- **Main Components**: `src/components/*.tsx` - Feature components
- **UI Components**: `src/components/ui/*.tsx` - Reusable primitives
- **Pages**: `src/pages/*.tsx` - Route-level components
- **Tests**: Adjacent `__tests__/` directories with `.test.tsx` files

Key components:
- `HauntedApp.tsx` - Main app wrapper with routing
- `SoulVault.tsx` - Authentication UI
- `SpectralScanner.tsx` - Code scanning interface
- `CryptHistory.tsx` - Scan history display
- `PatchGraveyard.tsx` - Patch management
- `ScanDetailModal.tsx` - Scan result details

### Backend Lambda Functions

Located in `backend/src/lambdas/`:
- `cryptKeeper.ts` - Authentication and user management
- `spectralAnalyzer.ts` - Code scanning
- `demonicOracle.ts` - AI feedback generation (Bedrock)
- `hauntedPatchForge.ts` - Code fix generation
- `hauntedPatchApi.ts` - Patch acceptance and management

Each Lambda has:
- Main handler function exported
- Adjacent test file in `__tests__/`
- Documentation in `.md` files where applicable

### Backend Services

Located in `backend/src/services/`:
- `userService.ts` - User CRUD operations
- `scanService.ts` - Scan result management
- `codeAnalysisService.ts` - Code analysis logic
- `githubService.ts` - GitHub API integration
- `s3Service.ts` - S3 operations

Services encapsulate business logic and AWS SDK calls.

### Type Definitions

- **Frontend**: `frontend/src/types/` - App and auth types
- **Backend**: `backend/src/types/` - Auth and spectral types
- Shared types should be duplicated (no shared package)

### Infrastructure

- `lib/cursed-code-reviewer-stack.ts` - Main CDK stack
- `bin/app.ts` - CDK app entry point
- `cdk.json` - CDK configuration

## Naming Conventions

### Files
- Components: PascalCase (e.g., `SoulVault.tsx`)
- Services: camelCase (e.g., `userService.ts`)
- Types: camelCase (e.g., `auth.ts`)
- Tests: Match source file with `.test.ts(x)` suffix

### Code
- Components: PascalCase
- Functions/variables: camelCase
- Constants: UPPER_SNAKE_CASE
- Types/Interfaces: PascalCase
- Lambda handlers: camelCase with `Handler` suffix

### AWS Resources (Halloween Theme)
- Use demonic/spooky names consistently
- Examples: SoulPool, TombstoneDB, CodeCrypt, NightmareGateway
- Lambda names: kebab-case with environment prefix

## Import Patterns

Use path alias `@/` for imports:
```typescript
// Frontend
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';

// Backend
import { UserService } from '@/services/userService';
import { SpectralIssue } from '@/types/spectral';
```

## Environment-Specific Files

- `.env.development` - Development configuration
- `.env.staging` - Staging configuration
- `.env.production` - Production configuration
- `.env.development.local` - Local overrides (gitignored)

## Build Artifacts

All build outputs are gitignored:
- `frontend/dist/` - Vite build output
- `backend/dist/` - TypeScript compilation
- `backend/lambda-package/` - Lambda deployment packages
- `infrastructure/dist/` - CDK compilation
- `infrastructure/cdk.out/` - CloudFormation templates
- `node_modules/` - Dependencies
