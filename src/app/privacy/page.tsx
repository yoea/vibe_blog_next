import type { Metadata } from 'next';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: '隐私政策',
  openGraph: { title: '隐私政策' },
  twitter: { card: 'summary_large_image', title: '隐私政策' },
};

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8">
      <h1 className="text-3xl font-bold">隐私政策</h1>
      <p className="text-sm text-muted-foreground">
        最后更新：2026 年 4 月 26 日
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">一、我们收集的信息</h2>
        <p>为提供正常的博客服务，我们会收集以下必要信息：</p>
        <ul className="list-disc pl-6 space-y-1.5 text-sm leading-relaxed">
          <li>
            <strong>注册信息</strong>
            ：注册时您提供的邮箱地址，用于账号登录和身份验证。
          </li>
          <li>
            <strong>个人资料</strong>
            ：您可自愿设置昵称和头像，这些信息会在您发布的文章、评论中公开展示。
          </li>
          <li>
            <strong>发布内容</strong>
            ：您撰写的文章、评论、留言板消息，以及点赞记录。
          </li>
          <li>
            <strong>技术信息</strong>：访问时自动记录的 IP
            地址和访问时间，用于网站访问统计和防刷机制。
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">二、信息的使用</h2>
        <p className="text-sm leading-relaxed">收集的信息仅用于以下目的：</p>
        <ul className="list-disc pl-6 space-y-1.5 text-sm leading-relaxed">
          <li>提供账号注册、登录和身份验证</li>
          <li>展示文章作者信息和用户互动（评论、留言）</li>
          <li>统计网站访问量和文章热度</li>
          <li>防止刷赞等滥用行为</li>
          <li>优化网站性能与用户体验</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">三、信息的存储</h2>
        <p className="text-sm leading-relaxed">
          您的数据存储于 Supabase（PostgreSQL 数据库）和 Supabase
          Storage（头像文件），服务器位于美国。我们采取合理的技术措施保护您的数据安全，包括但不限于：
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-sm leading-relaxed">
          <li>传输加密（HTTPS）</li>
          <li>数据库行级安全策略（RLS），确保用户只能访问自己有权限的数据</li>
          <li>密码采用 Supabase Auth 内置的安全哈希机制</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">四、第三方服务</h2>
        <p className="text-sm leading-relaxed">本网站使用了以下第三方服务：</p>
        <ul className="list-disc pl-6 space-y-1.5 text-sm leading-relaxed">
          <li>
            <strong>Supabase</strong> —
            身份认证、数据库和文件存储，其隐私政策详见{' '}
            <a
              href="https://supabase.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              supabase.com/privacy
            </a>
          </li>
          <li>
            <strong>DeepSeek</strong> —
            可选的文章摘要生成功能，仅在您点击生成时发送文章内容至 DeepSeek
            API，其隐私政策详见{' '}
            <a
              href="https://cdn.deepseek.com/policies/zh-CN/deepseek-privacy-policy.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              deepseek.com/privacy
            </a>
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">五、Cookie 的使用</h2>
        <p className="text-sm leading-relaxed">本网站使用以下 Cookie：</p>
        <ul className="list-disc pl-6 space-y-1.5 text-sm leading-relaxed">
          <li>
            <strong>认证 Cookie</strong>：由 Supabase Auth
            设置，用于维持登录状态
          </li>
          <li>
            <strong>主题偏好</strong>：记录您选择的浅色/深色/跟随系统主题
          </li>
        </ul>
        <p className="text-sm leading-relaxed">
          您可以在浏览器设置中管理或清除 Cookie。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">六、您的权利</h2>
        <p className="text-sm leading-relaxed">您对自己的数据拥有以下权利：</p>
        <ul className="list-disc pl-6 space-y-1.5 text-sm leading-relaxed">
          <li>
            <strong>查看</strong>：在设置页面查看您的账号信息
          </li>
          <li>
            <strong>修改</strong>：随时修改您的昵称、头像
          </li>
          <li>
            <strong>删除</strong>
            ：可注销账号，注销后您的文章和评论将被匿名化处理
          </li>
          <li>
            <strong>导出</strong>
            ：如需导出您的数据，请通过下方联系方式与我们联系
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">七、政策更新</h2>
        <p className="text-sm leading-relaxed">
          本隐私政策可能不时更新。重大变更时，我们会在网站显著位置发布通知。继续使用本网站即表示您同意更新后的政策。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">八、联系方式</h2>
        <p className="text-sm leading-relaxed">
          如对隐私政策有任何疑问，请通过{' '}
          <a
            href="https://github.com/yoea"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            GitHub
          </a>{' '}
          与我们联系。
        </p>
      </section>
    </div>
  );
}
