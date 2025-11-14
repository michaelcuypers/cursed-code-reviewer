# CryptKeeper Lambda Functions

## Overview

The CryptKeeper Lambda functions handle authentication, authorization, and user context management for the Cursed Code Reviewer.

## Functions

### 1. CryptKeeper Authorizer (`cryptKeeper.handler`)

**Purpose**: Custom API Gateway authorizer that validates JWT tokens and enriches user context.

**Trigger**: API Gateway authorizer

**Environment Variables**:
- `TOMBSTONE_TABLE_NAME`: DynamoDB table name for user data
- `ENVIRONMENT`: Deployment environment (dev/staging/prod)

**Flow**:
1. Extracts JWT token from Authorization header
2. Decodes token to get user ID (soulId) and email
3. Calls UserService to get or create user record in DynamoDB
4. Returns IAM policy with user context attached

**Context Passed to Downstream Lambdas**:
- `soulId`: User's unique identifier
- `email`: User's email address
- `defaultSeverity`: User's preferred scan severity
- `autoFixEnabled`: Whether auto-fix is enabled
- `userPreferences`: Full preferences object (JSON string)

### 2. Get User Context (`cryptKeeper.getUserContextHandler`)

**Purpose**: Retrieves enriched user context including preferences.

**Endpoint**: `GET /api/v1/user-context`

**Authorization**: Cognito JWT token required

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

### 3. Update Preferences (`cryptKeeper.updatePreferencesHandler`)

**Purpose**: Updates user preferences in DynamoDB.

**Endpoint**: `PUT /api/v1/preferences`

**Authorization**: Cognito JWT token required

**Request Body**:
```json
{
  "preferences": {
    "defaultSeverity": "critical",
    "autoFixEnabled": true,
    "enabledRuleCategories": ["security", "performance"],
    "theme": "darker"
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

## UserService

The `UserService` class handles all DynamoDB operations for user management:

### Methods

- `getOrCreateUser(soulId, email)`: Gets existing user or creates new one with defaults
- `updatePreferences(soulId, preferences)`: Updates user preferences
- `updateLastSeen(soulId)`: Updates last activity timestamp
- `incrementScanCount(soulId)`: Increments total scan counter
- `getPreferences(soulId)`: Retrieves user preferences

### DynamoDB Schema

**Table**: TombstoneDB

**User Record**:
```
PK: "SOUL#${soulId}"
SK: "METADATA"
entityType: "Soul"
soulId: string
email: string
createdAt: ISO 8601 timestamp
lastSeenAt: ISO 8601 timestamp
preferences: {
  defaultSeverity: "minor" | "moderate" | "critical"
  autoFixEnabled: boolean
  enabledRuleCategories: string[]
  theme: "dark" | "darker" | "darkest"
}
```

## Error Handling

All errors are returned with demonic messages:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "demonicMessage": "💀 User-friendly cursed message",
    "technicalDetails": "Technical error details"
  }
}
```

## Deployment

The Lambda functions are deployed via AWS CDK:

```bash
cd infrastructure
npm run build
cdk deploy --context environment=dev
```

## Testing

To test locally, ensure you have:
1. AWS credentials configured
2. DynamoDB table created
3. Environment variables set

```bash
cd backend
npm run build
# Test with SAM Local or invoke directly
```
