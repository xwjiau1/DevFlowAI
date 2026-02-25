import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Download, RefreshCw, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';

// 使用正确的cn函数
function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// 改进的mermaid初始化配置
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  themeVariables: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '14px',
    primaryColor: '#3b82f6',
    primaryTextColor: '#ffffff',
    secondaryColor: '#10b981',
    secondaryTextColor: '#ffffff',
    tertiaryColor: '#6b7280',
    tertiaryTextColor: '#ffffff',
    background: '#ffffff',
    borderColor: '#e5e7eb',
  },
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis',
  },
  sequence: {
    useMaxWidth: true,
    width: 150,
    height: 60,
  },
  gantt: {
    useMaxWidth: true,
  },
});

interface MermaidProps {
  chart: string;
  onFix?: (chart: string) => void;
}

const Mermaid: React.FC<MermaidProps> = ({ chart, onFix }) => {
  const svgRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [attempts, setAttempts] = useState<number>(0);

  // 清理无效的图表内容
  const cleanChartContent = (content: string): string => {
    if (!content) return '';
    
    // 移除可能存在的markdown代码块标记
    const cleaned = content
      .replace(/^```mermaid\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    
    return cleaned;
  };

  useEffect(() => {
    let isMounted = true;
    
    const renderChart = async () => {
      const cleanedChart = cleanChartContent(chart);
      
      if (!cleanedChart) {
        if (isMounted) {
          setIsRendering(false);
          setSvgContent('');
          setError(null);
          setAttempts(0);
        }
        return;
      }

      try {
        setIsRendering(true);
        setError(null);
        setSvgContent('');
        
        // 生成符合规范的唯一 ID
        const id = `mermaid-svg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // 1. 重置mermaid状态，防止缓存问题
        await mermaid.reset();
        
        // 2. 直接渲染，不使用parse检查（parse可能过于严格）
        const { svg, bindFunctions } = await mermaid.render(id, cleanedChart);
        
        if (isMounted) {
          setSvgContent(svg);
          setIsRendering(false);
          setAttempts(0);
          
          // 3. 绑定交互函数
          if (svgRef.current && bindFunctions) {
            bindFunctions(svgRef.current);
          }
        }
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        if (isMounted) {
          setError(err?.message || '图表渲染失败');
          setIsRendering(false);
          setSvgContent('');
          setAttempts(prev => prev + 1);
        }
      }
    };

    renderChart();
    return () => { 
      isMounted = false;
    };
  }, [chart]);

  const handleDownload = async () => {
    if (!svgContent || !svgRef.current) {
      alert('图表尚未加载完成');
      return;
    }
    
    const svgElement = svgRef.current.querySelector('svg');
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
            console.error('PNG export failed:', e);
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

  // 重试渲染功能
  const handleRetry = () => {
    setAttempts(0);
    setError(null);
  };

  return (
    <div className="group relative my-4">
      <div 
        className={cn(
          "mermaid overflow-x-auto bg-white p-6 rounded-xl border transition-all",
          error ? "border-red-200 bg-red-50/30" : "border-zinc-200 shadow-sm"
        )}
      >
        {isRendering && (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
            <div className="animate-pulse mb-4">
              <div className="w-12 h-12 border-4 border-zinc-200 border-t-4 border-emerald-500 rounded-full animate-spin" />
            </div>
            <p>渲染图表中...</p>
          </div>
        )}
        {!isRendering && svgContent && (
          <div 
            ref={svgRef}
            dangerouslySetInnerHTML={{ __html: svgContent }}
            className="max-w-full"
          />
        )}
        {!isRendering && !svgContent && !error && (
          <div className="flex items-center justify-center py-12 text-zinc-400">
            <p>图表内容为空</p>
          </div>
        )}
      </div>

      {error ? (
        <div className="mt-2 p-4 bg-red-50 border border-red-100 rounded-xl flex flex-col gap-3">
          <div className="flex items-center gap-2 text-red-600 text-sm font-semibold">
            <AlertCircle className="w-4 h-4" />
            <span>Mermaid 图表错误</span>
          </div>
          <p className="text-xs text-red-500 font-mono bg-white/50 p-2 rounded border border-red-100 overflow-x-auto max-h-20">
            {error}
          </p>
          <div className="flex gap-2">
            <button 
              onClick={handleRetry}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              重试渲染
            </button>
            {onFix && (
              <button 
                onClick={() => onFix(chart)}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                自动修复
              </button>
            )}
          </div>
        </div>
      ) : (svgContent && (
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button 
            onClick={handleDownload}
            className="p-2 bg-white/80 backdrop-blur shadow-sm border border-zinc-200 rounded-lg text-zinc-500 hover:text-emerald-600 hover:border-emerald-200 transition-all"
            title="导出为 PNG"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default Mermaid;
