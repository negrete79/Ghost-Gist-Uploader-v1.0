const CACHE_NAME = 'ghost-gist-cache-v1';

// Lista de arquivos que serão cacheados na instalação
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
];

// Evento de instalação: abre um cache e adiciona os arquivos essenciais
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
  // Força a ativação do novo Service Worker imediatamente
  self.skipWaiting();
});

// Evento de ativação: limpa caches antigos
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Limpando cache antigo');
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Garante que o novo Service Worker assuma o controle imediatamente
  return self.clients.claim();
});

// Evento de busca (fetch): intercepta as requisições e serve do cache se estiver offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se o arquivo estiver no cache, retorna-o
        if (response) {
          return response;
        }
        // Senão, busca na rede
        return fetch(event.request);
      })
  );
});
