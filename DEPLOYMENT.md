# Cursed Code Reviewer - Deployment Summary

## Deployment Details

**Environment**: Development  
**Region**: eu-west-1  
**Account ID**: 493651073710  
**Deployment Date**: November 14, 2024

## Deployed Resources

### API Gateway
- **Endpoint**: https://36juh3g3e7.execute-api.eu-west-1.amazonaws.com/dev/
- **Stage**: dev
- **CORS**: Enabled for all origins

### Cognito User Pool (SoulPool)
- **User Pool ID**: eu-west-1_vacT2US8F
- **Client ID**: 33341t7q2nfnksmuddh3h0siae
- **Sign-in**: Email-based authentication
- **Password Policy**: 8+ characters with lowercase, uppercase, digits, and symbols

### DynamoDB
- **Table Name**: cursed-code-reviewer-dev-tombstone
- **Billing Mode**: Pay-per-request
- **TTL**: Enabled (90-day retention)
- **GSIs**: 
  - soulId-scanTimestamp-index
  - scanId-issueId-index

### S3
- **Bucket Name**: cursed-code-reviewer-dev-code-crypt
- **Encryption**: S3-managed (SSE-S3)
- **Lifecycle**: 90-day automatic deletion

### Lambda Functions

1. **CryptKeeper** (Authentication)
   - ARN: arn:aws:lambda:eu-west-1:493651073710:function:cursed-code-reviewer-dev-crypt-keeper
   - Memory: 512 MB
   - Timeout: 30s

2. **UserContext** (User data retrieval)
   - ARN: arn:aws:lambda:eu-west-1:493651073710:function:cursed-code-reviewer-dev-user-context
   - Memory: 256 MB
   - Timeout: 10s

3. **UpdatePreferences** (User preferences)
   - ARN: arn:aws:lambda:eu-west-1:493651073710:function:cursed-code-reviewer-dev-update-preferences
   - Memory: 256 MB
   - Timeout: 10s

4. **SpectralAnalyzer** (Code scanning)
   - ARN: arn:aws:lambda:eu-west-1:493651073710:function:cursed-code-reviewer-dev-spectral-analyzer
   - Memory: 1024 MB
   - Timeout: 30s

5. **DemonicOracle** (AI feedback generation)
   - ARN: arn:aws:lambda:eu-west-1:493651073710:function:cursed-code-reviewer-dev-demonic-oracle
   - Memory: 1024 MB
   - Timeout: 30s

6. **HauntedPatchForge** (Code fix generation)
   - ARN: arn:aws:lambda:eu-west-1:493651073710:function:cursed-code-reviewer-dev-haunted-patch-forge
   - Memory: 1024 MB
   - Timeout: 30s

7. **HauntedPatchApi** (Patch management)
   - ARN: arn:aws:lambda:eu-west-1:493651073710:function:cursed-code-reviewer-dev-haunted-patch-api
   - Memory: 512 MB
   - Timeout: 30s

## API Endpoints

All endpoints require Cognito authentication via Bearer token.

- `GET /api/v1/user-context` - Get user context and preferences
- `PUT /api/v1/preferences` - Update user preferences
- `POST /api/v1/spectral-scan` - Submit code for scanning
- `GET /api/v1/spectral-scan/{scanId}` - Get scan results
- `GET /api/v1/crypt-history` - Get scan history
- `POST /api/v1/haunted-patch/accept` - Accept and apply a patch

## Frontend Configuration

The frontend environment file has been created at `frontend/.env.development.local`:

```
VITE_API_ENDPOINT=https://36juh3g3e7.execute-api.eu-west-1.amazonaws.com/dev/api/v1
VITE_AWS_REGION=eu-west-1
VITE_COGNITO_USER_POOL_ID=eu-west-1_vacT2US8F
VITE_COGNITO_CLIENT_ID=33341t7q2nfnksmuddh3h0siae
VITE_ENVIRONMENT=development
```

## Running the Frontend Locally

```bash
cd frontend
npm install
npm run dev
```

The frontend will connect to the deployed AWS backend in eu-west-1.

## IAM Permissions

Each Lambda function has its own IAM role with:
- CloudWatch Logs write permissions
- DynamoDB read/write on TombstoneDB table
- S3 read/write on CodeCrypt bucket
- Bedrock InvokeModel permissions
- Lambda InvokeFunction permissions (for inter-Lambda calls)

## Cost Considerations

- DynamoDB: Pay-per-request billing
- Lambda: Pay per invocation and duration
- S3: Pay for storage and requests
- Bedrock: Pay per API call (Claude 3 Sonnet)
- API Gateway: Pay per request

Estimated monthly cost for light usage: $5-20

## Next Steps

1. Test the application by running the frontend locally
2. Create a Cognito user account for testing
3. Submit test code scans
4. Monitor CloudWatch Logs for any errors
5. Review DynamoDB tables for data storage
6. Consider adding CloudWatch alarms for production

## Cleanup

To remove all resources:

```bash
cd infrastructure
export AWS_REGION=eu-west-1
npx cdk destroy -c environment=dev
```

Note: DynamoDB and S3 have retention policies for dev environment and will be automatically deleted.
