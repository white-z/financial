import { createClient } from "@supabase/supabase-js";

/**
 * 服务端 Supabase 客户端
 * 优先使用 SUPABASE_SERVICE_ROLE_KEY（跳过 RLS），
 * 未设置时回退到 anon key（需要 RLS 策略放行）
 */
export function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url.includes("your-project-id")) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
