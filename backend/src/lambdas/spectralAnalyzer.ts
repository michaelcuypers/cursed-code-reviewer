// SpectralAnalyzer Lambda - Main code scanning and analysis handler

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { CodeAnalysisService } from '../services/codeAnalysisService';
import { S3Service } from '../services/s3Service';
import { ScanService } from '../services/scanService';
import { UserService } from '../services/userService';
import { GitHubService } from '../services/githubService';
import type { SpectralScanRequest, CursedIssue } from '../types/spectral';

const codeAnalysisService = new CodeAnalysisService();
const s3Service = new S3Service();
const scanService = new ScanService();
const userService = new UserService();
const githubService = new GitHubService();

/**
 * Extract user ID from Cognito authorizer context
 */
function extractSoulId(event: APIGatewayProxyEvent): string | undefined {
  // Cognito authorizer provides claims in the authorizer.claims object
  const claims = event.requestContext?.authorizer?.claims;
  return claims?.sub || claims?.['cognito:username'];
}

/**
 * Main handler for spectral scan operations
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('SpectralAnalyzer invoked:', JSON.stringify(event, null, 2));

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
    if (event.httpMethod === 'POST' && event.path.includes('/spectral-scan')) {
      return await handleScanSubmission(event, headers);
    }

    if (event.httpMethod === 'GET' && event.path.includes('/spectral-scan/')) {
      return await handleScanRetrieval(event, headers);
    }

    if (event.httpMethod === 'GET' && event.path.includes('/crypt-history')) {
      return await handleHistoryRetrieval(event, headers);
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: {
          code: 'NOT_FOUND',
          demonicMessage: '💀 This path leads to nowhere in the crypt!',
          technicalDetails: 'Endpoint not found',
        },
      }),
    };
  } catch (error: any) {
    console.error('SpectralAnalyzer error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          demonicMessage: '🔥 The spectral forces are in chaos!',
          technicalDetails: error.message,
          timestamp: new Date().toISOString(),
        },
      }),
    };
  }
};

/**
 * Handle code submission for scanning
 */
async function handleScanSubmission(
  event: APIGatewayProxyEvent,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();

  try {
    // Extract user ID from authorizer context
    const soulId = extractSoulId(event);
    
    if (!soulId) {
      return {
        statusCode: 401,
        headers,
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
    const body: SpectralScanRequest = JSON.parse(event.body || '{}');

    if (!body.content || !body.type) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: {
            code: 'INVALID_REQUEST',
            demonicMessage: '🕷️ Your cursed submission is incomplete!',
            technicalDetails: 'Missing required fields: content and type',
          },
        }),
      };
    }

    // Generate scan ID
    const scanId = randomUUID();

    // Get code content based on submission type
    let code = body.content;
    let language = body.language || 'unknown';

    // Handle PR type
    if (body.type === 'pr') {
      try {
        const prDiff = await githubService.fetchPRDiff(body.content);
        code = githubService.extractChangedCode(prDiff.files);
        
        if (!code || code.trim().length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: {
                code: 'EMPTY_PR',
                demonicMessage: '👻 This PR is empty! No code to haunt!',
                technicalDetails: 'No code changes found in the PR',
              },
            }),
          };
        }

        // Try to detect language from first file
        if (prDiff.files.length > 0) {
          language = codeAnalysisService.detectLanguage(code, prDiff.files[0].filename);
        }
      } catch (error: any) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: {
              code: 'PR_FETCH_FAILED',
              demonicMessage: '🕷️ Failed to summon the PR from GitHub!',
              technicalDetails: error.message,
            },
          }),
        };
      }
    }

    // Detect language if not provided
    if (language === 'unknown') {
      language = codeAnalysisService.detectLanguage(code);
    }

    // Store code in S3 if it's large
    let s3CodeKey: string | undefined;
    if (s3Service.shouldStoreInS3(code)) {
      s3CodeKey = await s3Service.storeCode(scanId, code, language);
    }

    // Analyze code using Bedrock
    const severityLevel = body.severityLevel || 'moderate';
    const rawIssues = await codeAnalysisService.analyzeCodeWithBedrock(code, language, severityLevel);

    // Convert to CursedIssue format with demonic messages
    const issues: CursedIssue[] = rawIssues.map(issue => ({
      id: randomUUID(),
      severity: issue.severity,
      lineNumber: issue.lineNumber,
      columnNumber: issue.columnNumber,
      demonicMessage: generateDemonicMessage(issue.message, issue.severity),
      technicalExplanation: issue.message,
      ruleId: issue.ruleId,
    }));

    // Calculate curse level
    const overallCurseLevel = codeAnalysisService.calculateCurseLevel(rawIssues);

    // Calculate scan duration
    const scanDuration = Date.now() - startTime;

    // Store scan in DynamoDB
    await scanService.storeScan(
      scanId,
      soulId,
      body.type,
      language,
      severityLevel,
      scanDuration,
      overallCurseLevel,
      s3CodeKey
    );

    // Store issues
    await scanService.storeIssues(scanId, issues);

    // Increment user's scan count
    await userService.incrementScanCount(soulId);

    // Return scan result
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        scanId,
        timestamp: new Date().toISOString(),
        issues,
        overallCurseLevel,
        scanDuration,
        language,
        status: 'completed',
        message: issues.length === 0 
          ? '✨ Your code is pure! No curses detected!' 
          : `👻 ${issues.length} curse${issues.length > 1 ? 's' : ''} detected in your code!`,
      }),
    };
  } catch (error: any) {
    console.error('Error in scan submission:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: {
          code: 'SCAN_FAILED',
          demonicMessage: '🔥 The spectral scan has failed!',
          technicalDetails: error.message,
          timestamp: new Date().toISOString(),
        },
      }),
    };
  }
}

