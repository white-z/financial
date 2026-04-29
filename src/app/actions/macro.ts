"use server";

import {
  insertMacroCheck,
  listMacroChecks,
  getLatestMacroCheck,
  getMacroCheckById,
  deleteMacroCheck,
  type MacroCheckInsert,
  type MacroCheckRow,
} from "@/lib/supabase/repositories/macro";

// ── 统一返回类型 ──────────────────────────────────────────
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function handleError(e: unknown): { success: false; error: string } {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg === "SUPABASE_NOT_CONFIGURED") return { success: false, error: "NOT_CONFIGURED" };
  return { success: false, error: msg };
}

// ── Actions ───────────────────────────────────────────────
export async function saveMacroCheckAction(
  payload: MacroCheckInsert
): Promise<ActionResult<MacroCheckRow>> {
  try {
    const row = await insertMacroCheck(payload);
    return { success: true, data: row };
  } catch (e) {
    return handleError(e);
  }
}

export async function listMacroChecksAction(): Promise<ActionResult<MacroCheckRow[]>> {
  try {
    const rows = await listMacroChecks();
    return { success: true, data: rows };
  } catch (e) {
    return handleError(e);
  }
}

export async function getLatestMacroCheckAction(): Promise<ActionResult<MacroCheckRow | null>> {
  try {
    const row = await getLatestMacroCheck();
    return { success: true, data: row };
  } catch (e) {
    return handleError(e);
  }
}

export async function getMacroCheckByIdAction(
  id: string
): Promise<ActionResult<MacroCheckRow | null>> {
  try {
    const row = await getMacroCheckById(id);
    return { success: true, data: row };
  } catch (e) {
    return handleError(e);
  }
}

export async function deleteMacroCheckAction(
  id: string
): Promise<ActionResult<void>> {
  try {
    await deleteMacroCheck(id);
    return { success: true, data: undefined };
  } catch (e) {
    return handleError(e);
  }
}
