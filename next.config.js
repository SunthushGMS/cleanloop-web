/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets a second dev server run from the same checkout without both
  // writing into .next (e.g. NEXT_DIST_DIR=.next-preview). Defaults to .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

module.exports = nextConfig;
