"use client";

type RelationshipHeroProps = {
  relationshipDays: number | string;
  meetingDays: number | string;
};

export function RelationshipHero({
  relationshipDays,
  meetingDays,
}: RelationshipHeroProps) {
  return (
    <article className="hero-card">
      <div className="hero-copy">
        <span>我们已经在一起</span>
        <strong>{relationshipDays}</strong>
        <span>天</span>
      </div>

      <div className="stars" aria-hidden="true">
        ✦ · ✧ · ✦
      </div>

      <p>
        距离下次见面还有 <b>{meetingDays}</b> 天
      </p>
    </article>
  );
}
