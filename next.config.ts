import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
      allowedOrigins: [
        "uattest.chaiyadetprogress.com",
        "*.chaiyadetprogress.com",
        "localhost:3005",
        "192.168.1.139:3005",
        "192.168.1.139",
      ],
    },
  },
};

export default nextConfig;