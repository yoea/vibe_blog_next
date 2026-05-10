import type { Metadata } from 'next';
import { readFile } from 'fs/promises';
import path from 'path';
import ReactMarkdown from 'react-markdown';

export const revalidate = 86400;
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

export const metadata: Metadata = {
  title: '接入指南',
  openGraph: { title: '接入指南' },
  twitter: { card: 'summary_large_image', title: '接入指南' },
};

export default async function GuidePage() {
  const filePath = path.join(process.cwd(), 'public', 'llms.txt');
  const content = await readFile(filePath, 'utf-8');

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">接入指南</h1>
      <div className="markdown-body text-sm leading-relaxed space-y-4">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSanitize]}
          components={{
            h1: ({ children }) => (
              <h2 className="text-lg font-semibold mt-8 mb-3">{children}</h2>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-semibold mt-8 mb-3">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-medium mt-6 mb-2">{children}</h3>
            ),
            p: ({ children }) => (
              <p className="text-muted-foreground">{children}</p>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-3">
                <table className="w-full text-xs border">{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead>{children}</thead>,
            th: ({ children }) => (
              <th className="px-3 py-1.5 text-left font-medium bg-muted">
                {children}
              </th>
            ),
            td: ({ children }) => <td className="px-3 py-1.5">{children}</td>,
            tbody: ({ children }) => (
              <tbody className="divide-y">{children}</tbody>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                {children}
              </ol>
            ),
            li: ({ children }) => <li>{children}</li>,
            code: ({ children }) => (
              <code className="font-mono text-xs bg-muted px-1 rounded">
                {children}
              </code>
            ),
            pre: ({ children }) => (
              <pre className="font-mono text-xs bg-muted/50 rounded-md px-3 py-2 overflow-x-auto my-3">
                {children}
              </pre>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-muted-foreground/30 pl-4 text-muted-foreground italic">
                {children}
              </blockquote>
            ),
            hr: () => <hr className="my-6" />,
            a: ({ href, children }) => (
              <a
                href={href}
                className="text-primary hover:underline"
                target={href?.startsWith('http') ? '_blank' : undefined}
                rel={
                  href?.startsWith('http') ? 'noopener noreferrer' : undefined
                }
              >
                {children}
              </a>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-foreground">
                {children}
              </strong>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
