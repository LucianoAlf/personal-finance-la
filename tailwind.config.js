/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	content: [
		'./pages/**/*.{ts,tsx}',
		'./components/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./src/**/*.{ts,tsx}',
	],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			},
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					50: '#f5f3ff',
					100: '#ede9fe',
					500: '#8b5cf6',
					600: '#7c3aed',
					700: '#6d28d9',
					DEFAULT: '#8b5cf6',
					foreground: '#ffffff',
				},
				success: {
					500: '#10b981',
					600: '#059669',
					DEFAULT: '#10b981',
					foreground: '#ffffff',
				},
				danger: {
					500: '#ef4444',
					600: '#dc2626',
					DEFAULT: '#ef4444',
					foreground: '#ffffff',
				},
				warning: {
					500: '#f59e0b',
					600: '#d97706',
					DEFAULT: '#f59e0b',
					foreground: '#ffffff',
				},
				info: {
					500: '#3b82f6',
					600: '#2563eb',
					DEFAULT: '#3b82f6',
					foreground: '#ffffff',
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))',
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))',
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
				},
			},
			borderRadius: {
				lg: '12px',
				md: '8px',
				sm: '4px',
			},
			fontFamily: {
				sans: ['Inter', 'sans-serif'],
			},
			keyframes: {
				'accordion-down': {
					from: { height: 0 },
					to: { height: 'var(--radix-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: 0 },
				},
				fadeIn: {
					from: { opacity: 0, transform: 'translateY(30px)' },
					to: { opacity: 1, transform: 'translateY(0)' },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fadeIn 0.5s ease-out',
			},
		},
	},
	plugins: [require('tailwindcss-animate')],
}