// next.config.ts (lub .js)
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.vercel-storage.com", // działa dla <bucket>.public.blob.vercel-storage.com
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig; // (w .js użyj module.exports = nextConfig;
