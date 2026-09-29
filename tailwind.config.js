module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      colors: { accent: '#5eead4' }
    }
  },
  plugins: []
}
