// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// Import necessary Firebase products based on project requirements
import { getFirestore } from "firebase/firestore"; // Example: Firestore for database
import { getAuth } from "firebase/auth"; // Example: Authentication
import { getStorage } from "firebase/storage"; // Example: Authentication

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCcJuMJp1O6faqbntlS0cmubXp1TMWO8Yo",
  authDomain: "hackaton-70b38.firebaseapp.com",
  projectId: "hackaton-70b38",
  storageBucket: "hackaton-70b38.appspot.com",
  messagingSenderId: "500779632759",
  appId: "1:500779632759:web:54db5d931d2ea1a3101e72",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Firestore and Auth if needed
export const db = getFirestore(app); // Firestore instance
export const auth = getAuth(app); // Auth instance
export const storage = getStorage(app);