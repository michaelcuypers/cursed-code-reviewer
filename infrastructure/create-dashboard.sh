#!/bin/bash

# Script to create CloudWatch Dashboard for monitoring

set -e

if [ -z "$1" ]; then
    echo "Usage: ./create-dashboard.sh <environment>"
    exit 1
fi

ENVIRONMENT=$1
REGION=${AWS_REGION:-us-east-1}
DASHBOARD_NAME="CursedCodeReviewer-${ENVIRONMENT}"

echo "Creating CloudWatch Dashboard: $DASHBOARD_NAME"

# Read outputs from deployment
if [ ! -f outputs.json ]; then
    echo "Error: outputs.json not found. Run deployment first."
    exit 1
fi

STACK_NAME="CursedCodeReviewer-${ENVIRONMENT}"

# Create dashboard JSON
cat > dashboard.json << 'EOF'
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/Lambda", "Invocations", { "stat": "Sum" } ],
          [ ".", "Errors", { "stat": "Sum" } ],
          [ ".", "Throttles", { "stat": "Sum" } ]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "REGION_PLACEHOLDER",
        "title": "Lambda Overview",
        "period": 300
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/Lambda", "Duration", { "stat": "Average" } ],
          [ "...", { "stat": "p99" } ]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "REGION_PLACEHOLDER",
        "title": "Lambda Duration",
        "period": 300,
        "yAxis": {
          "left": {
            "label": "Milliseconds"
          }
        }
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/ApiGateway", "Count", { "stat": "Sum" } ],
          [ ".", "4XXError", { "stat": "Sum" } ],
          [ ".", "5XXError", { "stat": "Sum" } ]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "REGION_PLACEHOLDER",
        "title": "API Gateway Requests",
        "period": 300
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/ApiGateway", "Latency", { "stat": "Average" } ],
          [ "...", { "stat": "p99" } ]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "REGION_PLACEHOLDER",
        "title": "API Gateway Latency",
        "period": 300,
        "yAxis": {
          "left": {
            "label": "Milliseconds"
          }
        }
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/DynamoDB", "ConsumedReadCapacityUnits", { "stat": "Sum" } ],
          [ ".", "ConsumedWriteCapacityUnits", { "stat": "Sum" } ]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "REGION_PLACEHOLDER",
        "title": "DynamoDB Capacity",
        "period": 300
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/DynamoDB", "UserErrors", { "stat": "Sum" } ],
          [ ".", "SystemErrors", { "stat": "Sum" } ]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "REGION_PLACEHOLDER",
        "title": "DynamoDB Errors",
        "period": 300
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/S3", "NumberOfObjects", { "stat": "Average" } ],
          [ ".", "BucketSizeBytes", { "stat": "Average" } ]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "REGION_PLACEHOLDER",
        "title": "S3 Storage",
        "period": 86400
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "CursedCodeReviewer", "BedrockInvocations", { "stat": "Sum" } ]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "REGION_PLACEHOLDER",
        "title": "Bedrock Invocations",
        "period": 3600
      }
    },
    {
      "type": "log",
      "properties": {
        "query": "SOURCE '/aws/lambda/cursed-code-reviewer-ENVIRONMENT_PLACEHOLDER-spectral-analyzer'\n| fields @timestamp, @message\n| filter @message like /ERROR/\n| sort @timestamp desc\n| limit 20",
        "region": "REGION_PLACEHOLDER",
        "title": "Recent Lambda Errors",
        "stacked": false
      }
    }
  ]
}
EOF

# Replace placeholders
sed -i.bak "s/REGION_PLACEHOLDER/$REGION/g" dashboard.json
sed -i.bak "s/ENVIRONMENT_PLACEHOLDER/$ENVIRONMENT/g" dashboard.json
rm dashboard.json.bak

# Create the dashboard
aws cloudwatch put-dashboard \
    --dashboard-name "$DASHBOARD_NAME" \
    --dashboard-body file://dashboard.json \
    --region "$REGION"

echo "Dashboard created successfully: $DASHBOARD_NAME"
echo "View it at: https://console.aws.amazon.com/cloudwatch/home?region=$REGION#dashboards:name=$DASHBOARD_NAME"

# Clean up
rm dashboard.json
