/** @type {import('next').NextConfig} */
const nextConfig = {
  // Served at blog.trippyants.com (subdomain) — no basePath needed.
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
