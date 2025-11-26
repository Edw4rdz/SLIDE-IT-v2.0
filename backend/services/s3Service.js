// backend/services/s3Service.js
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as getSignedUrlSDK } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

// Configure AWS SDK v3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'slideit-conversions';
const REGION = process.env.AWS_REGION || 'ap-southeast-1';

/**
 * Upload a file buffer to S3
 * @param {Buffer} fileBuffer - The file content as a buffer
 * @param {string} fileName - The name to save the file as (include extension)
 * @param {string} contentType - MIME type (e.g., 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
 * @param {string} userId - User ID to organize files by user (optional, defaults to 'anonymous')
 * @returns {Promise<{success: boolean, url: string, key: string}>}
 */
export const uploadToS3 = async (fileBuffer, fileName, contentType = 'application/octet-stream', userId = 'anonymous') => {
  try {
    // Generate a unique key for the file organized by user
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const sanitizedUserId = String(userId).replace(/[^a-zA-Z0-9_-]/g, '_');
    
    // Store in: conversions/user-{userId}/{timestamp}-{filename}
    const key = `conversions/user-${sanitizedUserId}/${timestamp}-${sanitizedFileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      // Remove ACL - the bucket doesn't allow public ACLs
      // Access is controlled by bucket policy instead
      // ACL: 'public-read',  // REMOVED
      // Add metadata
      Metadata: {
        'uploaded-at': new Date().toISOString(),
        'original-filename': fileName,
        'user-id': sanitizedUserId
      }
    });

    console.log(`[S3] Uploading to bucket: ${BUCKET_NAME}, key: ${key}`);
    
    await s3Client.send(command);
    
    // Construct the public URL
    const url = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${key}`;
    
    console.log(`[S3] Upload successful: ${url}`);

    return {
      success: true,
      url: url, // Public URL
      key: key, // S3 key for later retrieval/deletion
      bucket: BUCKET_NAME
    };
  } catch (error) {
    console.error('[S3] Upload failed:', error);
    throw new Error(`S3 upload failed: ${error.message}`);
  }
};

/**
 * Delete a file from S3
 * @param {string} key - The S3 key of the file to delete
 * @returns {Promise<{success: boolean}>}
 */
export const deleteFromS3 = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    await s3Client.send(command);
    console.log(`[S3] Deleted file: ${key}`);

    return { success: true };
  } catch (error) {
    console.error('[S3] Delete failed:', error);
    throw new Error(`S3 delete failed: ${error.message}`);
  }
};

/**
 * Get a signed URL for temporary access to a private file
 * @param {string} key - The S3 key of the file
 * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>}
 */
export const getSignedUrl = async (key, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    const url = await getSignedUrlSDK(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('[S3] Failed to generate signed URL:', error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
};

/**
 * Check if S3 is configured properly
 * @returns {Promise<boolean>}
 */
export const testS3Connection = async () => {
  try {
    const command = new HeadBucketCommand({ Bucket: BUCKET_NAME });
    await s3Client.send(command);
    console.log(`[S3] Successfully connected to bucket: ${BUCKET_NAME}`);
    return true;
  } catch (error) {
    console.error('[S3] Connection test failed:', error.message);
    return false;
  }
};
