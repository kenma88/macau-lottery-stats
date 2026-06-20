import { deleteProject, ensureReady, errorResponse, json } from "../../_shared/db.js";

export async function onRequestDelete(context) {
  try {
    await ensureReady(context.env);
    await deleteProject(context.env, context.params.projectId);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
