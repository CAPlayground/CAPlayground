/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Use standalone output for Electron builds (includes Node.js server)
  // This supports dynamic routes like /editor/[id] and API routes
  ...(process.env.ELECTRON_BUILD === 'true' ? {
    output: 'standalone',
  } : {}),
}

export default nextConfig
