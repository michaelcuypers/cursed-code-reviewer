import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as path from 'path';

interface CursedCodeReviewerStackProps extends cdk.StackProps {
  environment: string;
  domainName?: string;
  certificateArn?: string;
  hostedZoneId?: string;
  alertEmail?: string;
}

export class CursedCodeReviewerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CursedCodeReviewerStackProps) {
    super(scope, id, props);

    const { environment, domainName, certificateArn, hostedZoneId, alertEmail } = props;

    // DynamoDB TombstoneDB Table
    const tombstoneTable = new dynamodb.Table(this, 'TombstoneDB', {
      tableName: `cursed-code-reviewer-${environment}-tombstone`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // GSI1: soulId-scanTimestamp-index
    tombstoneTable.addGlobalSecondaryIndex({
      indexName: 'soulId-scanTimestamp-index',
      partitionKey: { name: 'soulId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'scanTimestamp', type: dynamodb.AttributeType.STRING },
    });

    // GSI2: scanId-issueId-index
    tombstoneTable.addGlobalSecondaryIndex({
      indexName: 'scanId-issueId-index',
      partitionKey: { name: 'scanId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'issueId', type: dynamodb.AttributeType.STRING },
    });

    // S3 CodeCrypt Bucket
    const codeCryptBucket = new s3.Bucket(this, 'CodeCryptBucket', {
      bucketName: `cursed-code-reviewer-${environment}-code-crypt`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      lifecycleRules: [
        {
          id: 'DeleteOldScans',
          expiration: cdk.Duration.days(90),
          enabled: true,
        },
      ],
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'prod',
    });

    // S3 Frontend Bucket
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `cursed-code-reviewer-${environment}-frontend`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'prod',
    });

    // CloudFront Origin Access Identity
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'FrontendOAI', {
      comment: `OAI for ${environment} frontend`,
    });

    frontendBucket.grantRead(originAccessIdentity);

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(frontendBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      enabled: true,
      comment: `Cursed Code Reviewer ${environment} Frontend`,
    });

