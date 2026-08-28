const CACHE_PREFIX = "two-planets-";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith(CACHE_PREFIX))
              .map((key) => caches.delete(key)),
          ),
        ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // API 请求和前端模块始终走网络，避免旧数据或旧脚本缓存。
  event.respondWith(fetch(request));
});

// Web Push

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = {
      body:
        event.data?.text() ??
        "你收到了一条来自两颗星球的新消息。",
    };
  }

  const title =
    typeof payload.title === "string"
      ? payload.title
      : "两颗星球";

  const body =
    typeof payload.body === "string"
      ? payload.body
      : "你收到了一条来自两颗星球的新消息。";

  const url =
    typeof payload.url === "string"
      ? payload.url
      : "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png?v=20260825-1",
      badge: "/icon-192.png?v=20260825-1",
      data: {
        url,
        eventType:
          payload.eventType ?? null,
        eventId:
          payload.eventId ?? null,
      },
    }),
  );
});

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const rawUrl =
      event.notification.data?.url ?? "/";

    const targetUrl = new URL(
      rawUrl,
      self.location.origin,
    ).href;

    event.waitUntil(
      self.clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then(async (windowClients) => {
          for (const client of windowClients) {
            if (!("focus" in client)) {
              continue;
            }

            if (
              "navigate" in client &&
              client.url !== targetUrl
            ) {
              await client.navigate(targetUrl);
            }

            return client.focus();
          }

          return self.clients.openWindow(
            targetUrl,
          );
        }),
    );
  },
);
