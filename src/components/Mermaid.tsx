import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Download, RefreshCw, AlertCircle } from 'lucide-react';

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'Inter',
});

interface MermaidProps {
  chart: string;
  onFix?: (chart: string) => void;
}

const Mermaid: React.FC<MermaidProps> = ({ chart, onFix }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    
    const renderChart = async () => {
      if (!ref.current || !chart) return;

      try {
        setError(null);
        // 显示加载状态
        ref.current.innerHTML = '<div class="flex items-center justify-center py-8 text-zinc-400 animate-pulse">Rendering diagram...</div>';
        
        // 生成符合规范的唯一 ID
        const id = `mermaid-svg-${Math.random().toString(36).substring(2, 11)}`;
        
        // 1. 语法检查
        try {
          await mermaid.parse(chart);
        } catch (parseErr: any) {
          if (isMounted) {
            setError(parseErr?.message || 'Mermaid 语法错误');
            if (ref.current) ref.current.innerHTML = '';
          }
          return;
        }

        // 2. 渲染
        const { svg: svgContent } = await mermaid.render(id, chart);
        
        if (isMounted) {
          setSvg(svgContent);
          if (ref.current) {
            ref.current.innerHTML = svgContent;
            // 确保渲染出的 SVG 宽度自适应
            const svgElement = ref.current.querySelector('svg');
            if (svgElement) {
              svgElement.style.maxWidth = '100%';
              svgElement.style.height = 'auto';
            }
          }
        }
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        if (isMounted) {
          setError(err?.message || '图表渲染失败');
          if (ref.current) ref.current.innerHTML = '';
        }
      }
    };

    renderChart();
    return () => { isMounted = false; };
  }, [chart]);

  const handleDownload = async () => {
    if (!ref.current) return;
    const svgElement = ref.current.querySelector('svg');
    if (!svgElement) {
      alert('图表尚未加载完成');
      return;
    }

    try {
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
      const viewBox = svgElement.viewBox.baseVal;
      const rect = svgElement.getBoundingClientRect();
      
      const width = viewBox.width || rect.width || 800;
      const height = viewBox.height || rect.height || 600;

      clonedSvg.setAttribute('width', (width * 2).toString());
      clonedSvg.setAttribute('height', (height * 2).toString());
      clonedSvg.style.backgroundColor = 'white';

      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = width * 2;
        canvas.height = height * 2;
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          try {
            const pngUrl = canvas.toDataURL('image/png');
            const downloadLink = document.createElement('a');
            downloadLink.href = pngUrl;
            downloadLink.download = `diagram-${Date.now()}.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
          } catch (e) {
            alert('导出 PNG 失败');
          }
        }
        URL.revokeObjectURL(img.src);
      };

      img.onerror = () => {
        alert('图片加载失败');
        URL.revokeObjectURL(img.src);
      };

      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      img.src = URL.createObjectURL(svgBlob);
    } catch (err) {
      console.error('Download error:', err);
      alert('导出失败');
    }
  };

  return (
    <div className="group relative my-4">
      <div 
        className={cn(
          "mermaid overflow-x-auto bg-white p-6 rounded-xl border transition-all",
          error ? "border-red-200 bg-red-50/30" : "border-zinc-200"
        )} 
        ref={ref}
      >
        {!error && <div className="flex items-center justify-center py-8 text-zinc-400 animate-pulse">Rendering diagram...</div>}
      </div>

      {error ? (
        <div className="mt-2 p-4 bg-red-50 border border-red-100 rounded-xl flex flex-col gap-3">
          <div className="flex items-center gap-2 text-red-600 text-sm font-semibold">
            <AlertCircle className="w-4 h-4" />
            <span>Mermaid Syntax Error</span>
          </div>
          <p className="text-xs text-red-500 font-mono bg-white/50 p-2 rounded border border-red-100 overflow-x-auto">
            {error}
          </p>
          {onFix && (
            <button 
              onClick={() => onFix(chart)}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors w-fit"
            >
              <RefreshCw className="w-3 h-3" />
              尝试自动修复
            </button>
          )}
        </div>
      ) : (
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={handleDownload}
            className="p-2 bg-white/80 backdrop-blur shadow-sm border border-zinc-200 rounded-lg text-zinc-500 hover:text-emerald-600 hover:border-emerald-200 transition-all"
            title="Export as PNG"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

// Helper for class names since we don't have it here
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export default Mermaid;
