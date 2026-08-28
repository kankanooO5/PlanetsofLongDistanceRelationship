import {
  readMemberSession,
} from "../storage/member-session";

export type NotificationPreferenceEventType =
  | "photo_uploaded"
  | "photo_comment_added"
  | "idea_answer_submitted"
  | "idea_analysis_ready";

export type NotificationPreference = {
  eventType: NotificationPreferenceEventType;
  enabled: boolean;
};

function getToken() {
  const session =
    readMemberSession();

  if (!session) {
    throw new Error(
      "当前设备尚未绑定成员身份",
    );
  }

  return session.token;
}

export async function loadNotificationPreferences() {
  const response =
    await fetch(
      "/api/notifications/preferences",
      {
        cache: "no-store",
        headers: {
          "x-member-token":
            getToken(),
        },
      },
    );

  const payload =
    (await response.json()) as {
      preferences?: NotificationPreference[];
      error?: string;
    };

  if (
    !response.ok ||
    !payload.preferences
  ) {
    throw new Error(
      payload.error ??
        "暂时无法读取通知设置",
    );
  }

  return payload.preferences;
}

export async function updateNotificationPreference(
  eventType: NotificationPreferenceEventType,
  enabled: boolean,
) {
  const response =
    await fetch(
      "/api/notifications/preferences",
      {
        method: "PATCH",
        headers: {
          "content-type":
            "application/json",
          "x-member-token":
            getToken(),
        },
        body: JSON.stringify({
          eventType,
          enabled,
        }),
      },
    );

  const payload =
    (await response.json()) as {
      preference?: NotificationPreference;
      error?: string;
    };

  if (
    !response.ok ||
    !payload.preference
  ) {
    throw new Error(
      payload.error ??
        "暂时无法保存通知设置",
    );
  }

  return payload.preference;
}
