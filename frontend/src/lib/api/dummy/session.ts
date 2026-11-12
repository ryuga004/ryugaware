/**
 * Dummy "cookie": remembers who is signed in across page reloads for the duration of the browser tab.
 * Lives in the dummy layer only; a real backend would use an HTTP-only session cookie.
 */
const KEY = "ryugaware.dummy.session";

export function getSessionEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setSessionEmail(email: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (email) window.sessionStorage.setItem(KEY, email);
    else window.sessionStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: session lasts for the page only */
  }
}
