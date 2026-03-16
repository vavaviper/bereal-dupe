import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyCRrM7TALVDuDi2ebb6fuwoC-nOxloMmwA",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "bereal-dupe.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "bereal-dupe",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "bereal-dupe.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "390537565517",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:390537565517:web:0d47c778eb1e11cf7b9304",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-Y8YSS4SH62",
};

const app: FirebaseApp = initializeApp(firebaseConfig);

let analytics: Analytics | null = null;

export function getFirebaseAnalytics(): Analytics | null {
  if (typeof window === "undefined") return null;
  if (!analytics) analytics = getAnalytics(app);
  return analytics;
}

export { app };
