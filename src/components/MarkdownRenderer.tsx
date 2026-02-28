import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Mermaid from './Mermaid';
import ErrorBoundary from './ErrorBoundary';
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
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, onDocLinkClick, onFixMermaid, className = '' }) => {
  return (
    <div className={cn("prose prose-zinc prose-base leading-relaxed max-w-none dark:prose-invert text-zinc-900 dark:text-zinc-100", className)}>
      <ErrorBoundary>
        <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            // 确保 children 是字符串
            const codeContent = String(children || '').replace(/\n$/, '');
            
            if (!inline && language === 'mermaid') {
              // 完全禁用Mermaid图表渲染，只显示代码块
              // 这是为了彻底解决无效Mermaid图表导致的SVG渲染问题
              return (
                <div className="relative group/code my-5">
                  <pre className={cn(className, "p-5 rounded-xl bg-zinc-800 text-zinc-100 overflow-x-auto dark:bg-zinc-900 border border-zinc-700")}>
                    <code className="text-sm font-mono leading-relaxed" {...props}>
                      {children}
                    </code>
                  </pre>
                  <button 
                    onClick={() => {
                      if (codeContent) {
                        navigator.clipboard.writeText(codeContent);
                      }
                    }}
                    className="absolute top-3 right-3 p-1.5 bg-zinc-700 text-zinc-300 hover:bg-zinc-600 hover:text-white rounded-lg opacity-0 group-hover/code:opacity-100 transition-all duration-200"
                    title="Copy code"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            }
            
            if (!inline) {
              return (
                <div className="relative group/code my-5">
                  <pre className={cn(className, "p-5 rounded-xl bg-zinc-800 text-zinc-100 overflow-x-auto dark:bg-zinc-900 border border-zinc-700")}>
                    <code className="text-sm font-mono leading-relaxed" {...props}>
                      {children}
                    </code>
                  </pre>
                  <button 
                    onClick={() => {
                      if (codeContent) {
                        navigator.clipboard.writeText(codeContent);
                      }
                    }}
                    className="absolute top-3 right-3 p-1.5 bg-zinc-700 text-zinc-300 hover:bg-zinc-600 hover:text-white rounded-lg opacity-0 group-hover/code:opacity-100 transition-all duration-200"
                    title="Copy code"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            }
            
            return (
              <code className={cn(className, "bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded-md text-sm font-mono dark:bg-zinc-800 dark:text-zinc-200")} {...props}>
                {children}
              </code>
            );
          },
          p({ children }) {
            // 检查 children 是否存在，避免渲染空 div
            if (!children) return null;
            return <div className="mb-4 last:mb-0 leading-relaxed text-zinc-900 dark:text-zinc-200">{children}</div>;
          },
          h1: ({ children, ...props }) => (
            <h1 className="text-2xl font-bold mb-6 mt-0 text-zinc-900 dark:text-white" {...props}>{children}</h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-xl font-semibold mb-4 mt-8 text-zinc-900 dark:text-white" {...props}>{children}</h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-lg font-semibold mb-3 mt-6 text-zinc-900 dark:text-white" {...props}>{children}</h3>
          ),
          ul: ({ children, ...props }) => (
            <ul className="mb-4 space-y-2 list-disc pl-5 text-zinc-800 dark:text-zinc-200" {...props}>{children}</ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="mb-4 space-y-2 list-decimal pl-5 text-zinc-800 dark:text-zinc-200" {...props}>{children}</ol>
          ),
          li: ({ children, ...props }) => (
            <li className="leading-relaxed" {...props}>{children}</li>
          ),
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
                  className="text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer underline decoration-emerald-500/30 underline-offset-4 dark:text-emerald-400 dark:hover:text-emerald-300"
                  {...props}
                >
                  {children}
                </a>
              );
            }
            return <a href={href} className="text-blue-600 hover:text-blue-800 font-medium underline decoration-blue-500/30 underline-offset-4 dark:text-blue-400 dark:hover:text-blue-300" {...props}>{children}</a>;
          },
          img({ node, src, alt, ...props }: any) {
            // 支持 MD 文档中的图片渲染
            return (
              <div className="my-6 flex items-center justify-center">
                <img 
                  src={src} 
                  alt={alt || ''} 
                  className="max-w-full max-h-[600px] object-contain rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm"
                  crossOrigin="anonymous" // 添加跨域支持
                  {...props}
                  onError={(e) => {
                    console.error('MD Image load error:', {
                      event: e,
                      src: src,
                      target: e.target
                    });
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `<p className="text-zinc-500 dark:text-zinc-400">Image failed to load: ${src}</p>`;
                    }
                  }}
                />
              </div>
            );
          },
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-6">
              <table className="w-full border-collapse dark:border-zinc-700" {...props}>
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th className="border border-zinc-200 px-4 py-2 text-left bg-zinc-50 font-semibold dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="border border-zinc-200 px-4 py-2 dark:border-zinc-700" {...props}>
              {children}
            </td>
          )
        }}
      >
        {content}
      </ReactMarkdown>
      </ErrorBoundary>
    </div>
  );
};

export default MarkdownRenderer;
