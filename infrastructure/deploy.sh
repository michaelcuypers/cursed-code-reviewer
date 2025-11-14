#!/bin/bash

# Cursed Code Reviewer Deployment Script
# This script deploys the infrastructure and application to AWS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if environment is provided
if [ -z "$1" ]; then
    print_error "Environment not specified. Usage: ./deploy.sh <environment> [options]"
    echo "Environments: dev, staging, prod"
    echo "Options:"
    echo "  --domain <domain>          Custom domain name"
    echo "  --certificate <arn>        ACM certificate ARN"
    echo "  --hosted-zone <id>         Route53 hosted zone ID"
    echo "  --alert-email <email>      Email for CloudWatch alerts"
    exit 1
fi

ENVIRONMENT=$1
shift

# Parse optional arguments
DOMAIN=""
CERTIFICATE=""
HOSTED_ZONE=""
ALERT_EMAIL=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        --certificate)
            CERTIFICATE="$2"
            shift 2
            ;;
        --hosted-zone)
            HOSTED_ZONE="$2"
            shift 2
            ;;
        --alert-email)
            ALERT_EMAIL="$2"
            shift 2
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

print_info "Starting deployment for environment: $ENVIRONMENT"

# Step 1: Build backend
print_info "Building backend Lambda functions..."
cd ../backend
npm install
npm run build
cd ../infrastructure

# Step 2: Build infrastructure
print_info "Building CDK infrastructure..."
npm install
npm run build

# Step 3: Bootstrap CDK (if needed)
print_info "Checking CDK bootstrap..."
cdk bootstrap

# Step 4: Deploy infrastructure
print_info "Deploying infrastructure stack..."
CDK_CONTEXT="-c environment=$ENVIRONMENT"

if [ -n "$DOMAIN" ]; then
    CDK_CONTEXT="$CDK_CONTEXT -c domainName=$DOMAIN"
fi

if [ -n "$CERTIFICATE" ]; then
    CDK_CONTEXT="$CDK_CONTEXT -c certificateArn=$CERTIFICATE"
fi

if [ -n "$HOSTED_ZONE" ]; then
    CDK_CONTEXT="$CDK_CONTEXT -c hostedZoneId=$HOSTED_ZONE"
fi

if [ -n "$ALERT_EMAIL" ]; then
    CDK_CONTEXT="$CDK_CONTEXT -c alertEmail=$ALERT_EMAIL"
fi

cdk deploy $CDK_CONTEXT --require-approval never --outputs-file outputs.json

# Step 5: Extract outputs
print_info "Extracting deployment outputs..."
if [ -f outputs.json ]; then
    API_ENDPOINT=$(jq -r '.["CursedCodeReviewer-'$ENVIRONMENT'"].ApiEndpoint' outputs.json)
    USER_POOL_ID=$(jq -r '.["CursedCodeReviewer-'$ENVIRONMENT'"].SoulPoolId' outputs.json)
    CLIENT_ID=$(jq -r '.["CursedCodeReviewer-'$ENVIRONMENT'"].SoulPoolClientId' outputs.json)
    FRONTEND_BUCKET=$(jq -r '.["CursedCodeReviewer-'$ENVIRONMENT'"].FrontendBucketName' outputs.json)
    CLOUDFRONT_ID=$(jq -r '.["CursedCodeReviewer-'$ENVIRONMENT'"].CloudFrontDistributionId' outputs.json)
    CLOUDFRONT_DOMAIN=$(jq -r '.["CursedCodeReviewer-'$ENVIRONMENT'"].CloudFrontDomainName' outputs.json)

    print_info "API Endpoint: $API_ENDPOINT"
    print_info "User Pool ID: $USER_POOL_ID"
    print_info "Client ID: $CLIENT_ID"
    print_info "Frontend Bucket: $FRONTEND_BUCKET"
    print_info "CloudFront Distribution: $CLOUDFRONT_ID"
    print_info "CloudFront Domain: $CLOUDFRONT_DOMAIN"
else
    print_error "outputs.json not found. Deployment may have failed."
    exit 1
fi

# Step 6: Build and deploy frontend
print_info "Building frontend application..."
cd ../frontend

# Create environment file for build
if [ "$ENVIRONMENT" == "prod" ]; then
    ENV_FILE=".env.production"
else
    ENV_FILE=".env.$ENVIRONMENT"
fi

# Update environment file with deployment outputs
cat > $ENV_FILE << EOF
VITE_API_ENDPOINT=${API_ENDPOINT}api/v1
VITE_AWS_REGION=${AWS_REGION:-us-east-1}
VITE_COGNITO_USER_POOL_ID=${USER_POOL_ID}
VITE_COGNITO_CLIENT_ID=${CLIENT_ID}
VITE_ENVIRONMENT=${ENVIRONMENT}
EOF

print_info "Building frontend with environment: $ENVIRONMENT"
npm install
npm run build

# Step 7: Deploy frontend to S3
print_info "Deploying frontend to S3..."
aws s3 sync dist/ s3://$FRONTEND_BUCKET/ --delete

# Step 8: Invalidate CloudFront cache
print_info "Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/*"

# Step 9: Print deployment summary
print_info "========================================="
print_info "Deployment completed successfully!"
print_info "========================================="
print_info "Environment: $ENVIRONMENT"
if [ -n "$DOMAIN" ]; then
    print_info "Frontend URL: https://$DOMAIN"
    print_info "API URL: https://api.$DOMAIN"
else
    print_info "Frontend URL: https://$CLOUDFRONT_DOMAIN"
    print_info "API URL: $API_ENDPOINT"
fi
print_info "========================================="

print_warning "Don't forget to:"
print_warning "1. Confirm SNS subscription email if alert email was provided"
print_warning "2. Test the application endpoints"
print_warning "3. Monitor CloudWatch logs and metrics"
print_warning "4. Review cost estimates in AWS Cost Explorer"

cd ../infrastructure
