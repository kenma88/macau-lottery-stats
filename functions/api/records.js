import { createRecord, ensureReady, errorResponse, json } from "../_shared/db.js";

export async function onRequestPost(context) {
  try {
    await ensureReady(context.env);
    const payload = await context.request.json();
    const record = await createRecord(context.env, payload);
    return json({ ok: true, record }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
