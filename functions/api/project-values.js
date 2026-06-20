import { ensureReady, errorResponse, json, updateProjectValue } from "../_shared/db.js";

export async function onRequestPut(context) {
  try {
    await ensureReady(context.env);
    const payload = await context.request.json();
    await updateProjectValue(context.env, payload);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
