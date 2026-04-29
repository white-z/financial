/**
 * Supabase 配置状态检测
 * 用于在未填写真实 env 时优雅降级，不影响计算功能
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return (
    !!url &&
    url !== "https://your-project-id.supabase.co" &&
    !url.includes("your-project-id")
  );
}
