// public/sw.js

self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json(); // Data yang dikirim dari server (Supabase)
    
    const options = {
      body: data.body,
      icon: '/Logo_apps.png',
      badge: '/Logo_apps.png',
      vibrate: [200, 100, 200],
      data: {
        url: data.url // URL untuk dibuka saat notif di-klik
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Menangani aksi saat notifikasi di-klik
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});