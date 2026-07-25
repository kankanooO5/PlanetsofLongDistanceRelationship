"use client";

import { useEffect } from "react";

export function useServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister())),
        )
        .catch(() => undefined);

      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
}
