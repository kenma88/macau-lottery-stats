import {
  buildLoginUrl,
  createConfigErrorResponse,
  createUnauthorizedApiResponse,
  isApiAuthenticated,
  isAuthenticated,
  isAuthConfigured,
  isPublicPath,
} from "./_shared/auth.js";

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (isPublicPath(url.pathname)) {
    if ((url.pathname === "/login" || url.pathname === "/login/") && isAuthConfigured(env)) {
      const authenticated = await isAuthenticated(request, env);
      if (authenticated) {
        return Response.redirect(new URL("/", url.origin), 302);
      }
    }

    return context.next();
  }

  if (!isAuthConfigured(env)) {
    return createConfigErrorResponse();
  }

  if (url.pathname.startsWith("/api/")) {
    const apiAuthenticated = await isApiAuthenticated(request, env);
    if (apiAuthenticated) {
      return context.next();
    }
    return createUnauthorizedApiResponse("请重新打开页面并登录。");
  }

  const authenticated = await isAuthenticated(request, env);
  if (authenticated) {
    return context.next();
  }

  return Response.redirect(buildLoginUrl(request), 302);
}
