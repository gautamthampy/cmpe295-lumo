<<<<<<< HEAD
=======
/** @type {import('next').NextConfig} */
>>>>>>> origin/dev
const withMDX = require('@next/mdx')({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

<<<<<<< HEAD
/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  experimental: {
    mdxRs: false,
=======
const nextConfig = {
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
>>>>>>> origin/dev
  },
};

module.exports = withMDX(nextConfig);
<<<<<<< HEAD
=======

>>>>>>> origin/dev
