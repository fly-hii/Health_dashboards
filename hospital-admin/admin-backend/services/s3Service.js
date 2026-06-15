const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');

const awsRegion = process.env.AWS_REGION;
const awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
const BUCKET = process.env.AWS_S3_BUCKET;

if (!awsRegion || !awsAccessKey || !awsSecretKey || !BUCKET) {
  throw new Error('AWS S3 environment variables (AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET) are not fully configured.');
}

const s3Client = new S3Client({
  region: awsRegion,
  credentials: {
    accessKeyId: awsAccessKey,
    secretAccessKey: awsSecretKey,
  },
});

/**
 * Upload a file buffer to S3
 * @param {Buffer} buffer - File buffer
 * @param {string} key - S3 object key (path)
 * @param {string} mimeType - File MIME type
 * @returns {Promise<{file_url: string, s3_key: string}>}
 */
const uploadToS3 = async (buffer, key, mimeType) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ServerSideEncryption: 'AES256',
  });

  await s3Client.send(command);

  const file_url = `https://${BUCKET}.s3.${awsRegion}.amazonaws.com/${key}`;
  return { file_url, s3_key: key };
};

/**
 * Generate a pre-signed download URL (valid 1 hour)
 * @param {string} s3Key - S3 object key
 * @param {number} expiresIn - Seconds (default 3600)
 * @returns {Promise<string>}
 */
const getSignedDownloadUrl = async (s3Key, expiresIn = 3600) => {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: s3Key });
  return getSignedUrl(s3Client, command, { expiresIn });
};

/**
 * Delete a file from S3
 * @param {string} s3Key - S3 object key
 */
const deleteFromS3 = async (s3Key) => {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key });
  await s3Client.send(command);
};

/**
 * Generate a unique S3 key for a report
 * @param {number} hospitalId
 * @param {number} patientId
 * @param {string} originalName
 */
const generateReportKey = (hospitalId, patientId, originalName) => {
  const ext = path.extname(originalName).toLowerCase();
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1e6);
  return `hospitals/${hospitalId}/patients/${patientId}/reports/${timestamp}-${random}${ext}`;
};

module.exports = { uploadToS3, getSignedDownloadUrl, deleteFromS3, generateReportKey };
