import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Download } from 'lucide-react';
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
  const [svgContent, setSvgContent] = useState<string>('');
  const [isRendering, setIsRendering] = useState<boolean>(false);

  // 清理和修复Mermaid图表内容
  const cleanChartContent = (content: string): string => {
    if (!content) return '';
    
    // 移除可能存在的markdown代码块标记
    let cleaned = content
      .replace(/^```mermaid\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    
    // 修复常见的语法问题
    if (cleaned) {
      // 1. 在end关键字后添加换行
      cleaned = cleaned.replace(/end\s*(subgraph|graph|sequenceDiagram|classDiagram|gantt|pie|stateDiagram|erDiagram)/g, 'end\n$1');
      
      // 2. 修复缩进问题
      cleaned = cleaned.replace(/\t/g, '  ');
      
      // 3. 移除连续的空白行
      cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
      
      // 4. 确保关键字后有空格
      cleaned = cleaned.replace(/(subgraph|graph|sequenceDiagram|classDiagram|gantt|pie|stateDiagram|erDiagram|end)([^\s])/g, '$1 $2');
      
      // 5. 移除行尾空格
      cleaned = cleaned.replace(/\s+$/gm, '');
    }
    
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
        }
        return;
      }

      // 额外的有效性检查，防止无效内容导致渲染错误
      const isValidChart = () => {
        // 检查是否包含至少一个有效的Mermaid图表类型关键字
        const chartTypes = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'gantt', 'pie', 'stateDiagram', 'erDiagram', 'journey', 'mindmap', 'c4model'];
        return chartTypes.some(type => cleanedChart.includes(type));
      };
      
      if (!isValidChart()) {
        if (isMounted) {
          setIsRendering(false);
          setSvgContent('');
        }
        return;
      }

      try {
        setIsRendering(true);
        
        // 生成符合规范的唯一 ID
        const id = `mermaid-svg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // 1. 设置超时，防止渲染过程无限等待
        const renderPromise = mermaid.render(id, cleanedChart);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('图表渲染超时')), 5000);
        });
        
        // 2. 使用Promise.race处理超时情况
        const { svg } = await Promise.race([renderPromise, timeoutPromise]);
        
        // 3. 检查生成的SVG是否包含错误信息
        if (svg.includes('Syntax error') || svg.includes('Error')) {
          throw new Error('Invalid Mermaid syntax');
        }
        
        if (isMounted) {
          setSvgContent(svg);
          setIsRendering(false);
        }
      } catch (err: any) {
        // 静默处理错误，不向控制台输出信息
        if (isMounted) {
          setIsRendering(false);
          setSvgContent(''); // 清空渲染内容
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

  // 只渲染成功生成的SVG内容，不显示任何加载状态或错误信息
  return (
    <>
      {svgContent && (
        <div className="group relative my-4">
          <div 
            className={cn(
              "mermaid overflow-x-auto bg-white p-6 rounded-xl border transition-all",
              "border-zinc-200 shadow-sm"
            )}
          >
            <div 
              ref={svgRef}
              dangerouslySetInnerHTML={{ __html: svgContent }}
              className="max-w-full"
            />
          </div>

          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button 
              onClick={handleDownload}
              className="p-2 bg-white/80 backdrop-blur shadow-sm border border-zinc-200 rounded-lg text-zinc-500 hover:text-emerald-600 hover:border-emerald-200 transition-all"
              title="导出为 PNG"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Mermaid;
