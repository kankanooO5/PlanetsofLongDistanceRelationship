"use client";

import type { FormEvent } from "react";
import type { Role } from "../../shared/types";

type WelcomeScreenProps = {
  code: string;
  role: Role;
  roleLocked: boolean;
  hasChosenRole: boolean;
  loading: boolean;
  error: string;
  firstNameInput: string;
  secondNameInput: string;
  onCodeChange: (value: string) => void;
  onRoleChange: (role: Role) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
};

export function WelcomeScreen({
  code,
  role,
  roleLocked,
  hasChosenRole,
  loading,
  error,
  firstNameInput,
  secondNameInput,
  onCodeChange,
  onRoleChange,
  onSubmit,
}: WelcomeScreenProps) {
  const roleName =
    role === "first"
      ? firstNameInput || "小行星 A"
      : secondNameInput || "小行星 B";

  return (
    <main className="welcome">
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />

      <section className="welcome-card">
        <div className="brand-mark" aria-hidden="true">
          <span>●</span>
          <span>●</span>
        </div>

        <p className="eyebrow">TWO PLANETS · ONE HOME</p>
        <h1>两颗星球</h1>

        <p className="welcome-copy">
          不管相隔多远，我们都在同一个小宇宙里。
        </p>

        <form onSubmit={onSubmit}>
          <label htmlFor="secret">我们的暗号</label>

          <input
            id="secret"
            value={code}
            onChange={(event) => onCodeChange(event.target.value)}
            placeholder="输入只有你们知道的暗号"
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            enterKeyHint="go"
            spellCheck={false}
            required
          />

          {roleLocked ? (
            <section className="bound-role-card">
              <span
                className={`planet ${
                  role === "first" ? "planet-a" : "planet-b"
                }`}
                aria-hidden="true"
              />

              <div>
                <p>本设备已绑定</p>
                <strong>{roleName}</strong>
              </div>

              <span className="bound-role-status">已锁定</span>
            </section>
          ) : (
            <fieldset>
              <legend>
                首次确认你的星球，绑定后不可随意更改
              </legend>

              <div className="role-picker">
                <button
                  className={
                    hasChosenRole && role === "first"
                      ? "selected"
                      : ""
                  }
                  type="button"
                  onClick={() => onRoleChange("first")}
                >
                  <span
                    className="planet planet-a"
                    aria-hidden="true"
                  />
                  {(firstNameInput || "A")}&apos;s 星球
                </button>

                <button
                  className={
                    hasChosenRole && role === "second"
                      ? "selected"
                      : ""
                  }
                  type="button"
                  onClick={() => onRoleChange("second")}
                >
                  <span
                    className="planet planet-b"
                    aria-hidden="true"
                  />
                  {(secondNameInput || "B")}&apos;s 星球
                </button>
              </div>
            </fieldset>
          )}

          {error && <p className="form-error">{error}</p>}

          <button
            className="primary-button"
            disabled={loading || !hasChosenRole}
            type="submit"
          >
            {loading ? "正在连接…" : "进入我们的小宇宙"}
          </button>
        </form>

        <p className="privacy-note">
          同一设备确认身份后，将固定进入对应星球
        </p>
      </section>
    </main>
  );
}
