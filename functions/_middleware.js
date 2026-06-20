import {
  buildLoginUrl,
  createConfigErrorResponse,
  createUnauthorizedApiResponse,
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

  const authenticated = await isAuthenticated(request, env);
  if (authenticated) {
    return context.next();
  }

  if (url.pathname.startsWith("/api/")) {
    return createUnauthorizedApiResponse();
  }

  return Response.redirect(buildLoginUrl(request), 302);
}
