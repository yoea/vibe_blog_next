import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '法律信息 - 马克博客',
}

export default function LegalPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">法律信息</h1>
      <div className="space-y-4 text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">1. 版权声明</h2>
        <p>除特别注明外，本站所有文章均为作者原创或经授权发布。未经授权不得转载、摘编或利用其它方式使用。</p>

        <h2 className="text-lg font-semibold text-foreground">2. 免责声明</h2>
        <p>本站提供的文章内容仅供参考，不构成专业建议。作者不对因使用本站内容而导致的任何损失承担责任。部分内容可能来源于第三方，我们尽力确保其准确性，但不作任何保证。</p>

        <h2 className="text-lg font-semibold text-foreground">3. 用户评论</h2>
        <p>用户评论仅代表评论者个人观点，与本站立场无关。请勿在评论中发布违反法律法规、侵犯他人权益的内容。我们保留删除不当评论的权利。</p>

        <h2 className="text-lg font-semibold text-foreground">4. 商标声明</h2>
        <p>本站使用的品牌名称、商标和标识均归其各自所有者所有。提及这些名称仅用于说明目的，不构成任何授权或从属关系。</p>

        <h2 className="text-lg font-semibold text-foreground">5. 适用法律</h2>
        <p>本法律声明的解释、效力及纠纷的解决，适用中华人民共和国法律。如与本站有关的任何争议，请通过友好协商解决；协商不成的，可向有管辖权的人民法院提起诉讼。</p>
      </div>
    </div>
  )
}
