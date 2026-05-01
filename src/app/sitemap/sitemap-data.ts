import { Home, Users, FileText, PenSquare, LogIn, UserPlus, Settings, Shield, Scale, Map, Heart } from 'lucide-react'

export const categories = [
  {
    title: '内容浏览',
    items: [
      { href: '/', title: '首页', icon: Home },
      { href: '/author', title: '作者列表', icon: Users },
      { href: '/sitemap', title: '网站地图', icon: Map },
    ],
  },
  {
    title: '文章管理',
    items: [
      { href: '/profile', title: '个人中心', icon: FileText },
      { href: '/posts/new', title: '新建文章', icon: PenSquare },
    ],
  },
  {
    title: '账号',
    items: [
      { href: '/login', title: '登录', icon: LogIn },
      { href: '/register', title: '注册', icon: UserPlus },
      { href: '/settings', title: '用户设置', icon: Settings },
    ],
  },
  {
    title: '关于',
    items: [
      { href: '/about', title: '关于本站', icon: Heart },
      { href: '/privacy', title: '隐私政策', icon: Shield },
      { href: '/legal', title: '法律信息', icon: Scale },
    ],
  },
  {
    title: '支持',
    items: [
      { href: null, title: '给网站作者充电', icon: Heart },
    ],
  },
]
