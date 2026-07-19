importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDp2od-lrfAhEHV5oAIqBW5rWjaRbnAdFM",
  authDomain: "aj-super-portal.firebaseapp.com",
  databaseURL: "https://aj-super-portal-default-rtdb.firebaseio.com",
  projectId: "aj-super-portal",
  storageBucket: "aj-super-portal.appspot.com",
  messagingSenderId: "288191292906",
  appId: "1:288191292906:web:bc31cb072948533f88fe93",
  measurementId: "G-8WYD1ZB96D"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'AJ Super Portal';
  const options = {
    body: payload.notification?.body || 'New AJ Portal activity',
    icon: '/logo.png',
    data: payload.data || {}
  };
  self.registration.showNotification(title, options);
});
