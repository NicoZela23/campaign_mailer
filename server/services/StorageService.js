const { Storage } = require("@google-cloud/storage");
const crypto = require("crypto");
const path = require("path");

// Initialize Firebase Storage with same credentials as Firestore
const private_key = process.env.FIREBASE_PRIVATE_KEY;

const storage = new Storage({
  projectId: process.env.FIREBASE_PROJECT_ID,
  credentials: {
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: private_key ? private_key.replace(/\\n/g, "\n") : undefined,
  },
});

// Bucket name - you can set this via environment variable or use default
const BUCKET_NAME =
  process.env.FIREBASE_STORAGE_BUCKET ||
  `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;
const bucket = storage.bucket(BUCKET_NAME);

class StorageService {
  /**
   * Get the storage path for a file
   */
  static _getStoragePath(userId, campaignId, filename) {
    const campaignFolder = campaignId || "temp";
    return `campaigns/${userId}/${campaignFolder}/${filename}`;
  }

  /**
   * Save uploaded file to Firebase Storage and return metadata
   */
  static async saveFile(file, userId, campaignId) {
    try {
      const fileId = crypto.randomUUID();
      const ext = path.extname(file.originalname);
      const filename = `${fileId}${ext}`;
      const storagePath = this._getStoragePath(userId, campaignId, filename);

      // Create a file reference in the bucket
      const fileRef = bucket.file(storagePath);

      // Upload the file buffer
      await fileRef.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
          metadata: {
            originalName: file.originalname,
            userId,
            campaignId: campaignId || "temp",
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      // Make the file publicly accessible (or you can use signed URLs)
      // For now, we'll keep it private and use signed URLs when needed

      return {
        id: fileId,
        filename: file.originalname,
        storagePath: storagePath, // Store the Firebase Storage path
        size: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date(),
      };
    } catch (error) {
      console.error("Error saving file to Firebase Storage:", error);
      throw new Error("Failed to upload file to storage");
    }
  }

  /**
   * Get file buffer from Firebase Storage
   */
  static async getFile(storagePath) {
    try {
      const fileRef = bucket.file(storagePath);

      // Check if file exists
      const [exists] = await fileRef.exists();
      if (!exists) {
        throw new Error("File not found");
      }

      // Download the file as a buffer
      const [buffer] = await fileRef.download();
      return buffer;
    } catch (error) {
      console.error("Error reading file from Firebase Storage:", error);
      if (error.message === "File not found") {
        throw new Error("File not found");
      }
      throw new Error("Failed to retrieve file from storage");
    }
  }

  /**
   * Get a signed URL for downloading a file (valid for 1 hour)
   */
  static async getSignedUrl(storagePath, expiresInMinutes = 60) {
    try {
      const fileRef = bucket.file(storagePath);
      const [url] = await fileRef.getSignedUrl({
        action: "read",
        expires: Date.now() + expiresInMinutes * 60 * 1000,
      });
      return url;
    } catch (error) {
      console.error("Error generating signed URL:", error);
      throw new Error("Failed to generate download URL");
    }
  }

  /**
   * Delete file from Firebase Storage
   */
  static async deleteFile(storagePath) {
    try {
      const fileRef = bucket.file(storagePath);
      await fileRef.delete();
      return true;
    } catch (error) {
      // If file doesn't exist, that's okay
      if (error.code === 404) {
        return true;
      }
      console.error("Error deleting file from Firebase Storage:", error);
      return false;
    }
  }

  /**
   * Delete all files for a campaign
   */
  static async deleteCampaignFiles(userId, campaignId) {
    try {
      const prefix = `campaigns/${userId}/${campaignId}/`;
      const [files] = await bucket.getFiles({ prefix });

      // Delete all files in parallel
      await Promise.all(
        files.map((file) =>
          file.delete().catch((err) => {
            console.error(`Error deleting file ${file.name}:`, err);
            return false;
          })
        )
      );

      return true;
    } catch (error) {
      console.error("Error deleting campaign files:", error);
      return false;
    }
  }

  /**
   * Check if bucket exists and is accessible
   */
  static async checkBucketAccess() {
    try {
      await bucket.getMetadata();
      return true;
    } catch (error) {
      console.error("Error accessing Firebase Storage bucket:", error);
      return false;
    }
  }
}

module.exports = StorageService;
