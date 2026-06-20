import { ensureReady, errorResponse, json } from "../_shared/db.js";
import { isAuthConfigured } from "../_shared/auth.js";

export async function onRequestGet(context) {
  try {
    await ensureReady(context.env);
    return json({
      ok: true,
      authConfigured: isAuthConfigured(context.env),
      databaseBinding: Boolean(context.env.DB),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
