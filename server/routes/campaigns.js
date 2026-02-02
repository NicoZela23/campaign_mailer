const express = require("express");
const FirestoreService = require("../services/Firestore");
const router = express.Router();

// Middleware to extract userId from request
const extractUserId = (req, res, next) => {
  if (!req.body.userId && !req.query.userId) {
    return res.status(401).json({ message: "User ID is required." });
  }
  req.userId = req.body.userId || req.query.userId;
  next();
};

// Get all campaigns for a user
router.get("/", extractUserId, async (req, res) => {
  try {
    const campaigns = await FirestoreService.getUserCampaigns(req.userId);
    res.json({ campaigns });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to fetch campaigns." });
  }
});

// Get a specific campaign by ID
router.get("/:id", extractUserId, async (req, res) => {
  try {
    const campaign = await FirestoreService.getCampaignById(
      req.params.id,
      req.userId
    );
    res.json({ campaign });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    const statusCode = error.message.includes("not found")
      ? 404
      : error.message.includes("Unauthorized")
      ? 403
      : 500;
    res
      .status(statusCode)
      .json({ message: error.message || "Failed to fetch campaign." });
  }
});

// Save or update a campaign
router.post("/", extractUserId, async (req, res) => {
  try {
    const { name, emailTemplate, headers, attachments, cc, bcc, status, id } =
      req.body;

    if (!name) {
      return res.status(400).json({ message: "Campaign name is required." });
    }

    const campaignData = {
      id,
      name,
      emailTemplate: emailTemplate || { subject: "", body: "" },
      headers: headers || [],
      attachments: attachments || [],
      cc: cc || [],
      bcc: bcc || [],
      status: status || "draft",
    };

    const savedCampaign = await FirestoreService.saveCampaign(
      req.userId,
      campaignData
    );
    res.json({ campaign: savedCampaign });
  } catch (error) {
    console.error("Error saving campaign:", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to save campaign." });
  }
});

// Update a campaign
router.put("/:id", extractUserId, async (req, res) => {
  try {
    const { name, emailTemplate, headers, attachments, cc, bcc, status } =
      req.body;

    // If only name is provided, fetch existing campaign and update only the name
    if (
      name &&
      !emailTemplate &&
      !headers &&
      !attachments &&
      !cc &&
      !bcc &&
      !status
    ) {
      // Get existing campaign to preserve other fields
      const existingCampaign = await FirestoreService.getCampaignById(
        req.params.id,
        req.userId
      );

      const campaignData = {
        id: req.params.id,
        name,
        emailTemplate: existingCampaign.emailTemplate,
        headers: existingCampaign.headers,
        attachments: existingCampaign.attachments,
        cc: existingCampaign.cc,
        bcc: existingCampaign.bcc,
        status: existingCampaign.status,
      };

      const updatedCampaign = await FirestoreService.saveCampaign(
        req.userId,
        campaignData
      );
      return res.json({ campaign: updatedCampaign });
    }

    // Full update
    if (!name) {
      return res.status(400).json({ message: "Campaign name is required." });
    }

    const campaignData = {
      id: req.params.id,
      name,
      emailTemplate: emailTemplate || { subject: "", body: "" },
      headers: headers || [],
      attachments: attachments || [],
      cc: cc || [],
      bcc: bcc || [],
      status: status || "draft",
    };

    const updatedCampaign = await FirestoreService.saveCampaign(
      req.userId,
      campaignData
    );
    res.json({ campaign: updatedCampaign });
  } catch (error) {
    console.error("Error updating campaign:", error);
    const statusCode = error.message.includes("not found")
      ? 404
      : error.message.includes("Unauthorized")
      ? 403
      : error.message.includes("Ya existe")
      ? 400
      : 500;
    res
      .status(statusCode)
      .json({ message: error.message || "Failed to update campaign." });
  }
});

// Delete a campaign
router.delete("/:id", extractUserId, async (req, res) => {
  try {
    const result = await FirestoreService.deleteCampaign(
      req.params.id,
      req.userId
    );
    res.json({ success: true, attachments: result.attachments });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    const statusCode = error.message.includes("not found")
      ? 404
      : error.message.includes("Unauthorized")
      ? 403
      : 500;
    res
      .status(statusCode)
      .json({ message: error.message || "Failed to delete campaign." });
  }
});

module.exports = router;
