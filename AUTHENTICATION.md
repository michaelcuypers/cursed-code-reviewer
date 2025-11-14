# Authentication System - Cursed Code Reviewer 💀

## Overview

The Cursed Code Reviewer uses AWS Cognito (SoulPool) for authentication with custom Lambda functions (CryptKeeper) for user context enrichment and preference management.

## Architecture

```
┌─────────────────┐
│  React Frontend │
│   (SoulVault)   │
└────────┬────────┘
         │ JWT Token
         ▼
┌─────────────────┐
│  API Gateway    │
│ (NightmareGW)   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌──────────────┐
│ Cognito │ │ CryptKeeper  │
│SoulPool │ │   Lambda     │
└─────────┘ └──────┬───────┘
                   │
                   ▼
            ┌──────────────┐
            │  DynamoDB    │
            │ TombstoneDB  │
            └──────────────┘
```

## Components

### 1. Frontend - SoulVault Component

**Location**: `frontend/src/components/SoulVault.tsx`

**Features**:
- 🦇 Sign in with email/password
- 👻 Sign up with email verification
- 📧 Email verification flow
- 🔮 Password reset
- 🔑 Password reset confirmation
- 💀 Halloween-themed UI with demonic error messages

**Usage**:
```tsx
import { SoulVault } from '@/components/SoulVault';

<SoulVault onAuthenticated={() => console.log('User authenticated!')} />
```

### 2. Authentication Hook - useAuth

**Location**: `frontend/src/hooks/useAuth.ts`

**Features**:
- Automatic session management
- Token refresh before expiration
- Demonic error message translation
- User context enrichment

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
    signOut 
  } = useAuth();

  // Use authentication state
}
```

### 3. Backend - CryptKeeper Lambda

**Location**: `backend/src/lambdas/cryptKeeper.ts`

**Functions**:
1. **Authorizer** (`handler`): Validates tokens and enriches context
2. **Get User Context** (`getUserContextHandler`): Returns user data and preferences
3. **Update Preferences** (`updatePreferencesHandler`): Updates user preferences

### 4. User Service

**Location**: `backend/src/services/userService.ts`

**Responsibilities**:
- Create/retrieve user records in DynamoDB
- Manage user preferences
- Track user activity (last seen, scan count)

## Setup Instructions

### 1. Deploy Infrastructure

```bash
cd infrastructure
npm install
npm run build

# Deploy to dev environment
cdk deploy --context environment=dev

# Note the outputs:
# - SoulPoolId
# - SoulPoolClientId
# - ApiEndpoint
```

### 2. Configure Frontend

Create `frontend/.env.development`:

```env
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_COGNITO_IDENTITY_POOL_ID=us-east-1:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
VITE_API_GATEWAY_URL=https://xxxxxx.execute-api.us-east-1.amazonaws.com/api/v1
```

Use the values from CDK outputs.

### 3. Build and Deploy Backend

```bash
cd backend
npm install
npm run build

