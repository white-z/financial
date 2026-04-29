import { getServerClient } from "../server";

// ── 类型定义 ─────────────────────────────────────────────
export type MicroToolType = "daily_yield" | "path_xirr" | "nav_return";

export interface MicroCalcInsert {
  tool_type: MicroToolType;
  input_payload: Record<string, unknown>;
  output_payload: Record<string, unknown>;
}

export interface MicroCalcRow extends MicroCalcInsert {
  id: string;
  created_at: string;
}

// ── CRUD 操作 ────────────────────────────────────────────
export async function insertMicroCalculation(data: MicroCalcInsert): Promise<MicroCalcRow> {
  const client = getServerClient();
  const { data: row, error } = await client
    .from("micro_calculations")
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return row as MicroCalcRow;
}

export async function deleteMicroCalculation(id: string): Promise<void> {
  const client = getServerClient();
  const { error } = await client.from("micro_calculations").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listMicroCalculations(toolType?: MicroToolType, limit = 8): Promise<MicroCalcRow[]> {
  const client = getServerClient();
  let query = client
    .from("micro_calculations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (toolType) query = query.eq("tool_type", toolType);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as MicroCalcRow[];
}
