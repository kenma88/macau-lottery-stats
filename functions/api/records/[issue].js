import { deleteRecord, ensureReady, errorResponse, json } from "../../_shared/db.js";

export async function onRequestDelete(context) {
  try {
    await ensureReady(context.env);
    await deleteRecord(context.env, context.params.issue);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
