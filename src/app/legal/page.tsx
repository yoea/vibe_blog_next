import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '法律信息',
  openGraph: { title: '法律信息' },
  twitter: { card: 'summary_large_image', title: '法律信息' },
};

export default function LegalPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8">
      <h1 className="text-3xl font-bold">法律信息</h1>
      <p className="text-sm text-muted-foreground">
        最后更新：2026 年 4 月 26 日
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">一、服务说明</h2>
        <p className="text-sm leading-relaxed">
          本网站是一个多人博客平台，用户可注册账号后发布文章、发表评论、参与互动。
          使用本网站即表示您同意以下条款。如您不同意，请停止使用本网站。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">二、用户责任</h2>
        <p className="text-sm leading-relaxed">使用本网站时，您同意：</p>
        <ul className="list-disc pl-6 space-y-1.5 text-sm leading-relaxed">
          <li>提供的注册信息真实有效</li>
          <li>妥善保管账号密码，因账号泄露造成的损失由用户自行承担</li>
          <li>不对网站进行恶意攻击、渗透测试或破坏网站正常运行</li>
          <li>不利用网站传播恶意软件、病毒或其他有害代码</li>
          <li>不利用网站从事任何违法活动</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">三、内容规范</h2>
        <p className="text-sm leading-relaxed">
          用户发布的内容（包括但不限于文章、评论、留言）不得包含：
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-sm leading-relaxed">
          <li>违反中华人民共和国法律法规的内容</li>
          <li>色情、暴力、赌博、毒品等违法违规信息</li>
          <li>诽谤、辱骂、骚扰他人或侵犯他人合法权益的内容</li>
          <li>垃圾广告、营销推广信息</li>
          <li>侵犯他人知识产权的内容</li>
        </ul>
        <p className="text-sm leading-relaxed">
          我们保留在不事先通知的情况下删除违规内容的权利。情节严重的，我们有权封禁相关账号。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">四、知识产权</h2>
        <p className="text-sm leading-relaxed">
          用户发布的文章和评论，其知识产权归用户本人所有。用户授予本网站在平台上展示、
          传播这些内容的许可。未经原作者许可，不得转载或商用。
        </p>
        <p className="text-sm leading-relaxed">
          本网站使用的开源组件和第三方库均遵循其各自的许可证条款。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">五、免责声明</h2>
        <ul className="list-disc pl-6 space-y-1.5 text-sm leading-relaxed">
          <li>
            本网站按&ldquo;现状&rdquo;提供服务，不保证服务不会中断或没有错误
          </li>
          <li>用户发布的内容仅代表其个人观点，不代表本网站立场</li>
          <li>
            因不可抗力（包括但不限于服务器故障、网络中断、自然灾害等）导致的服务中断，本网站不承担责任
          </li>
          <li>本网站有权在必要时修改或暂停服务，恕不另行通知</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">六、账号注销</h2>
        <p className="text-sm leading-relaxed">
          用户可在设置页面自助注销账号。注销后，您的邮箱和昵称等个人信息将被移除或匿名化，
          但您之前发布的文章和评论将保留（作者信息显示为&ldquo;已注销用户&rdquo;），
          以保持网站内容的完整性和对话的连贯性。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">七、争议解决</h2>
        <p className="text-sm leading-relaxed">
          本条款适用中华人民共和国法律。如发生争议，双方应首先友好协商解决；
          协商不成的，可向有管辖权的人民法院提起诉讼。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">八、联系方式</h2>
        <p className="text-sm leading-relaxed">
          如有疑问或需联系网站运营者，请通过{' '}
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
