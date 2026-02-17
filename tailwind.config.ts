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
        'school-gold': '#FFD700',
      },
      fontFamily: {
        'school': ['serif'],
      },
    },
  },
  plugins: [],
}
export default config
