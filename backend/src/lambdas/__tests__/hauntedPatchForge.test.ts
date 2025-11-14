// Tests for HauntedPatchForge Lambda

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HauntedPatch } from '../../types/spectral';

// Mock DynamoDB client
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => {
  const mockSend = vi.fn();
  return {
    DynamoDBDocumentClient: {
      from: vi.fn().mockReturnValue({
        send: mockSend,
      }),
    },
    PutCommand: vi.fn().mockImplementation((params) => params),
    GetCommand: vi.fn().mockImplementation((params) => params),
    UpdateCommand: vi.fn().mockImplementation((params) => params),
    QueryCommand: vi.fn().mockImplementation((params) => params),
    __mockSend: mockSend,
  };
});

// Import after mocks
import {
  handler,
  validatePatch,
  applyPatch,
  storePatch,
  getPatch,
  getPatchesForScan,
  acceptPatch,
  forgePatch,
} from '../hauntedPatchForge';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Get the mock send function
const getMockSend = () => {
  const docClient = DynamoDBDocumentClient.from({} as any);
  return docClient.send as ReturnType<typeof vi.fn>;
};

describe('HauntedPatchForge Lambda', () => {
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSend = getMockSend();
    vi.clearAllMocks();
  });

  describe('Patch validation', () => {
    it('should validate a correct patch', () => {
      const patch: HauntedPatch = {
        id: 'patch-1',
        issueId: 'issue-1',
        originalCode: 'var x = 1',
        cursedCode: 'const x = 1;',
        explanation: 'Changed var to const',
        confidence: 0.9,
      };

      expect(validatePatch(patch)).toBe(true);
    });

    it('should reject patch with missing required fields', () => {
      const patch: HauntedPatch = {
        id: 'patch-1',
        issueId: 'issue-1',
        originalCode: '',
        cursedCode: 'const x = 1;',
        explanation: 'Changed var to const',
        confidence: 0.9,
      };

      expect(validatePatch(patch)).toBe(false);
    });

    it('should reject patch that does not modify code', () => {
      const patch: HauntedPatch = {
        id: 'patch-1',
        issueId: 'issue-1',
        originalCode: 'const x = 1;',
        cursedCode: 'const x = 1;',
        explanation: 'No change',
        confidence: 0.9,
      };

      expect(validatePatch(patch)).toBe(false);
    });

    it('should reject patch with unbalanced brackets', () => {
      const patch: HauntedPatch = {
        id: 'patch-1',
        issueId: 'issue-1',
        originalCode: 'function test() {}',
        cursedCode: 'function test() {',
        explanation: 'Missing closing brace',
        confidence: 0.9,
      };

      expect(validatePatch(patch)).toBe(false);
    });

    it('should reject patch with unbalanced parentheses', () => {
      const patch: HauntedPatch = {
        id: 'patch-1',
        issueId: 'issue-1',
        originalCode: 'console.log("test")',
        cursedCode: 'console.log("test"',
        explanation: 'Missing closing paren',
        confidence: 0.9,
      };

      expect(validatePatch(patch)).toBe(false);
    });

    it('should reject patch with confidence out of range', () => {
      const patch: HauntedPatch = {
        id: 'patch-1',
        issueId: 'issue-1',
        originalCode: 'var x = 1',
        cursedCode: 'const x = 1;',
        explanation: 'Changed var to const',
        confidence: 1.5,
      };

      expect(validatePatch(patch)).toBe(false);
    });

    it('should reject patch with negative confidence', () => {
      const patch: HauntedPatch = {
        id: 'patch-1',
        issueId: 'issue-1',
        originalCode: 'var x = 1',
        cursedCode: 'const x = 1;',
        explanation: 'Changed var to const',
        confidence: -0.1,
      };

      expect(validatePatch(patch)).toBe(false);
    });

    it('should reject patch with syntax errors (multiple semicolons)', () => {
      const patch: HauntedPatch = {
        id: 'patch-1',
        issueId: 'issue-1',
        originalCode: 'const x = 1',
        cursedCode: 'const x = 1;;',
        explanation: 'Added semicolons',
        confidence: 0.9,
      };

      expect(validatePatch(patch)).toBe(false);
    });

    it('should validate patch with balanced nested brackets', () => {
      const patch: HauntedPatch = {
        id: 'patch-1',
        issueId: 'issue-1',
        originalCode: 'const obj = {a: 1}',
        cursedCode: 'const obj = { a: [1, 2, { b: 3 }] };',
        explanation: 'Added nested structure',
        confidence: 0.8,
      };

      expect(validatePatch(patch)).toBe(true);
    });
  });

  describe('Patch application', () => {
    it('should apply patch by returning cursed code', () => {
      const patch: HauntedPatch = {
        id: 'patch-1',
        issueId: 'issue-1',
        originalCode: 'var x = 1',
        cursedCode: 'const x = 1;',
        explanation: 'Changed var to const',
        confidence: 0.9,
      };

      const result = applyPatch('var x = 1', patch);
      expect(result).toBe('const x = 1;');
    });

    it('should return cursed code regardless of original', () => {
      const patch: HauntedPatch = {
        id: 'patch-1',
        issueId: 'issue-1',
        originalCode: 'old code',
        cursedCode: 'new code',
        explanation: 'Fixed',
        confidence: 0.9,
      };

      const result = applyPatch('different original', patch);
      expect(result).toBe('new code');
    });
  });

  describe('Patch storage', () => {
    it('should store patch in DynamoDB', async () => {
      mockSend.mockResolvedValue({});

      const patch: HauntedPatch = {
        id: 'patch-1',
        issueId: 'issue-1',
        originalCode: 'var x = 1',
        cursedCode: 'const x = 1;',
        explanation: 'Changed var to const',
        confidence: 0.9,
      };

      await storePatch('scan-123', patch);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.TableName).toBe('TombstoneDB');
      expect(callArgs.Item.PK).toBe('SCAN#scan-123');
      expect(callArgs.Item.SK).toBe('PATCH#patch-1');
      expect(callArgs.Item.entityType).toBe('HauntedPatch');
      expect(callArgs.Item.patchId).toBe('patch-1');
      expect(callArgs.Item.accepted).toBe(false);
    });

    it('should generate patch ID if not provided', async () => {
      mockSend.mockResolvedValue({});

      const patch: HauntedPatch = {
        id: 'patch-123',
        issueId: 'issue-1',
        originalCode: 'var x = 1',
        cursedCode: 'const x = 1;',
        explanation: 'Changed var to const',
        confidence: 0.9,
      };

      await storePatch('scan-123', patch);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.Item.patchId).toBeDefined();
      expect(callArgs.Item.patchId.length).toBeGreaterThan(0);
    });

    it('should throw error if DynamoDB fails', async () => {
      mockSend.mockRejectedValue(new Error('DynamoDB error'));

      const patch: HauntedPatch = {
        id: 'patch-1',
        issueId: 'issue-1',
        originalCode: 'var x = 1',
        cursedCode: 'const x = 1;',
        explanation: 'Changed var to const',
        confidence: 0.9,
      };

      await expect(storePatch('scan-123', patch)).rejects.toThrow(
        'Failed to store patch in TombstoneDB'
      );
    });
  });

  describe('Patch retrieval', () => {
    it('should get patch by ID', async () => {
      const mockPatchRecord = {
        PK: 'SCAN#scan-123',
        SK: 'PATCH#patch-1',
        entityType: 'HauntedPatch',
        patchId: 'patch-1',
        issueId: 'issue-1',
        originalCode: 'var x = 1',
        cursedCode: 'const x = 1;',
        explanation: 'Changed var to const',
        confidence: 0.9,
        accepted: false,
      };

      mockSend.mockResolvedValue({ Item: mockPatchRecord });

      const patch = await getPatch('scan-123', 'patch-1');

      expect(patch).not.toBeNull();
      expect(patch?.id).toBe('patch-1');
      expect(patch?.issueId).toBe('issue-1');
      expect(patch?.originalCode).toBe('var x = 1');
      expect(patch?.cursedCode).toBe('const x = 1;');
      expect(patch?.confidence).toBe(0.9);
    });

    it('should return null if patch not found', async () => {
      mockSend.mockResolvedValue({});

      const patch = await getPatch('scan-123', 'patch-999');

      expect(patch).toBeNull();
    });

    it('should throw error if DynamoDB fails', async () => {
      mockSend.mockRejectedValue(new Error('DynamoDB error'));

      await expect(getPatch('scan-123', 'patch-1')).rejects.toThrow(
        'Failed to retrieve patch from TombstoneDB'
      );
    });
  });

  describe('Get patches for scan', () => {
    it('should get all patches for a scan', async () => {
      const mockPatchRecords = [
        {
          PK: 'SCAN#scan-123',
          SK: 'PATCH#patch-1',
          entityType: 'HauntedPatch',
          patchId: 'patch-1',
          issueId: 'issue-1',
          originalCode: 'var x = 1',
          cursedCode: 'const x = 1;',
          explanation: 'Changed var to const',
          confidence: 0.9,
          accepted: false,
        },
        {
          PK: 'SCAN#scan-123',
          SK: 'PATCH#patch-2',
          entityType: 'HauntedPatch',
          patchId: 'patch-2',
          issueId: 'issue-2',
          originalCode: 'let y = 2',
          cursedCode: 'const y = 2;',
          explanation: 'Changed let to const',
          confidence: 0.85,
          accepted: false,
        },
      ];

      mockSend.mockResolvedValue({ Items: mockPatchRecords });

      const patches = await getPatchesForScan('scan-123');

      expect(patches).toHaveLength(2);
      expect(patches[0].id).toBe('patch-1');
      expect(patches[1].id).toBe('patch-2');
    });

    it('should return empty array if no patches found', async () => {
      mockSend.mockResolvedValue({ Items: [] });

      const patches = await getPatchesForScan('scan-123');

      expect(patches).toEqual([]);
    });

    it('should return empty array if Items is undefined', async () => {
      mockSend.mockResolvedValue({});

      const patches = await getPatchesForScan('scan-123');

      expect(patches).toEqual([]);
    });

    it('should throw error if DynamoDB fails', async () => {
      mockSend.mockRejectedValue(new Error('DynamoDB error'));

      await expect(getPatchesForScan('scan-123')).rejects.toThrow(
        'Failed to retrieve patches from TombstoneDB'
      );
    });
  });

  describe('Patch acceptance', () => {
    it('should accept a patch and update DynamoDB', async () => {
      const mockUpdatedRecord = {
        PK: 'SCAN#scan-123',
        SK: 'PATCH#patch-1',
        entityType: 'HauntedPatch',
        patchId: 'patch-1',
        issueId: 'issue-1',
        originalCode: 'var x = 1',
        cursedCode: 'const x = 1;',
        explanation: 'Changed var to const',
        confidence: 0.9,
        accepted: true,
        appliedAt: '2024-01-01T00:00:00.000Z',
      };

      mockSend.mockResolvedValue({ Attributes: mockUpdatedRecord });

      const patch = await acceptPatch('scan-123', 'patch-1');

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.Key.PK).toBe('SCAN#scan-123');
      expect(callArgs.Key.SK).toBe('PATCH#patch-1');
      expect(callArgs.UpdateExpression).toContain('accepted');
      expect(callArgs.UpdateExpression).toContain('appliedAt');
      expect(callArgs.ExpressionAttributeValues[':accepted']).toBe(true);

      expect(patch.id).toBe('patch-1');
      expect(patch.cursedCode).toBe('const x = 1;');
    });

    it('should throw error if patch not found', async () => {
      mockSend.mockResolvedValue({});

      await expect(acceptPatch('scan-123', 'patch-999')).rejects.toThrow(
        'Failed to accept patch in TombstoneDB'
      );
    });

    it('should throw error if DynamoDB fails', async () => {
      mockSend.mockRejectedValue(new Error('DynamoDB error'));

      await expect(acceptPatch('scan-123', 'patch-1')).rejects.toThrow(
        'Failed to accept patch in TombstoneDB'
      );
    });
  });

  describe('Patch generation (forgePatch)', () => {
    it('should generate a valid patch', async () => {
      const patch = await forgePatch(
        'issue-1',
        'var x = 1',
        'const x = 1;',
        'Changed var to const for immutability',
        0.9
      );

      expect(patch.id).toBeDefined();
      expect(patch.issueId).toBe('issue-1');
      expect(patch.originalCode).toBe('var x = 1');
      expect(patch.cursedCode).toBe('const x = 1;');
      expect(patch.explanation).toBe('Changed var to const for immutability');
      expect(patch.confidence).toBe(0.9);
    });

    it('should throw error if patch fails validation', async () => {
      await expect(
        forgePatch(
          'issue-1',
          'const x = 1;',
          'const x = 1;', // Same as original
          'No change',
          0.9
        )
      ).rejects.toThrow('Generated patch failed validation');
    });

    it('should throw error for invalid syntax', async () => {
      await expect(
        forgePatch(
          'issue-1',
          'function test() {}',
          'function test() {', // Unbalanced braces
          'Broken function',
          0.9
        )
      ).rejects.toThrow('Generated patch failed validation');
    });

    it('should throw error for confidence out of range', async () => {
      await expect(
        forgePatch(
          'issue-1',
          'var x = 1',
          'const x = 1;',
          'Changed var to const',
          1.5 // Invalid confidence
        )
      ).rejects.toThrow('Generated patch failed validation');
    });
  });

  describe('Lambda handler', () => {
    it('should handle forgePatch action', async () => {
      mockSend.mockResolvedValue({});

      const event = {
        action: 'forgePatch' as const,
        scanId: 'scan-123',
        issueId: 'issue-1',
        originalCode: 'var x = 1',
        cursedCode: 'const x = 1;',
        explanation: 'Changed var to const',
        confidence: 0.9,
      };

      const response = await handler(event);

      expect(response.success).toBe(true);
      expect(response.patch).toBeDefined();
      expect(response.patch?.issueId).toBe('issue-1');
      expect(response.patch?.cursedCode).toBe('const x = 1;');
      expect(mockSend).toHaveBeenCalled(); // Should store patch
    });

    it('should handle forgePatch without scanId (no storage)', async () => {
      const event = {
        action: 'forgePatch' as const,
        issueId: 'issue-1',
        originalCode: 'var x = 1',
        cursedCode: 'const x = 1;',
        explanation: 'Changed var to const',
        confidence: 0.9,
      };

      const response = await handler(event);

      expect(response.success).toBe(true);
      expect(response.patch).toBeDefined();
      expect(mockSend).not.toHaveBeenCalled(); // Should not store
    });

    it('should handle acceptPatch action', async () => {
      const mockUpdatedRecord = {
        patchId: 'patch-1',
        issueId: 'issue-1',
        originalCode: 'var x = 1',
        cursedCode: 'const x = 1;',
        explanation: 'Changed var to const',
        confidence: 0.9,
      };

      mockSend.mockResolvedValue({ Attributes: mockUpdatedRecord });

      const event = {
        action: 'acceptPatch' as const,
        scanId: 'scan-123',
        patchId: 'patch-1',
      };

      const response = await handler(event);

      expect(response.success).toBe(true);
      expect(response.patch).toBeDefined();
      expect(response.patch?.id).toBe('patch-1');
    });

    it('should handle getPatch action', async () => {
      const mockPatchRecord = {
        PK: 'SCAN#scan-123',
        SK: 'PATCH#patch-1',
        entityType: 'HauntedPatch',
        patchId: 'patch-1',
        issueId: 'issue-1',
        originalCode: 'var x = 1',
        cursedCode: 'const x = 1;',
        explanation: 'Changed var to const',
        confidence: 0.9,
      };

      mockSend.mockResolvedValue({ Item: mockPatchRecord });

      const event = {
        action: 'getPatch' as const,
        scanId: 'scan-123',
        patchId: 'patch-1',
      };

      const response = await handler(event);

      expect(response.success).toBe(true);
      expect(response.patch).toBeDefined();
      expect(response.patch?.id).toBe('patch-1');
    });

    it('should handle getPatchesForScan action', async () => {
      const mockPatchRecords = [
        {
          patchId: 'patch-1',
          issueId: 'issue-1',
          originalCode: 'var x = 1',
          cursedCode: 'const x = 1;',
          explanation: 'Changed var to const',
          confidence: 0.9,
        },
      ];

      mockSend.mockResolvedValue({ Items: mockPatchRecords });

      const event = {
        action: 'getPatchesForScan' as const,
        scanId: 'scan-123',
      };

      const response = await handler(event);

      expect(response.success).toBe(true);
      expect(response.patches).toBeDefined();
      expect(response.patches?.length).toBe(1);
    });

    it('should return error for missing fields in forgePatch', async () => {
      const event = {
        action: 'forgePatch' as const,
        issueId: 'issue-1',
        // Missing required fields
      };

      const response = await handler(event);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Missing required fields');
    });

    it('should return error for missing scanId in acceptPatch', async () => {
      const event = {
        action: 'acceptPatch' as const,
        patchId: 'patch-1',
        // Missing scanId
      };

      const response = await handler(event);

      expect(response.success).toBe(false);
      expect(response.error).toContain('scanId and patchId are required');
    });

    it('should return error for missing scanId in getPatch', async () => {
      const event = {
        action: 'getPatch' as const,
        patchId: 'patch-1',
        // Missing scanId
      };

      const response = await handler(event);

      expect(response.success).toBe(false);
      expect(response.error).toContain('scanId and patchId are required');
    });

    it('should return error for missing scanId in getPatchesForScan', async () => {
      const event = {
        action: 'getPatchesForScan' as const,
        // Missing scanId
      };

      const response = await handler(event);

      expect(response.success).toBe(false);
      expect(response.error).toContain('scanId is required');
    });

    it('should return error for unknown action', async () => {
      const event = {
        action: 'unknownAction' as any,
      };

      const response = await handler(event);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Unknown action');
    });

    it('should return error when patch not found in getPatch', async () => {
      mockSend.mockResolvedValue({});

      const event = {
        action: 'getPatch' as const,
        scanId: 'scan-123',
        patchId: 'patch-999',
      };

      const response = await handler(event);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Patch not found');
    });

    it('should handle validation errors in forgePatch', async () => {
      const event = {
        action: 'forgePatch' as const,
        issueId: 'issue-1',
        originalCode: 'const x = 1;',
        cursedCode: 'const x = 1;', // Same as original
        explanation: 'No change',
        confidence: 0.9,
      };

      const response = await handler(event);

      expect(response.success).toBe(false);
      expect(response.error).toContain('validation');
    });
  });
});