# Lambda code is deployed via CDK
cd ../infrastructure
cdk deploy --context environment=dev
```

### 4. Run Frontend Locally

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to see the SoulVault authentication interface.

## Authentication Flow

### Sign Up Flow

1. User enters email and password in SoulVault
2. Frontend calls `signUp()` from useAuth hook
3. AWS Amplify sends request to Cognito
4. Cognito sends verification code to email
5. User enters code in verification form
6. Frontend calls `confirmSignUp()`
7. Account is activated

### Sign In Flow

1. User enters credentials in SoulVault
2. Frontend calls `signIn()` from useAuth hook
3. AWS Amplify authenticates with Cognito
4. Cognito returns JWT tokens (access, id, refresh)
5. useAuth stores tokens and sets up auto-refresh
6. API calls include token in Authorization header
7. API Gateway validates token with Cognito
8. CryptKeeper enriches user context
9. User data stored/updated in DynamoDB

### Token Refresh Flow

1. useAuth monitors token expiration
2. 5 minutes before expiry, triggers refresh
3. Calls `fetchAuthSession({ forceRefresh: true })`
4. Cognito returns new tokens
5. useAuth updates stored tokens

### Password Reset Flow

1. User clicks "Forgot password" in SoulVault
2. Frontend calls `resetPassword(email)`
3. Cognito sends reset code to email
4. User enters code and new password
5. Frontend calls `confirmResetPassword()`
6. Password is updated

## API Endpoints

### GET /api/v1/user-context

**Authorization**: Bearer token required

**Response**:
```json
{
  "user": {
    "soulId": "uuid",
    "email": "user@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastSeenAt": "2024-01-01T00:00:00.000Z"
  },
  "preferences": {
    "defaultSeverity": "moderate",
    "autoFixEnabled": false,
    "enabledRuleCategories": ["all"],
    "theme": "dark"
  }
}
```

### PUT /api/v1/preferences

**Authorization**: Bearer token required

**Request**:
```json
{
  "preferences": {
    "defaultSeverity": "critical",
    "autoFixEnabled": true
  }
}
```

**Response**:
```json
{
  "message": "✅ Your cursed preferences have been updated!",
  "preferences": { ... }
}
```

## Security Features

### Password Policy

- Minimum 8 characters
- Requires uppercase letter
- Requires lowercase letter
- Requires number
- Requires special character

### Token Security

- JWT tokens signed by Cognito
- Access tokens expire after 1 hour
- Refresh tokens expire after 30 days
- Automatic token refresh 5 minutes before expiry
- Tokens transmitted over HTTPS only

### API Security

- All API endpoints require valid JWT token
- Cognito validates token signature
- CryptKeeper enriches user context
- User can only access their own data

## Error Messages

All errors are translated to demonic messages:

| Technical Error | Demonic Message |
|----------------|-----------------|
| User does not exist | 🦇 Your soul is not bound to our crypt. Sign up to join the darkness! |
| Incorrect password | 💀 The spirits reject your credentials. Try again, mortal! |
| User not confirmed | 👻 Your soul awaits verification. Check your cursed inbox! |
| Invalid verification code | 🕷️ The runes you provided are incorrect. Try again! |
| Weak password | ⚰️ Your password is too weak for the underworld. Make it stronger! |
| User already exists | 🧛 This soul is already claimed by the darkness! |
| Too many attempts | 🔥 Too many failed attempts! The gates are temporarily sealed. |

## Testing

### Manual Testing

1. **Sign Up**:
   - Go to SoulVault
   - Click "New soul? Join the darkness"
   - Enter email and password
   - Check email for verification code
   - Enter code to verify

2. **Sign In**:
   - Enter verified credentials
   - Should see success message

3. **Password Reset**:
   - Click "Forgot your cursed password?"
   - Enter email
   - Check email for reset code
   - Enter code and new password

### Automated Testing

```bash
# Frontend tests
cd frontend
npm test

# Backend tests
cd backend
npm test
```

## Troubleshooting

### "User does not exist" after sign up

- Check if email verification was completed
- Verify Cognito user pool has the user
- Check CloudWatch logs for errors

### Token refresh fails

- Check if refresh token is still valid (30 days)
- Verify Cognito configuration
- Check network connectivity

### API returns 401 Unauthorized

- Verify token is included in Authorization header
- Check token hasn't expired
- Verify Cognito authorizer is configured correctly

### CryptKeeper errors

- Check DynamoDB table exists and has correct permissions
- Verify Lambda has IAM permissions for DynamoDB
- Check CloudWatch logs for detailed errors

## Monitoring

### CloudWatch Metrics

- **Cognito**: Sign-in success/failure rates
- **Lambda**: CryptKeeper invocation count, errors, duration
- **DynamoDB**: Read/write capacity, throttling

### CloudWatch Logs

- **Frontend**: Browser console logs
- **Lambda**: `/aws/lambda/cursed-code-reviewer-{env}-crypt-keeper`
- **API Gateway**: Request/response logs

## Next Steps

After authentication is working:

1. ✅ Implement SpectralAnalyzer Lambda for code scanning
2. ✅ Build DemonicOracle Lambda for AI feedback
3. ✅ Create HauntedPatchForge Lambda for code fixes
4. ✅ Build remaining frontend components

## References

- [AWS Amplify Auth Documentation](https://docs.amplify.aws/lib/auth/getting-started/q/platform/js/)
- [AWS Cognito User Pools](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)
- [API Gateway Authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html)
