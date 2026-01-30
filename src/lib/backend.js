export const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://back-ielts.cloudpub.ru").replace(/\/+$/, "");

export function buildBackendUrl(pathname) {
  if (!pathname) return BACKEND_URL;
  return `${BACKEND_URL}${pathname.startsWith("/") ? "" : "/"}${pathname}`;
}

