import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        neutral: {
          1: 'var(--color-neutral-1)',
          2: 'var(--color-neutral-2)',
          3: 'var(--color-neutral-3)',
          4: 'var(--color-neutral-4)',
          5: 'var(--color-neutral-5)',
          6: 'var(--color-neutral-6)',
          7: 'var(--color-neutral-7)',
          8: 'var(--color-neutral-8)',
          9: 'var(--color-neutral-9)',
          10: 'var(--color-neutral-10)',
          11: 'var(--color-neutral-11)',
          12: 'var(--color-neutral-12)',
        },
        accent: {
          1: 'var(--color-accent-1)',
          2: 'var(--color-accent-2)',
          3: 'var(--color-accent-3)',
          4: 'var(--color-accent-4)',
          5: 'var(--color-accent-5)',
          6: 'var(--color-accent-6)',
          7: 'var(--color-accent-7)',
          8: 'var(--color-accent-8)',
          9: 'var(--color-accent-9)',
          10: 'var(--color-accent-10)',
          11: 'var(--color-accent-11)',
          12: 'var(--color-accent-12)',
        },
        bg: 'var(--color-bg)',
        fg: 'var(--color-fg)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
      },
    },
  },
  plugins: [],
}
export default config
