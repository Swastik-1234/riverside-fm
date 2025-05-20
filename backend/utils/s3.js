// const fs = require('fs');
// const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
// const { config } = require('dotenv');
// const { pipeline } = require('stream');
// const util = require('util');

// config(); // Load .env

// const pipe = util.promisify(pipeline);

// const s3 = new S3Client({
//   region: process.env.AWS_REGION,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   },
// });

// const BUCKET = process.env.AWS_S3_BUCKET;

// async function downloadFromS3(s3Key, localPath) {
//   const command = new GetObjectCommand({
//     Bucket: BUCKET,
//     Key: s3Key,
//   });

//   const { Body } = await s3.send(command);
//   await pipe(Body, fs.createWriteStream(localPath));
// }
// const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
// // const { GetObjectCommand } = require('@aws-sdk/client-s3');

// async function uploadToS3(filePath, s3Key) {
//   const fileStream = fs.createReadStream(filePath);
  
//   // Upload to S3
//   const uploadCommand = new PutObjectCommand({
//     Bucket: BUCKET,
//     Key: s3Key,
//     Body: fileStream,
//     ContentType: 'video/mp4',
//   });
//   await s3.send(uploadCommand);

//   // ✅ Use GetObjectCommand for signed download URL
//   const getUrlCommand = new GetObjectCommand({
//     Bucket: BUCKET,
//     Key: s3Key,
//   });

//   const signedUrl = await getSignedUrl(s3, getUrlCommand, { expiresIn: 3600 });

//   return signedUrl;
// }


// module.exports = { downloadFromS3, uploadToS3 };

const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const { createReadStream, createWriteStream } = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize S3 client with more robust credential handling
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// Ensure bucket name is consistently available
const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'riverside-media-upload';

/**
 * Download a file from S3 to a local path
 * @param {string} s3Key - S3 object key
 * @param {string} localPath - Local destination path
 * @returns {Promise<void>}
 */
async function downloadFromS3(s3Key, localPath) {
  try {
    console.log(`Starting download from s3://${BUCKET_NAME}/${s3Key} to ${localPath}`);
    
    // Make sure the directory exists
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Log credential info (without exposing secrets)
    console.log(`AWS Region: ${process.env.AWS_REGION || 'default'}`);
    console.log(`AWS_ACCESS_KEY_ID available: ${!!process.env.AWS_ACCESS_KEY_ID}`);
    console.log(`AWS_SECRET_ACCESS_KEY available: ${!!process.env.AWS_SECRET_ACCESS_KEY}`);
    console.log(`S3 Bucket: ${BUCKET_NAME}`);
    
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });

    const response = await s3.send(command);
    
    if (!response.Body) {
      throw new Error(`No data returned from S3 for key: ${s3Key}`);
    }
    
    const writeStream = createWriteStream(localPath);
    
    // Pipe the S3 object to a file
    return new Promise((resolve, reject) => {
      const stream = response.Body;
      
      stream.pipe(writeStream)
        .on('error', err => {
          console.error(`Error writing to file ${localPath}:`, err);
          reject(err);
        })
        .on('finish', () => {
          console.log(`Successfully downloaded ${s3Key} to ${localPath}`);
          resolve(localPath);
        });
      
      // Handle errors on the stream
      stream.on('error', (err) => {
        console.error(`Error with S3 stream for key ${s3Key}:`, err);
        writeStream.end();
        reject(err);
      });
    });
  } catch (err) {
    console.error(`Error downloading from S3 (${s3Key}):`, err);
    throw err;
  }
}

/**
 * Upload a file from local path to S3
 * @param {string} localPath - Local file path
 * @param {string} s3Key - S3 object key
 * @returns {Promise<string>} - S3 URL
 */
async function uploadToS3(localPath, s3Key) {
  try {
    console.log(`Starting upload from ${localPath} to s3://${BUCKET_NAME}/${s3Key}`);
    
    // Verify file exists
    if (!fs.existsSync(localPath)) {
      throw new Error(`Local file does not exist: ${localPath}`);
    }
    
    // Determine content type based on file extension
    const contentType = getContentType(path.extname(localPath));
    
    // Create readable stream from file
    const fileStream = createReadStream(localPath);
    const fileSize = fs.statSync(localPath).size;
    
    console.log(`File size: ${fileSize} bytes, Content-Type: ${contentType}`);
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileStream,
      ContentType: contentType,
      ContentLength: fileSize
    });

    await s3.send(command);
    
    // Construct and return the S3 URL
    const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;
    console.log(`Successfully uploaded ${localPath} to ${s3Url}`);
    return s3Url;
  } catch (err) {
    console.error(`Error uploading to S3 (${s3Key}):`, err);
    throw err;
  }
}

