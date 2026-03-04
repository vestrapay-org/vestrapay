import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@vestrapay/ui"],
  turbopack: {
    root: resolve(__dirname, "../.."),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https:",
              "connect-src 'self' https:",
              "frame-src 'self' https://mtf.gateway.mastercard.com https://*.mastercard.com https://*.visa.com https://*.verve.com.ng https://*.3dsecure.io https:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
