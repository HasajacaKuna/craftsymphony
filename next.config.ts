/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "blob.vercel-storage.com" },
      // jeśli użyjesz S3:
      // { protocol: "https", hostname: "*.amazonaws.com" }
    ],
  },
};

export default nextConfig;
