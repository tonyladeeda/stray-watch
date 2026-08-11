import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'LA StrayWatch',
        short_name: 'StrayWatch',
        description: 'Track and rescue stray dogs in DTLA',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'https://placehold.co/192x192/e2e8f0/64748b?text=Icon',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://placehold.co/512x512/e2e8f0/64748b?text=Icon',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})