import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { ServerResponse } from 'http'

// El backend corre aparte, en el puerto 3001. Si no está arriba, cada llamada a
// /api falla; sin este manejador Vite imprime un AggregateError completo por
// cada petición y la terminal se vuelve ilegible.
let avisoMostrado = false

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // host: true escucha en todas las interfaces de red, no solo en localhost.
    // Es lo que permite abrir la app desde el celular con la IP del computador
    // (por ejemplo http://192.168.1.20:3000) estando en el mismo WiFi.
    host: true,
    proxy: {
      '/api': {
        // 127.0.0.1 en vez de "localhost": en Windows "localhost" puede resolver
        // primero a ::1 (IPv6) y fallar aunque el backend esté escuchando.
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err: NodeJS.ErrnoException, _req, res) => {
            if (!avisoMostrado) {
              avisoMostrado = true
              const motivo = err.code === 'ECONNREFUSED'
                ? 'el servidor backend no está corriendo en el puerto 3001'
                : err.message
              console.log(
                `\n\x1b[33m⚠️  No hay conexión con el backend — ${motivo}.\x1b[0m\n` +
                `   Detén esto (Ctrl+C) y arranca los dos procesos juntos:\n` +
                `   \x1b[36mnpm run dev\x1b[0m\n` +
                `   Si el backend falla al arrancar, revisa que PostgreSQL esté encendido.\n`,
              )
            }
            // Respuesta limpia para que el frontend muestre un error entendible
            const r = res as ServerResponse
            if ('writeHead' in r && !r.headersSent) {
              r.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' })
              r.end(JSON.stringify({
                error: 'El servidor backend no está disponible. Ejecuta "npm run dev" para iniciarlo.',
              }))
            }
          })
          // Si vuelve a responder, permite avisar de nuevo en una caída futura
          proxy.on('proxyRes', () => { avisoMostrado = false })
        },
      },
    },
  },
  preview: {
    port: 3000,
    host: true,
  },
})
