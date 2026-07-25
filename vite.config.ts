import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // host: true escucha en todas las interfaces de red, no solo en localhost.
    // Es lo que permite abrir la app desde el celular con la IP del computador
    // (por ejemplo http://192.168.1.20:3000) estando en el mismo WiFi.
    host: true,
    proxy: {
      // El celular pide /api al mismo origen y Vite lo reenvía al backend, así
      // que no hay que exponer el puerto 3001 ni tocar CORS.
      '/api': 'http://localhost:3001',
    },
  },
  preview: {
    port: 3000,
    host: true,
  },
})