/**
 * Get content type based on file extension
 * @param {string} extension - File extension including the dot
 * @returns {string} - Content type
 */
function getContentType(extension) {
  const types = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.m4a': 'audio/mp4',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif'
  };
  
  return types[extension.toLowerCase()] || 'application/octet-stream';
}

module.exports = {
  downloadFromS3,
  uploadToS3
};

// const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3'); 
// const fs = require('fs'); 
// const { createReadStream, createWriteStream } = require('fs'); 
// const path = require('path');  

// // Initialize S3 client
// const s3 = new S3Client({   
//   region: process.env.AWS_REGION,   
//   credentials: {     
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,     
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,   
//   } 
// });  

// /**  
//  * Download a file from S3 to a local path  
//  * @param {string} s3Key - S3 object key  
//  * @param {string} localPath - Local destination path  
//  * @returns {Promise<void>}  
//  */ 
// async function downloadFromS3(s3Key, localPath) {   
//   const bucket = process.env.AWS_S3_BUCKET;      
//   try {     
//     console.log(`Starting download from s3://${bucket}/${s3Key} to ${localPath}`);          
//     const command = new GetObjectCommand({       
//       Bucket: bucket,       
//       Key: s3Key     
//     });      
    
//     const response = await s3.send(command);     
//     const writeStream = createWriteStream(localPath);          
    
//     // Pipe the S3 object to a file     
//     return new Promise((resolve, reject) => {       
//       const stream = response.Body;              
//       stream.pipe(writeStream)         
//         .on('error', err => {           
//           console.error(`Error writing to file ${localPath}:`, err);           
//           reject(err);         
//         })         
//         .on('finish', () => {           
//           console.log(`Successfully downloaded ${s3Key} to ${localPath}`);           
//           resolve();         
//         });     
//     });   
//   } catch (err) {     
//     console.error(`Error downloading from S3 (${s3Key}):`, err);     
//     throw err;   
//   } 
// }  

// /**  
//  * Upload a file from local path to S3  
//  * @param {string} localPath - Local file path  
//  * @param {string} s3Key - S3 object key  
//  * @returns {Promise<string>} - S3 URL  
//  */ 
// async function uploadToS3(localPath, s3Key) {   
//   const bucket = process.env.AWS_S3_BUCKET;      
  
//   if (!bucket) {
//     throw new Error('AWS_S3_BUCKET environment variable is not set');
//   }
  
//   try {     
//     console.log(`Starting upload from ${localPath} to s3://${bucket}/${s3Key}`);          
    
//     // Determine content type based on file extension     
//     const contentType = getContentType(path.extname(localPath));          
    
//     // Create readable stream from file     
//     const fileStream = createReadStream(localPath);     
//     const fileSize = fs.statSync(localPath).size;          
    
//     const command = new PutObjectCommand({       
//       Bucket: bucket,       
//       Key: s3Key,       
//       Body: fileStream,       
//       ContentType: contentType,       
//       ContentLength: fileSize     
//     });      
    
//     const response = await s3.send(command);          
    
//     // Construct and return the S3 URL     
//     const s3Url = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;     
//     console.log(`Successfully uploaded ${localPath} to ${s3Url}`);     
//     return s3Url;   
//   } catch (err) {     
//     console.error(`Error uploading to S3 (${s3Key}):`, err);     
//     throw err;   
//   } 
// }  

// /**  
//  * Get content type based on file extension  
//  * @param {string} extension - File extension including the dot  
//  * @returns {string} - Content type  
//  */ 
// function getContentType(extension) {   
//   const types = {     
//     '.mp4': 'video/mp4',     
//     '.webm': 'video/webm',     
//     '.m4a': 'audio/mp4',     
//     '.mp3': 'audio/mpeg',     
//     '.wav': 'audio/wav',     
//     '.ogg': 'audio/ogg',     
//     '.png': 'image/png',     
//     '.jpg': 'image/jpeg',     
//     '.jpeg': 'image/jpeg',     
//     '.gif': 'image/gif'   
//   };      
  
//   return types[extension.toLowerCase()] || 'application/octet-stream'; 
// }  

// module.exports = {   
//   downloadFromS3,   
//   uploadToS3 
// };