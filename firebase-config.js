// 1. Go to https://console.firebase.google.com
// 2. Create a project (free) -> Build -> Firestore Database -> Create database (start in test mode, or set rules below)
// 3. Project settings (gear icon) -> General -> "Your apps" -> Add app -> Web (</>) -> register app
// 4. Copy the firebaseConfig values it shows you into the object below
// 5. In Firestore -> Rules, use (family-only, no login required):
//
//   rules_version = '2';
//   service cloud.firestore {
//     match /databases/{database}/documents {
//       match /items/{itemId} {
//         allow read, write: if true;
//       }
//     }
//   }
//
// Note: "allow read, write: if true" means anyone with your config can read/write.
// That's fine for a private family list, but never put real secrets in Firestore this way.

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCs3ci-0Opv8TRKc5c1OJ1IKB_ekphh81k",
  authDomain: "trackit-a3aee.firebaseapp.com",
  projectId: "trackit-a3aee",
  storageBucket: "trackit-a3aee.firebasestorage.app",
  messagingSenderId: "147937147864",
  appId: "1:147937147864:web:f239e934db37ce675010ad",
  measurementId: "G-MBK1R32Q7Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);