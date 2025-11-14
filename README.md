# Cursed Code Reviewer 🎃

An AI-powered code review system that analyzes pull requests and code files with a demonic, Halloween-themed personality.

## Project Structure

```
cursed-code-reviewer/
├── frontend/           # React frontend (Crypt Dashboard)
├── backend/            # Lambda functions
├── infrastructure/     # AWS CDK infrastructure as code
└── package.json        # Root workspace configuration
```

## Prerequisites

- Node.js 20.x or later
- AWS CLI configured with appropriate credentials
- AWS CDK CLI (`npm install -g aws-cdk`)

## Getting Started

### Install Dependencies

```bash
npm run install:all
```

### Development

#### Frontend Development
```bash
cd frontend
npm run dev
```

#### Backend Development
```bash
cd backend
npm run build
npm run watch  # For continuous compilation
```

#### Infrastructure Development
```bash
cd infrastructure
npm run build
npm run synth  # Synthesize CloudFormation template
```

## Deployment

### Deploy to Development
```bash
npm run deploy:dev
```

### Deploy to Staging
```bash
npm run deploy:staging
```

### Deploy to Production
```bash
npm run deploy:prod
```

## Environment Configuration

Environment-specific configuration files are located in:
- `frontend/.env.{environment}`
- `backend/.env.{environment}`

Update these files with the appropriate values after deploying infrastructure.

## Architecture

The application uses:
- **Frontend**: React + Vite + TypeScript + TailwindCSS
- **Backend**: AWS Lambda + TypeScript
- **Infrastructure**: AWS CDK
- **Database**: DynamoDB (TombstoneDB)
- **Storage**: S3 (CodeCrypt Bucket)
- **Auth**: AWS Cognito (SoulPool)
- **AI**: AWS Bedrock (Claude)

## License

Private - All Rights Reserved
