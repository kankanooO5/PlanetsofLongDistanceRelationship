"use client";

import type { CoupleSettings, Role } from "../../shared/types";
import { daysBetween, daysUntil, greetingFor } from "../utils/dates";
import { HomeHeader } from "./HomeHeader";
import { RelationshipHero } from "./RelationshipHero";

type HomeTabProps = {
  settings: CoupleSettings;
  role: Role;
  now: Date;
};

export function HomeTab({ settings, role, now }: HomeTabProps) {
  const name = role === "first" ? settings.firstName : settings.secondName;
  const relationshipDays = daysBetween(settings.startDate, now);
  const meetingDays = daysUntil(settings.nextMeeting, now);

  return (
    <>
      <HomeHeader greeting={greetingFor(now)} name={name} role={role} />

      <section className="content">
        <RelationshipHero
          relationshipDays={relationshipDays}
          meetingDays={meetingDays}
        />
      </section>
    </>
  );
}
