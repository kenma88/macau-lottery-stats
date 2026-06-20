const loginForm = document.querySelector("#loginForm");
const passwordInput = document.querySelector("#passwordInput");
const loginError = document.querySelector("#loginError");

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
  url.searchParams.set("login_entry", String(Date.now()));
  return `${url.pathname}${url.search}${url.hash}`;
}
