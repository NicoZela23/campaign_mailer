const express = require("express");
const Mailer = require("../services/Mailer");
const Sanitizer = require("../utils/Sanitizer");
const StorageService = require("../services/StorageService");
const router = express.Router();

const fakeAuthMiddleware = (req, res, next) => {
  if (!req.body.userConfig) {
    return res.status(401).json({ message: "User configuration is missing." });
  }
  req.userConfig = req.body.userConfig;
  next();
};

router.post("/send", fakeAuthMiddleware, async (req, res) => {
  const { csvData, emailTemplate, cc, bcc, attachments } = req.body;
  const { userConfig } = req;

  if (!csvData || !emailTemplate) {
    return res
      .status(400)
      .json({ message: "CSV data and email template are required." });
  }

  try {
    const mailer = new Mailer(userConfig);
    const sanitizedData = Sanitizer.sanitizeData(csvData);

    // Debug logging
    console.log("Sending emails with:", {
      recipientsCount: sanitizedData.length,
      ccCount: cc?.length || 0,
      bccCount: bcc?.length || 0,
      attachmentsCount: attachments?.length || 0,
      cc: cc,
      bcc: bcc,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        storagePath: a.storagePath,
      })),
    });

    // Create function to get attachment files
    const getAttachmentFile =
      attachments && attachments.length > 0
        ? async (storagePath) => {
            console.log("Fetching attachment from storage:", storagePath);
            return await StorageService.getFile(storagePath);
          }
        : null;

    const results = await mailer.sendMassEmails(sanitizedData, emailTemplate, {
      cc: cc || [],
      bcc: bcc || [],
      attachments: attachments || [],
      getAttachmentFile,
    });

    res.json({ status: "completed", results });
  } catch (error) {
    console.error("Error during mass email sending:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "A critical error occurred.",
    });
  }
});

router.post("/send-test", fakeAuthMiddleware, async (req, res) => {
  const { testEmail, emailTemplate, dataRow, cc, bcc, attachments } = req.body;
  const { userConfig } = req;

  if (!testEmail || !emailTemplate) {
    return res
      .status(400)
      .json({ message: "Test email, and email template are required." });
  }

  try {
    const mailer = new Mailer(userConfig);

    // Create function to get attachment files
    const getAttachmentFile =
      attachments && attachments.length > 0
        ? async (storagePath) => await StorageService.getFile(storagePath)
        : null;

    await mailer.sendSingleEmail(emailTemplate, testEmail, dataRow || {}, {
      cc: cc || [],
      bcc: bcc || [],
      attachments: attachments || [],
      getAttachmentFile,
    });

    res.json({ message: `Test email successfully sent to ${testEmail}` });
  } catch (error) {
    console.error("Error sending test email:", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to send test email." });
  }
});

module.exports = router;
