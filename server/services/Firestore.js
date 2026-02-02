const { Firestore } = require("@google-cloud/firestore");
const StorageService = require("./StorageService");

const private_key = process.env.FIREBASE_PRIVATE_KEY;

const firestore = new Firestore({
  projectId: process.env.FIREBASE_PROJECT_ID,
  credentials: {
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: private_key ? private_key.replace(/\\n/g, "\n") : undefined,
  },
});
const USERS_COLLECTION = "email_sender_users";
const CAMPAIGNS_COLLECTION = "campaigns";

class FirestoreService {
  static async authenticateUser(email, password) {
    try {
      const snapshot = await firestore
        .collection(USERS_COLLECTION)
        .where("email", "==", email)
        .limit(1)
        .get();

      if (snapshot.empty) {
        console.log(`Authentication failed: No user found for email ${email}`);
        return null;
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();

      if (userData.password === password) {
        const { password: _, ...user } = userData;

        // Load user's campaigns metadata (optimized - without full data)
        // If there's an error or no campaigns, default to empty array
        try {
          const campaigns = await this.getUserCampaigns(email, 50);
          user.campaigns = campaigns || [];
        } catch (error) {
          // If campaigns fail to load, don't fail the login
          // User can still login, just without campaigns loaded
          console.warn(
            `Could not load campaigns for user ${email}:`,
            error.message
          );
          user.campaigns = [];
        }

        return user;
      } else {
        console.log(
          `Authentication failed: Incorrect password for email ${email}`
        );
        return null;
      }
    } catch (error) {
      console.error("Error authenticating user:", error);
      throw new Error("Failed to authenticate user due to a server error.");
    }
  }

  /**
   * Get user campaigns (metadata only, optimized)
   * Returns empty array if user has no campaigns (no error thrown)
   */
  static async getUserCampaigns(userId, limit = 50) {
    try {
      // Query without orderBy to avoid requiring composite index
      // We'll sort in memory instead
      const snapshot = await firestore
        .collection(CAMPAIGNS_COLLECTION)
        .where("userId", "==", userId)
        .limit(limit * 2) // Get more to account for sorting
        .get();

      // If no campaigns, return empty array (not an error)
      if (snapshot.empty) {
        return [];
      }

      // Map and sort in memory by updatedAt descending
      const campaigns = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
            status: data.status || "draft",
            attachmentsCount: data.attachments?.length || 0,
            hasCC: (data.cc?.length || 0) > 0,
            hasBCC: (data.bcc?.length || 0) > 0,
          };
        })
        .sort((a, b) => {
          // Sort by updatedAt descending (most recent first)
          const dateA =
            a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt);
          const dateB =
            b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt);
          return dateB - dateA;
        })
        .slice(0, limit); // Apply limit after sorting

      return campaigns;
    } catch (error) {
      // If it's an index error, try without orderBy (already doing that)
      // For other errors, log and return empty array instead of throwing
      console.error("Error getting user campaigns:", error.message);

      // Return empty array instead of throwing error
      // This allows users without campaigns to login successfully
      return [];
    }
  }

  /**
   * Get full campaign data by ID
   */
  static async getCampaignById(campaignId, userId) {
    try {
      const doc = await firestore
        .collection(CAMPAIGNS_COLLECTION)
        .doc(campaignId)
        .get();

      if (!doc.exists) {
        throw new Error("Campaign not found");
      }

      const data = doc.data();

      // Verify ownership
      if (data.userId !== userId) {
        throw new Error("Unauthorized access to campaign");
      }

      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      };
    } catch (error) {
      console.error("Error getting campaign:", error);
      throw error;
    }
  }

  /**
   * Save or update a campaign
   */
  static async saveCampaign(userId, campaignData) {
    try {
      // Check for duplicate campaign names (excluding current campaign if updating)
      const existingCampaigns = await firestore
        .collection(CAMPAIGNS_COLLECTION)
        .where("userId", "==", userId)
        .where("name", "==", campaignData.name)
        .get();

      // If updating, exclude the current campaign from the check
      if (campaignData.id) {
        const duplicateCampaigns = existingCampaigns.docs.filter(
          (doc) => doc.id !== campaignData.id
        );
        if (duplicateCampaigns.length > 0) {
          throw new Error(
            `Ya existe una campaña con el nombre "${campaignData.name}". Por favor, elige un nombre diferente.`
          );
        }
      } else {
        // If creating new, check if any campaign with this name exists
        if (!existingCampaigns.empty) {
          throw new Error(
            `Ya existe una campaña con el nombre "${campaignData.name}". Por favor, elige un nombre diferente.`
          );
        }
      }

      const campaignRef = campaignData.id
        ? firestore.collection(CAMPAIGNS_COLLECTION).doc(campaignData.id)
        : firestore.collection(CAMPAIGNS_COLLECTION).doc();

      const now = new Date();
      const campaign = {
        userId,
        name: campaignData.name,
        emailTemplate: campaignData.emailTemplate || { subject: "", body: "" },
        headers: campaignData.headers || [],
        attachments: campaignData.attachments || [],
        cc: campaignData.cc || [],
        bcc: campaignData.bcc || [],
        status: campaignData.status || "draft",
        updatedAt: now,
      };

      if (!campaignData.id) {
        campaign.createdAt = now;
      }

      await campaignRef.set(campaign, { merge: true });

      return {
        id: campaignRef.id,
        ...campaign,
        createdAt: campaign.createdAt?.toDate?.() || campaign.createdAt,
        updatedAt: campaign.updatedAt?.toDate?.() || campaign.updatedAt,
      };
    } catch (error) {
      console.error("Error saving campaign:", error);
      throw new Error("Failed to save campaign.");
    }
  }

  /**
   * Delete a campaign
   */
  static async deleteCampaign(campaignId, userId) {
    try {
      const doc = await firestore
        .collection(CAMPAIGNS_COLLECTION)
        .doc(campaignId)
        .get();

      if (!doc.exists) {
        throw new Error("Campaign not found");
      }

      const data = doc.data();

      // Verify ownership
      if (data.userId !== userId) {
        throw new Error("Unauthorized access to campaign");
      }

      // Delete all attachments from Firebase Storage
      if (data.attachments && data.attachments.length > 0) {
        await StorageService.deleteCampaignFiles(userId, campaignId);
      }

      await firestore.collection(CAMPAIGNS_COLLECTION).doc(campaignId).delete();

      return { success: true, attachments: data.attachments || [] };
    } catch (error) {
      console.error("Error deleting campaign:", error);
      throw error;
    }
  }
}

module.exports = FirestoreService;
