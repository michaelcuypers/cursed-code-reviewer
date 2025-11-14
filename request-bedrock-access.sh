#!/bin/bash
# Request access to Bedrock models

echo "🦇 Requesting access to Claude 3 Sonnet in Bedrock..."
echo ""
echo "You need to manually enable model access in the AWS Console:"
echo ""
echo "1. Go to: https://eu-west-1.console.aws.amazon.com/bedrock/home?region=eu-west-1#/modelaccess"
echo "2. Click 'Manage model access' or 'Edit'"
echo "3. Check the box for 'Claude 3 Sonnet'"
echo "4. Click 'Save changes'"
echo "5. Wait for approval (usually instant)"
echo ""
echo "Or run this command to check current access:"
echo "aws bedrock list-foundation-models --region eu-west-1 --by-provider anthropic"
echo ""
echo "After enabling, wait 1-2 minutes and try scanning again!"
