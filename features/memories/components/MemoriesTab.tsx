"use client";

export function MemoriesTab() {
  return (
    <section className="tab-page">
      <header className="tab-page-header">
        <p className="tab-page-eyebrow">OUR MEMORIES</p>
        <h1>我们的回忆</h1>
        <p>把一起经历过的小事，慢慢收藏在这里。</p>
      </header>

      <div className="empty-state-card">
        <div className="empty-state-icon" aria-hidden="true">
          ◫
        </div>
        <h2>回忆相册正在准备中</h2>
        <p>之后可以在这里添加照片、纪念日和共同记录。</p>
      </div>
    </section>
  );
}
