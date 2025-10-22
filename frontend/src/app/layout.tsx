import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://rentalai.ai'),
  title: 'RentalAi - AI-Powered Property Management',
  description: 'Automate your property management workflow with intelligent AI tools. Save time, reduce errors, and scale your business effortlessly.',
  keywords: 'property management, rental management, AI automation, tenant portal, lease management',
  
  // Open Graph (Facebook, LinkedIn, etc.)
  openGraph: {
    title: 'RentalAi - AI-Powered Property Management',
    description: 'Automate your property management workflow with intelligent AI tools. Save time, reduce errors, and scale your business effortlessly.',
    url: 'https://rentalai.ai',
    siteName: 'RentalAi',
    images: [
      {
        url: 'https://rentalai.ai/og-image.png',
        width: 1200,
        height: 630,
        alt: 'RentalAi Dashboard Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  
  // Twitter
  twitter: {
    card: 'summary_large_image',
    title: 'RentalAi - AI-Powered Property Management',
    description: 'Automate your property management workflow with intelligent AI tools. Save time, reduce errors, and scale your business effortlessly.',
    images: ['https://rentalai.ai/og-image.png'],
    creator: '@rentalai',
  },
  
  // Additional meta tags
  robots: {
    index: true,
    follow: true,
  },
  
  // Favicon
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
