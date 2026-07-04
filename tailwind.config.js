/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        warm: {
          bg: '#fef9f0',
          card: '#ffffff',
          border: '#e8d5b7',
          accent: '#e67e22',
          text: '#2c3e50',
          muted: '#7f8c8d',
        },
        vocab: {
          underline: '#e74c3c',
          bg: '#fef3c7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Georgia', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
