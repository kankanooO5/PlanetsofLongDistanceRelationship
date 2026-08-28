import {
  readMemberSession,
} from "../storage/member-session";

export type PushClientStatus =
  | "checking"
  | "unsupported"
  | "needs-install"
  | "disabled"
  | "blocked"
  | "enabled";

function isIos() {
  return /iphone|ipad|ipod/i.test(
    navigator.userAgent,
  );
}

function isStandalone() {
  return (
    window.matchMedia(
      "(display-mode: standalone)",
    ).matches ||
    Boolean(
      (
        navigator as Navigator & {
          standalone?: boolean;
        }
      ).standalone,
    )
  );
}

function urlBase64ToUint8Array(
  base64String: string,
) {
  const padding =
    "=".repeat(
      (4 - (base64String.length % 4)) % 4,
    );

  const base64 = (
    base64String + padding
  )
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData =
    window.atob(base64);

  return Uint8Array.from(
    rawData,
    (character) =>
      character.charCodeAt(0),
  );
}

export async function getPushStatus():
Promise<PushClientStatus> {
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }

  if (
    isIos() &&
    !isStandalone()
  ) {
    return "needs-install";
  }

  if (
    Notification.permission ===
    "denied"
  ) {
    return "blocked";
  }

  const registration =
    await navigator.serviceWorker.ready;

  const subscription =
    await registration.pushManager
      .getSubscription();

  if (
    Notification.permission ===
      "granted" &&
    subscription
  ) {
    return "enabled";
  }

  return "disabled";
}

export async function enablePush() {
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    throw new Error(
      "当前浏览器暂不支持系统通知",
    );
  }

  if (
    isIos() &&
    !isStandalone()
  ) {
    throw new Error(
      "请先将两颗星球添加到主屏幕，再开启通知",
    );
  }

  const session =
    readMemberSession();

  if (!session) {
    throw new Error(
      "当前设备尚未绑定成员身份",
    );
  }

  const permission =
    await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "通知权限已被关闭，请在系统设置中重新开启"
        : "尚未获得通知权限",
    );
  }

  const registration =
    await navigator.serviceWorker.ready;

  let subscription =
    await registration.pushManager
      .getSubscription();

  if (!subscription) {
    const configResponse =
      await fetch(
        "/api/push/config",
        {
          cache: "no-store",
        },
      );

    const config =
      (await configResponse.json()) as {
        publicKey?: string;
        error?: string;
      };

    if (
      !configResponse.ok ||
      !config.publicKey
    ) {
      throw new Error(
        config.error ??
          "暂时无法读取通知配置",
      );
    }

    subscription =
      await registration.pushManager
        .subscribe({
          userVisibleOnly: true,
          applicationServerKey:
            urlBase64ToUint8Array(
              config.publicKey,
            ),
        });
  }

  const serialized =
    subscription.toJSON();

  const response =
    await fetch(
      "/api/push/subscribe",
      {
        method: "POST",
        headers: {
          "content-type":
            "application/json",
          "x-member-token":
            session.token,
        },
        body: JSON.stringify(
          serialized,
        ),
      },
    );

  const payload =
    (await response.json()) as {
      ok?: boolean;
      error?: string;
    };

  if (
    !response.ok ||
    !payload.ok
  ) {
    throw new Error(
      payload.error ??
        "暂时无法开启通知",
    );
  }

  return subscription;
}
