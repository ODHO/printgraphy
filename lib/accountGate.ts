/** Keep post-login redirects inside this site. */
export function safeNextPath(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("://")) return fallback;
  return value;
}

export function registerHref(nextPath: string, notice: "draft" | "paid" | "checkout") {
  const params = new URLSearchParams({
    tab: "signup",
    next: nextPath,
    notice,
  });
  return `/auth?${params.toString()}`;
}

export async function viewerIsSignedIn() {
  try {
    const data = await fetch("/api/auth/me").then((response) => response.json());
    return Boolean(data?.user);
  } catch {
    return false;
  }
}
