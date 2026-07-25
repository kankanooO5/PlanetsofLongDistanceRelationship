"use client";

import { useEffect } from "react";

const CACHE_PREFIX = "two-planets-";

export function useServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(
            registrations.map((registration) => registration.unregister()),
          ),
        )
        .catch(() => undefined);

      if ("caches" in window) {
        caches
          .keys()
          .then((keys) =>
            Promise.all(
              keys
                .filter((key) => key.startsWith(CACHE_PREFIX))
                .map((key) => caches.delete(key)),
            ),
          )
          .catch(() => undefined);
      }

      return;
    }

    let disposed = false;
    let reloading = false;

    // 首次安装时不强制刷新；仅在已有 SW 被新版本替换时刷新。
    const hadController = Boolean(navigator.serviceWorker.controller);

    const handleControllerChange = () => {
      if (disposed || reloading || !hadController) return;

      reloading = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );

    navigator.serviceWorker
      .register("/sw.js", {
        updateViaCache: "none",
      })
      .then((registration) => registration.update())
      .catch(() => undefined);

    return () => {
      disposed = true;
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
    };
  }, []);
}
