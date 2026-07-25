import Link from "next/link";

export function ProfileTab() {
  return (
    <section className="tab-page">
      <header className="tab-page-header">
        <p className="tab-page-eyebrow">
          OUR LITTLE UNIVERSE
        </p>

        <h1>我的星球</h1>

        <p>
          管理当前成员身份，以及需要连接的其他设备。
        </p>
      </header>

      <div className="profile-identity-card">
        <div
          className="profile-identity-icon"
          aria-hidden="true"
        >
          ✦
        </div>

        <div className="profile-identity-copy">
          <h2>固定成员身份</h2>

          <p>
            这台设备已经绑定当前星球。每台设备都会保存独立的成员凭证。
          </p>
        </div>
      </div>

      <section className="profile-device-section">
        <header className="profile-device-header">
          <p>设备管理</p>
        </header>

        <div className="profile-device-list">
          <Link
            href="/device-code?target=self"
            className="profile-menu-item"
          >
            <span>
              <strong>绑定我的另一台设备</strong>

              <small>
                新设备继续使用当前星球身份
              </small>
            </span>

            <span aria-hidden="true">›</span>
          </Link>

          <Link
            href="/device-code?target=partner"
            className="profile-menu-item"
          >
            <span>
              <strong>恢复另一颗星球</strong>

              <small>
                为关系中的另一位固定成员恢复身份
              </small>
            </span>

            <span aria-hidden="true">›</span>
          </Link>
        </div>
      </section>
    </section>
  );
}
