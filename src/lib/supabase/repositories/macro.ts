import { getServerClient } from "../server";

// ── 类型定义 ─────────────────────────────────────────────
export interface MacroCheckInsert {
  age: number;
  annual_income: number;
  ppp_rate: number;
  assets_cash: number;
  assets_invest_liquid: number;
  assets_fixed_income: number;
  assets_property: number;
  liab_consumption: number;
  liab_investment: number;
  liab_student: number;
  net_worth: number;
  net_worth_ppp: number;
  income_ppp: number;
  age_percentile: number;
}

export interface MacroCheckRow extends MacroCheckInsert {
  id: string;
  created_at: string;
}

// ── CRUD 操作 ────────────────────────────────────────────
export async function insertMacroCheck(data: MacroCheckInsert): Promise<MacroCheckRow> {
  const client = getServerClient();
  const { data: row, error } = await client
    .from("macro_checks")
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return row as MacroCheckRow;
}

export async function listMacroChecks(limit = 8): Promise<MacroCheckRow[]> {
  const client = getServerClient();
  const { data, error } = await client
    .from("macro_checks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as MacroCheckRow[];
}

export async function getLatestMacroCheck(): Promise<MacroCheckRow | null> {
  const client = getServerClient();
  const { data, error } = await client
    .from("macro_checks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as MacroCheckRow | null;
}

export async function deleteMacroCheck(id: string): Promise<void> {
  const client = getServerClient();
  const { error } = await client.from("macro_checks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getMacroCheckById(id: string): Promise<MacroCheckRow | null> {
  const client = getServerClient();
  const { data, error } = await client
    .from("macro_checks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as MacroCheckRow | null;
}
