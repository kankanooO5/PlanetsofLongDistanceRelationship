"use client";

export function WishesTab() {
  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">OUR LITTLE UNIVERSE</p>

          <h1>心愿</h1>

          <p className="tab-header-description">
            记录下一次见面，以及想一起完成的事情。
          </p>
        </div>
      </header>

      <section className="content tab-page">
        <div className="empty-state-card">
          <div className="empty-state-icon" aria-hidden="true">
            ☆
          </div>
          <h2>还没有共同心愿</h2>
          <p>之后可以添加旅行计划、约会清单和未来目标。</p>
        </div>
      </section>
    </>
  );
}
