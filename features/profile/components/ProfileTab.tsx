"use client";

import type { CoupleSettings, Role } from "../../shared/types";

type ProfileTabProps = {
  settings: CoupleSettings;
  role: Role;
};

export function ProfileTab({
  settings,
  role,
}: ProfileTabProps) {
  const currentName =
    role === "first"
      ? settings.firstName
      : settings.secondName;

  const partnerName =
    role === "first"
      ? settings.secondName
      : settings.firstName;

  return (
    <section className="tab-page profile-page">
      <header className="tab-page-header">
        <p className="tab-page-eyebrow">OUR LITTLE UNIVERSE</p>
        <h1>我的星球</h1>
        <p>管理你们的小宇宙和关系信息。</p>
      </header>

      <section className="profile-card">
        <div className="profile-avatar" aria-hidden="true">
          {currentName.slice(0, 1)}
        </div>

        <div className="profile-card-copy">
          <p className="profile-card-label">当前身份</p>
          <h2>{currentName}</h2>
          <p>和 {partnerName} 共享这颗小宇宙</p>
        </div>
      </section>

      <section className="profile-list">
        <div className="profile-list-item">
          <span>恋爱开始日</span>
          <strong>{settings.startDate}</strong>
        </div>

        <div className="profile-list-item">
          <span>下次见面</span>
          <strong>{settings.nextMeeting}</strong>
        </div>

        <div className="profile-list-item">
          <span>我的身份</span>
          <strong>
            {role === "first" ? "星球一" : "星球二"}
          </strong>
        </div>
      </section>
    </section>
  );
}
