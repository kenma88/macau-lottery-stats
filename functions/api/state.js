import { ensureReady, errorResponse, json, readState } from "../_shared/db.js";

export async function onRequestGet(context) {
  try {
    await ensureReady(context.env);
    const state = await readState(context.env);
    return json(state);
  } catch (error) {
    return errorResponse(error);
  }
}
