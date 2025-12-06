const CACHE_NAME = 'mobility-mindfulness-v2';
const AUDIO_CACHE = 'audio-cache-v2';
const OFFLINE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Audio file IDs from Google Drive
const AUDIO_FILES = [
  'https://drive.google.com/uc?export=download&id=1HbnA2YFRiIzTc7ovgvH4G-mOZOKwdwKx', // NSDR 10 Min
  'https://drive.google.com/uc?export=download&id=1GnkxM6Frced8p6MgxS16Tdl0ivV24GfI', // Med 10min
  'https://drive.google.com/uc?export=download&id=1Umgjax0s5xAJSAD1vWmC-aaH9FQbQPND', // Med 15min
  'https://drive.google.com/uc?export=download&id=1k7Vd-2U6sxCIwAH1xGILVYbwzdk87V7q', // Med 20min
  'https://drive.google.com/uc?export=download&id=11VUSC-lgdnK9YDNNrfgU4klr_jAJRgeV', // Med 30min
  'https://drive.google.com/uc?export=download&id=1iq_qS4jvFGP14Ha7GKEZDmSMb7yW_DJ4', // Med 45min & 60min
  'https://drive.google.com/uc?export=download&id=1ZkPzUaHc0iiKUvFCCZRf1kgPN2nby0yQ', // End of Day
  'https://drive.google.com/uc?export=download&id=1PSUDBJGpg5ED6zY1tVrIg0nIChnI3_I3', // Stressed 3min
  'https://drive.google.com/uc?export=download&id=10Pt0_vvtCHQNFfh6hpWj-w3LjeHqStQS'  // Walking 10min
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_ASSETS)),
      // Pre-cache audio files in the background
      caches.open(AUDIO_CACHE).then((cache) => {
        return Promise.allSettled(
          AUDIO_FILES.map((url) =>
            fetch(url, { mode: 'no-cors' })
              .then((response) => cache.put(url, response))
              .catch((err) => console.log('Failed to cache audio:', url, err))
          )
        );
      })
    ])
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key !== AUDIO_CACHE)
           .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // Cache-first strategy for audio files from Google Drive
  if (url.includes('drive.google.com/uc?export=download')) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) {
            console.log('Serving audio from cache:', url);
            return cached;
          }

          console.log('Fetching and caching audio:', url);
          return fetch(event.request, { mode: 'no-cors' }).then((response) => {
            const clone = response.clone();
            cache.put(event.request, clone);
            return response;
          });
        })
      )
    );
    return;
  }

  // Network-first strategy for everything else
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
