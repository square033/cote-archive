import { useState, useEffect, useRef } from "react";
import {
  Plus, Sparkles, ChevronLeft, Trash2, Link as LinkIcon, Code2,
  BookOpen, Loader2, Wand2, User, Heart, X, ClipboardList, Lightbulb, TriangleAlert, LogOut, LogIn
} from "lucide-react";
import { supabase } from "./supabase";
import AuthScreen from "./AuthScreen";

/* ───────────────────────── 상수 & 테마 ───────────────────────── */

const CATEGORIES = [
  { id: "dfs", name: "DFS · BFS · 백트래킹", short: "탐색", emoji: "🧭", bg: "#FFE9EF", deep: "#E0527A", grad: "linear-gradient(135deg,#FFD6E2,#FFEDF3)" },
  { id: "dnc", name: "분할 정복", short: "분할", emoji: "🪓", bg: "#EFE9FF", deep: "#7C5CE0", grad: "linear-gradient(135deg,#E3D9FF,#F3EEFF)" },
  { id: "bin", name: "이진 탐색", short: "이분", emoji: "🎯", bg: "#E0F7EE", deep: "#1FA97E", grad: "linear-gradient(135deg,#CFF2E3,#E9FBF3)" },
  { id: "greedy", name: "그리디", short: "탐욕", emoji: "🍬", bg: "#FFF1DD", deep: "#E8923A", grad: "linear-gradient(135deg,#FFE5C2,#FFF5E6)" },
  { id: "dp", name: "다이나믹 프로그래밍", short: "DP", emoji: "🧩", bg: "#E4F0FF", deep: "#3182F6", grad: "linear-gradient(135deg,#CFE4FF,#EAF3FF)" },
  { id: "etc", name: "기타", short: "기타", emoji: "📦", bg: "#F2F4F6", deep: "#6B7684", grad: "linear-gradient(135deg,#E8EAED,#F4F6F8)" },
];
const catOf = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES.find((c) => c.id === "etc");

const LEVELS = [
  { id: "lv0", name: "Lv.0", label: "입문", color: "#8B95A1", bg: "#F2F4F6" },
  { id: "lv1", name: "Lv.1", label: "쉬움", color: "#1FA97E", bg: "#E0F7EE" },
  { id: "lv2", name: "Lv.2", label: "보통", color: "#3182F6", bg: "#E4F0FF" },
  { id: "lv3", name: "Lv.3", label: "중상", color: "#7C5CE0", bg: "#EFE9FF" },
  { id: "lv4", name: "Lv.4", label: "어려움", color: "#E8923A", bg: "#FFF1DD" },
  { id: "lv5", name: "Lv.5", label: "최상", color: "#E0527A", bg: "#FFE9EF" },
];
const levelOf = (id) => LEVELS.find((l) => l.id === id) || null;

const clay = {
  card: {
    background: "#FFFFFF",
    borderRadius: 24,
    boxShadow: "0 10px 30px rgba(100,116,139,0.10), 0 2px 6px rgba(100,116,139,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
    border: "1px solid rgba(255,255,255,0.7)",
  },
  glass: {
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    border: "1px solid rgba(255,255,255,0.6)",
  },
};

const FONT = `"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", "Segoe UI", sans-serif`;

/* ───────────────────────── API 헬퍼 ───────────────────────── */

async function askAI(prompt) {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) throw new Error("API 호출 실패");
  const data = await res.json();
  let text = (data.text || "").trim();

  // 1. 최초의 '{' 부터 마지막 '}' 까지만 정확히 추출
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    text = jsonMatch[0];
  }

  try {
    return JSON.parse(text);
  } catch (parseError) {
    console.error("1차 파싱 실패, 정제 시도:", text);
    try {
      // 2. 제어 문자 및 줄바꿈 기호 안전하게 이스케이프 처리
      let cleanedText = text
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t");

      // 깨진 괄호 쌍 보정
      if (!cleanedText.startsWith("{")) cleanedText = cleanedText.substring(cleanedText.indexOf("{"));
      if (!cleanedText.endsWith("}")) cleanedText = cleanedText.substring(0, cleanedText.lastIndexOf("}") + 1);

      return JSON.parse(cleanedText);
    } catch (secondError) {
      console.error("최종 파싱 실패 원본:", text);
      
      // [중요] ReviewCard 컴포넌트의 영문 Key(goodPoints, improvements 등)와 완벽히 일치시킴
      return {
        "summary": "AI 응답 데이터에 특수문자나 형식 오류가 섞여 파싱에 실패했습니다. 다시 시도해 주세요.",
        "algorithm": "알 수 없음",
        "timeComplexity": "-",
        "spaceComplexity": "-",
        "formula": null,
        "steps": [],
        "goodPoints": ["코드를 다시 제출하거나 잠시 후 리뷰를 요청해 보세요."],
        "improvements": ["코드 내 특수 주석이나 문자열이 AI 포맷을 깨뜨렸을 수 있습니다."]
      };
    }
  }
}

async function reviewCode(problem, code) {
  return askAI(
    `너는 친절하고 꼼꼼한 알고리즘 코드 리뷰어야. 반드시 다음 규칙을 지켜서 출력해줘.
    
    ⚠️ [최우선 규칙] 
    - 마크다운 백틱(\`\`\`) 구문이나 "여기 JSON입니다" 같은 앞뒤 설명은 절대 포함하지 마.
    - 오직 중괄호 '{'로 시작해서 '}'로 끝나는 순수한 JSON 데이터만 출력해.
    - 텍스트 내부에 큰따옴표(")가 들어간다면 반드시 백슬래시(\\")로 이스케이프 처리를 하거나 작은따옴표(')를 사용해.
    
    [문제 제목: ${problem.title}]
    [유형: ${catOf(problem.category).name}]
    ${(problem.body || "").slice(0, 1500)}
    
    [사용자 풀이 코드]
    ${code.slice(0, 3500)}

    ⚠️ 중요 규칙: 
    1. 절대로 설명이나 마크다운(\`\`\`)을 붙이지 말고, 오직 { ... } 형태의 순수한 JSON 데이터로만 출력해.
    2. 텍스트 내부에 큰따옴표(")를 써야 한다면 반드시 백슬래시(\\")로 이스케이프를 하거나 작은따옴표(')를 사용해.
    
    [응답할 JSON 포맷]
    {
      "summary": "풀이 한 줄 요약",
      "algorithm": "사용된 핵심 알고리즘/자료구조",
      "timeComplexity": "O(...) 와 짧은 근거",
      "spaceComplexity": "O(...) 와 짧은 근거",
      "formula": "핵심 수식이나 점화식 (없으면 null)",
      "steps": [{"name":"단계 이름","desc":"이 단계에서 코드가 하는 일"}],
      "goodPoints": ["잘한 점 1~3개"],
      "improvements": ["개선 제안 1~3개"]
    }`
  );
}

/* ───────────────────────── 작은 컴포넌트 ───────────────────────── */

function Chip({ active, color, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: FONT, fontSize: 14, fontWeight: 600, cursor: "pointer",
        padding: "9px 16px", borderRadius: 999, transition: "all .2s",
        background: active ? color.deep : "#FFFFFF",
        color: active ? "#fff" : "#4E5968",
        border: active ? "1px solid transparent" : "1px solid #E5E8EB",
        boxShadow: active ? `0 6px 16px ${color.deep}40` : "0 2px 6px rgba(100,116,139,0.06)",
      }}
    >
      {children}
    </button>
  );
}

function CatBadge({ id, small }) {
  const c = catOf(id);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: c.bg, color: c.deep, fontWeight: 700,
      fontSize: small ? 12 : 13, padding: small ? "4px 10px" : "6px 12px",
      borderRadius: 999, fontFamily: FONT,
    }}>
      <span>{c.emoji}</span>{c.name}
    </span>
  );
}

