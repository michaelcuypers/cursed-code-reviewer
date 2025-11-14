// User service for managing soul records and preferences in DynamoDB

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { UserPreferences, UserContext, DynamoDBSoulRecord } from '../types/auth';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TOMBSTONE_TABLE = process.env.TOMBSTONE_TABLE_NAME || 'TombstoneDB';

export class UserService {
  /**
   * Get or create user record in DynamoDB
   */
  async getOrCreateUser(soulId: string, email: string): Promise<UserContext> {
    const PK = `SOUL#${soulId}`;
    const SK = 'METADATA';

    try {
      // Try to get existing user
      const getResult = await docClient.send(
        new GetCommand({
          TableName: TOMBSTONE_TABLE,
          Key: { PK, SK },
        })
      );

      if (getResult.Item) {
        const record = getResult.Item as DynamoDBSoulRecord;
        
        // Update last seen timestamp
        await this.updateLastSeen(soulId);

        return {
          user: {
            soulId: record.soulId,
            email: record.email,
            createdAt: record.createdAt,
            lastSeenAt: new Date().toISOString(),
          },
          preferences: record.preferences,
        };
      }

      // Create new user if doesn't exist
      const now = new Date().toISOString();
      const defaultPreferences: UserPreferences = {
        defaultSeverity: 'moderate',
        autoFixEnabled: false,
        enabledRuleCategories: ['all'],
        theme: 'dark',
      };

      const newRecord: DynamoDBSoulRecord = {
        PK,
        SK,
        entityType: 'Soul',
        soulId,
        email,
        createdAt: now,
        lastSeenAt: now,
        preferences: defaultPreferences,
      };

      await docClient.send(
        new PutCommand({
          TableName: TOMBSTONE_TABLE,
          Item: newRecord,
        })
      );

      return {
        user: {
          soulId,
          email,
          createdAt: now,
          lastSeenAt: now,
        },
        preferences: defaultPreferences,
      };
    } catch (error) {
      console.error('Error getting/creating user:', error);
      throw new Error('Failed to retrieve user context from the crypt');
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(soulId: string, preferences: Partial<UserPreferences>): Promise<void> {
    const PK = `SOUL#${soulId}`;
    const SK = 'METADATA';

    try {
      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      Object.entries(preferences).forEach(([key, value], index) => {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        updateExpressions.push(`preferences.${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
      });

      await docClient.send(
        new UpdateCommand({
          TableName: TOMBSTONE_TABLE,
          Key: { PK, SK },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
        })
      );
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw new Error('Failed to update cursed preferences');
    }
  }

  /**
   * Update last seen timestamp
   */
  async updateLastSeen(soulId: string): Promise<void> {
    const PK = `SOUL#${soulId}`;
    const SK = 'METADATA';

    try {
      await docClient.send(
        new UpdateCommand({
          TableName: TOMBSTONE_TABLE,
          Key: { PK, SK },
          UpdateExpression: 'SET lastSeenAt = :timestamp',
          ExpressionAttributeValues: {
            ':timestamp': new Date().toISOString(),
          },
        })
      );
    } catch (error) {
      console.error('Error updating last seen:', error);
      // Non-critical error, don't throw
    }
  }

  /**
   * Increment user's total scan count
   */
  async incrementScanCount(soulId: string): Promise<void> {
    const PK = `SOUL#${soulId}`;
    const SK = 'METADATA';

    try {
      await docClient.send(
        new UpdateCommand({
          TableName: TOMBSTONE_TABLE,
          Key: { PK, SK },
          UpdateExpression: 'ADD totalScans :increment',
          ExpressionAttributeValues: {
            ':increment': 1,
          },
        })
      );
    } catch (error) {
      console.error('Error incrementing scan count:', error);
      // Non-critical error, don't throw
    }
  }

  /**
   * Get user preferences
   */
  async getPreferences(soulId: string): Promise<UserPreferences> {
    const PK = `SOUL#${soulId}`;
    const SK = 'METADATA';

    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: TOMBSTONE_TABLE,
          Key: { PK, SK },
        })
      );

      if (result.Item) {
        const record = result.Item as DynamoDBSoulRecord;
        return record.preferences;
      }

      // Return defaults if user not found
      return {
        defaultSeverity: 'moderate',
        autoFixEnabled: false,
        enabledRuleCategories: ['all'],
        theme: 'dark',
      };
    } catch (error) {
      console.error('Error getting preferences:', error);
      throw new Error('Failed to retrieve cursed preferences');
    }
  }
}
