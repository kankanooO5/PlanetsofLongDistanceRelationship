"use client";

import type { ReactNode } from "react";

type UniverseVisual = "two-planets" | "planet-device";

type UniversePageShellProps = {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
  visual?: UniverseVisual;
  footer?: ReactNode;
};

export function UniversePageShell({
  eyebrow,
  title,
  description,
  children,
  visual = "two-planets",
  footer,
}: UniversePageShellProps) {
  return (
    <main className="relationship-entry universe-flow-page">
      <div
        className="relationship-entry-background"
        aria-hidden="true"
      >
        <span className="relationship-entry-orbit relationship-entry-orbit-one" />
        <span className="relationship-entry-orbit relationship-entry-orbit-two" />
      </div>

      <section className="relationship-entry-card universe-flow-card">
        <div
          className="relationship-entry-universe"
          aria-hidden="true"
        >
          <span className="relationship-entry-visual-orbit relationship-entry-visual-orbit-outer" />
          <span className="relationship-entry-visual-orbit relationship-entry-visual-orbit-inner" />

          <span className="relationship-entry-planet relationship-entry-planet-a">
            <span className="relationship-entry-planet-shine" />
          </span>

          {visual === "two-planets" ? (
            <span className="relationship-entry-planet relationship-entry-planet-b">
              <span className="relationship-entry-planet-shine" />
            </span>
          ) : (
            <span className="universe-flow-device">
              <span />
            </span>
          )}

          <span className="relationship-entry-star relationship-entry-star-one">
            ✦
          </span>

          <span className="relationship-entry-star relationship-entry-star-two">
            ✧
          </span>
        </div>

        <header className="relationship-entry-header">
          <p className="relationship-entry-eyebrow">
            {eyebrow}
          </p>

          <h1>{title}</h1>

          <div className="relationship-entry-description">
            {description}
          </div>
        </header>

        <div className="universe-flow-content">
          {children}
        </div>

        {footer && (
          <div className="universe-flow-footer">
            {footer}
          </div>
        )}
      </section>
    </main>
  );
}