function PrimaryBtn({ children, onClick, disabled, color = "#3182F6", style }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        fontFamily: FONT, fontWeight: 700, fontSize: 15, color: "#fff",
        background: disabled ? "#B0C4DE" : color, border: "none", cursor: disabled ? "default" : "pointer",
        padding: "12px 22px", borderRadius: 16, display: "inline-flex", alignItems: "center", gap: 8,
        boxShadow: disabled ? "none" : `0 8px 20px ${color}45`, transition: "transform .15s, box-shadow .15s",
        ...style,
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
}

/* ───────────────────────── AI 리뷰 카드 ───────────────────────── */

function ReviewCard({ review }) {
  if (!review) return null;
  return (
    <div style={{ ...clay.card, borderRadius: 20, padding: 20, marginTop: 12, background: "linear-gradient(160deg,#FBFCFF,#F4F8FF)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Sparkles size={18} color="#7C5CE0" />
        <span style={{ fontWeight: 800, fontSize: 15, color: "#191F28" }}>AI 코드 리뷰</span>
      </div>

      <p style={{ margin: "0 0 14px", fontSize: 14.5, color: "#333D4B", lineHeight: 1.6 }}>{review.summary}</p>

      {/* 알고리즘 정리 표 */}
      <div style={{ overflow: "hidden", borderRadius: 14, border: "1px solid #E5E8EB", marginBottom: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <tbody>
            {[
              ["알고리즘", review.algorithm],
              ["시간 복잡도", review.timeComplexity],
              ["공간 복잡도", review.spaceComplexity],
            ].map(([k, v]) => (
              <tr key={k} style={{ borderBottom: "1px solid #F2F4F6" }}>
                <td style={{ padding: "10px 14px", fontWeight: 700, color: "#6B7684", background: "#F9FAFB", width: 110, whiteSpace: "nowrap" }}>{k}</td>
                <td style={{ padding: "10px 14px", color: "#191F28" }}>{v || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 핵심 수식 */}
      {review.formula && review.formula !== "null" && (
        <div style={{
          background: "#191F28", color: "#9EEFC9", borderRadius: 14, padding: "14px 16px",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13.5, marginBottom: 14,
          overflowX: "auto", whiteSpace: "pre-wrap",
        }}>
          {review.formula}
        </div>
      )}

      {/* 단계별 정리 */}
      {Array.isArray(review.steps) && review.steps.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: "#6B7684", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <ClipboardList size={15} /> 단계별 흐름
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {review.steps.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, background: "#fff", border: "1px solid #EFF1F4", borderRadius: 12, padding: "10px 12px" }}>
                <div style={{
                  minWidth: 24, height: 24, borderRadius: 999, background: "#E4F0FF", color: "#3182F6",
                  fontWeight: 800, fontSize: 12.5, display: "flex", alignItems: "center", justifyContent: "center",
                }}>{i + 1}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: "#191F28" }}>{s.name}</div>
                  <div style={{ fontSize: 13, color: "#6B7684", lineHeight: 1.5 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        {Array.isArray(review.goodPoints) && review.goodPoints.length > 0 && (
          <div style={{ background: "#E9FBF3", borderRadius: 14, padding: "12px 14px" }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#1FA97E", marginBottom: 6, display: "flex", gap: 6, alignItems: "center" }}><Heart size={14} /> 잘한 점</div>
            {review.goodPoints.map((g, i) => <div key={i} style={{ fontSize: 13, color: "#2A6E57", lineHeight: 1.6 }}>· {g}</div>)}
          </div>
        )}
        {Array.isArray(review.improvements) && review.improvements.length > 0 && (
          <div style={{ background: "#FFF5E6", borderRadius: 14, padding: "12px 14px" }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#E8923A", marginBottom: 6, display: "flex", gap: 6, alignItems: "center" }}><Lightbulb size={14} /> 개선 아이디어</div>
            {review.improvements.map((g, i) => <div key={i} style={{ fontSize: 13, color: "#8A5A22", lineHeight: 1.6 }}>· {g}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── 문제 등록 모달 ───────────────────────── */

/* ───────────────────────── 언어 & 간단 신택스 하이라이터 ───────────────────────── */

const LANGUAGES = [
  { id: "cpp", name: "C++", color: "#3182F6" },
  { id: "python", name: "Python", color: "#1FA97E" },
  { id: "java", name: "Java", color: "#E8923A" },
  { id: "javascript", name: "JavaScript", color: "#E0B400" },
  { id: "c", name: "C", color: "#6B7684" },
  { id: "etc", name: "기타", color: "#8B95A1" },
];
const langOf = (id) => LANGUAGES.find((l) => l.id === id) || LANGUAGES.find((l) => l.id === "etc");

// 키워드 사전 (언어별) — 정규식으로 토큰화해서 색칠하는 가벼운 하이라이터
const KEYWORDS = {
  cpp: ["int","long","double","float","char","bool","void","string","auto","const","static","class","struct","public","private","protected","return","if","else","for","while","do","switch","case","break","continue","include","using","namespace","std","vector","map","set","pair","true","false","new","delete","template","typename","null","nullptr"],
  c: ["int","long","double","float","char","void","const","static","struct","return","if","else","for","while","do","switch","case","break","continue","include","define","typedef","sizeof","null"],
  java: ["public","private","protected","class","static","void","int","long","double","float","boolean","char","String","return","if","else","for","while","do","switch","case","break","continue","new","import","package","extends","implements","interface","true","false","null","this","super","try","catch","finally"],
  python: ["def","class","return","if","elif","else","for","while","break","continue","import","from","as","with","try","except","finally","raise","pass","lambda","yield","True","False","None","and","or","not","in","is","self","print"],
  javascript: ["function","return","if","else","for","while","do","switch","case","break","continue","const","let","var","class","extends","new","import","export","from","default","true","false","null","undefined","this","async","await","try","catch","finally"],
  etc: [],
};

// HTML 이스케이프
const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// 저장된 문제 본문에서 어두운 배경/밝은 글자색을 제거해 밝은 테마로 표시
// (배경정리 기능 추가 전에 저장된 옛날 문제도 깔끔하게 보이도록)
function sanitizeBody(html) {
  if (!html || typeof window === "undefined") return html || "";
  try {
    const box = document.createElement("div");
    box.innerHTML = html;
    box.querySelectorAll("*").forEach((node) => {
      if (!node.style) return;
      // 배경 제거
      node.style.background = "";
      node.style.backgroundColor = "";
      // 표 셀이 아닌 곳의 글자색 제거 (어두운 배경에 맞춰 흰색이던 글자들)
      if (node.tagName !== "TD" && node.tagName !== "TH") {
        node.style.color = "";
      }
    });
    // 표는 우리 스타일로 정리
    box.querySelectorAll("table").forEach((t) => {
      t.style.borderCollapse = "collapse";
      t.style.background = "";
    });
    box.querySelectorAll("table td, table th").forEach((cell) => {
      cell.style.color = "#191F28";
      cell.style.background = "";
      cell.style.border = "1px solid #D8DCE2";
      cell.style.padding = "7px 11px";
    });
    box.querySelectorAll("table tr:first-child td, table tr:first-child th").forEach((cell) => {
      cell.style.background = "#F2F4F6";
      cell.style.fontWeight = "700";
    });
    return box.innerHTML;
  } catch (e) {
    return html;
  }
}

function highlightCode(code, lang) {
  const kws = KEYWORDS[lang] || [];
  const kwSet = new Set(kws);
  // 문자열, 주석, 숫자, 단어 단위로 토큰화
  const tokenRe = /(\/\/.*$)|(\/\*[\s\S]*?\*\/)|(#.*$)|("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(\b\d+\.?\d*\b)|([A-Za-z_]\w*)/gm;
  let result = "";
  let last = 0;
  let m;
  while ((m = tokenRe.exec(code))) {
    result += escapeHtml(code.slice(last, m.index));
    const [full, lineComment, blockComment, hashComment, dquote, squote, num, word] = m;
    if (lineComment || blockComment || hashComment) {
      result += `<span style="color:#6B8A99">${escapeHtml(full)}</span>`;
    } else if (dquote || squote) {
      result += `<span style="color:#9EEFC9">${escapeHtml(full)}</span>`;
    } else if (num) {
      result += `<span style="color:#FFB86C">${escapeHtml(full)}</span>`;
    } else if (word && kwSet.has(word)) {
      result += `<span style="color:#82AAFF;font-weight:700">${escapeHtml(full)}</span>`;
    } else {
      result += escapeHtml(full);
    }
    last = m.index + full.length;
  }
  result += escapeHtml(code.slice(last));
  return result;
}


/* 굵게·정렬·표를 지원하는 가벼운 contentEditable 에디터.
   표는 엑셀/구글시트에서 복사해 붙여넣으면 HTML 표가 그대로 인식돼요. */

function RichTextEditor({ value, onChange, placeholder, minHeight = 160 }) {
  const ref = useRef(null);
  const [focused, setFocused] = useState(false);

  // 외부에서 value가 바뀌었는데 (예: 초기 로드, 수정 모드 진입) 에디터 내용과 다르면 동기화
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value === "" ? "__empty__" : undefined]); // 초기화(빈 값으로 리셋)될 때만 강제 동기화

  const exec = (cmd, arg) => {
    document.execCommand(cmd, false, arg);
    ref.current?.focus();
    onChange(ref.current?.innerHTML || "");
  };

  const [showColor, setShowColor] = useState(false);
  const [showSize, setShowSize] = useState(false);

  // 글자 색 적용
  const applyColor = (color) => {
    document.execCommand("foreColor", false, color);
    ref.current?.focus();
    onChange(ref.current?.innerHTML || "");
    setShowColor(false);
  };

  // 글자 크기 적용 (execCommand fontSize는 1~7 단계라, 선택 영역을 span으로 감싸 px 직접 지정)
  const applySize = (px) => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && !sel.isCollapsed) {
      const range = sel.getRangeAt(0);
      const span = document.createElement("span");
      span.style.fontSize = px + "px";
      try {
        span.appendChild(range.extractContents());
        range.insertNode(span);
        sel.removeAllRanges();
      } catch (e) { /* 복잡한 선택이면 무시 */ }
    }
    ref.current?.focus();
    onChange(ref.current?.innerHTML || "");
    setShowSize(false);
  };

  // 붙여넣은 어두운 배경/색상 싹 제거 (프로그래머스 등에서 복사한 경우)
  const stripBackground = () => {
    const el = ref.current;
    if (!el) return;
    el.querySelectorAll("*").forEach((node) => {
      node.style && (node.style.background = "", node.style.backgroundColor = "");
      // 표 셀이 아닌데 글자색이 밝은(흰색 계열) 경우 색 제거
      if (node.tagName !== "TD" && node.tagName !== "TH") {
        node.style && (node.style.color = "");
      }
    });
    // 표는 우리 스타일로 다시 정리
    el.querySelectorAll("table td, table th").forEach((cell) => {
      cell.style.color = "#191F28";
      cell.style.background = "";
    });
    el.querySelectorAll("table tr:first-child td, table tr:first-child th").forEach((cell) => {
      cell.style.background = "#F2F4F6";
    });
    onChange(el.innerHTML || "");
  };

  const COLORS = ["#191F28", "#3182F6", "#1FA97E", "#E8923A", "#E0527A", "#7C5CE0", "#8B95A1"];
  const SIZES = [{ px: 12, label: "작게" }, { px: 14, label: "보통" }, { px: 17, label: "크게" }, { px: 22, label: "제목" }];

  const [showTablePicker, setShowTablePicker] = useState(false);
  const [tRows, setTRows] = useState(2);
  const [tCols, setTCols] = useState(2);

  // 깔끔한 표 HTML 생성 (헤더행 강조)
  const buildTable = (rows, cols) => {
    const cellStyle = "border:1px solid #D8DCE2;padding:7px 11px;font-size:14px;";
    const headStyle = cellStyle + "background:#F2F4F6;font-weight:700;";
    let html = `<table style="border-collapse:collapse;width:100%;margin:8px 0;"><tbody>`;
    for (let r = 0; r < rows; r++) {
      html += "<tr>";
      for (let cc = 0; cc < cols; cc++) {
        html += `<td style="${r === 0 ? headStyle : cellStyle}">${r === 0 ? "제목" + (cc + 1) : ""}</td>`;
      }
      html += "</tr>";
    }
    html += `</tbody></table><p><br></p>`;
    return html;
  };

  const insertTable = () => {
    exec("insertHTML", buildTable(tRows, tCols));
    setShowTablePicker(false);
  };

  // 표 안의 모든 셀에 우리 스타일을 강제로 입혀서 깔끔하게 정리
  const normalizeTables = () => {
    const el = ref.current;
    if (!el) return;
    el.querySelectorAll("table").forEach((t) => {
      t.style.borderCollapse = "collapse";
      t.style.width = t.style.width || "100%";
      t.style.margin = "8px 0";
      t.removeAttribute("border");
      t.querySelectorAll("td,th").forEach((cell, i) => {
        cell.style.border = "1px solid #D8DCE2";
        cell.style.padding = "7px 11px";
        cell.style.fontSize = "14px";
      });
      // 첫 행 헤더 느낌
      const firstRow = t.querySelector("tr");
      if (firstRow) firstRow.querySelectorAll("td,th").forEach((cell) => {
        cell.style.background = "#F2F4F6";
        cell.style.fontWeight = "700";
      });
    });
  };

  // 탭/줄바꿈으로 구분된 평문(엑셀 복사 등)을 표로 변환
  const tsvToTable = (text) => {
    const rows = text.replace(/\r/g, "").split("\n").filter((r) => r.length > 0);
    if (rows.length < 1) return null;
    const hasTab = rows.some((r) => r.includes("\t"));
    if (!hasTab && rows.length < 2) return null; // 표로 보기 어려움
    const cellStyle = "border:1px solid #D8DCE2;padding:7px 11px;font-size:14px;";
    const headStyle = cellStyle + "background:#F2F4F6;font-weight:700;";
    let html = `<table style="border-collapse:collapse;width:100%;margin:8px 0;"><tbody>`;
    rows.forEach((row, ri) => {
      const cells = hasTab ? row.split("\t") : [row];
      html += "<tr>";
      cells.forEach((cell) => {
        html += `<td style="${ri === 0 ? headStyle : cellStyle}">${escapeHtml(cell.trim())}</td>`;
      });
      html += "</tr>";
    });
    html += `</tbody></table><p><br></p>`;
    return hasTab ? html : null;
  };

  const btn = (active) => ({
    fontFamily: FONT, border: "1.5px solid " + (active ? "#3182F6" : "#E5E8EB"),
    background: active ? "#E4F0FF" : "#fff", color: active ? "#3182F6" : "#6B7684",
    borderRadius: 9, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", fontWeight: 800, fontSize: 13.5, flexShrink: 0,
  });

  return (
    <div style={{ border: "1.5px solid " + (focused ? "#3182F6" : "#E5E8EB"), borderRadius: 14, overflow: "hidden", background: "#FAFBFC" }}>
      {/* 툴바 */}
      <div style={{ display: "flex", gap: 6, padding: "8px 10px", borderBottom: "1px solid #EFF1F4", flexWrap: "wrap", background: "#F7F9FC" }}>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")} style={btn(false)} title="굵게">B</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")} style={{ ...btn(false), fontStyle: "italic" }} title="기울임">I</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("underline")} style={{ ...btn(false), textDecoration: "underline" }} title="밑줄">U</button>
        <div style={{ width: 1, background: "#E5E8EB", margin: "2px 4px" }} />

        {/* 글자 색 */}
        <div style={{ position: "relative" }}>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setShowColor(!showColor); setShowSize(false); }} style={btn(showColor)} title="글자 색">
            <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 4, background: "linear-gradient(135deg,#3182F6,#E0527A)" }} />
          </button>
          {showColor && (
            <div onMouseDown={(e) => e.preventDefault()} style={{
              position: "absolute", top: 38, left: 0, zIndex: 20, background: "#fff", borderRadius: 14,
              boxShadow: "0 10px 30px rgba(100,116,139,0.22)", border: "1px solid #EFF1F4", padding: 12,
              display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, width: 160,
            }}>
              {COLORS.map((col) => (
                <button key={col} type="button" onClick={() => applyColor(col)} title={col} style={{
                  width: 28, height: 28, borderRadius: 8, background: col, border: "2px solid #fff",
                  boxShadow: "0 0 0 1px #E5E8EB", cursor: "pointer",
                }} />
              ))}
            </div>
          )}
        </div>

        {/* 글자 크기 */}
        <div style={{ position: "relative" }}>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setShowSize(!showSize); setShowColor(false); }} style={{ ...btn(showSize), fontSize: 12 }} title="글자 크기">가</button>
          {showSize && (
            <div onMouseDown={(e) => e.preventDefault()} style={{
              position: "absolute", top: 38, left: 0, zIndex: 20, background: "#fff", borderRadius: 14,
              boxShadow: "0 10px 30px rgba(100,116,139,0.22)", border: "1px solid #EFF1F4", padding: 8, width: 120,
            }}>
              {SIZES.map((s) => (
                <button key={s.px} type="button" onClick={() => applySize(s.px)} style={{
                  fontFamily: FONT, display: "block", width: "100%", textAlign: "left", border: "none",
                  background: "transparent", cursor: "pointer", padding: "7px 10px", borderRadius: 8,
                  fontSize: s.px, color: "#191F28", fontWeight: 600,
                }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#F2F4F6"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >{s.label}</button>
              ))}
            </div>
          )}
        </div>

        <div style={{ width: 1, background: "#E5E8EB", margin: "2px 4px" }} />
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("justifyLeft")} style={btn(false)} title="왼쪽 정렬">⬅</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("justifyCenter")} style={btn(false)} title="가운데 정렬">↔</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("justifyRight")} style={btn(false)} title="오른쪽 정렬">➡</button>
        <div style={{ width: 1, background: "#E5E8EB", margin: "2px 4px" }} />
        <div style={{ position: "relative" }}>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setShowTablePicker(!showTablePicker)} style={btn(showTablePicker)} title="표 삽입">⊞</button>
          {showTablePicker && (
            <div onMouseDown={(e) => e.preventDefault()} style={{
              position: "absolute", top: 38, left: 0, zIndex: 20, background: "#fff", borderRadius: 14,
              boxShadow: "0 10px 30px rgba(100,116,139,0.22)", border: "1px solid #EFF1F4", padding: 14, width: 200,
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: "#191F28", marginBottom: 10 }}>표 만들기</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12.5, color: "#6B7684", width: 28 }}>행</span>
                <input type="number" min={1} max={20} value={tRows} onChange={(e) => setTRows(Math.max(1, Math.min(20, +e.target.value || 1)))}
                  style={{ fontFamily: FONT, flex: 1, border: "1.5px solid #E5E8EB", borderRadius: 9, padding: "6px 10px", fontSize: 13, outline: "none" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 12.5, color: "#6B7684", width: 28 }}>열</span>
                <input type="number" min={1} max={10} value={tCols} onChange={(e) => setTCols(Math.max(1, Math.min(10, +e.target.value || 1)))}
                  style={{ fontFamily: FONT, flex: 1, border: "1.5px solid #E5E8EB", borderRadius: 9, padding: "6px 10px", fontSize: 13, outline: "none" }} />
              </div>
              <button type="button" onClick={insertTable} style={{
                fontFamily: FONT, width: "100%", border: "none", background: "#3182F6", color: "#fff",
                borderRadius: 10, padding: "8px 0", fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}>{tRows} × {tCols} 표 삽입</button>
            </div>
          )}
        </div>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")} style={btn(false)} title="목록">•≡</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={stripBackground} style={{ ...btn(false), fontSize: 11, fontWeight: 700, width: "auto", padding: "0 8px" }} title="붙여넣은 어두운 배경/색 제거">배경정리</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("removeFormat")} style={{ ...btn(false), fontSize: 11, fontWeight: 700, width: "auto", padding: "0 8px" }} title="서식 지우기">서식지움</button>
      </div>
      {/* 편집 영역 — 표 붙여넣기도 그대로 인식 */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onPaste={(e) => {
          const html = e.clipboardData.getData("text/html");
          const text = e.clipboardData.getData("text/plain");
          e.preventDefault();
          if (html && /<table/i.test(html)) {
            // 표가 포함된 HTML → 그대로 넣고 스타일 정리 + 어두운 배경 제거
            document.execCommand("insertHTML", false, html);
            normalizeTables();
            stripBackground();
          } else {
            // 평문인데 탭으로 구분돼 있으면 표로 자동 변환
            const asTable = tsvToTable(text);
            if (asTable) {
              document.execCommand("insertHTML", false, asTable);
            } else if (html) {
              document.execCommand("insertHTML", false, html);
              normalizeTables();
            } else {
              // 일반 텍스트 — 줄바꿈 살려서 넣기
              document.execCommand("insertHTML", false, escapeHtml(text).replace(/\n/g, "<br>"));
            }
          }
          onChange(ref.current?.innerHTML || "");
        }}
        data-placeholder={placeholder}
        className="rte-editable"
        style={{
          minHeight, padding: "12px 14px", fontSize: 14.5, lineHeight: 1.7, color: "#191F28",
          outline: "none", fontFamily: FONT, overflowX: "auto",
        }}
      />
      <style>{`
        .rte-editable:empty:before { content: attr(data-placeholder); color: #A8B1BD; }
        .rte-editable table { border-collapse: collapse; }
        .rte-editable td, .rte-editable th { border: 1px solid #D8DCE2; padding: 6px 10px; }
      `}</style>
    </div>
  );
}

