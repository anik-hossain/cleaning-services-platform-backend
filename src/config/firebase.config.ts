import * as admin from 'firebase-admin';

const initializeFirebase = () => {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId && !clientEmail && !privateKey) {
      console.warn(
        'Firebase credentials are not configured; push is disabled.',
      );
      return;
    }

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Firebase configuration is incomplete. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.',
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }
};

export default initializeFirebase;
