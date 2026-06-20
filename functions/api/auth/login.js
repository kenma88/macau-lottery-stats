import { createSession, isAuthConfigured, json, verifyPassword } from "../../_shared/auth.js";

export async function onRequestPost(context) {
  try {
    if (!isAuthConfigured(context.env)) {
      return json({ error: "请先配置 SITE_PASSWORD 和 AUTH_SECRET。" }, 503);
    }

    const payload = await context.request.json();
    const password = String(payload?.password ?? "");
    if (!password) {
      return json({ error: "请输入密码。" }, 400);
    }

    const matched = await verifyPassword(password, context.env);
    if (!matched) {
      return json({ error: "密码不正确。" }, 401);
    }

    const session = await createSession(context.env);
    return json(
      { ok: true, sessionNonce: session.sessionNonce },
      200,
      {
        "Set-Cookie": session.cookie,
      },
    );
  } catch (error) {
    return json({ error: error?.message || "登录失败。" }, error?.status || 500);
  }
}
