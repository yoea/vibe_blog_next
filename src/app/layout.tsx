import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import '@/app/globals.css'
import 'nprogress/nprogress.css'
import { Geist, Geist_Mono } from 'next/font/google'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Toaster } from 'sonner'
import { ProgressBar } from '@/components/layout/progress-bar'
import { ThemeProvider } from '@/components/layout/theme-provider'
import { CommandPalette } from '@/components/layout/command-palette'
import { LoginToast } from '@/components/auth/login-toast'
import { DeployNotifier } from '@/components/deploy-notifier'
import { createClient } from '@/lib/supabase/server'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export async function generateMetadata(): Promise<Metadata> {
  const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE ?? 'Blog'
  const siteDescription = process.env.NEXT_PUBLIC_SITE_DESCRIPTION ?? 'A blog built with Supabase and Next.js'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  return {
    title: {
      default: siteTitle,
      template: `%s - ${siteTitle}`,
    },
    description: siteDescription,
    alternates: {
      types: {
        'application/rss+xml': `${siteUrl}/rss`,
      },
    },
    icons: {
      icon: '/logo.svg',
    },
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      type: 'website',
      siteName: siteTitle,
      url: siteUrl,
      images: siteUrl ? [{ url: `${siteUrl}/og-image.jpg`, width: 1200, height: 630 }] : undefined,
    },
  }
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
  const cookieStore = await cookies()
  const resolved = cookieStore.get('themeResolved')?.value
  const initialDark = resolved === 'dark'

  const supabase = await createClient()
  const { data: configRows } = await supabase
    .from('site_config')
    .select('key, value')
    .in('key', ['maintenance_mode', 'icp_number', 'icp_visible', 'show_deploy_notify'])

  const config = Object.fromEntries((configRows ?? []).map((r) => [r.key, r.value]))
  const isMaintenance = config.maintenance_mode === 'true'
  const icpNumber = config.icp_visible === 'true' ? (config.icp_number || '') : ''

  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${geistMono.variable} antialiased${initialDark ? ' dark' : ''}`} suppressHydrationWarning>
      <body className="flex flex-col bg-background min-h-screen" suppressHydrationWarning>
        <ThemeProvider>
          <ProgressBar />
          <CommandPalette />
          <Header siteTitle={siteTitle} isMaintenance={isMaintenance} />
          <LoginToast />
          <DeployNotifier enabled={config.show_deploy_notify === 'true'} />
          <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 flex flex-col">{children}</main>
          <Footer isMaintenance={isMaintenance} icpNumber={icpNumber} />
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  )
}
