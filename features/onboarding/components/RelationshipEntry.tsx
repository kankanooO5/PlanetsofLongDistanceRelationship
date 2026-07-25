"use client";

type RelationshipEntryProps = {
  error?: string;
};

export function RelationshipEntry({
  error = "",
}: RelationshipEntryProps) {
  return (
    <main className="relationship-entry">
      <div className="relationship-entry-orbit relationship-entry-orbit-one" />
      <div className="relationship-entry-orbit relationship-entry-orbit-two" />

      <section className="relationship-entry-card">
        <div className="relationship-entry-planets" aria-hidden="true">
          <span className="relationship-entry-planet relationship-entry-planet-a" />
          <span className="relationship-entry-path" />
          <span className="relationship-entry-planet relationship-entry-planet-b" />
        </div>

        <p className="relationship-entry-eyebrow">
          TWO PLANETS · ONE HOME
        </p>

        <h1>两颗星球</h1>

        <p className="relationship-entry-copy">
          创建属于你们的小宇宙，或通过对方发送的一次性邀请链接加入。
        </p>

        {error && (
          <p className="relationship-entry-error">
            {error}
          </p>
        )}

        <a
          className="relationship-entry-primary"
          href="/create"
        >
          创建我们的星球
        </a>

        <section className="relationship-entry-invite-note">
          <span aria-hidden="true">✦</span>

          <div>
            <strong>已经收到邀请？</strong>
            <p>
              请直接打开对方发送的邀请链接，不需要输入共同暗号。
            </p>
          </div>
        </section>

        <p className="relationship-entry-footer">
          每段关系只有两位固定成员，绑定后不能随意切换身份。
        </p>
      </section>
    </main>
  );
}
