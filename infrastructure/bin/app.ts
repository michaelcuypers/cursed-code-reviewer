#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CursedCodeReviewerStack } from '../lib/cursed-code-reviewer-stack';

const app = new cdk.App();

const environment = app.node.tryGetContext('environment') || 'dev';
const stackName = `CursedCodeReviewer-${environment}`;

new CursedCodeReviewerStack(app, stackName, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'eu-west-1',
  },
  environment,
  stackName,
});
