import type { Config } from 'tailwindcss'

const config: Config = {
    darkMode: ['class'],
    content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		colors: {
  			neutral: {
  				'1': 'var(--color-neutral-1)',
  				'2': 'var(--color-neutral-2)',
  				'3': 'var(--color-neutral-3)',
  				'4': 'var(--color-neutral-4)',
  				'5': 'var(--color-neutral-5)',
  				'6': 'var(--color-neutral-6)',
  				'7': 'var(--color-neutral-7)',
  				'8': 'var(--color-neutral-8)',
  				'9': 'var(--color-neutral-9)',
  				'10': 'var(--color-neutral-10)',
  				'11': 'var(--color-neutral-11)',
  				'12': 'var(--color-neutral-12)'
  			},
  			accent: {
  				'1': 'var(--color-accent-1)',
  				'2': 'var(--color-accent-2)',
  				'3': 'var(--color-accent-3)',
  				'4': 'var(--color-accent-4)',
  				'5': 'var(--color-accent-5)',
  				'6': 'var(--color-accent-6)',
  				'7': 'var(--color-accent-7)',
  				'8': 'var(--color-accent-8)',
  				'9': 'var(--color-accent-9)',
  				'10': 'var(--color-accent-10)',
  				'11': 'var(--color-accent-11)',
  				'12': 'var(--color-accent-12)',
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			bg: 'var(--color-bg)',
  			fg: 'var(--color-fg)',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			sm: 'calc(var(--radius) - 4px)',
  			md: 'calc(var(--radius) - 2px)',
  			lg: 'var(--radius)',
  			xl: 'var(--radius-xl)',
  			'2xl': 'var(--radius-2xl)',
  			full: 'var(--radius-full)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
export default config
