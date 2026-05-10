'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { Schema } from 'hast-util-sanitize';
import 'highlight.js/styles/github-dark-dimmed.css';
import { CodeBlock } from '@/components/shared/code-block';

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
    h1: [...((defaultSchema.attributes as any)?.h1 ?? []), ['id']],
    h2: [...((defaultSchema.attributes as any)?.h2 ?? []), ['id']],
    h3: [...((defaultSchema.attributes as any)?.h3 ?? []), ['id']],
    h4: [...((defaultSchema.attributes as any)?.h4 ?? []), ['id']],
    h5: [...((defaultSchema.attributes as any)?.h5 ?? []), ['id']],
    h6: [...((defaultSchema.attributes as any)?.h6 ?? []), ['id']],
  },
};

export function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[
          rehypeSlug,
          rehypeHighlight,
          [rehypeSanitize, sanitizeSchema],
        ]}
        components={{
          pre: ({ children, className }) => (
            <CodeBlock className={className}>{children}</CodeBlock>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
