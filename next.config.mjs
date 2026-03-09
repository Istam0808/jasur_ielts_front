/** @type {import('next').NextConfig} */
const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://jasur-ielts-backend.onrender.com/";
const nextConfig = {
  // Отключаем авто-редирект Next.js между URL со слешом/без слеша.
  // Это важно для backend endpoint, где хвостовой слеш обязателен.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      // Для списка mocks принудительно сохраняем URL со слешом в конце.
      {
        source: "/api/backend/api/v1/mocks/list/",
        destination: `${backendUrl.replace(/\/+$/, "")}/api/v1/mocks/list/`,
      },
      // Общее правило для всех backend‑запросов (auth, mocks и т.д.) — путь прокидывается как есть.
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
