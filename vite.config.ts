// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vitejs.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   optimizeDeps: {
//     exclude: ['lucide-react'],
//   },
// })
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react'
export default defineConfig({
  root: '',
  plugins: [
    // Add SSL if needed for secure cookies
    basicSsl(),
    react()
  ],
    optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: './www',
    minify: true, // 构建时禁用代码压缩
    emptyOutDir: true,
    commonjsOptions: {
      transformMixedEsModules: true // 允许混合使用 ES 和 CommonJS
    },
    rollupOptions: {
      input: {
        main: './index.html',
      
      }
    }
  },

});