import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // Intercepta as chamadas do front que começam com /api-proxy
        source: '/api-proxy/:path*',
        // Repassa de forma invisível para o seu Express local rodando na porta 5000
        destination: 'http://localhost:5000/:path*',
      },
    ];
  },
};

export default nextConfig;