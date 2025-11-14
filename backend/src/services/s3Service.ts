// S3 service for storing and retrieving code submissions

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({});
const CODE_CRYPT_BUCKET = process.env.CODE_CRYPT_BUCKET || 'code-crypt-bucket';
const LARGE_CODE_THRESHOLD = 100000; // 100KB

export class S3Service {
  /**
   * Check if code should be stored in S3 (based on size)
   */
  shouldStoreInS3(code: string): boolean {
    return Buffer.byteLength(code, 'utf8') > LARGE_CODE_THRESHOLD;
  }

  /**
   * Store code in S3
   */
  async storeCode(scanId: string, code: string, language: string): Promise<string> {
    const key = `scans/${scanId}/original.txt`;

    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: CODE_CRYPT_BUCKET,
          Key: key,
          Body: code,
          ContentType: 'text/plain',
          Metadata: {
            scanId,
            language,
            timestamp: new Date().toISOString(),
          },
        })
      );

      console.log(`Code stored in S3: ${key}`);
      return key;
    } catch (error) {
      console.error('Error storing code in S3:', error);
      throw new Error('Failed to store code in the CodeCrypt');
    }
  }

  /**
   * Retrieve code from S3
   */
  async retrieveCode(s3Key: string): Promise<string> {
    try {
      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: CODE_CRYPT_BUCKET,
          Key: s3Key,
        })
      );

      if (!response.Body) {
        throw new Error('No content in S3 object');
      }

      const code = await response.Body.transformToString();
      console.log(`Code retrieved from S3: ${s3Key}`);
      return code;
    } catch (error) {
      console.error('Error retrieving code from S3:', error);
      throw new Error('Failed to retrieve code from the CodeCrypt');
    }
  }

  /**
   * Store metadata for a scan
   */
  async storeMetadata(scanId: string, metadata: any): Promise<void> {
    const key = `scans/${scanId}/metadata.json`;

    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: CODE_CRYPT_BUCKET,
          Key: key,
          Body: JSON.stringify(metadata, null, 2),
          ContentType: 'application/json',
        })
      );

      console.log(`Metadata stored in S3: ${key}`);
    } catch (error) {
      console.error('Error storing metadata in S3:', error);
      // Non-critical, don't throw
    }
  }
}
