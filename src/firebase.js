// src/firebase.js
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAIxe55-HP7yjTDwoCbGKdyga-yZA0mJeI",
  authDomain: "syn-erp.firebaseapp.com",
  projectId: "syn-erp",
  storageBucket: "syn-erp.firebasestorage.app",
  messagingSenderId: "1038403525510",
  appId: "1:1038403525510:web:375b8d19c46cb46e2d6a07",
  measurementId: "G-26BNMNR9E5"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

// Fungsi untuk meminta token notifikasi
export const requestForToken = async () => {
  try {
    // 1. Daftarkan Service Worker (Penjaga Background) secara eksplisit
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    
    // 2. Minta Token menggunakan VAPID KEY Anda
    const currentToken = await getToken(messaging, { 
      vapidKey: 'PASTE_VAPID_KEY_ANDA_DI_SINI', // <--- PASTE VAPID KEY PANJANG ANDA DI SINI
      serviceWorkerRegistration: registration 
    });
    
    if (currentToken) {
      return currentToken;
    } else {
      console.log('Tidak bisa mendapatkan token Firebase.');
      return null;
    }
  } catch (err) {
    console.error('Terjadi error saat mengambil token: ', err);
    return null;
  }
};