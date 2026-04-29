"use server";

import {
  insertMicroCalculation,
  listMicroCalculations,
  deleteMicroCalculation,
  type MicroCalcInsert,
  type MicroCalcRow,
  type MicroToolType,
} from "@/lib/supabase/repositories/micro";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function handleError(e: unknown): { success: false; error: string } {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg === "SUPABASE_NOT_CONFIGURED") return { success: false, error: "NOT_CONFIGURED" };
  return { success: false, error: msg };
}

export async function saveMicroCalcAction(
  payload: MicroCalcInsert
): Promise<ActionResult<MicroCalcRow>> {
  try {
    const row = await insertMicroCalculation(payload);
    return { success: true, data: row };
  } catch (e) {
    return handleError(e);
  }
}

export async function listMicroCalcsAction(
  toolType?: MicroToolType
): Promise<ActionResult<MicroCalcRow[]>> {
  try {
    const rows = await listMicroCalculations(toolType);
    return { success: true, data: rows };
  } catch (e) {
    return handleError(e);
  }
}

export async function deleteMicroCalcAction(
  id: string
): Promise<ActionResult<void>> {
  try {
    await deleteMicroCalculation(id);
    return { success: true, data: undefined };
  } catch (e) {
    return handleError(e);
  }
}
