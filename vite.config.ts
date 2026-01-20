import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // AGREGA ESTO PARA QUE FUNCIONEN LOS TESTS DE REACT:
  test: {
    environment: 'happy-dom',
    globals: true
  }
} as any) // El 'as any' es un truco rápido para evitar pelear con tipos de Vitest ahora mismo