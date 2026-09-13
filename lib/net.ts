/* Network helpers: direct fetch first, then same-origin proxy /r/ passthrough
   if the app is served behind the technocore-live proxy, then corsproxy. */
const TC = "https://technocore.chat";

export async function get(url: string): Promise<Response> {
  const abs = url.startsWith("http")
    ? url
    : `${TC}${url.startsWith("/") ? url : `/${url}`}`;
  // same-origin proxy (if running under the live server)
  const tries: string[] = [];
  if (typeof window !== "undefined" && location.hostname === "localhost") {
    tries.push(`/${abs.replace(/^https?:\/\//, "")}`);
  }
  tries.push(abs, `https://corsproxy.io/?${encodeURIComponent(abs)}`);
  for (const u of tries) {
    try {
      const r = await fetch(u);
      if (r.ok) return r;
    } catch {
      /* next */
    }
  }
  throw new Error("net");
}

export async function getJson<T = unknown>(url: string): Promise<T> {
  const r = await get(url);
  return (await r.json()) as T;
}
