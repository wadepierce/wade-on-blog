import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react(), tailwind({ applyBaseStyles: true })],
  server: {
    host: process.env.HOST ?? '0.0.0.0',
    port: Number(process.env.PORT ?? 4321),
  },
  // Astro's generic Origin/Host CSRF check is unreliable behind Railway's
  // envoy proxy and was blocking legitimate same-origin passkey POSTs. We
  // have stronger protection elsewhere: every WebAuthn flow is origin-bound
  // via RP_ID, session cookies are SameSite=lax, and admin endpoints are
  // gated by requireAdmin.
  security: {
    checkOrigin: false,
  },
  vite: {
    ssr: {
      // sharp and postgres must stay external on the server
      external: ['sharp', 'postgres'],
    },
  },
});
