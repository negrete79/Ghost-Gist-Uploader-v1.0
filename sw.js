// Nome do cache para controle de versão
const CACHE_NAME = 'ghost-gist-cache-v1';

// Arquivos essenciais para o funcionamento offline
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

// Evento de instalação: o Service Worker está sendo instalado.
// Usamos isso para criar um cache e adicionar os arquivos essenciais.
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cache aberto, adicionando arquivos essenciais');
        return cache.addAll(urlsToCache);
      })
  );
  // Força o novo Service Worker a se tornar ativo imediatamente
  self.skipWaiting();
});

// Evento de ativação: o Service Worker foi instalado e agora está ativo.
// Usamos isso para limpar caches antigos.
self.addEventListener('activate', event => {
  console.log('[Service Worker] Ativado e pronto para controlar a página!');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Se o nome do cache não for o atual, delete-o
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Limpando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Garante que o Service Worker assuma o controle da página imediatamente
  return self.clients.claim();
});

// Evento de busca (fetch): intercepta todas as requisições de rede.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se a resposta estiver no cache, retorna-a
        if (response) {
          console.log('[Service Worker] Servindo do cache:', event.request.url);
          return response;
        }
        // Senão, busca na rede
        console.log('[Service Worker] Buscando na rede:', event.request.url);
        return fetch(event.request);
      })
  );
});
