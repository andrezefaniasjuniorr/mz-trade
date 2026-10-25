import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

export const firebaseConfig = {
  apiKey: "AIzaSyB_JP_rGdCeDL9tnfT7TRLAV9ewz_OpQ9k",
  authDomain: "mz-trader.firebaseapp.com",
  projectId: "mz-trader",
  storageBucket: "mz-trader.firebasestorage.app",
  messagingSenderId: "347709256990",
  appId: "1:347709256990:web:007bd90b80357ea269850f",
  measurementId: "G-KYMDNWHPP9"
};

// Initialize Firebase safely (avoid multiple initializations in SSR / Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);

// Safe Analytics initialization (only runs in browser environment)
export const initAnalytics = async () => {
  if (typeof window !== "undefined") {
    try {
      const supported = await isSupported();
      if (supported) {
        return getAnalytics(app);
      }
    } catch {
      // Analytics not supported in this environment
    }
  }
  return null;
};

export default app;
