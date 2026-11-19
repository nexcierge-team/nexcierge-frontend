import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // /about was folded into /why-nexcierge in the site redesign. Temporary
  // (307) while pre-launch, so it can still change.
  async redirects() {
    return [
      { source: "/about", destination: "/why-nexcierge", permanent: false },
    ];
  },
};

export default nextConfig;
