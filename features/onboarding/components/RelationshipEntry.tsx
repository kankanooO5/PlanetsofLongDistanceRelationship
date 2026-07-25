import Link from "next/link";

type RelationshipEntryProps = {
  error?: string;
};

export function RelationshipEntry({
  error,
}: RelationshipEntryProps) {
  return (
    <main className="relationship-entry">
      <div
        className="relationship-entry-background"
        aria-hidden="true"
      >
        <span className="relationship-entry-orbit relationship-entry-orbit-one" />
        <span className="relationship-entry-orbit relationship-entry-orbit-two" />
      </div>

      <section className="relationship-entry-card">
        <div
          className="relationship-entry-universe"
          aria-hidden="true"
        >
          <span className="relationship-entry-visual-orbit relationship-entry-visual-orbit-outer" />
          <span className="relationship-entry-visual-orbit relationship-entry-visual-orbit-inner" />

          <span className="relationship-entry-planet relationship-entry-planet-a">
            <span className="relationship-entry-planet-shine" />
          </span>

          <span className="relationship-entry-planet relationship-entry-planet-b">
            <span className="relationship-entry-planet-shine" />
          </span>

          <span className="relationship-entry-star relationship-entry-star-one">
            ✦
          </span>

          <span className="relationship-entry-star relationship-entry-star-two">
            ✧
          </span>
        </div>

        <header className="relationship-entry-header">
          <p className="relationship-entry-eyebrow">
            TWO PLANETS · ONE HOME
          </p>

          <h1>进入你们的小宇宙</h1>

          <p className="relationship-entry-description">
            每段关系只属于两颗固定的星球。选择一种方式，开始进入你们共同的空间。
          </p>
        </header>

        {error && (
          <p className="relationship-entry-error">
            {error}
          </p>
        )}

        <div className="relationship-entry-actions">
          <Link
            href="/create"
            className="relationship-entry-action relationship-entry-create"
          >
            <span
              className="relationship-entry-action-icon"
              aria-hidden="true"
            >
              <span className="relationship-entry-mini-planet relationship-entry-mini-planet-a" />
              <span className="relationship-entry-action-plus">
                +
              </span>
            </span>

            <span className="relationship-entry-action-copy">
              <strong>创建一段关系</strong>
              <span>
                建立新的小宇宙，并邀请另一颗星球加入
              </span>
            </span>

            <span
              className="relationship-entry-action-arrow"
              aria-hidden="true"
            >
              →
            </span>
          </Link>

          <Link
            href="/pair-device"
            className="relationship-entry-action relationship-entry-bind"
          >
            <span
              className="relationship-entry-action-icon"
              aria-hidden="true"
            >
              <span className="relationship-entry-mini-planet relationship-entry-mini-planet-b" />
              <span className="relationship-entry-device-mark" />
            </span>

            <span className="relationship-entry-action-copy">
              <strong>绑定这台设备</strong>
              <span>
                已经创建关系，将当前设备连接到你的星球
              </span>
            </span>

            <span
              className="relationship-entry-action-arrow"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        </div>

        <div className="relationship-entry-invite-note">
          <span
            className="relationship-entry-note-icon"
            aria-hidden="true"
          >
            ✦
          </span>

          <p>
            已收到对方邀请时，不需要在这里创建关系，请直接打开邀请链接完成加入。
          </p>
        </div>
      </section>
    </main>
  );
}
