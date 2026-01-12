const { defineConfig } = require("vite");
const vue = require("@vitejs/plugin-vue");
const path = require("path");
const AutoImport = require("unplugin-auto-import/vite").default;
const Components = require("unplugin-vue-components/vite").default;
const { ElementPlusResolver } = require("unplugin-vue-components/resolvers");

module.exports = defineConfig({
  plugins: [
    vue(),
    // Element Plus 按需引入
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  base: "./",
  build: {
    outDir: "dist",
    // 代码分割优化
    rollupOptions: {
      output: {
        manualChunks: {
          // 将 Vue 相关库打包到一起
          vue: ['vue'],
          // Element Plus 单独打包
          'element-plus': ['element-plus'],
          // ZXing 库单独打包
          zxing: ['@zxing/browser', '@zxing/library'],
        },
      },
    },
    // 压缩优化
    minify: 'terser',
    terserOptions: {
      compress: {
        // 生产环境移除 console
        drop_console: true,
        drop_debugger: true,
      },
    },
    // 文件大小报告
    reportCompressedSize: false,
  },
});
