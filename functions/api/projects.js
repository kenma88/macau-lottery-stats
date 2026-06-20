import { createProject, ensureReady, errorResponse, json } from "../_shared/db.js";

export async function onRequestPost(context) {
  try {
    await ensureReady(context.env);
    const payload = await context.request.json();
    const project = await createProject(context.env, payload?.name);
    return json({ ok: true, project }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
