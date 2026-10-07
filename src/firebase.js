import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCVVCUZKPY1cdVI34OGcfor9p76UQ8FnWY",
  authDomain: "web-counter-63ba4.firebaseapp.com",
  projectId: "web-counter-63ba4",
  storageBucket: "web-counter-63ba4.firebasestorage.app",
  messagingSenderId: "113357298158",
  appId: "1:113357298158:web:d36e43db368de13e5d56ff",
  measurementId: "G-RX6D7T12RH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

