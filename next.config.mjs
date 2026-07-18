/** @type {import('next').NextConfig} */
const nextConfig = {
  // Blog is mounted at https://www.trippyants.com/blog (Wix main site + Vercel app).
  basePath: '/blog',
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
};

export default nextConfig;
