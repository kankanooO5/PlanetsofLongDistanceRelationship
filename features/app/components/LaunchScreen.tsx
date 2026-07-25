"use client";

type LaunchScreenProps = {
  leaving?: boolean;
};

export function LaunchScreen({ leaving = false }: LaunchScreenProps) {
  return (
    <main
      className={`launch-screen${leaving ? " launch-screen-leaving" : ""}`}
      aria-label="正在进入两颗星球"
    >
      <div className="launch-background" aria-hidden="true">
        <div className="launch-background-orbit launch-background-orbit-one" />
        <div className="launch-background-orbit launch-background-orbit-two" />
      </div>

      <section className="launch-content">
        <div className="launch-universe" aria-hidden="true">
          <div className="launch-orbit launch-orbit-outer" />
          <div className="launch-orbit launch-orbit-inner" />

          <span className="launch-planet launch-planet-a">
            <span className="launch-planet-shine" />
          </span>

          <span className="launch-planet launch-planet-b">
            <span className="launch-planet-shine" />
          </span>

          <span className="launch-star launch-star-one">✦</span>
          <span className="launch-star launch-star-two">✧</span>
          <span className="launch-star launch-star-three">·</span>
        </div>

        <div className="launch-copy">
          <p className="launch-eyebrow">TWO PLANETS · ONE HOME</p>
          <h1>两颗星球</h1>
          <p className="launch-subtitle">
            不管相隔多远，我们都在同一个小宇宙里。
          </p>
        </div>

        <div className="launch-loading" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
    </main>
  );
}
