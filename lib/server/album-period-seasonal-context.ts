import {
  Solar,
} from "lunar-javascript";

import {
  addCalendarDays,
} from "./relationship-date";

export type AlbumSolarTermContext = {
  name: string;
  date: string;

  relation:
    | "within_period"
    | "just_before"
    | "just_after";

  distanceDays: number;
};

export type AlbumPeriodSeasonalContext = {
  solarTerms:
    AlbumSolarTermContext[];

  factualNote: string;
};

function parseDateKey(
  dateKey: string,
) {
  const [
    year,
    month,
    day,
  ] = dateKey
    .split("-")
    .map(Number);

  return {
    year,
    month,
    day,
  };
}

function dayDistance(
  from: string,
  to: string,
) {
  const a =
    Date.parse(
      `${from}T00:00:00Z`,
    );

  const b =
    Date.parse(
      `${to}T00:00:00Z`,
    );

  return Math.round(
    (b - a) /
      86400000,
  );
}

function solarTermOn(
  dateKey: string,
) {
  const {
    year,
    month,
    day,
  } =
    parseDateKey(
      dateKey,
    );

  const name =
    Solar
      .fromYmd(
        year,
        month,
        day,
      )
      .getLunar()
      .getJieQi();

  return name?.trim() || null;
}

export function getAlbumPeriodSeasonalContext(
  input: {
    startDate: string;
    endDate: string;
  },
): AlbumPeriodSeasonalContext {
  const scanStart =
    addCalendarDays(
      input.startDate,
      -5,
    );

  const scanEnd =
    addCalendarDays(
      input.endDate,
      5,
    );

  const found: Array<{
    name: string;
    date: string;
  }> = [];

  let current =
    scanStart;

  while (
    current <= scanEnd
  ) {
    const name =
      solarTermOn(
        current,
      );

    if (name) {
      found.push({
        name,
        date:
          current,
      });
    }

    current =
      addCalendarDays(
        current,
        1,
      );
  }

  const within =
    found
      .filter(
        (item) =>
          item.date >=
            input.startDate &&
          item.date <=
            input.endDate,
      )
      .map(
        (item) => ({
          ...item,

          relation:
            "within_period" as const,

          distanceDays:
            0,
        }),
      );

  const previous =
    found
      .filter(
        (item) =>
          item.date <
          input.startDate,
      )
      .map(
        (item) => ({
          ...item,

          distanceDays:
            dayDistance(
              item.date,
              input.startDate,
            ),
        }),
      )
      .sort(
        (a, b) =>
          a.distanceDays -
          b.distanceDays,
      )[0];

  const next =
    found
      .filter(
        (item) =>
          item.date >
          input.endDate,
      )
      .map(
        (item) => ({
          ...item,

          distanceDays:
            dayDistance(
              input.endDate,
              item.date,
            ),
        }),
      )
      .sort(
        (a, b) =>
          a.distanceDays -
          b.distanceDays,
      )[0];

  const solarTerms:
    AlbumSolarTermContext[] =
      [...within];

  if (
    within.length === 0 &&
    previous &&
    previous.distanceDays <= 5
  ) {
    solarTerms.push({
      name:
        previous.name,

      date:
        previous.date,

      relation:
        "just_before",

      distanceDays:
        previous.distanceDays,
    });
  }

  if (
    within.length === 0 &&
    next &&
    next.distanceDays <= 5
  ) {
    solarTerms.push({
      name:
        next.name,

      date:
        next.date,

      relation:
        "just_after",

      distanceDays:
        next.distanceDays,
    });
  }

  const factualNote =
    solarTerms
      .map(
        (term) => {
          if (
            term.relation ===
            "within_period"
          ) {
            return (
              `${term.name}在本周期内，` +
              `日期为${term.date}`
            );
          }

          if (
            term.relation ===
            "just_before"
          ) {
            return (
              `${term.name}在周期开始前` +
              `${term.distanceDays}天，` +
              `日期为${term.date}`
            );
          }

          return (
            `${term.name}在周期结束后` +
            `${term.distanceDays}天，` +
            `日期为${term.date}`
          );
        },
      )
      .join("；");

  return {
    solarTerms,
    factualNote,
  };
}
