import { useState, useEffect } from "react";
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
  const text = (data.text || "").replace(/```json|```/g, "").trim();
  return JSON.parse(text);
}

async function classifyProblem(title, body) {
  return askAI(
    `다음 코딩테스트 문제를 아래 6가지 유형 중 정확히 하나로 분류해줘.
유형 id 목록: dfs(DFS/BFS/백트래킹), dnc(분할 정복), bin(이진 탐색), greedy(그리디), dp(다이나믹 프로그래밍), etc(위 5가지에 해당하지 않는 기타 유형)

문제 제목: ${title}
문제 내용:
${body.slice(0, 3000)}

반드시 아래 JSON 형식으로만 응답해. 마크다운이나 다른 텍스트 절대 금지:
{"category":"dfs|dnc|bin|greedy|dp|etc","reason":"분류 이유 한 문장"}`
  );
}

async function reviewCode(problem, code) {
  return askAI(
    `너는 친절한 알고리즘 코드 리뷰어야. 아래 문제와 풀이 코드를 분석해서 JSON으로 정리해줘.

[문제: ${problem.title} / 유형: ${catOf(problem.category).name}]
${(problem.body || "").slice(0, 2000)}

[풀이 코드]
${code.slice(0, 4000)}

반드시 아래 JSON 형식으로만 응답 (마크다운 금지, 한국어로 작성):
{
 "summary": "풀이 한 줄 요약",
 "algorithm": "사용된 핵심 알고리즘/자료구조",
 "timeComplexity": "O(...) 와 짧은 근거",
 "spaceComplexity": "O(...) 와 짧은 근거",
 "formula": "핵심 수식이나 점화식 (예: dp[i] = max(dp[i-1], dp[i-2]+a[i])), 없으면 null",
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

function AddModal({ onClose, onSave }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [body, setBody] = useState("");
  const [mode, setMode] = useState("ai"); // ai | manual
  const [manualCat, setManualCat] = useState("dfs");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!title.trim()) { setErr("문제 제목을 입력해 주세요."); return; }
    setErr(""); setBusy(true);
    try {
      let category = manualCat, reason = "";
      if (mode === "ai") {
        if (!body.trim()) { setErr("AI 분류를 쓰려면 문제 내용을 붙여넣어 주세요."); setBusy(false); return; }
        const r = await classifyProblem(title, body);
        category = CATEGORIES.some((c) => c.id === r.category) ? r.category : "dfs";
        reason = r.reason || "";
      }
      onSave({
        id: "p" + Date.now(), title: title.trim(), url: url.trim(), body: body.trim(),
        category, aiReason: reason, createdAt: Date.now(), solutions: [],
      });
    } catch (e) {
      setErr("AI 분류에 실패했어요. 잠시 후 다시 시도하거나 직접 선택해 주세요.");
      setBusy(false);
    }
  };

  const input = { fontFamily: FONT, width: "100%", boxSizing: "border-box", border: "1.5px solid #E5E8EB", borderRadius: 14, padding: "12px 14px", fontSize: 14.5, outline: "none", background: "#FAFBFC", color: "#191F28" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(25,31,40,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...clay.card, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", padding: 24, borderRadius: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#191F28" }}>새 문제 등록</h2>
          <button onClick={onClose} style={{ border: "none", background: "#F2F4F6", borderRadius: 999, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} color="#6B7684" /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input style={input} placeholder="문제 제목 (예: 네트워크 — 프로그래머스 Lv.3)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input style={input} placeholder="문제 링크 (선택)" value={url} onChange={(e) => setUrl(e.target.value)} />
          <textarea style={{ ...input, minHeight: 140, resize: "vertical", lineHeight: 1.6 }} placeholder="문제 내용을 붙여넣어 주세요. AI가 이 내용을 보고 유형을 분류해요." value={body} onChange={(e) => setBody(e.target.value)} />

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
              <p style={{ margin: 0, fontSize: 13, color: "#6B7684", lineHeight: 1.5 }}>등록 버튼을 누르면 문제 내용을 분석해 5가지 유형 중 하나로 자동 분류해요. ✨</p>
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
  const [code, setCode] = useState("");
  const [solType, setSolType] = useState("mine"); // mine | others
  const [author, setAuthor] = useState("");
  const [memo, setMemo] = useState("");
  const [showBody, setShowBody] = useState(true);
  const [reviewing, setReviewing] = useState(null); // solution id
  const [err, setErr] = useState("");

  const addSolution = () => {
    if (!code.trim()) { setErr("코드를 입력해 주세요."); return; }
    setErr("");
    const sol = {
      id: "s" + Date.now(), type: solType, author: solType === "others" ? (author.trim() || "이름 없는 풀이") : "내 풀이",
      code, memo: memo.trim(), review: null, createdAt: Date.now(),
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

  const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" };

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 16px 80px" }}>
      <button onClick={onBack} style={{ fontFamily: FONT, display: "inline-flex", alignItems: "center", gap: 4, border: "none", background: "transparent", color: "#6B7684", fontWeight: 700, fontSize: 14, cursor: "pointer", padding: "16px 0" }}>
        <ChevronLeft size={18} /> 목록으로
      </button>

      {/* 헤더 카드 */}
      <div style={{ ...clay.card, padding: 24, background: c.grad, border: "1px solid rgba(255,255,255,0.8)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <CatBadge id={problem.category} />
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

      {/* 문제 내용 */}
      {problem.body && (
        <div style={{ ...clay.card, marginTop: 14, padding: 20 }}>
          <button onClick={() => setShowBody(!showBody)} style={{ fontFamily: FONT, border: "none", background: "transparent", fontWeight: 800, fontSize: 15, color: "#191F28", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: 0 }}>
            <BookOpen size={16} color={c.deep} /> 문제 내용 {showBody ? "접기" : "펼치기"}
          </button>
          {showBody && <pre style={{ margin: "14px 0 0", whiteSpace: "pre-wrap", fontFamily: FONT, fontSize: 14, color: "#4E5968", lineHeight: 1.7 }}>{problem.body}</pre>}
        </div>
      )}

      {/* 코드 작성 */}
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

        <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false}
          placeholder={"// 여기에 코드를 작성하거나 붙여넣어 주세요\n#include <bits/stdc++.h>\nusing namespace std;"}
          style={{ ...mono, width: "100%", boxSizing: "border-box", minHeight: 220, resize: "vertical", background: "#191F28", color: "#E8F0FE", border: "none", borderRadius: 16, padding: 16, fontSize: 13.5, lineHeight: 1.65, outline: "none" }} />

        <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모 (선택) — 이 풀이에서 배운 점, 패턴 등"
          style={{ fontFamily: FONT, width: "100%", boxSizing: "border-box", border: "1.5px solid #E5E8EB", borderRadius: 14, padding: "11px 14px", fontSize: 14, outline: "none", margin: "10px 0", background: "#FAFBFC" }} />

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
          {problem.solutions.map((sol) => (
            <div key={sol.id} style={{ ...clay.card, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 13.5,
                  color: sol.type === "mine" ? "#3182F6" : "#E0527A",
                  background: sol.type === "mine" ? "#E4F0FF" : "#FFE9EF", padding: "5px 12px", borderRadius: 999,
                }}>
                  {sol.type === "mine" ? <User size={13} /> : <Heart size={13} />} {sol.author}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => runReview(sol)} disabled={reviewing === sol.id} style={{
                    fontFamily: FONT, display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13,
                    color: "#7C5CE0", background: "#EFE9FF", border: "none", borderRadius: 999, padding: "7px 14px", cursor: "pointer",
                  }}>
                    {reviewing === sol.id ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
                    {sol.review ? "리뷰 다시 받기" : "AI 코드 리뷰"}
                  </button>
                  <button onClick={() => delSolution(sol.id)} style={{ border: "none", background: "#F2F4F6", borderRadius: 999, padding: "7px 10px", cursor: "pointer" }}>
                    <Trash2 size={14} color="#8B95A1" />
                  </button>
                </div>
              </div>
              {sol.memo && <p style={{ margin: "0 0 10px", fontSize: 13.5, color: "#6B7684", background: "#F7F9FC", borderRadius: 12, padding: "9px 12px" }}>📝 {sol.memo}</p>}
              <pre style={{ ...mono, margin: 0, background: "#191F28", color: "#E8F0FE", borderRadius: 14, padding: 16, fontSize: 13, lineHeight: 1.6, overflowX: "auto" }}>{sol.code}</pre>
              <ReviewCard review={sol.review} />
            </div>
          ))}
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
  const [view, setView] = useState({ page: "home", id: null });
  const [showAdd, setShowAdd] = useState(false);
  const [showAuth, setShowAuth] = useState(false); // 로그인 화면 모달 표시
  const [syncing, setSyncing] = useState(false);

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
    setView({ page: "detail", id: p.id });
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
    setView({ page: "home", id: null });
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
  const shown = filter === "all" ? problems : problems.filter((p) => p.category === filter);
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
      <header style={{ ...clay.glass, position: "sticky", top: 0, zIndex: 40, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => setView({ page: "home", id: null })} style={{ fontFamily: FONT, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 34, height: 34, borderRadius: 12, background: "linear-gradient(135deg,#3182F6,#7C5CE0)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 14px rgba(49,130,246,0.35)" }}>
            <Code2 size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, color: "#191F28" }}>코테 아카이브</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
        <div className="rise"><ProblemDetail problem={current} onBack={() => setView({ page: "home", id: null })} onUpdate={updateProblem} onDelete={deleteProblem} /></div>
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <Chip active={filter === "all"} color={{ deep: "#191F28" }} onClick={() => setFilter("all")}>전체 {problems.length}</Chip>
            {CATEGORIES.map((c) => (
              <Chip key={c.id} active={filter === c.id} color={c} onClick={() => setFilter(c.id)}>{c.short}</Chip>
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
                const mine = p.solutions.filter((s) => s.type === "mine").length;
                const liked = p.solutions.filter((s) => s.type === "others").length;
                return (
                  <button key={p.id} onClick={() => setView({ page: "detail", id: p.id })} style={{
                    fontFamily: FONT, textAlign: "left", cursor: "pointer", ...clay.card, padding: 18,
                    transition: "transform .18s, box-shadow .18s",
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 14px 30px ${c.deep}28`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = clay.card.boxShadow; }}
                  >
                    <CatBadge id={p.category} small />
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
