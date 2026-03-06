import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { handleUpload, handleDelete, handleEdit } from './scripts/api-handlers.js'

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    react(),
    {
      name: 'diecast-api',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url || ''
          if (url.startsWith('/api/upload') && req.method === 'POST') {
            handleUpload(req, res)
          } else if (url.startsWith('/api/car') && req.method === 'DELETE') {
            handleDelete(req, res)
          } else if (url.startsWith('/api/car') && req.method === 'PATCH') {
            handleEdit(req, res)
          } else {
            next()
          }
        })
      },
    },
  ],
  server: {
    port: 7777,
  },
})
