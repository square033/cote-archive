import { useState } from "react";

/* 라이트 / 다크 테마 관리
   - 색은 대부분 index.css의 CSS 변수로 바뀌므로, 여기서는 <html data-theme="..."> 만 갈아끼운다.
   - JS 쪽에서 hex 값이 직접 필요한 곳(유형·난이도·언어 색)은 isDark()로 분기한다.
   - 첫 페인트 전에 index.html의 인라인 스크립트가 data-theme을 먼저 심어줘서 깜빡임이 없다. */

const KEY = "cota:theme:v1";

let dark =
  typeof document !== "undefined" &&
  document.documentElement.getAttribute("data-theme") === "dark";

export const isDark = () => dark;

export function preferredTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch (e) { /* 프라이빗 모드 등 */ }
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

export function applyTheme(theme) {
  dark = theme === "dark";
  document.documentElement.setAttribute("data-theme", theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? "#14171B" : "#F4F7FB";
  try { localStorage.setItem(KEY, theme); } catch (e) { /* 무시 */ }
}

// [theme, toggle] — toggle은 모듈 플래그와 DOM 속성을 먼저 바꾼 뒤 리렌더를 일으킨다
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const t = document.documentElement.getAttribute("data-theme") || preferredTheme();
    if (document.documentElement.getAttribute("data-theme") !== t) applyTheme(t);
    dark = t === "dark";
    return t;
  });

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  };

  return [theme, toggle];
}
