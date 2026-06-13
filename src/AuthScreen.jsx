// 로그인 / 회원가입 화면 — 토스 파스텔 클레이 스타일
import { useState } from "react";
import { Code2, Loader2, TriangleAlert, LogIn, UserPlus } from "lucide-react";
import { supabase } from "./supabase";

const FONT = `"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", "Segoe UI", sans-serif`;

export default function AuthScreen() {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      setErr("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    if (password.length < 6) {
      setErr("비밀번호는 6자 이상이어야 해요.");
      return;
    }
    setErr(""); setInfo(""); setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        // 이메일 확인이 켜져 있으면 세션이 없는 상태로 응답이 와요
        if (data.user && !data.session) {
          setInfo("가입 확인 메일을 보냈어요! 메일함에서 인증 링크를 눌러주세요 📬");
        }
        // 세션이 바로 생기면 App에서 onAuthStateChange로 자동 입장
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (e) {
      const msg = (e.message || "").toLowerCase();
      if (msg.includes("invalid login credentials")) setErr("이메일 또는 비밀번호가 맞지 않아요.");
      else if (msg.includes("already registered")) setErr("이미 가입된 이메일이에요. 로그인으로 시도해 보세요.");
      else if (msg.includes("email not confirmed")) setErr("아직 이메일 인증이 안 됐어요. 메일함을 확인해 주세요.");
      else setErr(e.message || "오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
  };

  const input = {
    fontFamily: FONT, width: "100%", boxSizing: "border-box",
    border: "1.5px solid #E5E8EB", borderRadius: 14, padding: "13px 15px",
    fontSize: 15, outline: "none", background: "#FAFBFC", color: "#191F28",
  };

  return (
    <div style={{
      minHeight: "100vh", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(180deg,#F4F7FB 0%, #EEF3FA 40%, #F6F4FB 100%)", padding: 16,
    }}>
      <div style={{
        width: "100%", maxWidth: 400, background: "#fff", borderRadius: 28, padding: "36px 28px",
        boxShadow: "0 16px 40px rgba(100,116,139,0.14), inset 0 1px 0 rgba(255,255,255,0.9)",
        border: "1px solid rgba(255,255,255,0.7)",
      }}>
        {/* 로고 */}
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18, margin: "0 auto 14px",
            background: "linear-gradient(135deg,#3182F6,#7C5CE0)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 10px 24px rgba(49,130,246,0.35)",
          }}>
            <Code2 size={28} color="#fff" />
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#191F28" }}>코테 아카이브</h1>
          <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "#8B95A1" }}>
            {mode === "login" ? "로그인하고 어디서든 풀이를 확인하세요" : "가입하고 나만의 패턴 노트를 시작하세요"}
          </p>
        </div>

        {/* 입력 폼 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input style={input} type="email" placeholder="이메일" value={email}
            onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
          <input style={input} type="password" placeholder="비밀번호 (6자 이상)" value={password}
            onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />

          {err && (
            <div style={{ display: "flex", gap: 6, alignItems: "center", color: "#E0527A", fontSize: 13.5, fontWeight: 600 }}>
              <TriangleAlert size={15} />{err}
            </div>
          )}
          {info && (
            <div style={{ background: "#E9FBF3", color: "#1FA97E", fontSize: 13.5, fontWeight: 700, borderRadius: 12, padding: "11px 14px", lineHeight: 1.5 }}>
              {info}
            </div>
          )}

          <button onClick={submit} disabled={busy} style={{
            fontFamily: FONT, fontWeight: 700, fontSize: 15.5, color: "#fff",
            background: busy ? "#B0C4DE" : "#3182F6", border: "none",
            cursor: busy ? "default" : "pointer", padding: "14px 0", borderRadius: 16,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: busy ? "none" : "0 8px 20px rgba(49,130,246,0.4)", marginTop: 4,
          }}>
            {busy ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
              : mode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}
            {mode === "login" ? "로그인" : "가입하기"}
          </button>
        </div>

        {/* 모드 전환 */}
        <p style={{ textAlign: "center", margin: "18px 0 0", fontSize: 13.5, color: "#8B95A1" }}>
          {mode === "login" ? "아직 계정이 없나요?" : "이미 계정이 있나요?"}{" "}
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(""); setInfo(""); }}
            style={{ fontFamily: FONT, border: "none", background: "transparent", color: "#3182F6", fontWeight: 800, fontSize: 13.5, cursor: "pointer", padding: 0 }}>
            {mode === "login" ? "가입하기" : "로그인"}
          </button>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
