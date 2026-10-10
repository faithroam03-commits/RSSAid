self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (
    event.request.method !== "POST" ||
    url.origin !== self.location.origin ||
    url.pathname !== "/share"
  ) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const formData = await event.request.formData();

        const files = formData
          .getAll("files")
          .filter((item) => item instanceof File);

        const cache = await caches.open(
          "random-link-share-temp-v1"
        );

        const file = files.find((item) =>
          item.type.startsWith("image/")
        );

        if (file) {
          await cache.put(
            "/__shared-image",
            new Response(file, {
              headers: {
                "Content-Type":
                  file.type || "application/octet-stream",
                "X-File-Name": encodeURIComponent(
                  file.name
                ),
              },
            })
          );

          return Response.redirect(
            new URL(
              "/register?shared=image",
              self.location.origin
            ).href,
            303
          );
        }

        const title = String(
          formData.get("title") || ""
        );
        const text = String(
          formData.get("text") || ""
        );
        const sharedUrl = String(
          formData.get("url") || ""
        );

        const params = new URLSearchParams();

        if (title) params.set("title", title);
        if (text) params.set("text", text);
        if (sharedUrl) params.set("url", sharedUrl);

        return Response.redirect(
          new URL(
            `/register?${params.toString()}`,
            self.location.origin
          ).href,
          303
        );
      } catch (error) {
        console.error("共有受信エラー:", error);

        return Response.redirect(
          new URL(
            "/register?shareError=1",
            self.location.origin
          ).href,
          303
        );
      }
    })()
  );
});