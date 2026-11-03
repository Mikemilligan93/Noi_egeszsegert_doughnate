/* „Kitakarító” service worker.
 * Ezen a címen korábban a Módszermatch futott, ami a látogatók böngészőjébe egy gyorsítótárazó service workert
 * telepített – az a régi oldalt adja vissza akkor is, ha a szerveren már ez az oldal van.
 * Ez a fájl lecseréli: törli a régi gyorsítótárakat, eltávolítja magát, és újratölti a nyitott lapokat.
 * A Doughnate oldal maga nem használ service workert. Ha már senkinél nem jelenik meg a Módszermatch, törölhető. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const kulcsok = await caches.keys();
    await Promise.all(kulcsok.map(k => caches.delete(k)));
    await self.registration.unregister();
    const lapok = await self.clients.matchAll({ type: "window" });
    lapok.forEach(lap => lap.navigate(lap.url));
  })());
});
