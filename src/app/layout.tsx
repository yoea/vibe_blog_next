import type { Metadata, Viewport } from 'next'
import '@/app/globals.css'
import { Geist, Geist_Mono } from 'next/font/google'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Toaster } from 'sonner'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Blog - Supabase + Next.js',
  description: 'A blog built with Supabase and Next.js',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE ?? 'Blog'

  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="flex flex-col bg-gray-50">
        <Header siteTitle={siteTitle} />
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">{children}</main>
        <Footer />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
