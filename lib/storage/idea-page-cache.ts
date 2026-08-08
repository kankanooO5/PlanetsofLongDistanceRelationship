import type {
  IdeaAnswer,
  TodayIdea,
  TodayIdeaExchange,
} from "../api/idea-client";
import type {
  IdeaAnalysisContent,
} from "../api/idea-analysis-client";
import type {
  IdeaCalendarMonth,
} from "../api/idea-calendar-client";

/*
  V2 使用 localStorage，而不是 sessionStorage。

  目的：
  - 页签切换秒开
  - PWA / 浏览器进程被杀后重新打开仍可恢复
  - 网络数据仍在后台静默刷新

  缓存按 relationship + member 隔离，
  避免同一设备切换成员身份后看到旧成员数据。
*/

const CACHE_VERSION = "v5";

type TodayCache = {
  savedAt: number;
  todayIdea: TodayIdea;
  answer: IdeaAnswer | null;
  exchange: TodayIdeaExchange;
};

type CalendarCache = {
  savedAt: number;
  calendar: IdeaCalendarMonth;
};

type AnalysisCache = {
  savedAt: number;
  analysis: IdeaAnalysisContent;
  revision: string;
};

function storage() {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  return window.localStorage;
}

function currentOwner() {
  const target = storage();

  if (!target) {
    return "";
  }

  const relationshipId =
    target.getItem(
      "two-planets-relationship-id",
    ) ?? "";

  const memberId =
    target.getItem(
      "two-planets-member-id",
    ) ?? "";

  if (
    !relationshipId ||
    !memberId
  ) {
    return "";
  }

  return `${relationshipId}:${memberId}`;
}

function todayKey() {
  const owner =
    currentOwner();

  return owner
    ? `two-planets-ideas-today-${CACHE_VERSION}:${owner}`
    : "";
}

function calendarKey() {
  const owner =
    currentOwner();

  return owner
    ? `two-planets-ideas-calendar-${CACHE_VERSION}:${owner}`
    : "";
}

function analysisKey(
  date: string,
) {
  const owner =
    currentOwner();

  return owner && date
    ? `two-planets-idea-analysis-${CACHE_VERSION}:${owner}:${date}`
    : "";
}

function currentDateInTimezone(
  timezone: string,
) {
  try {
    const parts =
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone: timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        },
      ).formatToParts(
        new Date(),
      );

    const year =
      parts.find(
        (part) =>
          part.type === "year",
      )?.value;

    const month =
      parts.find(
        (part) =>
          part.type === "month",
      )?.value;

    const day =
      parts.find(
        (part) =>
          part.type === "day",
      )?.value;

    if (
      !year ||
      !month ||
      !day
    ) {
      return null;
    }

    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
}


/* =========================================================
   Today
   ========================================================= */

export function readIdeaTodayCache() {
  const target =
    storage();

  const key =
    todayKey();

  if (
    !target ||
    !key
  ) {
    return null;
  }

  try {
    const raw =
      target.getItem(key);

    if (!raw) {
      return null;
    }

    const cache =
      JSON.parse(raw) as TodayCache;

    const currentDate =
      currentDateInTimezone(
        cache.todayIdea.timezone,
      );

    /*
      当天缓存不设分钟级 TTL。

      只要还是关系时区里的同一天，
      就先瞬间显示旧缓存，
      随后后台请求再修正状态。
    */
    if (
      !currentDate ||
      currentDate !==
        cache.todayIdea
          .dailyQuestion
          .localDate
    ) {
      target.removeItem(key);
      return null;
    }

    return cache;
  } catch {
    return null;
  }
}

export function writeIdeaTodayCache(
  value: Omit<
    TodayCache,
    "savedAt"
  >,
) {
  const target =
    storage();

  const key =
    todayKey();

  if (
    !target ||
    !key
  ) {
    return;
  }

  try {
    target.setItem(
      key,
      JSON.stringify({
        ...value,
        savedAt:
          Date.now(),
      }),
    );
  } catch {
    /*
      localStorage 写满等情况
      不应影响主功能。
    */
  }
}


/* =========================================================
   Calendar
   ========================================================= */

export function readIdeaCalendarCache() {
  const target =
    storage();

  const key =
    calendarKey();

  if (
    !target ||
    !key
  ) {
    return null;
  }

  try {
    const raw =
      target.getItem(key);

    if (!raw) {
      return null;
    }

    const cache =
      JSON.parse(
        raw,
      ) as CalendarCache;

    const actualDate =
      currentDateInTimezone(
        cache.calendar.timezone,
      );

    if (!actualDate) {
      return null;
    }

    /*
      App 冷启动时只恢复“当前月份”。

      如果用户昨天浏览到了旧月份，
      杀进程后重新打开仍应先回到本月。
    */
    if (
      cache.calendar.month !==
      actualDate.slice(0, 7)
    ) {
      return null;
    }

    return {
      ...cache.calendar,
      currentDate:
        actualDate,
    };
  } catch {
    return null;
  }
}

export function writeIdeaCalendarCache(
  calendar: IdeaCalendarMonth,
) {
  const target =
    storage();

  const key =
    calendarKey();

  if (
    !target ||
    !key
  ) {
    return;
  }

  /*
    只持久化当前月，
    浏览历史月份时不覆盖冷启动首页缓存。
  */
  const actualDate =
    currentDateInTimezone(
      calendar.timezone,
    );

  if (
    !actualDate ||
    calendar.month !==
      actualDate.slice(0, 7)
  ) {
    return;
  }

  try {
    target.setItem(
      key,
      JSON.stringify({
        savedAt:
          Date.now(),
        calendar,
      }),
    );
  } catch {
    // 缓存失败不影响主流程。
  }
}


/* =========================================================
   AI analysis
   ========================================================= */

export function readIdeaAnalysisCache(
  date: string,
  revision: string,
) {
  const target =
    storage();

  const key =
    analysisKey(date);

  if (
    !target ||
    !key ||
    !revision
  ) {
    return null;
  }

  try {
    const raw =
      target.getItem(key);

    if (!raw) {
      return null;
    }

    const cache =
      JSON.parse(
        raw,
      ) as AnalysisCache;

    /*
      revision 由双方答案 updatedAt 构成。

      任意一方修改回答，
      旧解析自然失效。
    */
    if (
      cache.revision !==
      revision
    ) {
      return null;
    }

    return cache.analysis;
  } catch {
    return null;
  }
}

export function writeIdeaAnalysisCache(
  date: string,
  revision: string,
  analysis: IdeaAnalysisContent,
) {
  const target =
    storage();

  const key =
    analysisKey(date);

  if (
    !target ||
    !key ||
    !revision
  ) {
    return;
  }

  try {
    target.setItem(
      key,
      JSON.stringify({
        savedAt:
          Date.now(),
        revision,
        analysis,
      }),
    );
  } catch {
    // 缓存失败不影响解析本身。
  }
}


export function clearLegacyIdeaSessionCache() {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    const keysToDelete: string[] =
      [];

    for (
      let index = 0;
      index <
      window.sessionStorage.length;
      index += 1
    ) {
      const key =
        window.sessionStorage.key(
          index,
        );

      if (
        key &&
        (
          key.startsWith(
            "two-planets-ideas-",
          ) ||
          key.startsWith(
            "two-planets-idea-analysis-",
          )
        )
      ) {
        keysToDelete.push(
          key,
        );
      }
    }

    for (
      const key of keysToDelete
    ) {
      window.sessionStorage.removeItem(
        key,
      );
    }
  } catch {
    // 忽略旧缓存清理失败。
  }
}