/**
 * Handle scan result retrieval
 */
async function handleScanRetrieval(
  event: APIGatewayProxyEvent,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> {
  try {
    // Extract user ID from authorizer context
    const soulId = extractSoulId(event);
    
    if (!soulId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            demonicMessage: '💀 Your soul is not recognized by the crypt!',
            technicalDetails: 'Missing authentication context',
          },
        }),
      };
    }

    // Extract scan ID from path
    const pathParts = event.path.split('/');
    const scanId = pathParts[pathParts.length - 1];

    if (!scanId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: {
            code: 'INVALID_REQUEST',
            demonicMessage: '🕷️ No scan ID provided!',
            technicalDetails: 'Scan ID is required in the path',
          },
        }),
      };
    }

    // Get scan from DynamoDB
    const scan = await scanService.getScan(scanId);

    if (!scan) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: {
            code: 'SCAN_NOT_FOUND',
            demonicMessage: '👻 This scan has vanished into the void!',
            technicalDetails: `Scan ${scanId} not found`,
          },
        }),
      };
    }

    // Verify the scan belongs to the requesting user
    if (scan.soulId !== soulId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: {
            code: 'FORBIDDEN',
            demonicMessage: '⚰️ This scan belongs to another soul!',
            technicalDetails: 'You do not have permission to access this scan',
          },
        }),
      };
    }

    // Get issues for the scan
    const issues = await scanService.getIssues(scanId);

    // Retrieve code from S3 if needed
    let code: string | undefined;
    if (scan.s3CodeKey) {
      try {
        code = await s3Service.retrieveCode(scan.s3CodeKey);
      } catch (error) {
        console.error('Error retrieving code from S3:', error);
        // Continue without code content
      }
    }

    // Return scan result
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        scanId: scan.scanId,
        timestamp: scan.scanTimestamp,
        issues,
        overallCurseLevel: scan.overallCurseLevel,
        scanDuration: scan.scanDuration,
        language: scan.language,
        status: scan.status,
        submissionType: scan.submissionType,
        code: code ? code.substring(0, 10000) : undefined, // Limit code size in response
        message: issues.length === 0 
          ? '✨ Your code is pure! No curses detected!' 
          : `👻 ${issues.length} curse${issues.length > 1 ? 's' : ''} detected in your code!`,
      }),
    };
  } catch (error: any) {
    console.error('Error in scan retrieval:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: {
          code: 'RETRIEVAL_FAILED',
          demonicMessage: '🔥 Failed to retrieve the scan from the crypt!',
          technicalDetails: error.message,
          timestamp: new Date().toISOString(),
        },
      }),
    };
  }
}

