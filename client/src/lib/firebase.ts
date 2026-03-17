import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, type Analytics } from "firebase/analytics";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app: FirebaseApp | null =
  firebaseConfig.apiKey && firebaseConfig.appId
    ? initializeApp(firebaseConfig)
    : null;

let analytics: Analytics | null = null;

export function getFirebaseAnalytics(): Analytics | null {
  if (typeof window === "undefined" || !app) return null;
  if (!analytics) analytics = getAnalytics(app);
  return analytics;
}

let storage: FirebaseStorage | null = null;

export function getFirebaseStorage(): FirebaseStorage | null {
  if (!app) return null;
  if (!storage) storage = getStorage(app);
  return storage;
}

/** Firebase Storage paths (bucket: gs://bereal-dupe.firebasestorage.app) */
export const STORAGE_PATHS = {
  /** images/event_banners/ */
  eventBanners: "images/event_banners",
  /** images/user_uploads/ */
  userUploads: "images/user_uploads",
} as const;

export { app };
