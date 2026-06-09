/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { domains: ['firebasestorage.googleapis.com', 'lh3.googleusercontent.com'] },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};
module.exports = nextConfig;
