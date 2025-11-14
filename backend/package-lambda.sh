#!/bin/bash
# Package Lambda functions with dependencies

set -e

echo "Creating Lambda package directory..."
rm -rf lambda-package
mkdir -p lambda-package

echo "Copying compiled code..."
cp -r dist/* lambda-package/

echo "Copying package.json..."
cp package.json lambda-package/
cp package-lock.json lambda-package/ 2>/dev/null || true

echo "Installing production dependencies..."
cd lambda-package
npm install --production --no-optional

cd ..

echo "Lambda package ready in lambda-package/"
