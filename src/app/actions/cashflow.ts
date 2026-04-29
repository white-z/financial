"use server";

import {
  insertCashflowAnalysis,
  listCashflowAnalyses,
  getLatestCashflowAnalysis,
  getCashflowById,
  deleteCashflowAnalysis,
  type CashflowInsert,
  type CashflowRow,
} from "@/lib/supabase/repositories/cashflow";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function handleError(e: unknown): { success: false; error: string } {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg === "SUPABASE_NOT_CONFIGURED") return { success: false, error: "NOT_CONFIGURED" };
  return { success: false, error: msg };
}

export async function saveCashflowAction(
  payload: CashflowInsert
): Promise<ActionResult<CashflowRow>> {
  try {
    const row = await insertCashflowAnalysis(payload);
    return { success: true, data: row };
  } catch (e) {
    return handleError(e);
  }
}

export async function listCashflowsAction(): Promise<ActionResult<CashflowRow[]>> {
  try {
    const rows = await listCashflowAnalyses();
    return { success: true, data: rows };
  } catch (e) {
    return handleError(e);
  }
}

export async function getLatestCashflowAction(): Promise<ActionResult<CashflowRow | null>> {
  try {
    const row = await getLatestCashflowAnalysis();
    return { success: true, data: row };
  } catch (e) {
    return handleError(e);
  }
}

export async function getCashflowByIdAction(
  id: string
): Promise<ActionResult<CashflowRow | null>> {
  try {
    const row = await getCashflowById(id);
    return { success: true, data: row };
  } catch (e) {
    return handleError(e);
  }
}

export async function deleteCashflowAction(
  id: string
): Promise<ActionResult<void>> {
  try {
    await deleteCashflowAnalysis(id);
    return { success: true, data: undefined };
  } catch (e) {
    return handleError(e);
  }
}
