// Scan service for managing spectral scans in DynamoDB

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand,
  QueryCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import type { 
  SpectralScanRecord, 
  CursedIssueRecord,
  CursedIssue,
} from '../types/spectral';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TOMBSTONE_TABLE = process.env.TOMBSTONE_TABLE_NAME || 'TombstoneDB';
const SCAN_RETENTION_DAYS = 90;

export class ScanService {
  /**
   * Store scan metadata in DynamoDB
   */
  async storeScan(
    scanId: string,
    soulId: string,
    submissionType: 'file' | 'pr' | 'text',
    language: string,
    severityLevel: string,
    scanDuration: number,
    overallCurseLevel: number,
    s3CodeKey?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    const ttl = Math.floor(Date.now() / 1000) + (SCAN_RETENTION_DAYS * 24 * 60 * 60);

    const record: SpectralScanRecord = {
      PK: `SCAN#${scanId}`,
      SK: 'METADATA',
      entityType: 'SpectralScan',
      scanId,
      soulId,
      submissionType,
      s3CodeKey,
      language,
      severityLevel,
      scanTimestamp: now,
      scanDuration,
      overallCurseLevel,
      status: 'completed',
      ttl,
    };

    try {
      await docClient.send(
        new PutCommand({
          TableName: TOMBSTONE_TABLE,
          Item: record,
        })
      );

      console.log(`Scan stored in DynamoDB: ${scanId}`);
    } catch (error) {
      console.error('Error storing scan:', error);
      throw new Error('Failed to store scan in TombstoneDB');
    }
  }

  /**
   * Store issues for a scan
   */
  async storeIssues(scanId: string, issues: CursedIssue[]): Promise<void> {
    if (issues.length === 0) {
      console.log('No issues to store');
      return;
    }

    try {
      // DynamoDB BatchWrite supports up to 25 items at a time
      const batchSize = 25;
      for (let i = 0; i < issues.length; i += batchSize) {
        const batch = issues.slice(i, i + batchSize);
        
        const putRequests = batch.map(issue => ({
          PutRequest: {
            Item: {
              PK: `SCAN#${scanId}`,
              SK: `ISSUE#${issue.id}`,
              entityType: 'CursedIssue',
              issueId: issue.id,
              scanId,
              severity: issue.severity,
              lineNumber: issue.lineNumber,
              columnNumber: issue.columnNumber,
              demonicMessage: issue.demonicMessage,
              technicalExplanation: issue.technicalExplanation,
              ruleId: issue.ruleId,
            } as CursedIssueRecord,
          },
        }));

        await docClient.send(
          new BatchWriteCommand({
            RequestItems: {
              [TOMBSTONE_TABLE]: putRequests,
            },
          })
        );
      }

      console.log(`Stored ${issues.length} issues for scan ${scanId}`);
    } catch (error) {
      console.error('Error storing issues:', error);
      throw new Error('Failed to store issues in TombstoneDB');
    }
  }

  /**
   * Get scan by ID
   */
  async getScan(scanId: string): Promise<SpectralScanRecord | null> {
    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: TOMBSTONE_TABLE,
          Key: {
            PK: `SCAN#${scanId}`,
            SK: 'METADATA',
          },
        })
      );

      return result.Item as SpectralScanRecord || null;
    } catch (error) {
      console.error('Error getting scan:', error);
      throw new Error('Failed to retrieve scan from TombstoneDB');
    }
  }

  /**
   * Get issues for a scan
   */
  async getIssues(scanId: string): Promise<CursedIssue[]> {
    try {
      const result = await docClient.send(
        new QueryCommand({
          TableName: TOMBSTONE_TABLE,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: {
            ':pk': `SCAN#${scanId}`,
            ':sk': 'ISSUE#',
          },
        })
      );

      if (!result.Items || result.Items.length === 0) {
        return [];
      }

      return result.Items.map(item => {
        const record = item as CursedIssueRecord;
        return {
          id: record.issueId,
          severity: record.severity as 'minor' | 'moderate' | 'critical',
          lineNumber: record.lineNumber,
          columnNumber: record.columnNumber,
          demonicMessage: record.demonicMessage,
          technicalExplanation: record.technicalExplanation,
          ruleId: record.ruleId,
        };
      });
    } catch (error) {
      console.error('Error getting issues:', error);
      throw new Error('Failed to retrieve issues from TombstoneDB');
    }
  }

  /**
   * Get scan history for a user with optional filtering
   */
  async getScanHistory(
    soulId: string,
    limit: number = 20,
    lastEvaluatedKey?: any,
    startDate?: string,
    endDate?: string,
    severity?: 'minor' | 'moderate' | 'critical'
  ): Promise<{ scans: SpectralScanRecord[]; lastKey?: any }> {
    try {
      // Build the query
      let keyConditionExpression = 'soulId = :soulId';
      const expressionAttributeValues: any = {
        ':soulId': soulId,
      };

      // Add date range filtering if provided
      if (startDate && endDate) {
        keyConditionExpression += ' AND scanTimestamp BETWEEN :startDate AND :endDate';
        expressionAttributeValues[':startDate'] = startDate;
        expressionAttributeValues[':endDate'] = endDate;
      } else if (startDate) {
        keyConditionExpression += ' AND scanTimestamp >= :startDate';
        expressionAttributeValues[':startDate'] = startDate;
      } else if (endDate) {
        keyConditionExpression += ' AND scanTimestamp <= :endDate';
        expressionAttributeValues[':endDate'] = endDate;
      }

      // Build filter expression for severity if provided
      let filterExpression: string | undefined;
      if (severity) {
        filterExpression = 'severityLevel = :severity';
        expressionAttributeValues[':severity'] = severity;
      }

      const queryParams: any = {
        TableName: TOMBSTONE_TABLE,
        IndexName: 'soulId-scanTimestamp-index',
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ScanIndexForward: false, // Sort by timestamp descending
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey,
      };

      if (filterExpression) {
        queryParams.FilterExpression = filterExpression;
      }

      const result = await docClient.send(new QueryCommand(queryParams));

      return {
        scans: (result.Items || []) as SpectralScanRecord[],
        lastKey: result.LastEvaluatedKey,
      };
    } catch (error) {
      console.error('Error getting scan history:', error);
      throw new Error('Failed to retrieve scan history from TombstoneDB');
    }
  }
}
