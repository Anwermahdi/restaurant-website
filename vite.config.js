import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Dev only: let phone-testing tunnels reach the dev server.
  server: {
    host: true,
    allowedHosts: [".trycloudflare.com", ".loca.lt"],
  },
})
