/** @type {import('next').NextConfig} */
const DEFAULT_BACKEND_URL = "https://jasur-ielts-backend.onrender.com";

function normalizeBackendUrl(value) {
  const raw = (value || DEFAULT_BACKEND_URL).trim();
  if (!raw || !/^https?:\/\//i.test(raw)) {
    return DEFAULT_BACKEND_URL;
  }

  try {
    const parsed = new URL(raw);
    const cleanPath = parsed.pathname
      .replace(/\/+$/, "")
      .replace(/(\/api\/backend|\/api\/v1)+$/i, "");
    return `${parsed.origin}${cleanPath === "/" ? "" : cleanPath}`;
  } catch (_) {
    return DEFAULT_BACKEND_URL;
  }
}

const backendUrl = normalizeBackendUrl(process.env.NEXT_PUBLIC_BACKEND_URL);
const nextConfig = {
  // Отключаем авто-редирект Next.js между URL со слешом/без слеша.
  // Это важно для backend endpoint'ов с разными правилами по слешам.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      // Для списка mocks принудительно сохраняем URL со слешом в конце.
      {
        source: "/api/backend/api/v1/mocks/list/",
        destination: `${backendUrl.replace(/\/+$/, "")}/api/v1/mocks/list/`,
      },
      // Общее прокси‑правило: сохраняем путь как есть, без принудительного добавления `/`.
      // Это нужно, чтобы auth endpoint'ы оставались без слеша (например, /api/v1/auth/login).
      {
        source: "/api/backend/:path*",
        destination: `${backendUrl.replace(/\/+$/, "")}/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/subjects/languages/english/practice/:difficulty/listening/:path*',
        destination: '/mock/listening',
        permanent: false,
      },
      {
        source: '/subjects/languages/english/practice/:difficulty/reading/:path*',
        destination: '/mock/reading',
        permanent: false,
      },
      {
        source: '/subjects/languages/english/practice/:difficulty/writing/:path*',
        destination: '/mock/writing',
        permanent: false,
      },
      {
        source: '/subjects/languages/english/practice/:difficulty',
        destination: '/mock/listening',
        permanent: false,
      },
      {
        source: '/practice/:difficulty/listening/:path*',
        destination: '/mock/listening',
        permanent: false,
      },
      {
        source: '/practice/:difficulty/reading/:path*',
        destination: '/mock/reading',
        permanent: false,
      },
      {
        source: '/practice/:difficulty/writing/:path*',
        destination: '/mock/writing',
        permanent: false,
      },
      {
        source: '/practice/:difficulty',
        destination: '/mock/listening',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
