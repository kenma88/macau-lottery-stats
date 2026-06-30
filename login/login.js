const loginForm = document.querySelector("#loginForm");
const passwordInput = document.querySelector("#passwordInput");
const loginError = document.querySelector("#loginError");

const loginEntryParam = "login_entry";
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

  if (window.location.protocol === "file:") {
    window.location.replace(getLocalNextPath());
    return;
  }

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

    window.location.replace(addLoginEntry(nextPath));
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

function addLoginEntry(path) {
  const url = new URL(path, window.location.origin);
  url.searchParams.set(loginEntryParam, String(Date.now()));
  return `${url.pathname}${url.search}${url.hash}`;
}

function getLocalNextPath() {
  const next = getNextPath();
  const normalizedHash = next === "/#picker" || next === "#picker" ? "#picker" : "#records";
  const appUrl = new URL("../index.html", window.location.href);
  appUrl.hash = normalizedHash.slice(1);
  return appUrl.toString();
}
