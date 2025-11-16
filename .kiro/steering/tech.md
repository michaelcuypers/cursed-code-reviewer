# Technology Stack

## Architecture

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: AWS Lambda + TypeScript (Node.js 20)
- **Infrastructure**: AWS CDK (TypeScript)
- **Database**: DynamoDB (on-demand billing)
- **Storage**: S3
- **Authentication**: AWS Cognito
- **AI**: AWS Bedrock (Claude 3 Sonnet)
- **API**: API Gateway REST API

## Build System

### Workspace Structure

Monorepo with npm workspaces:
- `frontend/` - React application
- `backend/` - Lambda functions
- `infrastructure/` - CDK infrastructure code

### Common Commands

```bash
# Install all dependencies
npm run install:all

# Build all workspaces
npm run build

# Build individual workspaces
npm run build:frontend
npm run build:backend
npm run build:infra

# Development
cd frontend && npm run dev          # Vite dev server on port 3000
cd backend && npm run watch         # TypeScript watch mode

# Testing
cd frontend && npm test             # Vitest (run once)
cd backend && npm test              # Vitest (run once)
cd frontend && npm run test:watch   # Vitest watch mode
cd backend && npm run test:watch    # Vitest watch mode

# Deployment
npm run deploy:dev                  # Deploy to dev environment
npm run deploy:staging              # Deploy to staging
npm run deploy:prod                 # Deploy to production

# Infrastructure
cd infrastructure
npm run synth                       # Generate CloudFormation
npm run diff                        # Show changes
cdk deploy -c environment=dev       # Deploy stack
```

## TypeScript Configuration

### Backend
- Target: ES2022
- Module: CommonJS (for Lambda)
- Strict mode enabled
- Path alias: `@/*` maps to `./src/*`
- Output: `dist/` directory
- Source maps and declarations enabled

### Frontend
- Target: ES2020
- Module: ESNext
- Module resolution: bundler
- JSX: react-jsx
- Strict mode enabled
- Path alias: `@/*` maps to `./src/*`
- No emit (Vite handles bundling)

## Key Libraries

### Frontend
- `aws-amplify` - Cognito authentication
- `@tanstack/react-query` - Data fetching
- `react-router-dom` - Routing
- `@monaco-editor/react` - Code editor
- `three` - 3D graphics
- `matter-js` - Physics engine
- `vitest` + `@testing-library/react` - Testing

### Backend
- `@aws-sdk/client-dynamodb` - DynamoDB operations
- `@aws-sdk/client-s3` - S3 operations
- `@aws-sdk/client-bedrock-runtime` - Bedrock AI
- `@octokit/rest` - GitHub API
- `vitest` - Testing

### Infrastructure
- `aws-cdk-lib` - CDK constructs
- `constructs` - CDK base

## Environment Variables

### Frontend (.env.{environment})
- `VITE_API_ENDPOINT` - API Gateway URL
- `VITE_AWS_REGION` - AWS region
- `VITE_COGNITO_USER_POOL_ID` - Cognito pool ID
- `VITE_COGNITO_CLIENT_ID` - Cognito client ID
- `VITE_ENVIRONMENT` - Environment name

### Backend (set by CDK)
- `TOMBSTONE_TABLE_NAME` - DynamoDB table
- `CODE_CRYPT_BUCKET` - S3 bucket
- `BEDROCK_MODEL_ID` - AI model ID
- `BEDROCK_REGION` - Bedrock region
- `ENVIRONMENT` - Environment name
- `LOG_LEVEL` - Logging level

## Testing

- Test framework: Vitest
- Frontend: `@testing-library/react` for component tests
- Backend: Node environment for Lambda tests
- Test files: `__tests__/*.test.ts(x)` adjacent to source
- Run with `npm test` (single run) or `npm run test:watch` (watch mode)
