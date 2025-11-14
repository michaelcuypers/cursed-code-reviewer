// HauntedPatchApi Lambda - API Gateway handler for patch operations

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { acceptPatch, getPatch, getPatchesForScan } from './hauntedPatchForge';

/**
 * Main API Gateway handler for patch operations
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('HauntedPatchApi invoked:', JSON.stringify(event, null, 2));

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  };

  try {
    // Handle OPTIONS for CORS
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      };
    }

    // Route based on HTTP method and path
    if (event.httpMethod === 'POST' && event.path.includes('/haunted-patch/accept')) {
      return await handlePatchAcceptance(event, headers);
    }

    if (event.httpMethod === 'GET' && event.path.includes('/haunted-patch/')) {
      return await handleGetPatch(event, headers);
    }

    if (event.httpMethod === 'GET' && event.path.includes('/haunted-patches/')) {
      return await handleGetPatchesForScan(event, headers);
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: {
          code: 'NOT_FOUND',
          demonicMessage: '💀 This patch has vanished into the void!',
          technicalDetails: 'Endpoint not found',
        },
      }),
    };
  } catch (error: any) {
    console.error('HauntedPatchApi error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          demonicMessage: '🔥 The patch forge has exploded!',
          technicalDetails: error.message,
          timestamp: new Date().toISOString(),
        },
      }),
    };
  }
};

/**
 * Handle patch acceptance
 * POST /haunted-patch/accept
 * Body: { scanId: string, patchId: string }
 */
async function handlePatchAcceptance(
  event: APIGatewayProxyEvent,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> {
  try {
    // Extract user ID from authorizer context
    const soulId = event.requestContext?.authorizer?.soulId;
    
    if (!soulId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            demonicMessage: '👻 Your soul is not recognized in this realm!',
            technicalDetails: 'Authentication required',
          },
        }),
      };
    }

    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: {
            code: 'BAD_REQUEST',
            demonicMessage: '🕷️ The spirits require a body for this ritual!',
            technicalDetails: 'Request body is required',
          },
        }),
      };
    }

    const body = JSON.parse(event.body);
    const { scanId, patchId } = body;

    if (!scanId || !patchId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: {
            code: 'BAD_REQUEST',
            demonicMessage: '🦇 The bats demand both scanId and patchId!',
            technicalDetails: 'scanId and patchId are required',
          },
        }),
      };
    }

    // Accept the patch
    const acceptedPatch = await acceptPatch(scanId, patchId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '✨ The patch has been accepted and sealed in the crypt!',
        patch: acceptedPatch,
        formattedCode: acceptedPatch.cursedCode,
      }),
    };
  } catch (error: any) {
    console.error('Error accepting patch:', error);

    if (error.message.includes('not found')) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: {
            code: 'NOT_FOUND',
            demonicMessage: '💀 This patch has been lost to the shadows!',
            technicalDetails: error.message,
          },
        }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          demonicMessage: '🔥 The acceptance ritual has failed!',
          technicalDetails: error.message,
        },
      }),
    };
  }
}

/**
 * Handle get single patch
 * GET /haunted-patch/{scanId}/{patchId}
 */
async function handleGetPatch(
  event: APIGatewayProxyEvent,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> {
  try {
    // Extract user ID from authorizer context
    const soulId = event.requestContext?.authorizer?.soulId;
    
    if (!soulId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            demonicMessage: '👻 Your soul is not recognized in this realm!',
            technicalDetails: 'Authentication required',
          },
        }),
      };
    }

    // Extract scanId and patchId from path parameters
    const pathParams = event.pathParameters;
    const scanId = pathParams?.scanId;
    const patchId = pathParams?.patchId;

    if (!scanId || !patchId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: {
            code: 'BAD_REQUEST',
            demonicMessage: '🦇 The bats demand both scanId and patchId!',
            technicalDetails: 'scanId and patchId are required',
          },
        }),
      };
    }

    // Get the patch
    const patch = await getPatch(scanId, patchId);

    if (!patch) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: {
            code: 'NOT_FOUND',
            demonicMessage: '💀 This patch has vanished into the void!',
            technicalDetails: 'Patch not found',
          },
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        patch,
      }),
    };
  } catch (error: any) {
    console.error('Error getting patch:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          demonicMessage: '🔥 The patch retrieval has failed!',
          technicalDetails: error.message,
        },
      }),
    };
  }
}

/**
 * Handle get all patches for a scan
 * GET /haunted-patches/{scanId}
 */
async function handleGetPatchesForScan(
  event: APIGatewayProxyEvent,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> {
  try {
    // Extract user ID from authorizer context
    const soulId = event.requestContext?.authorizer?.soulId;
    
    if (!soulId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            demonicMessage: '👻 Your soul is not recognized in this realm!',
            technicalDetails: 'Authentication required',
          },
        }),
      };
    }

    // Extract scanId from path parameters
    const pathParams = event.pathParameters;
    const scanId = pathParams?.scanId;

    if (!scanId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: {
            code: 'BAD_REQUEST',
            demonicMessage: '🦇 The bats demand a scanId!',
            technicalDetails: 'scanId is required',
          },
        }),
      };
    }

    // Get all patches for the scan
    const patches = await getPatchesForScan(scanId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        patches,
        count: patches.length,
      }),
    };
  } catch (error: any) {
    console.error('Error getting patches:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          demonicMessage: '🔥 The patch graveyard is inaccessible!',
          technicalDetails: error.message,
        },
      }),
    };
  }
}
