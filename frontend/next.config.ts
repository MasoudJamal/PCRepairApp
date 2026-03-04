/** @type {import('next').NextConfig} */
const nextConfig = {
  // If you are on Next.js 15+, the 'turbo' key inside experimental 
  // is often unnecessary or has changed. Let's simplify it:
  experimental: {
    // Remove the 'root' key entirely. 
    // Next.js automatically detects the root based on where next.config.ts sits.
  },
};

export default nextConfig; // Use 'export default' for .ts files