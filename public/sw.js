// 缓存静态资源，加快二次加载
const CACHE = 'kaoyan-reader-v1'
const URLS = ['/kaoyan-reader/']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(URLS)))
})

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  )
})
