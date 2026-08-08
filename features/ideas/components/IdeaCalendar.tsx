"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  fetchIdeaCalendar,
  type IdeaCalendarDay,
  type IdeaCalendarMonth,
} from "../../../lib/api/idea-calendar-client";
import { readMemberSession } from "../../../lib/storage/member-session";

const WEEKDAYS = [
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "日",
];

function monthLabel(
  month: string,
) {
  const [year, monthNumber] =
    month.split("-").map(Number);

  return `${year}年${monthNumber}月`;
}

function shiftMonth(
  month: string,
  amount: number,
) {
  const [year, monthNumber] =
    month.split("-").map(Number);

  const date = new Date(
    Date.UTC(
      year,
      monthNumber - 1 + amount,
      1,
    ),
  );

  return [
    date.getUTCFullYear(),
    String(
      date.getUTCMonth() + 1,
    ).padStart(2, "0"),
  ].join("-");
}

function buildMonthDates(
  month: string,
) {
  const [year, monthNumber] =
    month.split("-").map(Number);

  const first =
    new Date(
      Date.UTC(
        year,
        monthNumber - 1,
        1,
      ),
    );

  const daysInMonth =
    new Date(
      Date.UTC(
        year,
        monthNumber,
        0,
      ),
    ).getUTCDate();

  /*
    JS:
    Sunday = 0

    月历：
    Monday = 0
  */
  const leadingEmpty =
    (first.getUTCDay() + 6) % 7;

  const cells:
    Array<string | null> = [];

  for (
    let index = 0;
    index < leadingEmpty;
    index += 1
  ) {
    cells.push(null);
  }

  for (
    let day = 1;
    day <= daysInMonth;
    day += 1
  ) {
    cells.push(
      `${month}-${String(day).padStart(
        2,
        "0",
      )}`,
    );
  }

  while (
    cells.length % 7 !== 0
  ) {
    cells.push(null);
  }

  return cells;
}

function stateClass(
  day:
    | IdeaCalendarDay
    | undefined,
) {
  if (!day) {
    return "";
  }

  if (day.bothAnswered) {
    return "idea-calendar-day-both";
  }

  if (day.selfAnswered) {
    return "idea-calendar-day-self";
  }

  if (day.partnerAnswered) {
    return "idea-calendar-day-partner";
  }

  return "idea-calendar-day-recorded";
}

export function IdeaCalendar({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const [
    calendar,
    setCalendar,
  ] =
    useState<IdeaCalendarMonth | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    changingMonth,
    setChangingMonth,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  async function loadMonth(
    month?: string,
  ) {
    const session =
      readMemberSession();

    if (!session) {
      setError(
        "当前设备尚未绑定成员身份",
      );
      setLoading(false);
      return;
    }

    if (calendar) {
      setChangingMonth(true);
    } else {
      setLoading(true);
    }

    try {
      const result =
        await fetchIdeaCalendar(
          session.token,
          month,
        );

      setCalendar(result);

      if (
        !selectedDate &&
        result.currentDate.startsWith(
          `${result.month}-`,
        )
      ) {
        onSelectDate(
          result.currentDate,
        );
      }

      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "暂时无法读取妙想月历",
      );
    } finally {
      setLoading(false);
      setChangingMonth(false);
    }
  }

  useEffect(() => {
    void loadMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dayMap =
    useMemo(() => {
      return new Map(
        (calendar?.days ?? []).map(
          (day) => [
            day.localDate,
            day,
          ],
        ),
      );
    }, [calendar]);

  const cells =
    useMemo(
      () =>
        calendar
          ? buildMonthDates(
              calendar.month,
            )
          : [],
      [calendar],
    );

  if (
    loading &&
    !calendar
  ) {
    return (
      <section className="idea-calendar-card idea-calendar-loading">
        正在打开这个月的妙想…
      </section>
    );
  }

  if (
    error &&
    !calendar
  ) {
    return (
      <section className="idea-calendar-card idea-calendar-loading">
        {error}
      </section>
    );
  }

  if (!calendar) {
    return null;
  }

  const previousMonth =
    shiftMonth(
      calendar.month,
      -1,
    );

  const nextMonth =
    shiftMonth(
      calendar.month,
      1,
    );

  const currentMonth =
    calendar.currentDate.slice(
      0,
      7,
    );

  const canGoNext =
    nextMonth <=
    currentMonth;

  return (
    <section className="idea-calendar-card">
      <div className="idea-calendar-header">
        <button
          type="button"
          className="idea-calendar-arrow"
          aria-label="上个月"
          disabled={changingMonth}
          onClick={() => {
            void loadMonth(
              previousMonth,
            );
          }}
        >
          ‹
        </button>

        <div className="idea-calendar-title">
          <strong>
            {monthLabel(
              calendar.month,
            )}
          </strong>

          {changingMonth ? (
            <small>
              正在翻页…
            </small>
          ) : (
            <small>
              这个月一起留下的妙想
            </small>
          )}
        </div>

        <button
          type="button"
          className="idea-calendar-arrow"
          aria-label="下个月"
          disabled={
            changingMonth ||
            !canGoNext
          }
          onClick={() => {
            void loadMonth(
              nextMonth,
            );
          }}
        >
          ›
        </button>
      </div>

      <div className="idea-calendar-weekdays">
        {WEEKDAYS.map(
          (weekday) => (
            <span key={weekday}>
              {weekday}
            </span>
          ),
        )}
      </div>

      <div className="idea-calendar-grid">
        {cells.map(
          (
            localDate,
            index,
          ) => {
            if (!localDate) {
              return (
                <span
                  key={`empty-${index}`}
                  className="idea-calendar-empty"
                  aria-hidden="true"
                />
              );
            }

            const day =
              dayMap.get(
                localDate,
              );

            const isToday =
              localDate ===
              calendar.currentDate;

            const isSelected =
              localDate ===
              selectedDate;

            const isFuture =
              localDate >
              calendar.currentDate;

            return (
              <button
                key={localDate}
                type="button"
                disabled={isFuture}
                aria-label={localDate}
                aria-current={
                  isToday
                    ? "date"
                    : undefined
                }
                className={[
                  "idea-calendar-day",
                  stateClass(day),
                  isToday
                    ? "idea-calendar-day-today"
                    : "",
                  isSelected
                    ? "idea-calendar-day-selected"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  onSelectDate(
                    localDate,
                  );
                }}
              >
                <span>
                  {Number(
                    localDate.slice(
                      8,
                    ),
                  )}
                </span>
              </button>
            );
          },
        )}
      </div>

      <div className="idea-calendar-legend">
        <span>
          <i className="idea-calendar-key idea-calendar-key-self" />
          我
        </span>

        <span>
          <i className="idea-calendar-key idea-calendar-key-partner" />
          TA
        </span>

        <span>
          <i className="idea-calendar-key idea-calendar-key-both" />
          两个人
        </span>
      </div>
    </section>
  );
}
