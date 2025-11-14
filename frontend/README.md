# Cursed Code Reviewer - Frontend 💀

## Overview

React-based frontend for the Cursed Code Reviewer with Halloween-themed authentication and code review interface.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **AWS Amplify** for Cognito authentication
- **TailwindCSS** for styling (to be configured)
- **React Query** for API state management
- **Monaco Editor** for code display

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── SoulVault.tsx          # Authentication component
│   │   └── SoulVault.css          # Halloween-themed styles
│   ├── hooks/
│   │   └── useAuth.ts             # Authentication hook
│   ├── types/
│   │   └── auth.ts                # TypeScript types
│   ├── config/
│   │   └── amplify.ts             # AWS Amplify configuration
│   ├── main.tsx                   # App entry point
│   └── index.css                  # Global styles
├── public/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.example                   # Environment variables template
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.development`:

```bash
cp .env.example .env.development
```

Edit `.env.development` with your AWS Cognito values:

```env
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_COGNITO_IDENTITY_POOL_ID=us-east-1:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
VITE_API_GATEWAY_URL=https://api.cursed-code-reviewer.com/api/v1
```

### 3. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## Components

### SoulVault

Authentication component with Halloween theme.

**Features**:
- Sign in / Sign up forms
- Email verification
- Password reset
- Demonic error messages
- Animated Halloween UI

**Usage**:
```tsx
import { SoulVault } from '@/components/SoulVault';

<SoulVault onAuthenticated={() => console.log('Authenticated!')} />
```

## Hooks

### useAuth

Custom hook for authentication management.

**Features**:
- Session management
- Automatic token refresh
- User context
- Demonic error translation

**Usage**:
```tsx
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { 
    isAuthenticated, 
    user, 
    token, 
    loading, 
    error,
    signIn,
    signUp,
    signOut 
  } = useAuth();
}
```

## Styling

### Halloween Theme

Color palette defined in `src/index.css`:

```css
--cursed-black: #0a0a0a
--graveyard-gray: #1a1a1a
--phantom-purple: #6b21a8
--blood-red: #dc2626
--toxic-green: #10b981
--ghostly-white: #f3f4f6
--shadow-purple: #4c1d95
--haunted-orange: #ea580c
```

### Fonts

- **Headers**: Creepster, Nosifer (Google Fonts)
- **Body**: Inter
- **Code**: Roboto Mono

## Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_COGNITO_USER_POOL_ID` | Cognito User Pool ID | `us-east-1_XXXXXXXXX` |
| `VITE_COGNITO_CLIENT_ID` | Cognito App Client ID | `XXXXXXXXXXXXXXXXXXXXXXXXXX` |
| `VITE_COGNITO_IDENTITY_POOL_ID` | Cognito Identity Pool ID | `us-east-1:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX` |
| `VITE_API_GATEWAY_URL` | API Gateway base URL | `https://api.example.com/api/v1` |

## Next Steps

- [ ] Configure TailwindCSS
- [ ] Build SpectralScanner component
- [ ] Build CursedFeedback component
- [ ] Build PatchGraveyard component
- [ ] Build CryptHistory component
- [ ] Integrate with backend API

## Testing

```bash
# Run tests (to be implemented)
npm test
```

## Deployment

```bash
# Build production bundle
npm run build

# Deploy to S3/CloudFront (via CDK)
cd ../infrastructure
cdk deploy
```

## Troubleshooting

### Amplify Configuration Errors

- Verify environment variables are set correctly
- Check Cognito User Pool and Client IDs
- Ensure User Pool has email sign-in enabled

### CORS Errors

- Verify API Gateway has CORS configured
- Check allowed origins include your frontend URL

### Token Errors

- Check token hasn't expired
- Verify Cognito configuration
- Clear browser storage and re-authenticate

## References

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [AWS Amplify Auth](https://docs.amplify.aws/lib/auth/getting-started/q/platform/js/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
