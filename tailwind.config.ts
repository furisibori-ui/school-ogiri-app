import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'school-navy': '#003366',
        'school-maroon': '#8B0000',
        'school-gold': '#FFD700',
        'school-bg': '#FFFEF0',
      },
      fontFamily: {
        'school': ['ヒラギノ明朝 ProN', 'Hiragino Mincho ProN', 'MS P明朝', 'MS PMincho', 'serif'],
      },
    },
  },
  plugins: [],
}
export default config