/**
 * Handle scan history retrieval
 */
async function handleHistoryRetrieval(
  event: APIGatewayProxyEvent,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> {
  try {
    // Extract user ID from authorizer context
    const soulId = extractSoulId(event);
    
    if (!soulId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            demonicMessage: '💀 Your soul is not recognized by the crypt!',
            technicalDetails: 'Missing authentication context',
          },
        }),
      };
    }

    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const limit = parseInt(queryParams.limit || '20', 10);
    const lastKey = queryParams.lastKey ? JSON.parse(decodeURIComponent(queryParams.lastKey)) : undefined;
    
    // Date range filtering
    const startDate = queryParams.startDate;
    const endDate = queryParams.endDate;
    
    // Severity filtering
    const severity = queryParams.severity as 'minor' | 'moderate' | 'critical' | undefined;

    // Validate limit
    if (limit < 1 || limit > 100) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: {
            code: 'INVALID_LIMIT',
            demonicMessage: '🕷️ The limit must be between 1 and 100!',
            technicalDetails: 'Limit parameter out of range',
          },
        }),
      };
    }

    // Get scan history from DynamoDB
    const result = await scanService.getScanHistory(
      soulId,
      limit,
      lastKey,
      startDate,
      endDate,
      severity
    );

    // Format response with issue counts
    const scans = await Promise.all(result.scans.map(async (scan) => {
      // Get issue count for this scan
      const issues = await scanService.getIssues(scan.scanId);
      
      return {
        scanId: scan.scanId,
        timestamp: scan.scanTimestamp,
        language: scan.language,
        severityLevel: scan.severityLevel,
        overallCurseLevel: scan.overallCurseLevel,
        scanDuration: scan.scanDuration,
        submissionType: scan.submissionType,
        status: scan.status,
        issueCount: issues.length,
      };
    }));

    const response: any = {
      scans,
      count: scans.length,
      message: scans.length === 0 
        ? '👻 No scans found in the crypt!' 
        : `⚰️ Retrieved ${scans.length} scan${scans.length > 1 ? 's' : ''} from the crypt!`,
    };

    // Add pagination info if there are more results
    if (result.lastKey) {
      response.lastKey = encodeURIComponent(JSON.stringify(result.lastKey));
      response.hasMore = true;
    } else {
      response.hasMore = false;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (error: any) {
    console.error('Error in history retrieval:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: {
          code: 'HISTORY_RETRIEVAL_FAILED',
          demonicMessage: '🔥 Failed to retrieve history from the crypt!',
          technicalDetails: error.message,
          timestamp: new Date().toISOString(),
        },
      }),
    };
  }
}

/**
 * Generate demonic message based on issue
 */
function generateDemonicMessage(technicalMessage: string, severity: string): string {
  const demonicPhrases = {
    minor: [
      '👻 A minor spirit haunts this line:',
      '🕷️ A small curse lingers here:',
      '🦇 The bats whisper of a minor issue:',
    ],
    moderate: [
      '💀 The dead are displeased with this code:',
      '🕸️ A moderate curse has been cast:',
      '👹 The demons frown upon this:',
    ],
    critical: [
      '🔥 THE FLAMES OF HELL CONSUME THIS CODE:',
      '☠️ CRITICAL CURSE DETECTED:',
      '⚰️ THIS CODE BELONGS IN A COFFIN:',
    ],
  };

  const phrases = demonicPhrases[severity as keyof typeof demonicPhrases] || demonicPhrases.moderate;
  const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];

  return `${randomPhrase} ${technicalMessage}`;
}
