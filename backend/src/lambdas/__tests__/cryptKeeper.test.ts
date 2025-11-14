// Tests for CryptKeeper Lambda - Token validation and authorization

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from '../cryptKeeper';
import type { APIGatewayRequestAuthorizerEvent, Context } from 'aws-lambda';
import { UserService } from '../../services/userService';

vi.mock('../../services/userService');

describe('CryptKeeper Lambda Authorization', () => {
  const mockContext = {} as Context;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should deny access when no token is provided', async () => {
    const event = {
      type: 'REQUEST',
      methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef/prod/GET/spectral-scan',
      headers: {},
    } as unknown as APIGatewayRequestAuthorizerEvent;

    await expect(handler(event, mockContext)).rejects.toThrow('Unauthorized');
  });

  it('should authorize valid token and enrich user context', async () => {
    const mockUserContext = {
      user: {
        soulId: 'soul-123',
        email: 'test@darkness.com',
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      },
      preferences: {
        defaultSeverity: 'moderate' as const,
        autoFixEnabled: true,
        enabledRuleCategories: ['security', 'performance', 'maintainability'],
        theme: 'dark' as const,
      },
    };

    vi.mocked(UserService.prototype.getOrCreateUser).mockResolvedValue(mockUserContext);

    // Create a valid JWT token (base64 encoded)
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(
      JSON.stringify({
        sub: 'soul-123',
        email: 'test@darkness.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString('base64');
    const signature = 'mock-signature';
    const token = `${header}.${payload}.${signature}`;

    const event = {
      type: 'REQUEST',
      methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef/prod/GET/spectral-scan',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    } as unknown as APIGatewayRequestAuthorizerEvent;

    const result = await handler(event, mockContext);

    expect(result.principalId).toBe('soul-123');
    expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
    expect(result.context).toEqual({
      soulId: 'soul-123',
      email: 'test@darkness.com',
      defaultSeverity: 'moderate',
      autoFixEnabled: 'true',
      userPreferences: JSON.stringify(mockUserContext.preferences),
    });
  });

  it('should handle token without Bearer prefix', async () => {
    const mockUserContext = {
      user: {
        soulId: 'soul-456',
        email: 'another@darkness.com',
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      },
      preferences: {
        defaultSeverity: 'critical' as const,
        autoFixEnabled: false,
        enabledRuleCategories: ['security'],
        theme: 'darker' as const,
      },
    };

    vi.mocked(UserService.prototype.getOrCreateUser).mockResolvedValue(mockUserContext);

    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(
      JSON.stringify({
        sub: 'soul-456',
        email: 'another@darkness.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString('base64');
    const signature = 'mock-signature';
    const token = `${header}.${payload}.${signature}`;

    const event = {
      type: 'REQUEST',
      methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef/prod/GET/spectral-scan',
      headers: {
        authorization: token, // lowercase header, no Bearer prefix
      },
    } as unknown as APIGatewayRequestAuthorizerEvent;

    const result = await handler(event, mockContext);

    expect(result.principalId).toBe('soul-456');
    expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
  });

  it('should deny access for malformed token', async () => {
    const event = {
      type: 'REQUEST',
      methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef/prod/GET/spectral-scan',
      headers: {
        Authorization: 'Bearer invalid-token',
      },
    } as unknown as APIGatewayRequestAuthorizerEvent;

    await expect(handler(event, mockContext)).rejects.toThrow('Unauthorized');
  });

  it('should deny access for token without required claims', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(
      JSON.stringify({
        // Missing sub and email
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString('base64');
    const signature = 'mock-signature';
    const token = `${header}.${payload}.${signature}`;

    const event = {
      type: 'REQUEST',
      methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef/prod/GET/spectral-scan',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    } as unknown as APIGatewayRequestAuthorizerEvent;

    await expect(handler(event, mockContext)).rejects.toThrow('Unauthorized');
  });

  it('should handle user service errors gracefully', async () => {
    vi.mocked(UserService.prototype.getOrCreateUser).mockRejectedValue(
      new Error('DynamoDB error')
    );

    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(
      JSON.stringify({
        sub: 'soul-789',
        email: 'error@darkness.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString('base64');
    const signature = 'mock-signature';
    const token = `${header}.${payload}.${signature}`;

    const event = {
      type: 'REQUEST',
      methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef/prod/GET/spectral-scan',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    } as unknown as APIGatewayRequestAuthorizerEvent;

    await expect(handler(event, mockContext)).rejects.toThrow('Unauthorized');
  });
});
