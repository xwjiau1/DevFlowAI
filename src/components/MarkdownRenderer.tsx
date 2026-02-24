import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Mermaid from './Mermaid';
import { Copy } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MarkdownRendererProps {
  content: string;
  onDocLinkClick?: (docId: string) => void;
  onFixMermaid?: (chart: string) => void;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, onDocLinkClick, onFixMermaid }) => {
  return (
    <div className="prose prose-zinc max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            // 确保 children 是字符串
            const codeContent = String(children || '').replace(/\n$/, '');
            
            if (!inline && language === 'mermaid') {
              return (
                <Mermaid 
                  chart={codeContent} 
                  onFix={onFixMermaid}
                />
              );
            }
            
            if (!inline) {
              return (
                <div className="relative group/code my-4">
                  <pre className={cn(className, "p-4 rounded-xl bg-zinc-900 text-zinc-100 overflow-x-auto")}>
                    <code {...props}>
                      {children}
                    </code>
                  </pre>
                  <button 
                    onClick={() => {
                      if (codeContent) {
                        navigator.clipboard.writeText(codeContent);
                      }
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg opacity-0 group-hover/code:opacity-100 transition-all border border-zinc-700"
                    title="Copy code"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            }
            
            return (
              <code className={cn(className, "bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded-md text-sm font-mono")} {...props}>
                {children}
              </code>
            );
          },
          p({ children }) {
            // 检查 children 是否存在，避免渲染空 div
            if (!children) return null;
            return <div className="mb-4 last:mb-0">{children}</div>;
          },
          a({ node, href, children, ...props }: any) {
            if (href?.startsWith('#doc-')) {
              const docId = href.replace('#doc-', '');
              return (
                <a 
                  href={href} 
                  onClick={(e) => {
                    e.preventDefault();
                    if (onDocLinkClick) onDocLinkClick(docId);
                  }}
                  className="text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer underline decoration-emerald-500/30 underline-offset-4"
                  {...props}
                >
                  {children}
                </a>
              );
            }
            return <a href={href} {...props}>{children}</a>;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
