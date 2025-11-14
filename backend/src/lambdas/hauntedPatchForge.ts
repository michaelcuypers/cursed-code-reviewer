// HauntedPatchForge Lambda - Generates and manages code patches

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand,
  UpdateCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type { 
  HauntedPatch,
  HauntedPatchRecord,
} from '../types/spectral';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TOMBSTONE_TABLE = process.env.TOMBSTONE_TABLE_NAME || 'TombstoneDB';

/**
 * Validate patch syntax and correctness
 */
export function validatePatch(patch: HauntedPatch): boolean {
  // 1. Check required fields
  if (!patch.originalCode || !patch.cursedCode || !patch.explanation) {
    console.warn('Patch missing required fields');
    return false;
  }

  // 2. Fixed code should be different from original
  if (patch.originalCode.trim() === patch.cursedCode.trim()) {
    console.warn('Patch does not modify the code');
    return false;
  }

  // 3. Check for balanced brackets/braces/parentheses
  const brackets = { '(': ')', '[': ']', '{': '}' };
  const stack: string[] = [];
  
  for (const char of patch.cursedCode) {
    if (char in brackets) {
      stack.push(brackets[char as keyof typeof brackets]);
    } else if (Object.values(brackets).includes(char)) {
      if (stack.length === 0 || stack.pop() !== char) {
        console.warn('Patch has unbalanced brackets');
        return false;
      }
    }
  }

  if (stack.length !== 0) {
    console.warn('Patch has unbalanced brackets');
    return false;
  }

  // 4. Check confidence is within valid range
  if (patch.confidence < 0 || patch.confidence > 1) {
    console.warn('Patch confidence out of range');
    return false;
  }

  // 5. Check for common syntax errors
  const syntaxErrors = [
    /\)\s*\(/,  // Missing operator between parentheses
    /\}\s*\{/,  // Missing operator between braces
    /;;+/,      // Multiple semicolons
  ];

  for (const pattern of syntaxErrors) {
    if (pattern.test(patch.cursedCode)) {
      console.warn('Patch contains syntax errors');
      return false;
    }
  }

  return true;
}

/**
 * Apply patch to original code (simple replacement)
 */
export function applyPatch(_originalCode: string, patch: HauntedPatch): string {
  // For now, we simply return the cursed (fixed) code
  // In a more sophisticated implementation, this could handle partial replacements
  return patch.cursedCode;
}

/**
 * Store patch in DynamoDB
 */
export async function storePatch(
  scanId: string,
  patch: HauntedPatch
): Promise<void> {
  const patchId = patch.id || randomUUID();
  
  const record: HauntedPatchRecord = {
    PK: `SCAN#${scanId}`,
    SK: `PATCH#${patchId}`,
    entityType: 'HauntedPatch',
    patchId,
    issueId: patch.issueId,
    originalCode: patch.originalCode,
    cursedCode: patch.cursedCode,
    explanation: patch.explanation,
    confidence: patch.confidence,
    accepted: false,
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: TOMBSTONE_TABLE,
        Item: record,
      })
    );

    console.log(`Patch stored in DynamoDB: ${patchId}`);
  } catch (error) {
    console.error('Error storing patch:', error);
    throw new Error('Failed to store patch in TombstoneDB');
  }
}

/**
 * Get patch by ID
 */
export async function getPatch(
  scanId: string,
  patchId: string
): Promise<HauntedPatch | null> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TOMBSTONE_TABLE,
        Key: {
          PK: `SCAN#${scanId}`,
          SK: `PATCH#${patchId}`,
        },
      })
    );

    if (!result.Item) {
      return null;
    }

    const record = result.Item as HauntedPatchRecord;
    return {
      id: record.patchId,
      issueId: record.issueId,
      originalCode: record.originalCode,
      cursedCode: record.cursedCode,
      explanation: record.explanation,
      confidence: record.confidence,
    };
  } catch (error) {
    console.error('Error getting patch:', error);
    throw new Error('Failed to retrieve patch from TombstoneDB');
  }
}

/**
 * Get all patches for a scan
 */
