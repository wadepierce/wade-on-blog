import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        electric: {
          50: '#e6f7ff',
          100: '#b3e6ff',
          200: '#80d4ff',
          300: '#4dc3ff',
          400: '#1ab1ff',
          500: '#00b4ff',
          600: '#0091cc',
          700: '#006d99',
          800: '#004966',
          900: '#002433',
          950: '#001119',
        },
        ink: {
          950: '#05060a',
          900: '#0b0d14',
          800: '#11141d',
        },
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            maxWidth: '72ch',
            '--tw-prose-links': theme('colors.electric.600'),
            '--tw-prose-invert-links': theme('colors.electric.400'),
            '--tw-prose-invert-body': theme('colors.neutral.200'),
            '--tw-prose-invert-headings': theme('colors.white'),
          },
        },
      }),
    },
  },
  plugins: [typography],
};
