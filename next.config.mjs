/** @type {import('next').NextConfig} */
const nextConfig = {
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
