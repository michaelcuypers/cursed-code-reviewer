#!/bin/bash

# Frontend Deployment Script
set -e

if [ -z "$1" ]; then
    echo "Usage: ./deploy-frontend.sh <environment>"
    echo "Environments: dev, staging, prod"
    exit 1
fi

ENVIRONMENT=$1
REGION=${AWS_REGION:-us-east-1}

echo "Deploying frontend for environment: $ENVIRONMENT"

# Read infrastructure outputs
OUTPUTS_FILE="../infrastructure/outputs.json"
if [ ! -f "$OUTPUTS_FILE" ]; then
    echo "Error: outputs.json not found. Deploy infrastructure first."
    exit 1
fi

STACK_NAME="CursedCodeReviewer-${ENVIRONMENT}"
BUCKET_NAME=$(jq -r ".\"${STACK_NAME}\".FrontendBucketName" "$OUTPUTS_FILE")
DISTRIBUTION_ID=$(jq -r ".\"${STACK_NAME}\".CloudFrontDistributionId" "$OUTPUTS_FILE")
API_ENDPOINT=$(jq -r ".\"${STACK_NAME}\".ApiEndpoint" "$OUTPUTS_FILE")
USER_POOL_ID=$(jq -r ".\"${STACK_NAME}\".SoulPoolId" "$OUTPUTS_FILE")
CLIENT_ID=$(jq -r ".\"${STACK_NAME}\".SoulPoolClientId" "$OUTPUTS_FILE")

echo "Bucket: $BUCKET_NAME"
echo "Distribution: $DISTRIBUTION_ID"
echo "API: $API_ENDPOINT"

# Create environment file
ENV_FILE=".env.${ENVIRONMENT}"
cat > "$ENV_FILE" << EOF
VITE_API_ENDPOINT=${API_ENDPOINT}api/v1
VITE_AWS_REGION=${REGION}
VITE_COGNITO_USER_POOL_ID=${USER_POOL_ID}
VITE_COGNITO_CLIENT_ID=${CLIENT_ID}
VITE_ENVIRONMENT=${ENVIRONMENT}
EOF

echo "Building frontend..."
npm run build:${ENVIRONMENT}

echo "Uploading to S3..."
aws s3 sync dist/ s3://${BUCKET_NAME}/ --delete --region ${REGION}

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id ${DISTRIBUTION_ID} \
  --paths "/*" \
  --region ${REGION}

echo "Frontend deployed successfully!"
