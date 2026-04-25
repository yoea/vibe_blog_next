import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '隐私政策 - 马克博客',
}

export default function PrivacyPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">隐私政策</h1>
      <p className="text-sm text-muted-foreground">最后更新日期：2026 年 4 月 25 日</p>
      <div className="space-y-4 text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">1. 我们收集的信息</h2>
        <p>在使用本站服务时，我们可能收集以下信息：</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>注册时提供的邮箱地址</li>
          <li>浏览器类型和设备信息</li>
          <li>文章内容和评论数据</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground">2. 信息的使用方式</h2>
        <p>我们使用收集的信息来：</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>提供、维护和改进博客服务</li>
          <li>处理用户注册和身份验证</li>
          <li>显示文章作者和评论者信息</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground">3. 信息保护</h2>
        <p>我们采取合理的安全措施保护您的个人信息不被未授权访问或泄露。所有数据传输均通过 HTTPS 加密。</p>

        <h2 className="text-lg font-semibold text-foreground">4. 第三方服务</h2>
        <p>本站使用 Supabase 作为后端服务提供者，其隐私政策请参阅 <a href="https://supabase.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Supabase 隐私政策</a>。</p>

        <h2 className="text-lg font-semibold text-foreground">5. 您的权利</h2>
        <p>您有权访问、更正和删除存储在系统中的个人信息。如需行使这些权利，请通过邮箱联系我们。</p>

        <h2 className="text-lg font-semibold text-foreground">6. 政策变更</h2>
        <p>我们可能会不时更新本隐私政策，变更后的内容将在页面上公布。请定期查看本页面以了解最新信息。</p>
      </div>
    </div>
  )
}
