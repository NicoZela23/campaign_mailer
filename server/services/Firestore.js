const { Firestore } = require('@google-cloud/firestore');

const private_key = process.env.FIREBASE_PRIVATE_KEY;

const firestore = new Firestore({
  projectId: process.env.FIREBASE_PROJECT_ID,
  credentials: {
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: private_key ? private_key.replace(/\\n/g, '\n') : undefined,
  },
});
const USERS_COLLECTION = 'email_sender_users';

class FirestoreService {

  static async authenticateUser(email, password) {
    try {
      const snapshot = await firestore
        .collection(USERS_COLLECTION)
        .where('email', '==', email)
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
        return user;
      } else {
        console.log(`Authentication failed: Incorrect password for email ${email}`);
        return null;
      }
    } catch (error) {
      console.error('Error authenticating user:', error);
      throw new Error('Failed to authenticate user due to a server error.');
    }
  }
}

module.exports = FirestoreService;