    // Cognito SoulPool User Pool
    const soulPool = new cognito.UserPool(this, 'SoulPool', {
      userPoolName: `cursed-code-reviewer-${environment}-soul-pool`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      customAttributes: {
        curseLevel: new cognito.NumberAttribute({ min: 0, max: 100 }),
        totalScans: new cognito.NumberAttribute({ min: 0 }),
      },
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    const soulPoolClient = soulPool.addClient('SoulPoolClient', {
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
      },
    });

    // Lambda code path - resolve from project root (use lambda-package with dependencies)
    const lambdaCodePath = path.resolve(__dirname, '../../../backend/lambda-package');

    // Helper function to create Lambda role with common permissions
    const createLambdaRole = (name: string) => {
      const role = new iam.Role(this, `${name}Role`, {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        ],
      });
      
      tombstoneTable.grantReadWriteData(role);
      codeCryptBucket.grantReadWrite(role);
      
      role.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['bedrock:InvokeModel', 'lambda:InvokeFunction'],
          resources: ['*'],
        })
      );
      
      return role;
    };

    // CryptKeeper Lambda Function
    const cryptKeeperLambda = new lambda.Function(this, 'CryptKeeperLambda', {
      functionName: `cursed-code-reviewer-${environment}-crypt-keeper`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambdas/cryptKeeper.handler',
      code: lambda.Code.fromAsset(lambdaCodePath),
      role: createLambdaRole('CryptKeeper'),
      environment: {
        TOMBSTONE_TABLE_NAME: tombstoneTable.tableName,
        ENVIRONMENT: environment,
        LOG_LEVEL: environment === 'prod' ? 'warn' : 'debug',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    // CryptKeeper User Context Handler
    const userContextLambda = new lambda.Function(this, 'UserContextLambda', {
      functionName: `cursed-code-reviewer-${environment}-user-context`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambdas/cryptKeeper.getUserContextHandler',
      code: lambda.Code.fromAsset(lambdaCodePath),
      role: createLambdaRole('UserContext'),
      environment: {
        TOMBSTONE_TABLE_NAME: tombstoneTable.tableName,
        ENVIRONMENT: environment,
        LOG_LEVEL: environment === 'prod' ? 'warn' : 'debug',
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
    });

    // CryptKeeper Preferences Update Handler
    const updatePreferencesLambda = new lambda.Function(this, 'UpdatePreferencesLambda', {
      functionName: `cursed-code-reviewer-${environment}-update-preferences`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambdas/cryptKeeper.updatePreferencesHandler',
      code: lambda.Code.fromAsset(lambdaCodePath),
      role: createLambdaRole('UpdatePreferences'),
      environment: {
        TOMBSTONE_TABLE_NAME: tombstoneTable.tableName,
        ENVIRONMENT: environment,
        LOG_LEVEL: environment === 'prod' ? 'warn' : 'debug',
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
    });

    // SpectralAnalyzer Lambda Function
    const spectralAnalyzerLambda = new lambda.Function(this, 'SpectralAnalyzerLambda', {
      functionName: `cursed-code-reviewer-${environment}-spectral-analyzer`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambdas/spectralAnalyzer.handler',
      code: lambda.Code.fromAsset(lambdaCodePath),
      role: createLambdaRole('SpectralAnalyzer'),
      environment: {
        TOMBSTONE_TABLE_NAME: tombstoneTable.tableName,
        CODE_CRYPT_BUCKET: codeCryptBucket.bucketName,
        BEDROCK_MODEL_ID: 'arn:aws:bedrock:eu-west-1:493651073710:inference-profile/eu.anthropic.claude-3-7-sonnet-20250219-v1:0',
        BEDROCK_REGION: this.region,
        ENVIRONMENT: environment,
        LOG_LEVEL: environment === 'prod' ? 'warn' : 'debug',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
    });

    // DemonicOracle Lambda Function
    const demonicOracleLambda = new lambda.Function(this, 'DemonicOracleLambda', {
      functionName: `cursed-code-reviewer-${environment}-demonic-oracle`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambdas/demonicOracle.handler',
      code: lambda.Code.fromAsset(lambdaCodePath),
      role: createLambdaRole('DemonicOracle'),
      environment: {
        TOMBSTONE_TABLE_NAME: tombstoneTable.tableName,
        BEDROCK_MODEL_ID: 'arn:aws:bedrock:eu-west-1:493651073710:inference-profile/eu.anthropic.claude-3-7-sonnet-20250219-v1:0',
        BEDROCK_REGION: this.region,
        ENVIRONMENT: environment,
        LOG_LEVEL: environment === 'prod' ? 'warn' : 'debug',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
    });

    // HauntedPatchForge Lambda Function
    const hauntedPatchForgeLambda = new lambda.Function(this, 'HauntedPatchForgeLambda', {
      functionName: `cursed-code-reviewer-${environment}-haunted-patch-forge`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambdas/hauntedPatchForge.handler',
      code: lambda.Code.fromAsset(lambdaCodePath),
      role: createLambdaRole('HauntedPatchForge'),
      environment: {
        TOMBSTONE_TABLE_NAME: tombstoneTable.tableName,
        BEDROCK_MODEL_ID: 'arn:aws:bedrock:eu-west-1:493651073710:inference-profile/eu.anthropic.claude-3-7-sonnet-20250219-v1:0',
        BEDROCK_REGION: this.region,
        ENVIRONMENT: environment,
        LOG_LEVEL: environment === 'prod' ? 'warn' : 'debug',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
    });

    // HauntedPatchApi Lambda Function
    const hauntedPatchApiLambda = new lambda.Function(this, 'HauntedPatchApiLambda', {
      functionName: `cursed-code-reviewer-${environment}-haunted-patch-api`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambdas/hauntedPatchApi.handler',
      code: lambda.Code.fromAsset(lambdaCodePath),
      role: createLambdaRole('HauntedPatchApi'),
      environment: {
        TOMBSTONE_TABLE_NAME: tombstoneTable.tableName,
        HAUNTED_PATCH_FORGE_FUNCTION: hauntedPatchForgeLambda.functionArn,
        ENVIRONMENT: environment,
        LOG_LEVEL: environment === 'prod' ? 'warn' : 'debug',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    // API Gateway with Cognito Authorizer
    let apiDomainConfig: apigateway.DomainNameOptions | undefined;
    
    // Add custom domain if provided
    if (domainName && certificateArn) {
      const certificate = certificatemanager.Certificate.fromCertificateArn(
        this,
        'ApiCertificate',
        certificateArn
      );
      apiDomainConfig = {
        domainName: `api.${domainName}`,
        certificate,
      };
    }

    const api = new apigateway.RestApi(this, 'NightmareGateway', {
      restApiName: `cursed-code-reviewer-${environment}-api`,
      description: 'Cursed Code Reviewer API Gateway',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
      deployOptions: {
        stageName: environment,
        metricsEnabled: true,
        tracingEnabled: true,
      },
      domainName: apiDomainConfig,
    });

    // Cognito Authorizer
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [soulPool],
      authorizerName: 'SoulPoolAuthorizer',
      identitySource: 'method.request.header.Authorization',
    });

    // API v1 resource
    const apiV1 = api.root.addResource('api').addResource('v1');

    // User context endpoint
    const userContextResource = apiV1.addResource('user-context');
    userContextResource.addMethod('GET', new apigateway.LambdaIntegration(userContextLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // User preferences endpoint
    const preferencesResource = apiV1.addResource('preferences');
    preferencesResource.addMethod('PUT', new apigateway.LambdaIntegration(updatePreferencesLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Spectral scan endpoints
    const spectralScanResource = apiV1.addResource('spectral-scan');
    spectralScanResource.addMethod('POST', new apigateway.LambdaIntegration(spectralAnalyzerLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const spectralScanIdResource = spectralScanResource.addResource('{scanId}');
    spectralScanIdResource.addMethod('GET', new apigateway.LambdaIntegration(spectralAnalyzerLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Haunted patch endpoints
    const hauntedPatchResource = apiV1.addResource('haunted-patch');
    const acceptPatchResource = hauntedPatchResource.addResource('accept');
    acceptPatchResource.addMethod('POST', new apigateway.LambdaIntegration(hauntedPatchApiLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Crypt history endpoint
    const cryptHistoryResource = apiV1.addResource('crypt-history');
    cryptHistoryResource.addMethod('GET', new apigateway.LambdaIntegration(spectralAnalyzerLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Outputs
    new cdk.CfnOutput(this, 'TombstoneTableName', {
      value: tombstoneTable.tableName,
      description: 'DynamoDB TombstoneDB Table Name',
    });

    new cdk.CfnOutput(this, 'CodeCryptBucketName', {
      value: codeCryptBucket.bucketName,
      description: 'S3 CodeCrypt Bucket Name',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'S3 Frontend Bucket Name',
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront Distribution ID',
    });

    new cdk.CfnOutput(this, 'CloudFrontDomainName', {
      value: distribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
    });

    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'Frontend URL',
    });

    new cdk.CfnOutput(this, 'SoulPoolId', {
      value: soulPool.userPoolId,
      description: 'Cognito SoulPool User Pool ID',
    });

    new cdk.CfnOutput(this, 'SoulPoolClientId', {
      value: soulPoolClient.userPoolClientId,
      description: 'Cognito SoulPool Client ID',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'API Gateway Endpoint',
    });



    new cdk.CfnOutput(this, 'CryptKeeperLambdaArn', {
      value: cryptKeeperLambda.functionArn,
      description: 'CryptKeeper Lambda Function ARN',
    });

    new cdk.CfnOutput(this, 'UserContextLambdaArn', {
      value: userContextLambda.functionArn,
      description: 'User Context Lambda Function ARN',
    });

    new cdk.CfnOutput(this, 'UpdatePreferencesLambdaArn', {
      value: updatePreferencesLambda.functionArn,
      description: 'Update Preferences Lambda Function ARN',
    });

    new cdk.CfnOutput(this, 'SpectralAnalyzerLambdaArn', {
      value: spectralAnalyzerLambda.functionArn,
      description: 'SpectralAnalyzer Lambda Function ARN',
    });

    new cdk.CfnOutput(this, 'DemonicOracleLambdaArn', {
      value: demonicOracleLambda.functionArn,
      description: 'DemonicOracle Lambda Function ARN',
    });

    new cdk.CfnOutput(this, 'HauntedPatchForgeLambdaArn', {
      value: hauntedPatchForgeLambda.functionArn,
      description: 'HauntedPatchForge Lambda Function ARN',
    });

    new cdk.CfnOutput(this, 'HauntedPatchApiLambdaArn', {
      value: hauntedPatchApiLambda.functionArn,
      description: 'HauntedPatchApi Lambda Function ARN',
    });
  }
}
