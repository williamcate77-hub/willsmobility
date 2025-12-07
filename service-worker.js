const CACHE_NAME = 'mobility-mindfulness-v5';
const AUDIO_CACHE = 'audio-cache-v5';
const OFFLINE_ASSETS = [
  '/willsmobility/',
  '/willsmobility/index.html',
  '/willsmobility/manifest.json',
  '/willsmobility/icon-192.png',
  '/willsmobility/icon-512.png'
];

// Local audio files
const AUDIO_FILES = [
  '/willsmobility/audio/nsdr-10min.mp3',
  '/willsmobility/audio/med-10min.mp3',
  '/willsmobility/audio/med-15min.mp3',
  '/willsmobility/audio/med-20min.mp3',
  '/willsmobility/audio/med-30min.mp3',
  '/willsmobility/audio/med-endofday.mp3',
  '/willsmobility/audio/med-stressed.mp3',
  '/willsmobility/audio/med-walking.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_ASSETS)),
      // Pre-cache audio files for instant playback
      caches.open(AUDIO_CACHE).then((cache) => cache.addAll(AUDIO_FILES))
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

  // Cache-first strategy for local audio files
  if (url.includes('/audio/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) {
          console.log('Serving audio from cache:', url);
          return cached;
        }
        console.log('Fetching audio:', url);
        return fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(AUDIO_CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Cache-first strategy for everything else
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match('/willsmobility/index.html'));
    })
  );
});
