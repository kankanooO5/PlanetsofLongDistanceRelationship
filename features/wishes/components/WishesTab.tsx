"use client";

export function WishesTab() {
  return (
    <section className="tab-page">
      <header className="tab-page-header">
        <p className="tab-page-eyebrow">OUR WISHES</p>
        <h1>共同心愿</h1>
        <p>记录下一次见面，以及想一起完成的事情。</p>
      </header>

      <div className="empty-state-card">
        <div className="empty-state-icon" aria-hidden="true">
          ☆
        </div>
        <h2>还没有共同心愿</h2>
        <p>之后可以添加旅行计划、约会清单和未来目标。</p>
      </div>
    </section>
  );
}
