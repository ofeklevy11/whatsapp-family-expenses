"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icon";

const LS_KEY = "dx-theme";

type Theme = "dark" | "light";

function readTheme(): Theme {
  try {
    const t = localStorage.getItem(LS_KEY);
    if (t === "light" || t === "dark") return t;
  } catch {
    /* ignore */
  }
  return "dark";
}

function applyTheme(t: Theme) {
  document.documentElement.setAttribute("data-theme", t);
  try {
    localStorage.setItem(LS_KEY, t);
  } catch {
    /* ignore */
  }
}

/**
 * Applies the saved theme on mount. The document defaults to dark (set in the
 * root layout), so only users who chose light may see a brief flash.
 */
export function ThemeInit() {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", readTheme());
  }, []);
  return null;
}

/** Topbar dark/light toggle. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title="החלף מצב תצוגה"
      className="noc-btn"
      style={{
        width: 38,
        height: 38,
        borderRadius: 11,
        background: "var(--glass-2)",
        border: "1px solid var(--border)",
        color: "var(--fg-1)",
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        transition: "all 120ms var(--ease-out-expo)",
      }}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={17} />
    </button>
  );
}

/** Settings-page hook that reflects + sets the same theme state. */
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>("dark");
  useEffect(() => {
    setThemeState(readTheme());
  }, []);
  const set = (t: Theme) => {
    setThemeState(t);
    applyTheme(t);
  };
  return [theme, set];
}
