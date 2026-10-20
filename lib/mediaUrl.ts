/** Turn a stored S3 URL into an app URL that can read the private bucket object. */
export function mediaSrc(src?: string | null): string {
  if (!src) return "";
  const trimmed = src.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/api/media/")) return trimmed;

  try {
    const url = new URL(trimmed);
    if (url.hostname.endsWith("amazonaws.com")) {
      const key = url.pathname.replace(/^\/+/, "");
      // Proxy any bucket object so apparel mockups (category-mockups/, etc.) load for customers
      if (key && !key.includes("..")) {
        return `/api/media/${key
          .split("/")
          .map((part) => encodeURIComponent(part))
          .join("/")}`;
      }
    }
  } catch {
    /* not an absolute URL */
  }

  return trimmed;
}
