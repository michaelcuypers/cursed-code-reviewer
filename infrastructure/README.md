# Cursed Code Reviewer Infrastructure

This directory contains the AWS CDK infrastructure code for the Cursed Code Reviewer application.

## Prerequisites

- Node.js 20.x or later
- AWS CLI configured with appropriate credentials
- AWS CDK CLI installed (`npm install -g aws-cdk`)
- jq (for parsing JSON outputs in deployment script)

## Setup

```bash
npm install
npm run build
```

## Quick Deployment

Use the deployment script for automated deployment:

```bash
# Development environment
./deploy.sh dev --alert-email your-email@example.com

# Staging environment
./deploy.sh staging --alert-email your-email@example.com

# Production with custom domain
./deploy.sh prod \
  --domain cursedcodereview.com \
  --certificate arn:aws:acm:us-east-1:123456789012:certificate/abc123 \
  --hosted-zone Z1234567890ABC \
  --alert-email your-email@example.com
```

The deployment script will:
1. Build backend Lambda functions
2. Deploy CDK infrastructure
3. Build frontend application
4. Deploy frontend to S3
5. Invalidate CloudFront cache
6. Output deployment URLs and configuration

## Manual Deployment

### Step 1: Bootstrap CDK (first time only)

```bash
cdk bootstrap
```

### Step 2: Build Backend

```bash
cd ../backend
npm install
npm run build
cd ../infrastructure
```

### Step 3: Deploy Infrastructure

Development:
```bash
cdk deploy -c environment=dev
```

Production with custom domain:
```bash
cdk deploy \
  -c environment=prod \
  -c domainName=cursedcodereview.com \
  -c certificateArn=arn:aws:acm:us-east-1:123456789012:certificate/abc123 \
  -c hostedZoneId=Z1234567890ABC \
  -c alertEmail=alerts@example.com
```

### Step 4: Deploy Frontend

```bash
cd ../frontend
npm install
npm run build

# Upload to S3 (replace with your bucket name from outputs)
aws s3 sync dist/ s3://cursed-code-reviewer-prod-frontend/ --delete

# Invalidate CloudFront cache (replace with your distribution ID)
aws cloudfront create-invalidation --distribution-id E1234567890ABC --paths "/*"
```

## Infrastructure Components

### Core Services

- **DynamoDB**: TombstoneDB table with GSIs for scan results and user data
- **S3**: 
  - CodeCrypt bucket for storing large code submissions
  - Frontend bucket for static website hosting
- **Cognito**: SoulPool user pool for authentication
- **API Gateway**: NightmareGateway REST API with Cognito authorizer
- **CloudFront**: CDN for frontend distribution

### Lambda Functions

- **SpectralAnalyzer**: Code scanning and analysis
- **DemonicOracle**: AI-powered feedback generation using Bedrock
- **HauntedPatchForge**: Code fix generation
- **HauntedPatchApi**: Patch acceptance and management
- **CryptKeeper**: Authentication and user management

### Monitoring & Alerts

- **CloudWatch Logs**: Automatic log retention (1 week)
- **CloudWatch Alarms**: 
  - Lambda errors, throttles, and high latency
  - API Gateway 4xx/5xx errors
  - DynamoDB throttles
  - Bedrock usage monitoring
  - Cost alerts
- **SNS Topic**: Email notifications for alarms

## CloudWatch Dashboard

Create a monitoring dashboard:

```bash
./create-dashboard.sh prod
```

This creates a comprehensive dashboard with:
- Lambda invocations, errors, and duration
- API Gateway requests and latency
- DynamoDB capacity and errors
- S3 storage metrics
- Bedrock invocation counts
- Recent error logs

## Environment Variables

The stack automatically configures Lambda environment variables:

- `TOMBSTONE_TABLE_NAME`: DynamoDB table name
- `CODE_CRYPT_BUCKET`: S3 bucket for code storage
- `BEDROCK_MODEL_ID`: Bedrock model identifier
- `BEDROCK_REGION`: AWS region for Bedrock
- `ENVIRONMENT`: Deployment environment (dev/staging/prod)
- `LOG_LEVEL`: Logging level (debug for dev, warn for prod)

## Custom Domain Setup

To use a custom domain:

1. **Create ACM Certificate** (in us-east-1 for CloudFront):
   ```bash
   aws acm request-certificate \
     --domain-name cursedcodereview.com \
     --subject-alternative-names "*.cursedcodereview.com" \
     --validation-method DNS \
     --region us-east-1
   ```

2. **Validate Certificate**: Add DNS records as instructed by ACM

3. **Get Hosted Zone ID**:
   ```bash
   aws route53 list-hosted-zones-by-name --dns-name cursedcodereview.com
   ```

4. **Deploy with Domain**:
   ```bash
   ./deploy.sh prod \
     --domain cursedcodereview.com \
     --certificate <certificate-arn> \
     --hosted-zone <hosted-zone-id> \
     --alert-email alerts@example.com
   ```

## Monitoring

### View Logs

```bash
# SpectralAnalyzer logs
aws logs tail /aws/lambda/cursed-code-reviewer-prod-spectral-analyzer --follow

# API Gateway logs
aws logs tail /aws/apigateway/cursed-code-reviewer-prod-api --follow
```

### View Metrics

```bash
# Lambda invocations
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=cursed-code-reviewer-prod-spectral-analyzer \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

### Cost Monitoring

View estimated costs:
```bash
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

## Useful Commands

- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch for changes and compile
- `cdk deploy` - Deploy this stack to your default AWS account/region
- `cdk diff` - Compare deployed stack with current state
- `cdk synth` - Emit the synthesized CloudFormation template
- `cdk destroy` - Remove the stack from AWS
- `./deploy.sh <env>` - Automated full deployment
- `./create-dashboard.sh <env>` - Create CloudWatch dashboard

## Troubleshooting

### Deployment Fails

1. Check AWS credentials: `aws sts get-caller-identity`
2. Verify CDK bootstrap: `cdk bootstrap`
3. Check CloudFormation events in AWS Console

### Lambda Errors

1. Check CloudWatch Logs
2. Verify environment variables
3. Check IAM permissions
4. Review Bedrock model availability in region

### Frontend Not Loading

1. Verify S3 bucket policy allows public read
2. Check CloudFront distribution status
3. Verify DNS records if using custom domain
4. Check browser console for CORS errors

## Security Considerations

- All S3 buckets use encryption at rest
- API Gateway requires Cognito authentication
- Lambda functions use least-privilege IAM roles
- CloudFront enforces HTTPS
- Secrets should be stored in AWS Secrets Manager (not in code)

## Cost Optimization

- DynamoDB uses on-demand billing
- S3 lifecycle policies delete old scans after 90 days
- CloudFront uses PriceClass 100 (North America & Europe)
- Lambda functions have appropriate memory/timeout settings
- CloudWatch logs retained for 1 week only

## Cleanup

To remove all resources:

```bash
# Delete frontend files from S3
aws s3 rm s3://cursed-code-reviewer-prod-frontend/ --recursive

# Destroy stack
cdk destroy -c environment=prod
```

Note: Resources with `RETAIN` policy (prod DynamoDB, S3) must be deleted manually.
