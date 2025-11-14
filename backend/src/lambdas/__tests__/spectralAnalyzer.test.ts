// Tests for SpectralAnalyzer Lambda

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// Create mock functions that will be hoisted
const mockDynamoSend = vi.fn();
const mockListFiles = vi.fn();

// Mock AWS SDK and external dependencies
vi.mock('@aws-sdk/client-dynamodb');
vi.mock('@aws-sdk/lib-dynamodb');
vi.mock('@aws-sdk/client-s3');
vi.mock('@octokit/rest');

// Import after mocks
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { Octokit } from '@octokit/rest';
import { handler } from '../spectralAnalyzer';

// Setup mocks
vi.mocked(DynamoDBClient).mockImplementation(() => ({} as any));
vi.mocked(DynamoDBDocumentClient.from).mockReturnValue({
  send: mockDynamoSend,
} as any);
vi.mocked(S3Client).mockImplementation(() => ({
  send: vi.fn(),
} as any));
vi.mocked(Octokit).mockImplementation(() => ({
  pulls: {
    get: vi.fn(),
    listFiles: mockListFiles,
  },
  repos: {
    getContent: vi.fn(),
  },
} as any));

describe('SpectralAnalyzer Lambda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDynamoSend.mockResolvedValue({});
  });

  describe('CORS and routing', () => {
    it('should handle OPTIONS request for CORS', async () => {
      const event = {
        httpMethod: 'OPTIONS',
        path: '/api/v1/spectral-scan',
      } as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.headers).toHaveProperty('Access-Control-Allow-Origin', '*');
      expect(result.headers).toHaveProperty('Access-Control-Allow-Methods');
    });

    it('should return 404 for unknown paths', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/api/v1/unknown',
        requestContext: {
          authorizer: {
            soulId: 'test-soul-id',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.demonicMessage).toContain('crypt');
    });
  });

  describe('Authentication', () => {
    it('should return 401 for unauthenticated POST requests', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/api/v1/spectral-scan',
        body: JSON.stringify({
          type: 'text',
          content: 'console.log("test");',
        }),
        requestContext: {},
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.demonicMessage).toContain('soul');
    });

    it('should return 401 for unauthenticated GET requests', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/api/v1/spectral-scan/test-scan-id',
        requestContext: {},
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Code submission and storage', () => {
    it('should successfully submit and analyze text code', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/api/v1/spectral-scan',
        body: JSON.stringify({
          type: 'text',
          content: 'console.log("test");\nvar x = 1;',
          language: 'javascript',
          severityLevel: 'minor',
        }),
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body).toHaveProperty('scanId');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('issues');
      expect(body).toHaveProperty('overallCurseLevel');
      expect(body).toHaveProperty('scanDuration');
      expect(body.language).toBe('javascript');
      expect(body.status).toBe('completed');
      
      // Should detect console.log and var issues
      expect(body.issues.length).toBeGreaterThan(0);
      expect(body.issues.some((i: any) => i.ruleId === 'no-console')).toBe(true);
      
      // Should have stored scan in DynamoDB
      expect(mockDynamoSend).toHaveBeenCalled();
    });

    it('should return 400 for missing required fields', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/api/v1/spectral-scan',
        body: JSON.stringify({
          type: 'text',
          // Missing content
        }),
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('INVALID_REQUEST');
      expect(body.error.technicalDetails).toContain('content');
    });

    it('should detect language from code content', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/api/v1/spectral-scan',
        body: JSON.stringify({
          type: 'text',
          content: 'def hello():\n    print("test")',
          // No language specified
        }),
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.language).toBe('python');
    });

    it('should store large code successfully', async () => {
      const largeCode = 'console.log("test");\n'.repeat(10000); // Large code
      
      const event = {
        httpMethod: 'POST',
        path: '/api/v1/spectral-scan',
        body: JSON.stringify({
          type: 'text',
          content: largeCode,
          language: 'javascript',
        }),
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      // Verify scan was created successfully
      expect(body.scanId).toBeDefined();
      expect(body.status).toBe('completed');
    });

    it('should analyze code with different severity levels', async () => {
      const codeWithIssues = `
        console.log("debug");
        var x = 1;
        if (x == 1) {}
        eval("test");
      `;

      const event = {
        httpMethod: 'POST',
        path: '/api/v1/spectral-scan',
        body: JSON.stringify({
          type: 'text',
          content: codeWithIssues,
          language: 'javascript',
          severityLevel: 'critical',
        }),
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      // With critical severity, should only show critical issues
      const criticalIssues = body.issues.filter((i: any) => i.severity === 'critical');
      expect(criticalIssues.length).toBeGreaterThan(0);
      
      // Should detect eval as critical
      expect(body.issues.some((i: any) => i.ruleId === 'no-eval')).toBe(true);
    });

    it('should return positive message for clean code', async () => {
      const cleanCode = 'const x = 1;\nconst y = 2;';

      const event = {
        httpMethod: 'POST',
        path: '/api/v1/spectral-scan',
        body: JSON.stringify({
          type: 'text',
          content: cleanCode,
          language: 'javascript',
        }),
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.issues.length).toBe(0);
      expect(body.overallCurseLevel).toBe(0);
      expect(body.message).toContain('pure');
    });
  });

  describe('PR fetching and parsing', () => {
    it('should fetch and analyze PR from GitHub', async () => {
      mockListFiles.mockResolvedValue({
        data: [
          {
            filename: 'test.js',
            status: 'modified',
            additions: 2,
            deletions: 1,
            patch: '@@ -1,3 +1,4 @@\n function test() {\n+  console.log("debug");\n   return true;\n }',
          },
        ],
      });

      const event = {
        httpMethod: 'POST',
        path: '/api/v1/spectral-scan',
        body: JSON.stringify({
          type: 'pr',
          content: 'https://github.com/owner/repo/pull/123',
        }),
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.scanId).toBeDefined();
      expect(body.issues).toBeDefined();
      expect(mockListFiles).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pull_number: 123,
      });
    });

    it('should return 400 for invalid PR URL', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/api/v1/spectral-scan',
        body: JSON.stringify({
          type: 'pr',
          content: 'invalid-url',
        }),
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('PR_FETCH_FAILED');
    });

    it('should return 400 for empty PR', async () => {
      mockListFiles.mockResolvedValue({
        data: [],
      });

      const event = {
        httpMethod: 'POST',
        path: '/api/v1/spectral-scan',
        body: JSON.stringify({
          type: 'pr',
          content: 'https://github.com/owner/repo/pull/456',
        }),
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('EMPTY_PR');
    });

    it('should handle GitHub API errors', async () => {
      mockListFiles.mockRejectedValue({
        status: 404,
        message: 'Not Found',
      });

      const event = {
        httpMethod: 'POST',
        path: '/api/v1/spectral-scan',
        body: JSON.stringify({
          type: 'pr',
          content: 'https://github.com/owner/repo/pull/999',
        }),
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('PR_FETCH_FAILED');
    });
  });

  describe('Scan result retrieval', () => {
    it('should retrieve scan results by ID', async () => {
      const mockScan = {
        PK: 'SCAN#test-scan-123',
        SK: 'METADATA',
        entityType: 'SpectralScan',
        scanId: 'test-scan-123',
        soulId: 'test-soul-123',
        submissionType: 'text',
        language: 'javascript',
        severityLevel: 'moderate',
        scanTimestamp: '2024-01-01T00:00:00.000Z',
        scanDuration: 150,
        overallCurseLevel: 25,
        status: 'completed',
      };

      const mockIssues = [
        {
          PK: 'SCAN#test-scan-123',
          SK: 'ISSUE#issue-1',
          entityType: 'CursedIssue',
          issueId: 'issue-1',
          scanId: 'test-scan-123',
          severity: 'moderate',
          lineNumber: 5,
          columnNumber: 10,
          demonicMessage: '💀 The dead are displeased',
          technicalExplanation: 'Use of var',
          ruleId: 'no-var',
        },
      ];

      mockDynamoSend
        .mockResolvedValueOnce({ Item: mockScan })
        .mockResolvedValueOnce({ Items: mockIssues });

      const event = {
        httpMethod: 'GET',
        path: '/api/v1/spectral-scan/test-scan-123',
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.scanId).toBe('test-scan-123');
      expect(body.language).toBe('javascript');
      expect(body.overallCurseLevel).toBe(25);
      expect(body.issues).toHaveLength(1);
      expect(body.issues[0].ruleId).toBe('no-var');
    });

    it('should return 404 for non-existent scan', async () => {
      mockDynamoSend.mockResolvedValue({ Item: null });

      const event = {
        httpMethod: 'GET',
        path: '/api/v1/spectral-scan/non-existent',
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('SCAN_NOT_FOUND');
    });

    it('should return 403 when accessing another users scan', async () => {
      const mockScan = {
        PK: 'SCAN#test-scan-123',
        SK: 'METADATA',
        scanId: 'test-scan-123',
        soulId: 'different-soul-456',
        language: 'javascript',
      };

      mockDynamoSend.mockResolvedValue({ Item: mockScan });

      const event = {
        httpMethod: 'GET',
        path: '/api/v1/spectral-scan/test-scan-123',
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('FORBIDDEN');
      expect(body.error.demonicMessage).toContain('another soul');
    });

    it('should return 400 for missing scan ID', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/api/v1/spectral-scan/',
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('INVALID_REQUEST');
    });

    it('should handle scans with S3 code keys', async () => {
      const mockScan = {
        PK: 'SCAN#test-scan-123',
        SK: 'METADATA',
        scanId: 'test-scan-123',
        soulId: 'test-soul-123',
        s3CodeKey: 'scans/test-scan-123/original.txt',
        language: 'javascript',
        scanTimestamp: '2024-01-01T00:00:00.000Z',
        scanDuration: 150,
        overallCurseLevel: 25,
        status: 'completed',
        submissionType: 'text',
        severityLevel: 'moderate',
      };

      mockDynamoSend
        .mockResolvedValueOnce({ Item: mockScan })
        .mockResolvedValueOnce({ Items: [] });

      const event = {
        httpMethod: 'GET',
        path: '/api/v1/spectral-scan/test-scan-123',
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      // Should return scan data even if S3 retrieval fails
      expect(body.scanId).toBe('test-scan-123');
      expect(body.language).toBe('javascript');
    });
  });

  describe('Scan history retrieval', () => {
    it('should retrieve scan history for authenticated user', async () => {
      const mockScans = [
        {
          PK: 'SCAN#scan-1',
          SK: 'METADATA',
          entityType: 'SpectralScan',
          scanId: 'scan-1',
          soulId: 'test-soul-123',
          submissionType: 'text',
          language: 'javascript',
          severityLevel: 'moderate',
          scanTimestamp: '2024-01-03T00:00:00.000Z',
          scanDuration: 150,
          overallCurseLevel: 25,
          status: 'completed',
        },
        {
          PK: 'SCAN#scan-2',
          SK: 'METADATA',
          entityType: 'SpectralScan',
          scanId: 'scan-2',
          soulId: 'test-soul-123',
          submissionType: 'pr',
          language: 'python',
          severityLevel: 'critical',
          scanTimestamp: '2024-01-02T00:00:00.000Z',
          scanDuration: 200,
          overallCurseLevel: 75,
          status: 'completed',
        },
      ];

      mockDynamoSend.mockResolvedValue({ 
        Items: mockScans,
        LastEvaluatedKey: undefined,
      });

      const event = {
        httpMethod: 'GET',
        path: '/api/v1/crypt-history',
        queryStringParameters: {},
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.scans).toHaveLength(2);
      expect(body.count).toBe(2);
      expect(body.hasMore).toBe(false);
      expect(body.message).toContain('Retrieved 2 scans');
      
      // Verify scan data structure
      expect(body.scans[0]).toHaveProperty('scanId');
      expect(body.scans[0]).toHaveProperty('timestamp');
      expect(body.scans[0]).toHaveProperty('language');
      expect(body.scans[0]).toHaveProperty('severityLevel');
      expect(body.scans[0]).toHaveProperty('overallCurseLevel');
      expect(body.scans[0]).toHaveProperty('scanDuration');
      expect(body.scans[0]).toHaveProperty('submissionType');
      expect(body.scans[0]).toHaveProperty('status');
    });

    it('should return 401 for unauthenticated history requests', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/api/v1/crypt-history',
        queryStringParameters: {},
        requestContext: {},
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle empty history', async () => {
      mockDynamoSend.mockResolvedValue({ 
        Items: [],
        LastEvaluatedKey: undefined,
      });

      const event = {
        httpMethod: 'GET',
        path: '/api/v1/crypt-history',
        queryStringParameters: {},
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.scans).toHaveLength(0);
      expect(body.count).toBe(0);
      expect(body.hasMore).toBe(false);
      expect(body.message).toContain('No scans found');
    });

    it('should support pagination with limit parameter', async () => {
      const mockScans = Array.from({ length: 10 }, (_, i) => ({
        PK: `SCAN#scan-${i}`,
        SK: 'METADATA',
        entityType: 'SpectralScan',
        scanId: `scan-${i}`,
        soulId: 'test-soul-123',
        submissionType: 'text',
        language: 'javascript',
        severityLevel: 'moderate',
        scanTimestamp: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
        scanDuration: 150,
        overallCurseLevel: 25,
        status: 'completed',
      }));

      mockDynamoSend.mockResolvedValue({ 
        Items: mockScans,
        LastEvaluatedKey: { PK: 'SCAN#scan-9', SK: 'METADATA' },
      });

      const event = {
        httpMethod: 'GET',
        path: '/api/v1/crypt-history',
        queryStringParameters: {
          limit: '10',
        },
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.scans).toHaveLength(10);
      expect(body.hasMore).toBe(true);
      expect(body.lastKey).toBeDefined();
      
      // Verify lastKey is properly encoded
      const decodedKey = JSON.parse(decodeURIComponent(body.lastKey));
      expect(decodedKey).toEqual({ PK: 'SCAN#scan-9', SK: 'METADATA' });
    });

    it('should support pagination with lastKey parameter', async () => {
      const mockScans = [
        {
          PK: 'SCAN#scan-11',
          SK: 'METADATA',
          entityType: 'SpectralScan',
          scanId: 'scan-11',
          soulId: 'test-soul-123',
          submissionType: 'text',
          language: 'javascript',
          severityLevel: 'moderate',
          scanTimestamp: '2024-01-11T00:00:00.000Z',
          scanDuration: 150,
          overallCurseLevel: 25,
          status: 'completed',
        },
      ];

      mockDynamoSend.mockResolvedValue({ 
        Items: mockScans,
        LastEvaluatedKey: undefined,
      });

      const lastKey = encodeURIComponent(JSON.stringify({ PK: 'SCAN#scan-10', SK: 'METADATA' }));

      const event = {
        httpMethod: 'GET',
        path: '/api/v1/crypt-history',
        queryStringParameters: {
          limit: '10',
          lastKey,
        },
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.scans).toHaveLength(1);
      expect(body.hasMore).toBe(false);
      expect(body.lastKey).toBeUndefined();
    });

    it('should validate limit parameter range', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/api/v1/crypt-history',
        queryStringParameters: {
          limit: '150', // Exceeds max of 100
        },
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('INVALID_LIMIT');
      expect(body.error.technicalDetails).toContain('out of range');
    });

    it('should validate minimum limit parameter', async () => {
      const event = {
        httpMethod: 'GET',
        path: '/api/v1/crypt-history',
        queryStringParameters: {
          limit: '0',
        },
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('INVALID_LIMIT');
    });

    it('should filter by date range', async () => {
      const mockScans = [
        {
          PK: 'SCAN#scan-1',
          SK: 'METADATA',
          entityType: 'SpectralScan',
          scanId: 'scan-1',
          soulId: 'test-soul-123',
          submissionType: 'text',
          language: 'javascript',
          severityLevel: 'moderate',
          scanTimestamp: '2024-01-15T00:00:00.000Z',
          scanDuration: 150,
          overallCurseLevel: 25,
          status: 'completed',
        },
      ];

      mockDynamoSend.mockResolvedValue({ 
        Items: mockScans,
        LastEvaluatedKey: undefined,
      });

      const event = {
        httpMethod: 'GET',
        path: '/api/v1/crypt-history',
        queryStringParameters: {
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-01-31T23:59:59.999Z',
        },
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.scans).toHaveLength(1);
      expect(body.scans[0].scanId).toBe('scan-1');
      
      // Verify the query was called with date range parameters
      expect(mockDynamoSend).toHaveBeenCalled();
    });

    it('should filter by start date only', async () => {
      const mockScans = [
        {
          PK: 'SCAN#scan-1',
          SK: 'METADATA',
          entityType: 'SpectralScan',
          scanId: 'scan-1',
          soulId: 'test-soul-123',
          submissionType: 'text',
          language: 'javascript',
          severityLevel: 'moderate',
          scanTimestamp: '2024-01-15T00:00:00.000Z',
          scanDuration: 150,
          overallCurseLevel: 25,
          status: 'completed',
        },
      ];

      mockDynamoSend.mockResolvedValue({ 
        Items: mockScans,
        LastEvaluatedKey: undefined,
      });

      const event = {
        httpMethod: 'GET',
        path: '/api/v1/crypt-history',
        queryStringParameters: {
          startDate: '2024-01-10T00:00:00.000Z',
        },
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.scans).toHaveLength(1);
    });

    it('should filter by end date only', async () => {
      const mockScans = [
        {
          PK: 'SCAN#scan-1',
          SK: 'METADATA',
          entityType: 'SpectralScan',
          scanId: 'scan-1',
          soulId: 'test-soul-123',
          submissionType: 'text',
          language: 'javascript',
          severityLevel: 'moderate',
          scanTimestamp: '2024-01-05T00:00:00.000Z',
          scanDuration: 150,
          overallCurseLevel: 25,
          status: 'completed',
        },
      ];

      mockDynamoSend.mockResolvedValue({ 
        Items: mockScans,
        LastEvaluatedKey: undefined,
      });

      const event = {
        httpMethod: 'GET',
        path: '/api/v1/crypt-history',
        queryStringParameters: {
          endDate: '2024-01-10T00:00:00.000Z',
        },
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.scans).toHaveLength(1);
    });

    it('should filter by severity level', async () => {
      const mockScans = [
        {
          PK: 'SCAN#scan-1',
          SK: 'METADATA',
          entityType: 'SpectralScan',
          scanId: 'scan-1',
          soulId: 'test-soul-123',
          submissionType: 'text',
          language: 'javascript',
          severityLevel: 'critical',
          scanTimestamp: '2024-01-15T00:00:00.000Z',
          scanDuration: 150,
          overallCurseLevel: 85,
          status: 'completed',
        },
      ];

      mockDynamoSend.mockResolvedValue({ 
        Items: mockScans,
        LastEvaluatedKey: undefined,
      });

      const event = {
        httpMethod: 'GET',
        path: '/api/v1/crypt-history',
        queryStringParameters: {
          severity: 'critical',
        },
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.scans).toHaveLength(1);
      expect(body.scans[0].severityLevel).toBe('critical');
    });

    it('should combine date range and severity filters', async () => {
      const mockScans = [
        {
          PK: 'SCAN#scan-1',
          SK: 'METADATA',
          entityType: 'SpectralScan',
          scanId: 'scan-1',
          soulId: 'test-soul-123',
          submissionType: 'text',
          language: 'javascript',
          severityLevel: 'moderate',
          scanTimestamp: '2024-01-15T00:00:00.000Z',
          scanDuration: 150,
          overallCurseLevel: 45,
          status: 'completed',
        },
      ];

      mockDynamoSend.mockResolvedValue({ 
        Items: mockScans,
        LastEvaluatedKey: undefined,
      });

      const event = {
        httpMethod: 'GET',
        path: '/api/v1/crypt-history',
        queryStringParameters: {
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-01-31T23:59:59.999Z',
          severity: 'moderate',
        },
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      expect(body.scans).toHaveLength(1);
      expect(body.scans[0].severityLevel).toBe('moderate');
    });

    it('should use default limit when not specified', async () => {
      const mockScans = Array.from({ length: 20 }, (_, i) => ({
        PK: `SCAN#scan-${i}`,
        SK: 'METADATA',
        entityType: 'SpectralScan',
        scanId: `scan-${i}`,
        soulId: 'test-soul-123',
        submissionType: 'text',
        language: 'javascript',
        severityLevel: 'moderate',
        scanTimestamp: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
        scanDuration: 150,
        overallCurseLevel: 25,
        status: 'completed',
      }));

      mockDynamoSend.mockResolvedValue({ 
        Items: mockScans,
        LastEvaluatedKey: undefined,
      });

      const event = {
        httpMethod: 'GET',
        path: '/api/v1/crypt-history',
        queryStringParameters: {},
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      // Default limit is 20
      expect(body.scans).toHaveLength(20);
    });

    it('should verify TTL is set on scan records', async () => {
      const event = {
        httpMethod: 'POST',
        path: '/api/v1/spectral-scan',
        body: JSON.stringify({
          type: 'text',
          content: 'const x = 1;',
          language: 'javascript',
        }),
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      await handler(event);

      // Verify that PutCommand was called with TTL
      expect(mockDynamoSend).toHaveBeenCalled();
      const putCall = mockDynamoSend.mock.calls.find(call => 
        call[0].input?.Item?.ttl !== undefined
      );
      
      expect(putCall).toBeDefined();
      if (putCall) {
        const ttl = putCall[0].input.Item.ttl;
        const now = Math.floor(Date.now() / 1000);
        const ninetyDaysInSeconds = 90 * 24 * 60 * 60;
        
        // TTL should be approximately 90 days from now
        expect(ttl).toBeGreaterThan(now);
        expect(ttl).toBeLessThanOrEqual(now + ninetyDaysInSeconds + 60); // Allow 1 minute tolerance
      }
    });

    it('should handle DynamoDB errors gracefully', async () => {
      mockDynamoSend.mockRejectedValue(new Error('DynamoDB connection failed'));

      const event = {
        httpMethod: 'GET',
        path: '/api/v1/crypt-history',
        queryStringParameters: {},
        requestContext: {
          authorizer: {
            soulId: 'test-soul-123',
          },
        },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('HISTORY_RETRIEVAL_FAILED');
      expect(body.error.demonicMessage).toContain('Failed to retrieve history');
    });
  });
});
