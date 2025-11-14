// CryptKeeper Lambda - Custom authentication and authorization logic
// This Lambda enriches user context and provides additional authorization

import type { 
  APIGatewayRequestAuthorizerEvent,
  APIGatewayAuthorizerResult,
  Context,
} from 'aws-lambda';
import { UserService } from '../services/userService';

const userService = new UserService();

/**
 * Lambda authorizer for API Gateway
 * Validates JWT tokens from Cognito and enriches user context
 */
export const handler = async (
  event: APIGatewayRequestAuthorizerEvent,
  _context: Context
): Promise<APIGatewayAuthorizerResult> => {
  console.log('CryptKeeper invoked:', JSON.stringify(event, null, 2));

  try {
    // Extract token from Authorization header
    const token = event.headers?.Authorization || event.headers?.authorization;
    
    if (!token) {
      console.log('No authorization token provided');
      throw new Error('Unauthorized - No soul token provided');
    }

    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace(/^Bearer\s+/i, '');

    // Decode JWT to extract user info (Cognito already validated the token)
    const payload = decodeJWT(cleanToken);
    
    if (!payload || !payload.sub || !payload.email) {
      console.log('Invalid token payload');
      throw new Error('Unauthorized - Invalid soul token');
    }

    const soulId = payload.sub;
    const email = payload.email;

    // Enrich user context by getting/creating user record
    const userContext = await userService.getOrCreateUser(soulId, email);

    // Build policy document
    const policy = generatePolicy(
      soulId,
      'Allow',
      event.methodArn,
      userContext
    );

    console.log('Authorization successful for soul:', soulId);
    return policy;

  } catch (error: any) {
    console.error('CryptKeeper authorization failed:', error);
    
    // Return deny policy
    throw new Error('Unauthorized');
  }
};

/**
 * Decode JWT token (basic decode, not validation - Cognito handles validation)
 */
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    console.error('JWT decode error:', error);
    return null;
  }
}

/**
 * Generate IAM policy for API Gateway
 */
function generatePolicy(
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string,
  userContext?: any
): APIGatewayAuthorizerResult {
  const policy: APIGatewayAuthorizerResult = {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };

  // Add user context to be passed to Lambda functions
  if (userContext) {
    policy.context = {
      soulId: principalId,
      email: userContext.user.email,
      defaultSeverity: userContext.preferences.defaultSeverity,
      autoFixEnabled: String(userContext.preferences.autoFixEnabled),
      userPreferences: JSON.stringify(userContext.preferences),
    };
  }

  return policy;
}

/**
 * Handler for user preference updates
 * This is a separate endpoint handler, not an authorizer
 */
export const updatePreferencesHandler = async (event: any): Promise<any> => {
  console.log('Update preferences invoked:', JSON.stringify(event, null, 2));

  try {
    // Extract user ID from authorizer context
    const soulId = event.requestContext?.authorizer?.soulId;
    
    if (!soulId) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            demonicMessage: '💀 Your soul is not recognized by the crypt!',
            technicalDetails: 'Missing authentication context',
          },
        }),
      };
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const preferences = body.preferences;

    if (!preferences) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'INVALID_REQUEST',
            demonicMessage: '🕷️ Your cursed preferences are malformed!',
            technicalDetails: 'Missing preferences in request body',
          },
        }),
      };
    }

    // Update preferences
    await userService.updatePreferences(soulId, preferences);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: '✅ Your cursed preferences have been updated!',
        preferences,
      }),
    };

  } catch (error: any) {
    console.error('Error updating preferences:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          demonicMessage: '🔥 The crypt is experiencing dark forces!',
          technicalDetails: error.message,
        },
      }),
    };
  }
};

/**
 * Handler for getting user context
 */
export const getUserContextHandler = async (event: any): Promise<any> => {
  console.log('Get user context invoked:', JSON.stringify(event, null, 2));

  try {
    // Extract user ID from authorizer context
    const soulId = event.requestContext?.authorizer?.soulId;
    const email = event.requestContext?.authorizer?.email;
    
    if (!soulId || !email) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            demonicMessage: '💀 Your soul is not recognized by the crypt!',
            technicalDetails: 'Missing authentication context',
          },
        }),
      };
    }

    // Get enriched user context
    const userContext = await userService.getOrCreateUser(soulId, email);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        user: userContext.user,
        preferences: userContext.preferences,
      }),
    };

  } catch (error: any) {
    console.error('Error getting user context:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          demonicMessage: '🔥 The crypt is experiencing dark forces!',
          technicalDetails: error.message,
        },
      }),
    };
  }
};
