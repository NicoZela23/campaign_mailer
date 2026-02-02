const nodemailer = require("nodemailer");
const { validateEmailDNS } = require("../utils/dnsValidator");

// Constants from specs and reference files
const CONCURRENT_EMAILS = 10;
const RETRY_ATTEMPTS = 8;
const RETRY_DELAY = 4000;
const BATCH_SIZE = 25;
const BATCH_DELAY = 1500;

class Mailer {
  constructor(userConfig) {
    if (
      !userConfig ||
      !userConfig.email ||
      !userConfig.config?.gmail_app_pss ||
      !userConfig.config?.from_name
    ) {
      throw new Error("User configuration is invalid or incomplete.");
    }
    this.config = userConfig;
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    return nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: this.config.email,
        pass: this.config.config.gmail_app_pss,
      },
      pool: true,
      maxConnections: CONCURRENT_EMAILS,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }

  /**
   * Verifies the SMTP transporter configuration.
   */
  async verifyConnection() {
    return this.transporter.verify();
  }

  /**
   * Personalizes the email content for a given recipient.
   */
  _personalizeTemplate(template, recipient) {
    const personalize = (text) =>
      text.replace(/{{(.*?)}}/g, (match, key) => {
        // Sanitize the key by trimming whitespace
        const cleanKey = key.trim();
        return recipient[cleanKey] || "";
      });

    const htmlBody = personalize(template.body);
    const textBody = htmlBody.replace(/<[^>]+>/g, "");

    return {
      subject: personalize(template.subject),
      html: htmlBody,
      text: textBody,
    };
  }

  /**
   * Sends a single email with an intelligent retry mechanism, based on the reference file.
   */
  async _sendEmailWithRetry(mailOptions, retries = RETRY_ATTEMPTS) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const info = await this.transporter.sendMail(mailOptions);
        if (info.rejected && info.rejected.length > 0) {
          return {
            success: false,
            error: `Email rejected: ${info.rejected.join(", ")}`,
            nonRetryable: true,
          };
        }
        return { success: true, info };
      } catch (error) {
        const errorMessage = (error.message || "").toLowerCase();
        const errorCode = (error.code || "").toString();
        const errorResponse = (error.response || "").toLowerCase();

        const mailboxNotFoundErrors = [
          "550",
          "5.1.1",
          "mailbox not found",
          "user not found",
          "no such user",
        ];
        const isMailboxNotFound = mailboxNotFoundErrors.some(
          (err) =>
            errorMessage.includes(err) ||
            errorCode.includes(err) ||
            errorResponse.includes(err)
        );
        if (isMailboxNotFound) {
          return {
            success: false,
            error: `Mailbox does not exist: ${error.message}`,
            nonRetryable: true,
          };
        }

        const invalidEmailErrors = [
          "553",
          "invalid recipient",
          "domain not found",
          "address rejected",
        ];
        const isInvalidEmail = invalidEmailErrors.some(
          (err) =>
            errorMessage.includes(err) ||
            errorCode.includes(err) ||
            errorResponse.includes(err)
        );
        if (isInvalidEmail) {
          return {
            success: false,
            error: `Invalid email or domain: ${error.message}`,
            nonRetryable: true,
          };
        }

        if (attempt === retries) {
          return {
            success: false,
            error: `Failed after ${retries} attempts: ${error.message}`,
          };
        }
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * attempt)
        );
      }
    }
  }

  /**
   * Builds attachments array for nodemailer from attachment metadata
   */
  async _buildAttachments(attachments, getFileCallback) {
    if (!attachments || attachments.length === 0 || !getFileCallback) {
      return [];
    }

    const attachmentPromises = attachments.map(async (attachment) => {
      try {
        if (!attachment.storagePath) {
          console.error(
            `Attachment ${attachment.filename || "unknown"} missing storagePath`
          );
          return null;
        }

        const fileBuffer = await getFileCallback(attachment.storagePath);
        if (!fileBuffer) {
          console.error(
            `Failed to load file buffer for ${attachment.filename}`
          );
          return null;
        }

        return {
          filename: attachment.filename || "attachment",
          content: fileBuffer,
          contentType: attachment.mimeType || "application/octet-stream",
        };
      } catch (error) {
        console.error(
          `Error loading attachment ${attachment.filename || "unknown"}:`,
          error.message
        );
        return null;
      }
    });

    const resolvedAttachments = await Promise.all(attachmentPromises);
    const validAttachments = resolvedAttachments.filter((a) => a !== null);

    if (validAttachments.length !== attachments.length) {
      console.warn(
        `Only ${validAttachments.length} of ${attachments.length} attachments loaded successfully`
      );
    }

    return validAttachments;
  }

  /**
   * Sends mass emails by processing recipients in batches and returns a consolidated report.
   */
  async sendMassEmails(recipients, template, options = {}) {
    const {
      cc = [],
      bcc = [],
      attachments = [],
      getAttachmentFile = null,
    } = options;
    const results = [];
    try {
      await this.verifyConnection();
    } catch (error) {
      console.error("SMTP Connection Error:", error);
      throw new Error(
        "Failed to verify connection with Gmail. Please check your credentials (App Password)."
      );
    }

    // Build attachments once for all emails
    let emailAttachments = [];
    if (attachments.length > 0 && getAttachmentFile) {
      console.log(`Building ${attachments.length} attachments for mass email`);
      emailAttachments = await this._buildAttachments(
        attachments,
        getAttachmentFile
      );
      console.log(`Successfully built ${emailAttachments.length} attachments`);
    }

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map((recipient, j) => {
        const overallIndex = i + j;
        return (async () => {
          if (!recipient.email) {
            results.push({
              status: "update",
              index: overallIndex,
              result: "FAILURE",
              email: "Missing email",
              error: "Recipient data is missing an email field.",
            });
            return;
          }

          const dnsValidation = await validateEmailDNS(recipient.email);
          if (!dnsValidation.valid) {
            results.push({
              status: "update",
              index: overallIndex,
              result: "FAILURE",
              email: recipient.email,
              error: `Invalid DNS: ${dnsValidation.error}`,
            });
            return;
          }

          const personalizedContent = this._personalizeTemplate(
            template,
            recipient
          );
          const mailOptions = {
            from: `"${this.config.config.from_name}" <${this.config.email}>`,
            to: recipient.email,
            subject: personalizedContent.subject,
            html: personalizedContent.html,
            text: personalizedContent.text,
          };

          // Add attachments if provided
          if (emailAttachments && emailAttachments.length > 0) {
            mailOptions.attachments = emailAttachments;
          }

          // Add CC and BCC if provided (nodemailer accepts array or comma-separated string)
          if (cc && Array.isArray(cc) && cc.length > 0) {
            mailOptions.cc = cc; // Array of email addresses
          } else if (cc && typeof cc === "string" && cc.trim()) {
            mailOptions.cc = cc; // Comma-separated string
          }

          if (bcc && Array.isArray(bcc) && bcc.length > 0) {
            mailOptions.bcc = bcc; // Array of email addresses
          } else if (bcc && typeof bcc === "string" && bcc.trim()) {
            mailOptions.bcc = bcc; // Comma-separated string
          }

          const result = await this._sendEmailWithRetry(mailOptions);
          results.push({
            status: "update",
            index: overallIndex,
            result: result.success ? "SUCCESS" : "FAILURE",
            email: recipient.email,
            error: result.error,
          });
        })();
      });

      await Promise.all(batchPromises);

      if (i + BATCH_SIZE < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
      }
    }
    return results;
  }

  async sendSingleEmail(template, recipientEmail, dataRow, options = {}) {
    const {
      cc = [],
      bcc = [],
      attachments = [],
      getAttachmentFile = null,
    } = options;

    try {
      await this.verifyConnection();
    } catch (error) {
      console.error("SMTP Connection Error:", error);
      throw new Error(
        "Failed to verify connection with Gmail. Please check your credentials (App Password)."
      );
    }

    const dnsValidation = await validateEmailDNS(recipientEmail);
    if (!dnsValidation.valid) {
      throw new Error(`Invalid DNS for test email: ${dnsValidation.error}`);
    }

    const personalizedContent = this._personalizeTemplate(template, dataRow);
    const mailOptions = {
      from: `"${this.config.config.from_name}" <${this.config.email}>`,
      to: recipientEmail,
      subject: personalizedContent.subject,
      html: personalizedContent.html,
      text: personalizedContent.text,
    };

    // Add attachments if provided
    if (attachments.length > 0 && getAttachmentFile) {
      mailOptions.attachments = await this._buildAttachments(
        attachments,
        getAttachmentFile
      );
    }

    // Add CC and BCC if provided (nodemailer accepts array or comma-separated string)
    if (cc && Array.isArray(cc) && cc.length > 0) {
      mailOptions.cc = cc; // Array of email addresses
    } else if (cc && typeof cc === "string" && cc.trim()) {
      mailOptions.cc = cc; // Comma-separated string
    }

    if (bcc && Array.isArray(bcc) && bcc.length > 0) {
      mailOptions.bcc = bcc; // Array of email addresses
    } else if (bcc && typeof bcc === "string" && bcc.trim()) {
      mailOptions.bcc = bcc; // Comma-separated string
    }

    const result = await this._sendEmailWithRetry(mailOptions);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result;
  }
}

module.exports = Mailer;
