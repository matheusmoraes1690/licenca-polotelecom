import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

let _csrfToken: string | null = null;

const _originalFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const method = (init?.method || "GET").toUpperCase();
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (!safeMethods.includes(method)) {
    const token = _csrfToken ||
      document.cookie.split("; ").find((row) => row.startsWith("csrfToken="))?.split("=")[1];
    if (token) {
      init = {
        ...init,
        headers: { ...(init?.headers as Record<string, string>), "x-csrf-token": token },
      };
    }
  }
  return _originalFetch(input, init);
};

async function initCsrfToken() {
  try {
    const res = await _originalFetch("/api/auth/csrf", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      if (data.csrfToken) {
        _csrfToken = data.csrfToken;
        return;
      }
    }
  } catch {
    // ignorar
  }
  // fallback: tentar ler do cookie (pode ter sido setado pelo /api/auth/user)
  const fromCookie = document.cookie.split("; ").find((r) => r.startsWith("csrfToken="))?.split("=")[1];
  if (fromCookie) _csrfToken = fromCookie;
}

initCsrfToken().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
