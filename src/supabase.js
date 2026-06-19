// Supabase 클라이언트
// 환경변수는 .env (로컬) 또는 Vercel 환경변수에서 읽어요.
// VITE_ 접두사가 붙은 변수만 프론트엔드에서 사용 가능해요.
// anon key는 공개되어도 괜찮은 키예요 (RLS 정책이 데이터를 보호함).

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error(
    'Supabase 환경변수가 없어요! .env 파일에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 설정해 주세요.'
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,      // 로그인 상태를 브라우저에 저장
    autoRefreshToken: true,    // 토큰 자동 갱신 (로그인 오래 유지)
    detectSessionInUrl: true,
  },
});