function AddModal({ onClose, onSave }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [body, setBody] = useState("");
  const [mode, setMode] = useState("ai"); // ai | manual
  const [manualCat, setManualCat] = useState("dfs");
  const [level, setLevel] = useState("lv1");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!title.trim()) { setErr("문제 제목을 입력해 주세요."); return; }
    setErr(""); setBusy(true);
    try {
      let category = manualCat, reason = "";
      const plainBody = body.replace(/<[^>]+>/g, " ").trim(); // AI 분류용 텍스트만 추출
      if (mode === "ai") {
        if (!plainBody) { setErr("AI 분류를 쓰려면 문제 내용을 입력해 주세요."); setBusy(false); return; }
        const r = await classifyProblem(title, plainBody);
        category = CATEGORIES.some((c) => c.id === r.category) ? r.category : "etc";
        reason = r.reason || "";
      }
      onSave({
        id: "p" + Date.now(), title: title.trim(), url: url.trim(), body: body.trim(),
        category, level, aiReason: reason, createdAt: Date.now(), solutions: [],
      });
    } catch (e) {
      setErr("AI 분류에 실패했어요. 잠시 후 다시 시도하거나 직접 선택해 주세요.");
      setBusy(false);
    }
  };

  const input = { fontFamily: FONT, width: "100%", boxSizing: "border-box", border: "1.5px solid #E5E8EB", borderRadius: 14, padding: "12px 14px", fontSize: 14.5, outline: "none", background: "#FAFBFC", color: "#191F28" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(25,31,40,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...clay.card, width: "100%", maxWidth: 620, maxHeight: "90vh", overflowY: "auto", padding: 24, borderRadius: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#191F28" }}>새 문제 등록</h2>
          <button onClick={onClose} style={{ border: "none", background: "#F2F4F6", borderRadius: 999, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} color="#6B7684" /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input style={input} placeholder="문제 제목 (예: 네트워크 — 프로그래머스 Lv.3)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input style={input} placeholder="문제 링크 (선택)" value={url} onChange={(e) => setUrl(e.target.value)} />

          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#8B95A1", marginBottom: 6 }}>
              문제 내용 — 굵게·정렬·표 사용 가능, 엑셀/표 복사 붙여넣기도 인식돼요
            </div>
            <RichTextEditor value={body} onChange={setBody} placeholder="문제 내용을 작성하거나 붙여넣어 주세요. AI가 이 내용을 보고 유형을 분류해요." minHeight={150} />
          </div>

          {/* 난이도(레벨) */}
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#8B95A1", marginBottom: 6 }}>난이도</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {LEVELS.map((l) => (
                <button key={l.id} onClick={() => setLevel(l.id)} style={{
                  fontFamily: FONT, flex: "1 1 90px", padding: "9px 0", borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: "pointer",
                  border: level === l.id ? `1.5px solid ${l.color}` : "1.5px solid #E5E8EB",
                  background: level === l.id ? l.bg : "#fff", color: level === l.id ? l.color : "#6B7684",
                }}>{l.name} <span style={{ fontWeight: 600, fontSize: 11.5 }}>· {l.label}</span></button>
              ))}
            </div>
          </div>

          {/* 분류 방식 */}
          <div style={{ background: "#F7F9FC", borderRadius: 18, padding: 14 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {[["ai", "AI 자동 분류", <Wand2 size={15} key="w" />], ["manual", "직접 선택", <BookOpen size={15} key="b" />]].map(([m, label, icon]) => (
                <button key={m} onClick={() => setMode(m)} style={{
                  fontFamily: FONT, flex: 1, padding: "10px 0", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all .15s",
                  border: mode === m ? "1.5px solid #3182F6" : "1.5px solid #E5E8EB",
                  background: mode === m ? "#E4F0FF" : "#fff", color: mode === m ? "#3182F6" : "#6B7684",
                }}>{icon}{label}</button>
              ))}
            </div>
            {mode === "ai" ? (
              <p style={{ margin: 0, fontSize: 13, color: "#6B7684", lineHeight: 1.5 }}>등록 버튼을 누르면 문제 내용을 분석해 6가지 유형 중 하나로 자동 분류해요. ✨</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {CATEGORIES.map((c) => (
                  <Chip key={c.id} active={manualCat === c.id} color={c} onClick={() => setManualCat(c.id)}>{c.emoji} {c.name}</Chip>
                ))}
              </div>
            )}
          </div>

          {err && <div style={{ display: "flex", gap: 6, alignItems: "center", color: "#E0527A", fontSize: 13.5, fontWeight: 600 }}><TriangleAlert size={15} />{err}</div>}

          <PrimaryBtn onClick={save} disabled={busy} style={{ justifyContent: "center" }}>
            {busy ? (<><Loader2 size={17} className="spin" /> AI가 유형을 분류하는 중…</>) : (<><Plus size={17} /> 문제 등록하기</>)}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── 문제 상세 ───────────────────────── */

function ProblemDetail({ problem, onBack, onUpdate, onDelete }) {
  const c = catOf(problem.category);
  const lv = levelOf(problem.level);
  const [code, setCode] = useState("");
  const [lang, setLang] = useState("cpp");
  const [solType, setSolType] = useState("mine"); // mine | others
  const [author, setAuthor] = useState("");
  const [memo, setMemo] = useState("");
  const [showBody, setShowBody] = useState(true);
  const [editingBody, setEditingBody] = useState(false);
  const [bodyDraft, setBodyDraft] = useState(problem.body || "");
  const [reviewing, setReviewing] = useState(null); // solution id
  const [editingId, setEditingId] = useState(null); // 인라인 수정 중인 solution id
  const [inlineCode, setInlineCode] = useState("");
  const [inlineMemo, setInlineMemo] = useState("");
  const [inlineLang, setInlineLang] = useState("cpp");
  const [editingMeta, setEditingMeta] = useState(false); // 카테고리·난이도 편집
  const [err, setErr] = useState("");

  const setCategory = (id) => onUpdate({ ...problem, category: id });
  const setLevel = (id) => onUpdate({ ...problem, level: id });

  const addSolution = () => {
    if (!code.trim()) { setErr("코드를 입력해 주세요."); return; }
    setErr("");
    const sol = {
      id: "s" + Date.now(), type: solType, author: solType === "others" ? (author.trim() || "이름 없는 풀이") : "내 풀이",
      code, lang, memo: memo.trim(), review: null, createdAt: Date.now(),
    };
    onUpdate({ ...problem, solutions: [sol, ...problem.solutions] });
    setCode(""); setMemo(""); setAuthor("");
  };

  const runReview = async (sol) => {
    setReviewing(sol.id); setErr("");
    try {
      const review = await reviewCode(problem, sol.code);
      onUpdate({ ...problem, solutions: problem.solutions.map((s) => (s.id === sol.id ? { ...s, review } : s)) });
    } catch (e) {
      setErr("AI 리뷰에 실패했어요. 잠시 후 다시 시도해 주세요.");
    }
    setReviewing(null);
  };

  const delSolution = (id) => onUpdate({ ...problem, solutions: problem.solutions.filter((s) => s.id !== id) });

  // 인라인 수정 — 풀이 카드 자체에서 편집
  const startInlineEdit = (sol) => {
    setEditingId(sol.id);
    setInlineCode(sol.code);
    setInlineMemo(sol.memo || "");
    setInlineLang(sol.lang || "cpp");
  };
  const cancelInlineEdit = () => setEditingId(null);
  const saveInlineEdit = (id) => {
    onUpdate({
      ...problem,
      solutions: problem.solutions.map((s) =>
        s.id === id ? { ...s, code: inlineCode, memo: inlineMemo.trim(), lang: inlineLang } : s
      ),
    });
    setEditingId(null);
  };

  // 문제 내용 수정
  const saveBody = () => {
    onUpdate({ ...problem, body: bodyDraft });
    setEditingBody(false);
  };
  const cancelBodyEdit = () => {
    setBodyDraft(problem.body || "");
    setEditingBody(false);
  };

  const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" };

  const langPicker = (value, onChange) => (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {LANGUAGES.map((l) => (
        <button key={l.id} type="button" onClick={() => onChange(l.id)} style={{
          fontFamily: FONT, padding: "5px 11px", borderRadius: 999, fontWeight: 700, fontSize: 12, cursor: "pointer",
          border: value === l.id ? `1.5px solid ${l.color}` : "1.5px solid #E5E8EB",
          background: value === l.id ? l.color + "22" : "#fff", color: value === l.id ? l.color : "#8B95A1",
        }}>{l.name}</button>
      ))}
    </div>
  );

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 16px 80px" }}>
      <button onClick={onBack} style={{ fontFamily: FONT, display: "inline-flex", alignItems: "center", gap: 4, border: "none", background: "transparent", color: "#6B7684", fontWeight: 700, fontSize: 14, cursor: "pointer", padding: "16px 0" }}>
        <ChevronLeft size={18} /> 목록으로
      </button>

      {/* 헤더 카드 */}
      <div style={{ ...clay.card, padding: 24, background: c.grad, border: "1px solid rgba(255,255,255,0.8)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <CatBadge id={problem.category} />
              {lv && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: lv.bg, color: lv.color, fontWeight: 800, fontSize: 13, padding: "6px 12px", borderRadius: 999, fontFamily: FONT }}>
                  {lv.name} · {lv.label}
                </span>
              )}
              <button onClick={() => setEditingMeta(!editingMeta)} style={{
                fontFamily: FONT, border: "none", background: "rgba(255,255,255,0.65)", color: "#4E5968",
                borderRadius: 999, padding: "6px 12px", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
              }}>{editingMeta ? "닫기" : "✏️ 유형·난이도 변경"}</button>
            </div>

            {editingMeta && (
              <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 16, padding: 14, marginTop: 12 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: "#6B7684", marginBottom: 6 }}>유형</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {CATEGORIES.map((cat) => (
                    <button key={cat.id} onClick={() => setCategory(cat.id)} style={{
                      fontFamily: FONT, padding: "6px 12px", borderRadius: 999, fontWeight: 700, fontSize: 12.5, cursor: "pointer",
                      border: problem.category === cat.id ? `1.5px solid ${cat.deep}` : "1.5px solid #E5E8EB",
                      background: problem.category === cat.id ? cat.bg : "#fff", color: problem.category === cat.id ? cat.deep : "#8B95A1",
                    }}>{cat.emoji} {cat.name}</button>
                  ))}
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: "#6B7684", marginBottom: 6 }}>난이도</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {LEVELS.map((l) => (
                    <button key={l.id} onClick={() => setLevel(l.id)} style={{
                      fontFamily: FONT, padding: "6px 12px", borderRadius: 999, fontWeight: 800, fontSize: 12.5, cursor: "pointer",
                      border: problem.level === l.id ? `1.5px solid ${l.color}` : "1.5px solid #E5E8EB",
                      background: problem.level === l.id ? l.bg : "#fff", color: problem.level === l.id ? l.color : "#8B95A1",
                    }}>{l.name} · {l.label}</button>
                  ))}
                </div>
              </div>
            )}

            <h1 style={{ margin: "12px 0 6px", fontSize: 24, fontWeight: 800, color: "#191F28", lineHeight: 1.3 }}>{problem.title}</h1>
            {problem.aiReason && <p style={{ margin: 0, fontSize: 13, color: c.deep, fontWeight: 600 }}>✨ AI 분류 이유 · {problem.aiReason}</p>}
            {problem.url && (
              <a href={problem.url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 10, fontSize: 13.5, color: "#3182F6", fontWeight: 700, textDecoration: "none" }}>
                <LinkIcon size={14} /> 문제 바로가기
              </a>
            )}
          </div>
          <button onClick={() => { if (confirm("이 문제와 저장된 풀이를 모두 삭제할까요?")) onDelete(problem.id); }}
            style={{ border: "none", background: "rgba(255,255,255,0.7)", borderRadius: 12, padding: 8, cursor: "pointer" }}>
            <Trash2 size={16} color="#E0527A" />
          </button>
        </div>
      </div>

      {/* 문제 내용 — 보기 / 수정 */}
      <div style={{ ...clay.card, marginTop: 14, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => setShowBody(!showBody)} style={{ fontFamily: FONT, border: "none", background: "transparent", fontWeight: 800, fontSize: 15, color: "#191F28", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: 0 }}>
            <BookOpen size={16} color={c.deep} /> 문제 내용 {showBody ? "접기" : "펼치기"}
          </button>
          {showBody && !editingBody && (
            <button onClick={() => { setBodyDraft(problem.body || ""); setEditingBody(true); }} style={{
              fontFamily: FONT, border: "none", background: "#E4F0FF", color: "#3182F6", borderRadius: 999,
              padding: "6px 12px", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
            }}>✏️ 수정</button>
          )}
        </div>

        {showBody && (
          editingBody ? (
            <div style={{ marginTop: 14 }}>
              <RichTextEditor value={bodyDraft} onChange={setBodyDraft} placeholder="문제 내용을 작성해 주세요." minHeight={160} />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <PrimaryBtn onClick={saveBody} color="#1FA97E"><Sparkles size={15} /> 저장</PrimaryBtn>
                <button onClick={cancelBodyEdit} style={{ fontFamily: FONT, border: "1.5px solid #E5E8EB", background: "#fff", borderRadius: 14, padding: "0 18px", fontWeight: 700, fontSize: 14, color: "#6B7684", cursor: "pointer" }}>취소</button>
              </div>
            </div>
          ) : problem.body ? (
            <div className="rte-editable" style={{ marginTop: 14, fontSize: 14, color: "#4E5968", lineHeight: 1.7, overflowX: "auto" }}
              dangerouslySetInnerHTML={{ __html: sanitizeBody(problem.body) }} />
          ) : (
            <p style={{ margin: "14px 0 0", color: "#A8B1BD", fontSize: 13.5 }}>아직 문제 내용이 없어요. 수정 버튼으로 작성해 보세요.</p>
          )
        )}
      </div>

      {/* 새 풀이 작성 */}
      <div style={{ ...clay.card, marginTop: 14, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Code2 size={17} color="#3182F6" />
          <span style={{ fontWeight: 800, fontSize: 15, color: "#191F28" }}>풀이 작성 · 저장</span>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          {[["mine", "🙋 내 풀이"], ["others", "💖 마음에 든 다른 사람 풀이"]].map(([t, label]) => (
            <button key={t} onClick={() => setSolType(t)} style={{
              fontFamily: FONT, padding: "8px 14px", borderRadius: 999, fontWeight: 700, fontSize: 13.5, cursor: "pointer",
              border: solType === t ? "1.5px solid #3182F6" : "1.5px solid #E5E8EB",
              background: solType === t ? "#E4F0FF" : "#fff", color: solType === t ? "#3182F6" : "#6B7684",
            }}>{label}</button>
          ))}
          {solType === "others" && (
            <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="작성자 (선택)"
              style={{ fontFamily: FONT, border: "1.5px solid #E5E8EB", borderRadius: 999, padding: "8px 14px", fontSize: 13.5, outline: "none", flex: "1 1 140px" }} />
          )}
        </div>

        <div style={{ marginBottom: 8 }}>{langPicker(lang, setLang)}</div>

        <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false}
          placeholder={"// 여기에 코드를 작성하거나 붙여넣어 주세요\n#include <bits/stdc++.h>\nusing namespace std;"}
          style={{ ...mono, width: "100%", boxSizing: "border-box", minHeight: 220, resize: "vertical", background: "#191F28", color: "#E8F0FE", border: "none", borderRadius: 16, padding: 16, fontSize: 13.5, lineHeight: 1.65, outline: "none" }} />

        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} 
          placeholder={"메모 (선택) — 이 풀이에서 배운 점, 패턴 등"} 
          style={{ 
            fontFamily: FONT, 
            width: "100%", 
            boxSizing: "border-box", 
            border: "1.5px solid #E5E8EB", 
            borderRadius: 14, 
            padding: "11px 14px", 
            fontSize: 14, 
            outline: "none", 
            margin: "10px 0", 
            background: "#FAFBFC",
            resize: "vertical", // 사용자가 높이를 조절할 수 있도록 설정
            minHeight: "60px"   // 기본 최소 높이
          }} 
        />

        {err && <div style={{ display: "flex", gap: 6, alignItems: "center", color: "#E0527A", fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}><TriangleAlert size={15} />{err}</div>}

        <PrimaryBtn onClick={addSolution}><Plus size={16} /> 풀이 저장하기</PrimaryBtn>
      </div>

      {/* 저장된 풀이 */}
      <div style={{ marginTop: 22 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: "#191F28", margin: "0 0 12px" }}>저장된 풀이 {problem.solutions.length > 0 && <span style={{ color: "#3182F6" }}>{problem.solutions.length}</span>}</h2>
        {problem.solutions.length === 0 && (
          <div style={{ ...clay.card, padding: 28, textAlign: "center", color: "#8B95A1", fontSize: 14 }}>
            아직 저장된 풀이가 없어요. 위에서 첫 풀이를 저장해 보세요! ✍️
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {problem.solutions.map((sol) => {
            const isEditing = editingId === sol.id;
            const solLang = langOf(sol.lang);
            return (
              <div key={sol.id} style={{ ...clay.card, padding: 18, border: isEditing ? "2px solid #3182F6" : undefined }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 13.5,
                      color: sol.type === "mine" ? "#3182F6" : "#E0527A",
                      background: sol.type === "mine" ? "#E4F0FF" : "#FFE9EF", padding: "5px 12px", borderRadius: 999,
                    }}>
                      {sol.type === "mine" ? <User size={13} /> : <Heart size={13} />} {sol.author}
                    </span>
                    {!isEditing && (
                      <span style={{ fontSize: 11.5, fontWeight: 800, color: solLang.color, background: solLang.color + "1A", padding: "4px 10px", borderRadius: 999 }}>
                        {solLang.name}
                      </span>
                    )}
                  </div>
                  {!isEditing && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => runReview(sol)} disabled={reviewing === sol.id} style={{
                        fontFamily: FONT, display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13,
                        color: "#7C5CE0", background: "#EFE9FF", border: "none", borderRadius: 999, padding: "7px 14px", cursor: "pointer",
                      }}>
                        {reviewing === sol.id ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
                        {sol.review ? "리뷰 다시 받기" : "AI 코드 리뷰"}
                      </button>
                      <button onClick={() => startInlineEdit(sol)} style={{
                        fontFamily: FONT, display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 700, fontSize: 13,
                        color: "#3182F6", background: "#E4F0FF", border: "none", borderRadius: 999, padding: "7px 12px", cursor: "pointer",
                      }}>✏️ 수정</button>
                      <button onClick={() => delSolution(sol.id)} style={{ border: "none", background: "#F2F4F6", borderRadius: 999, padding: "7px 10px", cursor: "pointer" }}>
                        <Trash2 size={14} color="#8B95A1" />
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  // ── 인라인 수정 모드: 카드 그 자리에서 바로 편집 ──
                  <div>
                    <div style={{ marginBottom: 8 }}>{langPicker(inlineLang, setInlineLang)}</div>
                    <textarea value={inlineCode} onChange={(e) => setInlineCode(e.target.value)} spellCheck={false}
                      style={{ ...mono, width: "100%", boxSizing: "border-box", minHeight: 200, resize: "vertical", background: "#191F28", color: "#E8F0FE", border: "none", borderRadius: 14, padding: 16, fontSize: 13, lineHeight: 1.6, outline: "none" }} />
                    <textarea 
                      value={inlineMemo} 
                      onChange={(e) => setInlineMemo(e.target.value)} 
                      placeholder="메모 (선택)"                     
                      style={{ fontFamily: FONT, width: "100%", boxSizing: "border-box", border: "1.5px solid #E5E8EB", borderRadius: 12, padding: "10px 13px", fontSize: 13.5, outline: "none", margin: "10px 0", background: "#FAFBFC" }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <PrimaryBtn onClick={() => saveInlineEdit(sol.id)} color="#1FA97E" style={{ padding: "10px 18px", fontSize: 13.5 }}>
                        <Sparkles size={14} /> 저장
                      </PrimaryBtn>
                      <button onClick={cancelInlineEdit} style={{ fontFamily: FONT, border: "1.5px solid #E5E8EB", background: "#fff", borderRadius: 12, padding: "0 16px", fontWeight: 700, fontSize: 13.5, color: "#6B7684", cursor: "pointer" }}>취소</button>
                    </div>
                  </div>
                ) : (
                  // ── 보기 모드: 신택스 하이라이팅 적용 ──
                  <>
                    {sol.memo && <p style={{ margin: "0 0 10px", fontSize: 13.5, color: "#6B7684", background: "#F7F9FC", borderRadius: 12, padding: "9px 12px" }}>📝 {sol.memo}</p>}
                    <pre style={{ ...mono, margin: 0, background: "#191F28", color: "#E8F0FE", borderRadius: 14, padding: 16, fontSize: 13, lineHeight: 1.6, overflowX: "auto" }}
                      dangerouslySetInnerHTML={{ __html: highlightCode(sol.code, sol.lang || "cpp") }} />
                    <ReviewCard review={sol.review} />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── 메인 앱 ───────────────────────── */

// 게스트 데이터는 브라우저 localStorage에 저장
const GUEST_KEY = "cota:guest:v1";
const loadGuest = () => {
  try { return JSON.parse(localStorage.getItem(GUEST_KEY) || "[]"); }
  catch { return []; }
};
const saveGuest = (arr) => {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(arr)); }
  catch (e) { console.error("게스트 저장 실패", e); }
};

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [problems, setProblems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [view, setView] = useState({ page: "home", id: null });
  const [showAdd, setShowAdd] = useState(false);
  const [showAuth, setShowAuth] = useState(false); // 로그인 화면 모달 표시
  const [syncing, setSyncing] = useState(false);

  // 상세 페이지로 이동 — 브라우저 히스토리에도 쌓아서 뒤로가기가 목록으로 오게 함
  const openDetail = (id) => {
    setView({ page: "detail", id });
    window.history.pushState({ page: "detail", id }, "");
    window.scrollTo({ top: 0 });
  };
  const goHome = () => {
    setView({ page: "home", id: null });
    // 히스토리에 detail 항목이 쌓여 있으면 하나 뒤로 (없으면 그냥 상태만 변경)
    if (window.history.state && window.history.state.page === "detail") {
      window.history.back();
    }
  };

  // 휴대폰/브라우저 자체 뒤로가기 버튼 → 상세에서 목록으로
  useEffect(() => {
    // 첫 진입 시 home 상태를 히스토리 베이스로 깔아둠 (뒤로가기가 사이트 밖으로 안 나가게)
    window.history.replaceState({ page: "home" }, "");
    const onPop = (e) => {
      const st = e.state;
      if (st && st.page === "detail" && st.id) {
        setView({ page: "detail", id: st.id });
      } else {
        setView({ page: "home", id: null });
      }
      setShowAdd(false);
      setShowAuth(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // 로그인 세션 감시
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) setShowAuth(false); // 로그인되면 모달 닫기
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // 세션 상태에 따라 데이터 불러오기 (게스트=localStorage / 로그인=클라우드)
  useEffect(() => {
    if (!authReady) return;
    (async () => {
      setLoaded(false);
      if (!session) {
        // 게스트: 브라우저에서 불러오기
        setProblems(loadGuest());
        setLoaded(true);
        return;
      }
      // 로그인: 게스트로 쌓아둔 게 있으면 클라우드로 한 번 동기화
      const guestData = loadGuest();
      if (guestData.length > 0) {
        setSyncing(true);
        const rows = guestData.map((p) => ({
          id: p.id, user_id: session.user.id, data: p,
          created_at: new Date(p.createdAt).toISOString(),
        }));
        const { error } = await supabase.from("problems").upsert(rows);
        if (error) console.error("동기화 실패", error);
        else saveGuest([]); // 성공하면 게스트 데이터 비우기
        setSyncing(false);
      }
      // 클라우드에서 전체 불러오기
      const { data, error } = await supabase
        .from("problems")
        .select("id, data")
        .order("created_at", { ascending: false });
      if (error) console.error("불러오기 실패", error);
      else setProblems((data || []).map((row) => row.data));
      setLoaded(true);
    })();
  }, [session, authReady]);

  // 문제 1건 저장/수정 (게스트=로컬, 로그인=클라우드)
  const upsertRow = async (p, nextList) => {
    if (!session) { saveGuest(nextList); return; }
    const { error } = await supabase.from("problems").upsert({
      id: p.id, user_id: session.user.id, data: p,
      created_at: new Date(p.createdAt).toISOString(),
    });
    if (error) { console.error("저장 실패", error); alert("저장에 실패했어요. 잠시 후 다시 시도해 주세요."); }
  };

  const addProblem = async (p) => {
    const next = [p, ...problems];
    setProblems(next);
    setShowAdd(false);
    openDetail(p.id);
    await upsertRow(p, next);
  };
  const updateProblem = async (p) => {
    const next = problems.map((x) => (x.id === p.id ? p : x));
    setProblems(next);
    await upsertRow(p, next);
  };
  const deleteProblem = async (id) => {
    const next = problems.filter((x) => x.id !== id);
    setProblems(next);
    goHome();
    if (!session) { saveGuest(next); return; }
    const { error } = await supabase.from("problems").delete().eq("id", id);
    if (error) console.error("삭제 실패", error);
  };

  const logout = async () => { await supabase.auth.signOut(); };

  // 인증 상태 확인 전
  if (!authReady) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F4F7FB" }}>
        <Loader2 size={26} color="#3182F6" style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // 로그인 화면을 모달로 띄운 경우 (게스트가 로그인 버튼 눌렀을 때)
  if (showAuth && !session) {
    return <AuthScreen onClose={() => setShowAuth(false)} />;
  }

  const current = problems.find((p) => p.id === view.id);
  const shown = problems
    .filter((p) => filter === "all" || p.category === filter)
    .filter((p) => levelFilter === "all" || p.level === levelFilter);
  const countOf = (id) => problems.filter((p) => p.category === id).length;

  return (
    <div style={{ minHeight: "100vh", fontFamily: FONT, background: "linear-gradient(180deg,#F4F7FB 0%, #EEF3FA 40%, #F6F4FB 100%)", color: "#191F28" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes floatUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .rise { animation: floatUp .4s ease both; }
        button:focus-visible, input:focus-visible, textarea:focus-visible { outline: 2px solid #3182F6; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { .rise, .spin { animation: none; } }
        ::placeholder { color: #A8B1BD; }
      `}</style>

      {/* 상단 바 */}
      <header style={{ ...clay.glass, position: "sticky", top: 0, zIndex: 40, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <button onClick={goHome} style={{ fontFamily: FONT, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 9, minWidth: 0, flexShrink: 1 }}>
          <div style={{ width: 34, height: 34, borderRadius: 12, background: "linear-gradient(135deg,#3182F6,#7C5CE0)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 14px rgba(49,130,246,0.35)", flexShrink: 0 }}>
            <Code2 size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, color: "#191F28", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>코테 아카이브</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <PrimaryBtn onClick={() => setShowAdd(true)} style={{ padding: "10px 18px", fontSize: 14 }}>
            <Plus size={16} /> 문제 등록
          </PrimaryBtn>
          {session ? (
            <button onClick={logout} title="로그아웃" style={{
              fontFamily: FONT, border: "1px solid #E5E8EB", background: "#fff", borderRadius: 12,
              padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              color: "#6B7684", fontWeight: 700, fontSize: 13,
            }}>
              <LogOut size={15} />
            </button>
          ) : (
            <button onClick={() => setShowAuth(true)} style={{
              fontFamily: FONT, border: "1px solid #E5E8EB", background: "#fff", borderRadius: 12,
              padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              color: "#3182F6", fontWeight: 700, fontSize: 13.5,
            }}>
              <LogIn size={15} /> 로그인
            </button>
          )}
        </div>
      </header>

      {/* 게스트 안내 배너 */}
      {!session && (
        <div style={{
          ...clay.glass, margin: "14px auto 0", maxWidth: 980, padding: "12px 18px", borderRadius: 16,
          display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "#4E5968",
          background: "linear-gradient(135deg,#FFF5E6,#FFF9F0)", border: "1px solid #FFE5C2",
        }}>
          <span style={{ fontSize: 18 }}>👋</span>
          <span style={{ flex: 1, lineHeight: 1.5 }}>
            <b style={{ color: "#E8923A" }}>게스트 모드</b>로 보고 있어요. 지금 저장한 건 이 브라우저에만 남아요.{" "}
            <button onClick={() => setShowAuth(true)} style={{ fontFamily: FONT, border: "none", background: "transparent", color: "#3182F6", fontWeight: 800, cursor: "pointer", padding: 0, fontSize: 13.5 }}>
              로그인하면
            </button>{" "}
            어디서든 보이고, 지금 저장한 것도 자동으로 옮겨가요!
          </span>
        </div>
      )}

      {/* 로그인 직후 동기화 중 표시 */}
      {syncing && (
        <div style={{ maxWidth: 980, margin: "10px auto 0", padding: "0 16px", display: "flex", alignItems: "center", gap: 8, color: "#3182F6", fontSize: 13.5, fontWeight: 700 }}>
          <Loader2 size={15} className="spin" /> 게스트로 저장한 문제를 계정으로 옮기는 중…
        </div>
      )}

      {view.page === "detail" && current ? (
        <div className="rise"><ProblemDetail problem={current} onBack={goHome} onUpdate={updateProblem} onDelete={deleteProblem} /></div>
      ) : (
        <main className="rise" style={{ maxWidth: 980, margin: "0 auto", padding: "28px 16px 80px" }}>
          {/* 히어로 */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ margin: 0, fontSize: 27, fontWeight: 800, letterSpacing: "-0.5px", lineHeight: 1.35 }}>
              유형별로 차곡차곡,<br />나만의 알고리즘 패턴 노트 🗂️
            </h1>
            <p style={{ margin: "8px 0 0", color: "#6B7684", fontSize: 14.5 }}>
              문제를 등록하면 AI가 유형을 분류하고, 저장한 풀이는 표와 수식으로 정리해 드려요.
            </p>
          </div>

          {/* 유형 카드 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 26 }}>
            {CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => setFilter(filter === c.id ? "all" : c.id)} style={{
                fontFamily: FONT, textAlign: "left", cursor: "pointer", padding: 16, borderRadius: 22,
                background: c.grad, transition: "transform .18s, box-shadow .18s",
                border: filter === c.id ? `2px solid ${c.deep}` : "2px solid rgba(255,255,255,0.8)",
                boxShadow: filter === c.id ? `0 12px 26px ${c.deep}35` : "0 8px 20px rgba(100,116,139,0.10), inset 0 1px 0 rgba(255,255,255,0.9)",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              >
                <div style={{ fontSize: 26, marginBottom: 8, filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.12))" }}>{c.emoji}</div>
                <div style={{ fontWeight: 800, fontSize: 13.5, color: "#333D4B", lineHeight: 1.35 }}>{c.name}</div>
                <div style={{ marginTop: 6, fontWeight: 800, fontSize: 13, color: c.deep }}>{countOf(c.id)}문제</div>
              </button>
            ))}
          </div>

          {/* 필터 칩 + 목록 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <Chip active={filter === "all"} color={{ deep: "#191F28" }} onClick={() => setFilter("all")}>전체 {problems.length}</Chip>
            {CATEGORIES.map((c) => (
              <Chip key={c.id} active={filter === c.id} color={c} onClick={() => setFilter(c.id)}>{c.short}</Chip>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <Chip active={levelFilter === "all"} color={{ deep: "#6B7684" }} onClick={() => setLevelFilter("all")}>난이도 전체</Chip>
            {LEVELS.map((l) => (
              <Chip key={l.id} active={levelFilter === l.id} color={{ deep: l.color }} onClick={() => setLevelFilter(l.id)}>{l.name}</Chip>
            ))}
          </div>

          {!loaded ? (
            <div style={{ textAlign: "center", padding: 60, color: "#8B95A1" }}><Loader2 className="spin" size={22} style={{ display: "inline" }} /></div>
          ) : shown.length === 0 ? (
            <div style={{ ...clay.card, padding: "48px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🌱</div>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>아직 등록된 문제가 없어요</div>
              <div style={{ color: "#6B7684", fontSize: 14, marginBottom: 18 }}>첫 문제를 등록하고 패턴 노트를 시작해 보세요.</div>
              <PrimaryBtn onClick={() => setShowAdd(true)} style={{ justifyContent: "center" }}><Plus size={16} /> 문제 등록하기</PrimaryBtn>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 14 }}>
              {shown.map((p) => {
                const c = catOf(p.category);
                const lv = levelOf(p.level);
                const mine = p.solutions.filter((s) => s.type === "mine").length;
                const liked = p.solutions.filter((s) => s.type === "others").length;
                return (
                  <button key={p.id} onClick={() => openDetail(p.id)} style={{
                    fontFamily: FONT, textAlign: "left", cursor: "pointer", ...clay.card, padding: 18,
                    transition: "transform .18s, box-shadow .18s",
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 14px 30px ${c.deep}28`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = clay.card.boxShadow; }}
                  >
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <CatBadge id={p.category} small />
                      {lv && (
                        <span style={{ fontSize: 11.5, fontWeight: 800, color: lv.color, background: lv.bg, padding: "4px 9px", borderRadius: 999 }}>
                          {lv.name}
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 15.5, margin: "10px 0 8px", lineHeight: 1.4, color: "#191F28" }}>{p.title}</div>
                    <div style={{ display: "flex", gap: 10, fontSize: 12.5, color: "#8B95A1", fontWeight: 600 }}>
                      <span>🙋 내 풀이 {mine}</span>
                      <span>💖 찜한 풀이 {liked}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </main>
      )}

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onSave={addProblem} />}
    </div>
  );
}
