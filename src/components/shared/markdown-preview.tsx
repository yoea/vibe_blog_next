'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import type { Schema } from 'hast-util-sanitize'
import 'highlight.js/styles/github-dark-dimmed.css'
import { CodeBlock } from '@/components/shared/code-block'

// Allow highlight.js generated className attributes on <span> and <code>
const sanitizeSchema: Schema = {
  ...defaultSchema,
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    span: [
      ...((defaultSchema.attributes as any)?.span ?? []),
      ['className', /^hljs-/],
    ],
    code: [
      ...((defaultSchema.attributes as any)?.code ?? []),
      ['className', /^hljs-/],
    ],
  },
}

export function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeHighlight, [rehypeSanitize, sanitizeSchema]]}
        components={{
          pre: ({ children, className }) => (
            <CodeBlock className={className}>{children}</CodeBlock>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
