"use client";

import Link from "next/link";

import type { CoupleSettings, Role } from "../../shared/types";

type ProfileTabProps = {
  settings: CoupleSettings;
  role: Role;
  onLogout: () => void;
};

export function ProfileTab({ settings, role, onLogout }: ProfileTabProps) {
  const currentName =
    role === "first" ? settings.firstName : settings.secondName;

  function handleLogout() {
    const confirmed = window.confirm(
      "退出后，这台设备将返回关系入口页。关系和另一台设备的数据不会被删除。",
    );

    if (!confirmed) return;

    onLogout();
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">OUR LITTLE UNIVERSE</p>

          <h1>我的</h1>

          <p className="tab-header-description">
            管理当前成员身份，以及需要连接的其他设备。
          </p>
        </div>
      </header>

      <section className="content tab-page">
        <div className="profile-card">
          <div className="profile-avatar" aria-hidden="true">
            ✦
          </div>

          <div className="profile-card-copy">
            <p className="profile-card-label">CURRENT PLANET</p>

            <h2>{currentName}</h2>

            <p>这台设备已经绑定当前星球</p>
          </div>
        </div>

        <div className="profile-list">
          <Link href="/device-code?target=self" className="profile-list-item">
            <span>绑定我的另一台设备</span>
            <strong aria-hidden="true">›</strong>
          </Link>

          <Link
            href="/device-code?target=partner"
            className="profile-list-item"
          >
            <span>恢复另一颗星球</span>
            <strong aria-hidden="true">›</strong>
          </Link>
        </div>

        <button
          type="button"
          className="profile-logout-button"
          onClick={handleLogout}
        >
          退出这台设备
        </button>

        <p className="profile-logout-note">
          只清除当前设备保存的成员身份，不会删除你们的关系。
        </p>
      </section>
    </>
  );
}
