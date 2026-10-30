import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
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

// Initialize Firebase safely
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export const initAnalytics = async () => {
  if (typeof window !== "undefined") {
    try {
      const supported = await isSupported();
      if (supported) {
        return getAnalytics(app);
      }
    } catch {
      // Analytics not supported
    }
  }
  return null;
};

export default app;
