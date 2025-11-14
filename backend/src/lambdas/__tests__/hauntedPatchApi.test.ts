// Tests for HauntedPatchApi Lambda

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from '../hauntedPatchApi';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import * as hauntedPatchForge from '../hauntedPatchForge';

// Mock the hauntedPatchForge module
vi.mock('../hauntedPatchForge', () => ({
  acceptPatch: vi.fn(),
  getPatch: vi.fn(),
  getPatchesForScan: vi.fn(),
}));

describe('HauntedPatchApi Lambda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockEvent = (
    httpMethod: string,
    path: string,
    body?: any,
    pathParameters?: any
  ): APIGatewayProxyEvent => ({
    httpMethod,
    path,
    body: body ? JSON.stringify(body) : null,
    pathParameters: pathParameters || null,
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    requestContext: {
      accountId: 'test-account',
      apiId: 'test-api',
      authorizer: {
        soulId: 'test-soul-123',
      },
      protocol: 'HTTP/1.1',
      httpMethod,
      path,
      stage: 'test',
      requestId: 'test-request',
      requestTimeEpoch: Date.now(),
      resourceId: 'test-resource',
      resourcePath: path,
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '127.0.0.1',
        user: null,
        userAgent: 'test-agent',
        userArn: null,
      },
    },
    resource: path,
    stageVariables: null,
  });

  describe('OPTIONS requests', () => {
    it('should handle CORS preflight', async () => {
      const event = createMockEvent('OPTIONS', '/haunted-patch/accept');
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(response.headers).toHaveProperty('Access-Control-Allow-Origin');
      expect(response.headers).toHaveProperty('Access-Control-Allow-Methods');
    });
  });

  describe('POST /haunted-patch/accept', () => {
    it('should accept a patch successfully', async () => {
      const mockPatch = {
        id: 'patch-1',
        issueId: 'issue-1',
        originalCode: 'const x = 1',
        cursedCode: 'const x = 1;',
        explanation: 'Added semicolon',
        confidence: 0.9,
      };

      vi.mocked(hauntedPatchForge.acceptPatch).mockResolvedValue(mockPatch);

      const event = createMockEvent('POST', '/haunted-patch/accept', {
        scanId: 'scan-123',
        patchId: 'patch-1',
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(hauntedPatchForge.acceptPatch).toHaveBeenCalledWith('scan-123', 'patch-1');

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.patch).toEqual(mockPatch);
      expect(body.formattedCode).toBe('const x = 1;');
    });

    it('should return 401 if not authenticated', async () => {
      const event = createMockEvent('POST', '/haunted-patch/accept', {
        scanId: 'scan-123',
        patchId: 'patch-1',
      });
      event.requestContext.authorizer = undefined;

      const response = await handler(event);

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 if body is missing', async () => {
      const event = createMockEvent('POST', '/haunted-patch/accept');

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('BAD_REQUEST');
    });

    it('should return 400 if scanId or patchId is missing', async () => {
      const event = createMockEvent('POST', '/haunted-patch/accept', {
        scanId: 'scan-123',
        // Missing patchId
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('BAD_REQUEST');
    });

    it('should return 404 if patch not found', async () => {
      vi.mocked(hauntedPatchForge.acceptPatch).mockRejectedValue(
        new Error('Patch not found')
      );

      const event = createMockEvent('POST', '/haunted-patch/accept', {
        scanId: 'scan-123',
        patchId: 'patch-999',
      });

      const response = await handler(event);

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /haunted-patch/{scanId}/{patchId}', () => {
    it('should get a patch successfully', async () => {
      const mockPatch = {
        id: 'patch-1',
        issueId: 'issue-1',
        originalCode: 'const x = 1',
        cursedCode: 'const x = 1;',
        explanation: 'Added semicolon',
        confidence: 0.9,
      };

      vi.mocked(hauntedPatchForge.getPatch).mockResolvedValue(mockPatch);

      const event = createMockEvent(
        'GET',
        '/haunted-patch/scan-123/patch-1',
        undefined,
        { scanId: 'scan-123', patchId: 'patch-1' }
      );

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(hauntedPatchForge.getPatch).toHaveBeenCalledWith('scan-123', 'patch-1');

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.patch).toEqual(mockPatch);
    });

    it('should return 404 if patch not found', async () => {
      vi.mocked(hauntedPatchForge.getPatch).mockResolvedValue(null);

      const event = createMockEvent(
        'GET',
        '/haunted-patch/scan-123/patch-999',
        undefined,
        { scanId: 'scan-123', patchId: 'patch-999' }
      );

      const response = await handler(event);

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /haunted-patches/{scanId}', () => {
    it('should get all patches for a scan', async () => {
      const mockPatches = [
        {
          id: 'patch-1',
          issueId: 'issue-1',
          originalCode: 'const x = 1',
          cursedCode: 'const x = 1;',
          explanation: 'Added semicolon',
          confidence: 0.9,
        },
        {
          id: 'patch-2',
          issueId: 'issue-2',
          originalCode: 'let y = 2',
          cursedCode: 'const y = 2;',
          explanation: 'Changed let to const',
          confidence: 0.85,
        },
      ];

      vi.mocked(hauntedPatchForge.getPatchesForScan).mockResolvedValue(mockPatches);

      const event = createMockEvent(
        'GET',
        '/haunted-patches/scan-123',
        undefined,
        { scanId: 'scan-123' }
      );

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      expect(hauntedPatchForge.getPatchesForScan).toHaveBeenCalledWith('scan-123');

      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.patches).toEqual(mockPatches);
      expect(body.count).toBe(2);
    });

    it('should return empty array if no patches found', async () => {
      vi.mocked(hauntedPatchForge.getPatchesForScan).mockResolvedValue([]);

      const event = createMockEvent(
        'GET',
        '/haunted-patches/scan-123',
        undefined,
        { scanId: 'scan-123' }
      );

      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.patches).toEqual([]);
      expect(body.count).toBe(0);
    });
  });

  describe('Unknown routes', () => {
    it('should return 404 for unknown paths', async () => {
      const event = createMockEvent('GET', '/unknown-path');

      const response = await handler(event);

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });
});
