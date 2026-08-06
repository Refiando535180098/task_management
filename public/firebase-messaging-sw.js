// public/firebase-messaging-sw.js

// Import library Firebase khusus untuk background worker
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Ganti bagian ini dengan konfigurasi Firebase Anda!
// (Bisa dilihat di Firebase Console > Project Settings > General > Your apps)
const firebaseConfig = {
  apiKey: "AIzaSyAIxe55-HP7yjTDwoCbGKdyga-yZA0mJeI",
  authDomain: "syn-erp.firebaseapp.com",
  projectId: "syn-erp",
  storageBucket: "syn-erp.firebasestorage.app",
  messagingSenderId: "1038403525510",
  appId: "1:1038403525510:web:375b8d19c46cb46e2d6a07",
  measurementId: "G-26BNMNR9E5"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Menerima pesan saat aplikasi berjalan di background / web ditutup
messaging.onBackgroundMessage((payload) => {
  console.log('Pesan dari background diterima:', payload);
  
  const notificationTitle = payload.notification?.title || 'Notifikasi Baru Syntegra';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/Logo_apps.png', // Pastikan nama file logo ini sesuai yang ada di folder public Anda
    badge: '/Logo_apps.png',
    vibrate: [200, 100, 200],
    data: { 
      // Mengarahkan user saat notifikasi diklik
      url: payload.data?.click_action || '/' 
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Aksi ketika notifikasi di-klik di HP/Laptop
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url));
});