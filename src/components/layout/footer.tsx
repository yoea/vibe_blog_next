import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t bg-white mt-auto">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <p className="text-[10px] sm:text-[11px] text-muted-foreground">
            Copyright © {new Date().getFullYear()} Yoea 保留所有权利
          </p>
          <nav className="flex items-center gap-2 text-[10px] sm:text-[11px] text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">隐私政策</Link>
            <span className="text-muted-foreground select-none">|</span>
            <Link href="/legal" className="hover:text-foreground transition-colors">法律信息</Link>
            <span className="text-muted-foreground select-none">|</span>
            <Link href="/sitemap" className="hover:text-foreground transition-colors">网站地图</Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
