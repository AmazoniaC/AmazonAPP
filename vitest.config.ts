import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.{js,ts}'],
    coverage: {
      provider: 'v8',
      include: ['server/**/*.js', 'src/utils/**/*.ts'],
      exclude: ['server/whatsapp.js', 'server/scheduler.js', 'server/seed.js'],
    },
  },
})
