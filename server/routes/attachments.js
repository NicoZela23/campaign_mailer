const express = require("express");
const multer = require("multer");
const FirestoreService = require("../services/Firestore");
const StorageService = require("../services/StorageService");
const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types for now
    cb(null, true);
  },
});

// Middleware to extract userId (works with JSON body, FormData, or query params)
// Must be called AFTER multer processes the FormData
const extractUserId = (req, res, next) => {
  // Try query params first
  if (req.query.userId) {
    req.userId = req.query.userId;
    return next();
  }

  // Try JSON body or FormData body (after multer processes it)
  if (req.body.userId) {
    req.userId = req.body.userId;
    return next();
  }

  return res.status(401).json({ message: "User ID is required." });
};

// Upload attachment for a campaign
// Multer processes the file, then we extract userId from FormData body
router.post(
  "/:campaignId",
  upload.single("file"),
  extractUserId,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded." });
      }

      const campaignId = req.params.campaignId;

      // Save file to storage (works even if campaign doesn't exist yet)
      const attachment = await StorageService.saveFile(
        req.file,
        req.userId,
        campaignId
      );

      // If campaignId is 'temp', just return the attachment without saving to campaign
      // The attachment will be saved to the campaign when the user saves the campaign
      if (campaignId === "temp") {
        return res.json({ attachment });
      }

      // If campaignId exists, verify campaign exists and belongs to user, then update it
      let campaign;
      try {
        campaign = await FirestoreService.getCampaignById(
          campaignId,
          req.userId
        );
      } catch (error) {
        // Campaign doesn't exist, but file was saved
        // Return the attachment anyway - it will be associated when campaign is created
        return res.json({ attachment });
      }

      // Update campaign with new attachment
      const updatedAttachments = [...(campaign.attachments || []), attachment];
      await FirestoreService.saveCampaign(req.userId, {
        id: campaignId,
        name: campaign.name,
        emailTemplate: campaign.emailTemplate,
        headers: campaign.headers,
        attachments: updatedAttachments,
        cc: campaign.cc,
        bcc: campaign.bcc,
        status: campaign.status,
      });

      res.json({ attachment });
    } catch (error) {
      console.error("Error uploading attachment:", error);
      res
        .status(500)
        .json({ message: error.message || "Failed to upload attachment." });
    }
  }
);

// Delete an attachment
router.delete("/:campaignId/:attachmentId", extractUserId, async (req, res) => {
  try {
    const { campaignId, attachmentId } = req.params;

    // Get campaign
    const campaign = await FirestoreService.getCampaignById(
      campaignId,
      req.userId
    );

    // Find attachment
    const attachment = campaign.attachments?.find((a) => a.id === attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: "Attachment not found." });
    }

    // Delete file from storage
    await StorageService.deleteFile(attachment.storagePath);

    // Update campaign
    const updatedAttachments = campaign.attachments.filter(
      (a) => a.id !== attachmentId
    );
    await FirestoreService.saveCampaign(req.userId, {
      id: campaignId,
      name: campaign.name,
      emailTemplate: campaign.emailTemplate,
      headers: campaign.headers,
      attachments: updatedAttachments,
      cc: campaign.cc,
      bcc: campaign.bcc,
      status: campaign.status,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    const statusCode = error.message.includes("not found")
      ? 404
      : error.message.includes("Unauthorized")
      ? 403
      : 500;
    res
      .status(statusCode)
      .json({ message: error.message || "Failed to delete attachment." });
  }
});

// Download an attachment (returns signed URL or file buffer)
router.get("/:campaignId/:attachmentId", extractUserId, async (req, res) => {
  try {
    const { campaignId, attachmentId } = req.params;
    const { download } = req.query; // If download=true, return file buffer, else return signed URL

    // Get campaign
    const campaign = await FirestoreService.getCampaignById(
      campaignId,
      req.userId
    );

    // Find attachment
    const attachment = campaign.attachments?.find((a) => a.id === attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: "Attachment not found." });
    }

    if (download === "true") {
      // Return file buffer for direct download (used by Mailer service)
      const fileBuffer = await StorageService.getFile(attachment.storagePath);
      res.setHeader("Content-Type", attachment.mimeType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${attachment.filename}"`
      );
      res.send(fileBuffer);
    } else {
      // Return signed URL (valid for 1 hour) for browser downloads
      const signedUrl = await StorageService.getSignedUrl(
        attachment.storagePath
      );
      res.json({ url: signedUrl, filename: attachment.filename });
    }
  } catch (error) {
    console.error("Error downloading attachment:", error);
    const statusCode = error.message.includes("not found")
      ? 404
      : error.message.includes("Unauthorized")
      ? 403
      : 500;
    res
      .status(statusCode)
      .json({ message: error.message || "Failed to download attachment." });
  }
});

module.exports = router;
