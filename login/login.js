const loginForm = document.querySelector("#loginForm");
const passwordInput = document.querySelector("#passwordInput");
const loginError = document.querySelector("#loginError");
const tabSessionFlagKey = "macauTabSessionActive";
const tabSessionIdKey = "macauTabSessionId";
const tabClosedPrefix = "macauTabClosed:";

const nextPath = getNextPath();

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setError("");

  const password = passwordInput.value;
  if (!password) {
    setError("请输入密码。");
    return;
  }

  const submitButton = loginForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "登录中...";

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || "登录失败。");
    }

    const tabSessionId = crypto.randomUUID();
    sessionStorage.setItem(tabSessionFlagKey, "1");
    sessionStorage.setItem(tabSessionIdKey, tabSessionId);
    localStorage.removeItem(`${tabClosedPrefix}${tabSessionId}`);
    window.location.replace(nextPath);
  } catch (error) {
    setError(error?.message || "登录失败。");
    passwordInput.focus();
    passwordInput.select();
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "进入统计表";
  }
});

passwordInput.focus();

if (hasValidTabSession() && (nextPath === "/" || nextPath.startsWith("/?") || nextPath.startsWith("/#"))) {
  window.location.replace(nextPath);
}

function hasValidTabSession() {
  const active = sessionStorage.getItem(tabSessionFlagKey) === "1";
  const tabSessionId = sessionStorage.getItem(tabSessionIdKey);
  if (!active || !tabSessionId) {
    clearTabSession();
    return false;
  }

  const closedMarker = localStorage.getItem(`${tabClosedPrefix}${tabSessionId}`);
  if (closedMarker) {
    clearTabSession();
    return false;
  }

  return true;
}

function clearTabSession() {
  const tabSessionId = sessionStorage.getItem(tabSessionIdKey);
  if (tabSessionId) {
    localStorage.removeItem(`${tabClosedPrefix}${tabSessionId}`);
  }

  sessionStorage.removeItem(tabSessionFlagKey);
  sessionStorage.removeItem(tabSessionIdKey);
}

function setError(message) {
  loginError.hidden = !message;
  loginError.textContent = message;
}

function getNextPath() {
  const url = new URL(window.location.href);
  const next = url.searchParams.get("next");
  if (!next || !next.startsWith("/")) {
    return "/";
  }
  return next;
}
