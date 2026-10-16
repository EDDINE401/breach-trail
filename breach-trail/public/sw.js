/* Service worker: keeps the app shell and fonts available if the hotspot drops.
   Browsers only run service workers on HTTPS or localhost. Over plain http on a
   hotspot address this file is simply never registered, and the app still works online. */
var VERSION = "bt-v6";
var SHELL = ["/", "/style.css", "/app.js", "/i18n.js", "/vendor/qrcode.js", "/vendor/jsQR.js", "/leader", "/leader.js",
  "/board", "/board.js", "/icon.svg", "/manifest.webmanifest",
  "/fonts/noto-sans-runic-runic-400-normal.woff2", "/fonts/jetbrains-mono-latin-500-normal.woff2", "/fonts/jetbrains-mono-latin-700-normal.woff2", "/fonts/jetbrains-mono-latin-800-normal.woff2",
  "/fonts/geist-latin-wght-normal.woff2", "/fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2", "/fonts/ibm-plex-sans-arabic-arabic-700-normal.woff2"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.indexOf("/api/") === 0) return;
  if (url.pathname.indexOf("/fonts/") === 0) {
    e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req); }));
    return;
  }
  e.respondWith(fetch(req).then(function (res) {
    var copy = res.clone();
    caches.open(VERSION).then(function (c) { c.put(req, copy); });
    return res;
  }).catch(function () { return caches.match(req).then(function (hit) { return hit || caches.match("/"); }); }));
});
