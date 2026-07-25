import Link from "next/link";

export function RelationshipEntry() {
  return (
    <main className="relationship-entry">
      <section className="relationship-entry-card">
        <div
          className="relationship-entry-planets"
          aria-hidden="true"
        >
          <span />
          <span />
        </div>

        <p className="relationship-entry-eyebrow">
          TWO PLANETS
        </p>

        <h1>进入你们的小宇宙</h1>

        <p className="relationship-entry-description">
          每段关系只有两位固定成员。创建后，将一次性邀请链接发送给另一颗星球。
        </p>

        <Link
          href="/create"
          className="relationship-entry-primary"
        >
          创建一段关系
        </Link>

        <Link
          href="/pair-device"
          className="relationship-entry-secondary"
        >
          绑定这台设备
        </Link>

        <p className="relationship-entry-note">
          收到邀请时，请直接打开对方发送的一次性邀请链接。
        </p>
      </section>
    </main>
  );
}