export async function getPatchesForScan(scanId: string): Promise<HauntedPatch[]> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TOMBSTONE_TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `SCAN#${scanId}`,
          ':sk': 'PATCH#',
        },
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    return result.Items.map(item => {
      const record = item as HauntedPatchRecord;
      return {
        id: record.patchId,
        issueId: record.issueId,
        originalCode: record.originalCode,
        cursedCode: record.cursedCode,
        explanation: record.explanation,
        confidence: record.confidence,
      };
    });
  } catch (error) {
    console.error('Error getting patches:', error);
    throw new Error('Failed to retrieve patches from TombstoneDB');
  }
}

/**
 * Accept a patch (mark as accepted and set timestamp)
 */
export async function acceptPatch(
  scanId: string,
  patchId: string
): Promise<HauntedPatch> {
  const now = new Date().toISOString();

  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TOMBSTONE_TABLE,
        Key: {
          PK: `SCAN#${scanId}`,
          SK: `PATCH#${patchId}`,
        },
        UpdateExpression: 'SET accepted = :accepted, appliedAt = :appliedAt',
        ExpressionAttributeValues: {
          ':accepted': true,
          ':appliedAt': now,
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    if (!result.Attributes) {
      throw new Error('Patch not found');
    }

    const record = result.Attributes as HauntedPatchRecord;
    console.log(`Patch accepted: ${patchId}`);

    return {
      id: record.patchId,
      issueId: record.issueId,
      originalCode: record.originalCode,
      cursedCode: record.cursedCode,
      explanation: record.explanation,
      confidence: record.confidence,
    };
  } catch (error) {
    console.error('Error accepting patch:', error);
    throw new Error('Failed to accept patch in TombstoneDB');
  }
}

/**
 * Generate patch from issue and code context
 */
export async function forgePatch(
  issueId: string,
  originalCode: string,
  cursedCode: string,
  explanation: string,
  confidence: number
): Promise<HauntedPatch> {
  const patchId = randomUUID();

  const patch: HauntedPatch = {
    id: patchId,
    issueId,
    originalCode,
    cursedCode,
    explanation,
    confidence,
  };

  // Validate the patch before returning
  if (!validatePatch(patch)) {
    throw new Error('Generated patch failed validation');
  }

  return patch;
}

/**
 * Lambda handler event types
 */
export interface HauntedPatchForgeEvent {
  action: 'forgePatch' | 'acceptPatch' | 'getPatch' | 'getPatchesForScan';
  scanId?: string;
  patchId?: string;
  issueId?: string;
  originalCode?: string;
  cursedCode?: string;
  explanation?: string;
  confidence?: number;
}

export interface HauntedPatchForgeResponse {
  success: boolean;
  patch?: HauntedPatch;
  patches?: HauntedPatch[];
  error?: string;
}

/**
 * Main Lambda handler
 */
export async function handler(
  event: HauntedPatchForgeEvent
): Promise<HauntedPatchForgeResponse> {
  console.log('HauntedPatchForge invoked:', JSON.stringify(event, null, 2));

  try {
    switch (event.action) {
      case 'forgePatch': {
        if (!event.issueId || !event.originalCode || !event.cursedCode || 
            !event.explanation || event.confidence === undefined) {
          throw new Error('Missing required fields for forgePatch action');
        }

        const patch = await forgePatch(
          event.issueId,
          event.originalCode,
          event.cursedCode,
          event.explanation,
          event.confidence
        );

        // Store the patch if scanId is provided
        if (event.scanId) {
          await storePatch(event.scanId, patch);
        }

        return {
          success: true,
          patch,
        };
      }

      case 'acceptPatch': {
        if (!event.scanId || !event.patchId) {
          throw new Error('scanId and patchId are required for acceptPatch action');
        }

        const acceptedPatch = await acceptPatch(event.scanId, event.patchId);

        return {
          success: true,
          patch: acceptedPatch,
        };
      }

      case 'getPatch': {
        if (!event.scanId || !event.patchId) {
          throw new Error('scanId and patchId are required for getPatch action');
        }

        const patch = await getPatch(event.scanId, event.patchId);

        if (!patch) {
          throw new Error('Patch not found');
        }

        return {
          success: true,
          patch,
        };
      }

      case 'getPatchesForScan': {
        if (!event.scanId) {
          throw new Error('scanId is required for getPatchesForScan action');
        }

        const patches = await getPatchesForScan(event.scanId);

        return {
          success: true,
          patches,
        };
      }

      default:
        throw new Error(`Unknown action: ${event.action}`);
    }
  } catch (error: any) {
    console.error('HauntedPatchForge error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
