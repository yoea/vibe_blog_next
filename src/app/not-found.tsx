import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <svg
        viewBox="0 0 240 160"
        className="h-40 w-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Ground */}
        <ellipse cx="120" cy="140" rx="80" ry="6" fill="#e5e7eb" />
        {/* Cat body */}
        <ellipse cx="120" cy="100" rx="40" ry="30" fill="#fbbf24" />
        {/* Cat head */}
        <circle cx="120" cy="60" r="28" fill="#fbbf24" />
        {/* Ears */}
        <polygon points="96,42 90,18 108,36" fill="#fbbf24" />
        <polygon points="144,42 150,18 132,36" fill="#fbbf24" />
        {/* Inner ears */}
        <polygon points="97,40 93,22 107,37" fill="#fca5a5" />
        <polygon points="143,40 147,22 133,37" fill="#fca5a5" />
        {/* Eyes - closed, sleepy */}
        <path
          d="M106 58 Q110 62 114 58"
          stroke="#78716c"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M126 58 Q130 62 134 58"
          stroke="#78716c"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Nose */}
        <ellipse cx="120" cy="64" rx="2" ry="1.5" fill="#fca5a5" />
        {/* Mouth */}
        <path
          d="M117 66 Q120 70 123 66"
          stroke="#78716c"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Whiskers */}
        <line
          x1="88"
          y1="60"
          x2="102"
          y2="62"
          stroke="#d6d3d1"
          strokeWidth="1"
        />
        <line
          x1="88"
          y1="66"
          x2="102"
          y2="66"
          stroke="#d6d3d1"
          strokeWidth="1"
        />
        <line
          x1="138"
          y1="62"
          x2="152"
          y2="60"
          stroke="#d6d3d1"
          strokeWidth="1"
        />
        <line
          x1="138"
          y1="66"
          x2="152"
          y2="66"
          stroke="#d6d3d1"
          strokeWidth="1"
        />
        {/* Tail */}
        <path
          d="M160 100 Q180 80 175 60"
          stroke="#fbbf24"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Paws */}
        <ellipse cx="100" cy="128" rx="10" ry="5" fill="#fbbf24" />
        <ellipse cx="140" cy="128" rx="10" ry="5" fill="#fbbf24" />
        {/* "404" on cat belly */}
        <text
          x="120"
          y="106"
          textAnchor="middle"
          fontSize="16"
          fontWeight="700"
          fill="#92400e"
          fontFamily="sans-serif"
        >
          404
        </text>
      </svg>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">页面走丢了</h1>
        <p className="text-muted-foreground max-w-sm">
          哎呀，这只小猫咪找不到你要的页面了呢~ 抱歉哦！
          <br />
        </p>
      </div>

      <Link
        href="/"
        className="inline-flex items-center justify-center h-8 px-4 text-sm font-medium rounded-md border border-transparent bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
      >
        返回首页
      </Link>
    </div>
  );
}
