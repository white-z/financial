import { getServerClient } from "../server";

// ── 类型定义 ─────────────────────────────────────────────
export interface CashflowInsert {
  annual_income: number;
  annual_spend: number;
  target_annual_spend: number;
  savings_rate: number;
  savings_rate_level: string;
  annual_surplus: number;
  income_gap: number;
  nest_egg_low: number;
  nest_egg_high: number;
}

export interface CashflowRow extends CashflowInsert {
  id: string;
  created_at: string;
}

// ── CRUD 操作 ────────────────────────────────────────────
export async function insertCashflowAnalysis(data: CashflowInsert): Promise<CashflowRow> {
  const client = getServerClient();
  const { data: row, error } = await client
    .from("cashflow_analyses")
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return row as CashflowRow;
}

export async function listCashflowAnalyses(limit = 8): Promise<CashflowRow[]> {
  const client = getServerClient();
  const { data, error } = await client
    .from("cashflow_analyses")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as CashflowRow[];
}

export async function getLatestCashflowAnalysis(): Promise<CashflowRow | null> {
  const client = getServerClient();
  const { data, error } = await client
    .from("cashflow_analyses")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as CashflowRow | null;
}

export async function deleteCashflowAnalysis(id: string): Promise<void> {
  const client = getServerClient();
  const { error } = await client.from("cashflow_analyses").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getCashflowById(id: string): Promise<CashflowRow | null> {
  const client = getServerClient();
  const { data, error } = await client
    .from("cashflow_analyses")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as CashflowRow | null;
}
