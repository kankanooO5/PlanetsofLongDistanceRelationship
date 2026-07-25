"use client";

import type { Role } from "../../shared/types";

type HomeHeaderProps = {
  greeting: string;
  name: string;
  role: Role;
};

export function HomeHeader({ greeting, name, role }: HomeHeaderProps) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">OUR LITTLE UNIVERSE</p>
        <h1>
          {greeting}，{name}
        </h1>
      </div>

      <div className="avatar-button" aria-label="当前星球">
        <span
          className={role === "first" ? "planet planet-a" : "planet planet-b"}
          aria-hidden="true"
        />
      </div>
    </header>
  );
}
