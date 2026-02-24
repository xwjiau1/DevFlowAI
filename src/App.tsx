import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Layout, 
  FileText, 
  CheckSquare, 
  ChevronRight, 
  Send, 
  Bot, 
  User, 
  Folder as FolderIcon,
  Settings,
  History,
  BookOpen,
  ClipboardList,
  GitBranch,
  Calendar,
  Box,
  FileCode,
  RefreshCw,
  Search,
  MoreVertical,
  Trash2,
  FolderPlus,
  Eye,
  FileJson,
  FileSpreadsheet,
  FileVideo,
  Image as ImageIcon,
  File as FileIcon,
  X,
  BarChart3,
  Database,
  Activity,
  Zap,
  Maximize2,
  Copy,
  Check,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  Cell
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Project, Message, Task, Document, Review, AIModel, Folder } from './types';
import MarkdownRenderer from './components/MarkdownRenderer';
import { chatWithAI, SYSTEM_INSTRUCTION } from './services/geminiService';
import mammoth from 'mammoth';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STEPS = [
  { id: 1, title: '需求确认', icon: MessageSquare, description: '初步沟通，留存会议纪要和录屏' },
  { id: 2, title: 'AW 任务项', icon: ClipboardList, description: '填写任务项' },
  { id: 3, title: '整体流程图', icon: GitBranch, description: '基于方案整理流程图' },
  { id: 4, title: '开发方案', icon: Calendar, description: '制定开发方案与计划' },
  { id: 5, title: '原型开发', icon: Box, description: '需求原型开发' },
  { id: 6, title: '过程进度', icon: RefreshCw, description: '整理开发过程进度文档' },
  { id: 7, title: '文档输出', icon: FileCode, description: '接口文档、上线方案等' },
];

const FileIconForType = ({ type }: { type: string }) => {
  if (type.includes('image')) return <ImageIcon className="w-5 h-5" />;
  if (type.includes('video')) return <FileVideo className="w-5 h-5" />;
  if (type.includes('pdf')) return <FileText className="w-5 h-5" />;
  if (type.includes('json')) return <FileJson className="w-5 h-5" />;
  if (type.includes('spreadsheet') || type.includes('excel')) return <FileSpreadsheet className="w-5 h-5" />;
  if (type.includes('markdown') || type.includes('text')) return <FileText className="w-5 h-5" />;
  return <FileIcon className="w-5 h-5" />;
};

const DocPreview = ({ doc }: { doc: Document }) => {
  const isImage = doc.type.startsWith('image/');
  const isVideo = doc.type.startsWith('video/');
  const isPDF = doc.type.includes('pdf');
  const isWord = doc.type.includes('word') || doc.type.includes('officedocument.wordprocessingml.document') || doc.title.endsWith('.docx');
  const isText = doc.type.startsWith('text/') || doc.type.includes('json') || doc.title.endsWith('.md');

  if (isImage) {
    return <img src={doc.content} alt={doc.title} className="max-w-full h-auto rounded-xl mx-auto" />;
  }

  if (isVideo) {
    return <video src={doc.content} controls className="max-w-full h-auto rounded-xl mx-auto" />;
  }

  if (isPDF) {
    return (
      <div className="w-full h-full min-h-[600px] flex flex-col">
        <iframe src={doc.content} className="flex-1 w-full rounded-xl border-none" />
      </div>
    );
  }

  if (isWord && doc.extracted_text) {
    return (
      <div className="bg-white p-8 rounded-xl border border-zinc-200 shadow-sm max-w-4xl mx-auto">
        <div className="prose prose-zinc max-w-none">
          <div className="whitespace-pre-wrap font-sans text-zinc-800 leading-relaxed">
            {doc.extracted_text}
          </div>
        </div>
      </div>
    );
  }

  if (isText) {
    return (
      <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
        <MarkdownRenderer content={doc.content} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-zinc-200">
      <FileIcon className="w-16 h-16 text-zinc-300 mb-4" />
      <p className="text-zinc-500 mb-4">Preview not available for this file type.</p>
      <a 
        href={doc.content} 
        download={doc.title}
        className="px-6 py-2 bg-zinc-900 text-white rounded-lg font-semibold hover:bg-zinc-800 transition-all"
      >
        Download File
      </a>
    </div>
  );
};

const DocumentCard = ({ doc, onPreview, onDelete }: { doc: Document, onPreview: () => void, onDelete: () => void }) => (
  <div className="bg-white p-4 rounded-2xl border border-zinc-200 hover:border-emerald-500 transition-all flex items-center justify-between group">
    <div className="flex items-center gap-4 flex-1 min-w-0" onClick={onPreview}>
      <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors shrink-0">
        <FileIconForType type={doc.type} />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="font-bold truncate">{doc.title}</h4>
        <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
          <span className="uppercase font-mono">{doc.type.split('/')[1] || doc.type}</span>
          <span>•</span>
          <span>{new Date(doc.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
      <button 
        onClick={(e) => { e.stopPropagation(); onPreview(); }}
        className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-emerald-500 transition-colors"
        title="Preview"
      >
        <Eye className="w-4 h-4" />
      </button>
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-red-500 transition-colors"
        title="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  </div>
);

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [activeModel, setActiveModel] = useState<AIModel | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard' | 'docs' | 'usage'>('chat');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newReviewContent, setNewReviewContent] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [newModelDisplayName, setNewModelDisplayName] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newModelBaseUrl, setNewModelBaseUrl] = useState('');
  const [newModelApiKey, setNewModelApiKey] = useState('');

  const [isStreaming, setIsStreaming] = useState(() => {
    const saved = localStorage.getItem('isStreaming');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('isStreaming', JSON.stringify(isStreaming));
  }, [isStreaming]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const [uploadingStep, setUploadingStep] = useState<number | null>(null);

  useEffect(() => {
    checkBackend();
    fetchProjects();
    fetchModels();
  }, []);

  const checkBackend = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ok') {
          setBackendStatus('ok');
          return;
        }
      }
      setBackendStatus('error');
    } catch (e) {
      console.error("Backend health check failed", e);
      setBackendStatus('error');
    }
  };

  useEffect(() => {
    if (activeProject) {
      fetchProjectData(activeProject.id);
      if (activeTab === 'chat') {
        setTimeout(() => chatInputRef.current?.focus(), 100);
      }
    }
  }, [activeProject, activeTab]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/models');
      if (res.ok) {
        const data = await res.json();
        setModels(data);
        const active = data.find((m: AIModel) => m.is_active === 1);
        if (active) setActiveModel(active);
      }
    } catch (e) {
      console.error("Failed to fetch models", e);
    }
  };

  const activateModel = async (modelId: string) => {
    try {
      await fetch(`/api/models/${modelId}/activate`, { method: 'PATCH' });
      fetchModels();
    } catch (e) {
      console.error("Failed to activate model", e);
    }
  };

  const handleSaveModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelDisplayName.trim() || !newModelName.trim() || !newModelApiKey.trim()) return;

    const payload = {
      display_name: newModelDisplayName,
      model_name: newModelName,
      base_url: newModelBaseUrl || 'https://api.openai.com/v1',
      api_key: newModelApiKey
    };

    try {
      if (editingModelId) {
        await fetch(`/api/models/${editingModelId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        const id = Math.random().toString(36).substring(7);
        await fetch('/api/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...payload })
        });
      }
      setNewModelDisplayName('');
      setNewModelName('');
      setNewModelBaseUrl('');
      setNewModelApiKey('');
      setEditingModelId(null);
      setIsAddingModel(false);
      fetchModels();
    } catch (e) {
      console.error("Failed to save model", e);
    }
  };

  const startEditingModel = (model: AIModel) => {
    setEditingModelId(model.id);
    setNewModelDisplayName(model.display_name);
    setNewModelName(model.model_name);
    setNewModelBaseUrl(model.base_url);
    setNewModelApiKey(model.api_key);
    setIsAddingModel(true);
  };

  const removeModel = async (modelId: string) => {
    if (modelId === 'default-gemini') {
      alert('Cannot delete default model');
      return;
    }
    try {
      await fetch(`/api/models/${modelId}`, { method: 'DELETE' });
      fetchModels();
    } catch (e) {
      console.error("Failed to remove model", e);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setProjects(data);
      
      // If active project was deleted or none selected, pick the first one
      if (data.length > 0) {
        if (!activeProject || !data.find((p: Project) => p.id === activeProject.id)) {
          setActiveProject(data[0]);
        }
      } else {
        setActiveProject(null);
      }
    } catch (e) {
      console.error("Failed to fetch projects", e);
    }
  };

  const fetchProjectData = async (projectId: string) => {
    try {
      const [msgRes, taskRes, docRes, reviewRes, folderRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/messages`),
        fetch(`/api/projects/${projectId}/tasks`),
        fetch(`/api/projects/${projectId}/documents`),
        fetch(`/api/projects/${projectId}/reviews`),
        fetch(`/api/projects/${projectId}/folders`),
      ]);
      
      if (!msgRes.ok || !taskRes.ok || !docRes.ok || !reviewRes.ok || !folderRes.ok) {
        console.error("Failed to fetch project data: one or more requests failed");
        return;
      }

      const [msgs, tks, dcs, rvs, flds] = await Promise.all([
        msgRes.json(),
        taskRes.json(),
        docRes.json(),
        reviewRes.json(),
        folderRes.json()
      ]);

      setMessages(msgs);
      setTasks(tks);
      setDocuments(dcs);
      setReviews(rvs);
      setFolders(flds);
    } catch (e) {
      console.error("Failed to fetch project data", e);
    }
  };

  const handleToggleStepStatus = async (stepId: number) => {
    if (!activeProject) return;
    
    const existingTask = tasks.find(t => t.step_number === stepId);
    
    if (!existingTask) {
      // Create new task (Start Step)
      const newTask: Task = {
        id: Math.random().toString(36).substring(7),
        project_id: activeProject.id,
        title: STEPS.find(s => s.id === stepId)?.title || `Step ${stepId}`,
        status: 'doing',
        step_number: stepId,
        created_at: new Date().toISOString()
      };
      
      await fetch(`/api/projects/${activeProject.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
    } else {
      // Toggle status
      const nextStatus = existingTask.status === 'doing' ? 'done' : 'doing';
      await fetch(`/api/projects/${activeProject.id}/tasks/${existingTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
    }
    
    fetchProjectData(activeProject.id);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, stepNumber?: number, folderId?: string) => {
    const file = e.target.files?.[0];
    if (!file || !activeProject) return;

    const isWord = file.type.includes('word') || file.type.includes('officedocument.wordprocessingml.document') || file.name.endsWith('.docx');
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      let extractedText = '';

      if (isWord) {
        try {
          // mammoth needs arrayBuffer
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          extractedText = result.value;
        } catch (err) {
          console.error("Mammoth extraction failed:", err);
        }
      }

      const docId = Math.random().toString(36).substring(7);
      const newDoc = {
        id: docId,
        project_id: activeProject.id,
        title: file.name,
        content: isWord ? content : content, // content is dataURL for binary
        extracted_text: extractedText,
        type: file.type || (isWord ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/octet-stream'),
        step_number: stepNumber || null,
        folder_id: folderId || null
      };

      await fetch(`/api/projects/${activeProject.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDoc)
      });

      fetchProjectData(activeProject.id);
      setUploadingStep(null);
    };

    if (file.type.startsWith('text/') || file.type === 'application/json' || file.name.endsWith('.md')) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  };

  const createFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !activeProject) return;

    const folderId = Math.random().toString(36).substring(7);
    await fetch(`/api/projects/${activeProject.id}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: folderId, name: newFolderName })
    });

    setNewFolderName('');
    setIsCreatingFolder(false);
    fetchProjectData(activeProject.id);
  };

  const deleteFolder = async (folderId: string) => {
    if (!activeProject) return;
    if (!confirm('Are you sure you want to delete this folder? Documents will be uncategorized.')) return;
    await fetch(`/api/projects/${activeProject.id}/folders/${folderId}`, {
      method: 'DELETE'
    });
    fetchProjectData(activeProject.id);
  };

  const deleteDocument = async (docId: string) => {
    if (!activeProject) return;
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/documents/${docId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchProjectData(activeProject.id);
        if (selectedDoc?.id === docId) setSelectedDoc(null);
      }
    } catch (e) {
      console.error("Failed to delete document", e);
    }
  };

  const handleUpdateReview = async (reviewId: string, status?: string, remark?: string) => {
    if (!activeProject) return;
    try {
      await fetch(`/api/projects/${activeProject.id}/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, remark })
      });
      fetchProjectData(activeProject.id);
    } catch (e) {
      console.error("Failed to update review", e);
    }
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newReviewContent.trim()) return;

    const reviewId = Math.random().toString(36).substring(7);
    await fetch(`/api/projects/${activeProject.id}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reviewId, content: newReviewContent })
    });

    setNewReviewContent('');
    setIsReviewModalOpen(false);
    fetchProjectData(activeProject.id);
  };

  const deleteProject = async (projectId: string) => {
    try {
      await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      fetchProjects();
    } catch (e) {
      console.error("Failed to delete project", e);
    }
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    
    const id = Math.random().toString(36).substring(7);
    const newProject = { id, name: newProjectName, description: '', created_at: new Date().toISOString() };
    
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProject),
    });
    
    setNewProjectName('');
    setIsCreatingProject(false);
    fetchProjects();
    setActiveProject(newProject);
  };

  const handleCompressContext = async () => {
    console.log("handleCompressContext triggered", { activeProject, messageCount: messages.length });
    if (!activeProject) {
      alert("Please select a project first.");
      return;
    }
    if (messages.length === 0) {
      alert("No messages to compress.");
      return;
    }
    
    if (!confirm('确定要压缩对话上下文吗？这将会总结之前的对话并删除旧消息以节省空间。')) return;

    setIsLoading(true);
    try {
      const summaryPrompt = "请总结上述所有对话内容。捕捉主要目标、已做出的决定以及项目的当前状态。要求简洁但全面。";
      
      console.log("Requesting summary from AI...");
      const aiResponse = await chatWithAI(
        activeProject.id, 
        [...messages, { role: 'user', content: summaryPrompt }],
        { 
          modelName: activeModel?.model_name || 'gemini-3.1-pro-preview', 
          apiKey: activeModel?.api_key || '',
          baseUrl: activeModel?.base_url || 'https://generativelanguage.googleapis.com/v1beta/openai/'
        },
        [],
        false
      );

      const summaryContent = typeof aiResponse === 'string' ? aiResponse : aiResponse.text;
      console.log("Summary received, updating database...");
      
      // Delete all old messages
      await fetch(`/api/projects/${activeProject.id}/messages`, { method: 'DELETE' });
      
      // Create new summary message
      const summaryMsg: Message = {
        id: Math.random().toString(36).substring(7),
        project_id: activeProject.id,
        role: 'assistant',
        content: `**[上下文已压缩]**\n\n${summaryContent}`,
        prompt_tokens: typeof aiResponse === 'string' ? 0 : aiResponse.usage.promptTokens,
        completion_tokens: typeof aiResponse === 'string' ? 0 : aiResponse.usage.completionTokens,
        created_at: new Date().toISOString(),
      };

      await fetch(`/api/projects/${activeProject.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(summaryMsg),
      });

      setMessages([summaryMsg]);
      setIsSettingsOpen(false);
      console.log("Context compression successful");
    } catch (error) {
      console.error("Failed to compress context:", error);
      alert("压缩上下文失败: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearContext = async () => {
    if (!activeProject) return;
    if (!confirm('Are you sure you want to clear the chat context for this project?')) return;

    try {
      await fetch(`/api/projects/${activeProject.id}/messages`, { method: 'DELETE' });
      setMessages([]);
    } catch (error) {
      console.error("Failed to clear context:", error);
      alert("Failed to clear context");
    }
  };

  const handleExportData = async () => {
    try {
      const res = await fetch('/api/backup/export');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `devflow-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("导出失败");
    }
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('导入备份将合并现有数据（相同 ID 的记录将被覆盖）。确定要继续吗？')) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const res = await fetch('/api/backup/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (res.ok) {
          alert("导入成功！正在刷新页面...");
          window.location.reload();
        } else {
          alert("导入失败");
        }
      } catch (error) {
        console.error("Import failed:", error);
        alert("无效的备份文件");
      }
    };
    reader.readAsText(file);
  };

  const handleFixMermaid = (chart: string) => {
    setInput(`你刚才生成的 Mermaid 图表存在语法错误。请修复它并重新生成。错误图表内容如下：\n\n\`\`\`mermaid\n${chart}\n\`\`\``);
    if (chatInputRef.current) {
      chatInputRef.current.focus();
    }
  };

  const handleCopyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeProject || isLoading) return;

    const userMsg: Message = {
      id: Math.random().toString(36).substring(7),
      project_id: activeProject.id,
      role: 'user',
      content: input,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      await fetch(`/api/projects/${activeProject.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userMsg),
      });

      const aiResponse = await chatWithAI(
        activeProject.id, 
        [...messages, userMsg],
        { 
          modelName: activeModel?.model_name || 'gpt-4o', 
          apiKey: activeModel?.api_key || '',
          baseUrl: activeModel?.base_url || 'https://api.openai.com/v1'
        },
        documents,
        isStreaming,
        (chunk) => {
          setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg.role === 'assistant') {
              return [...prev.slice(0, -1), { ...lastMsg, content: lastMsg.content + chunk }];
            } else {
              return [...prev, {
                id: Math.random().toString(36).substring(7),
                project_id: activeProject.id,
                role: 'assistant',
                content: chunk,
                created_at: new Date().toISOString()
              }];
            }
          });
        }
      );
      
      const aiMsg: Message = {
        id: Math.random().toString(36).substring(7),
        project_id: activeProject.id,
        role: 'assistant',
        content: typeof aiResponse === 'string' ? aiResponse : aiResponse.text,
        prompt_tokens: typeof aiResponse === 'string' ? 0 : aiResponse.usage.promptTokens,
        completion_tokens: typeof aiResponse === 'string' ? 0 : aiResponse.usage.completionTokens,
        created_at: new Date().toISOString(),
      };

      if (!isStreaming) {
        setMessages(prev => [...prev, aiMsg]);
      } else {
        // Update the last message with token counts
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg.role === 'assistant') {
            return [...prev.slice(0, -1), { ...lastMsg, prompt_tokens: aiMsg.prompt_tokens, completion_tokens: aiMsg.completion_tokens }];
          }
          return prev;
        });
      }

      await fetch(`/api/projects/${activeProject.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiMsg),
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#F9F9F8] text-zinc-900 font-sans overflow-hidden">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={(e) => handleFileUpload(e, uploadingStep || undefined)} 
      />

      {/* Modals */}
      <AnimatePresence mode="wait">
        {isCreatingProject && (
          <div key="modal-create-project" className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-6">Create New Project</h2>
              <form onSubmit={createProject} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Project Name</label>
                  <input 
                    autoFocus
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full bg-zinc-100 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Enter project name..."
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsCreatingProject(false)}
                    className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-semibold hover:bg-zinc-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={!newProjectName.trim()}
                    className="flex-1 py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 disabled:opacity-50 transition-all"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isReviewModalOpen && (
          <div key="modal-daily-review" className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-6">Daily Review</h2>
              <form onSubmit={handleCreateReview} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Content</label>
                  <textarea 
                    autoFocus
                    value={newReviewContent}
                    onChange={(e) => setNewReviewContent(e.target.value)}
                    className="w-full bg-zinc-100 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500 outline-none min-h-[120px] resize-none"
                    placeholder="What happened today? Any blockers?"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-semibold hover:bg-zinc-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={!newReviewContent.trim()}
                    className="flex-1 py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 disabled:opacity-50 transition-all"
                  >
                    Save Review
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isSettingsOpen && (
          <div key="modal-settings" className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8 sticky top-0 bg-white pb-4 z-10">
                <h2 className="text-2xl font-bold">Settings</h2>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 hover:bg-zinc-100 rounded-xl transition-colors"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
              
              <div className="space-y-8">
                <section>
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Project Management</h3>
                  <div className="space-y-4">
                    {projects.length === 0 ? (
                      <p className="text-sm text-zinc-500 italic">No projects found.</p>
                    ) : (
                      projects.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                          <div className="flex items-center gap-3">
                            <FolderIcon className="w-5 h-5 text-zinc-400" />
                            <span className="font-semibold">{p.name}</span>
                          </div>
                          <button 
                            onClick={() => deleteProject(p.id)}
                            className="text-xs font-bold text-red-500 hover:text-red-600 uppercase tracking-wider"
                          >
                            Delete
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">AI Models</h3>
                    {!isAddingModel && (
                      <button 
                        onClick={() => {
                          setEditingModelId(null);
                          setNewModelDisplayName('');
                          setNewModelName('');
                          setNewModelBaseUrl('https://api.openai.com/v1');
                          setNewModelApiKey('');
                          setIsAddingModel(true);
                        }}
                        className="text-xs font-bold text-emerald-500 hover:text-emerald-600 uppercase tracking-wider flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add Model
                      </button>
                    )}
                  </div>

                  {isAddingModel && (
                    <form onSubmit={handleSaveModel} className="mb-6 p-6 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-bold text-zinc-600 mb-2">显示名称</label>
                          <input 
                            value={newModelDisplayName}
                            onChange={(e) => setNewModelDisplayName(e.target.value)}
                            className="w-full bg-white border border-zinc-200 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="OpenAI GPT-4o"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-zinc-600 mb-2">模型 ID (如 GPT-4O)</label>
                          <input 
                            value={newModelName}
                            onChange={(e) => setNewModelName(e.target.value)}
                            className="w-full bg-white border border-zinc-200 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="gpt-4o"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-zinc-600 mb-2">API BASE URL</label>
                        <input 
                          value={newModelBaseUrl}
                          onChange={(e) => setNewModelBaseUrl(e.target.value)}
                          className="w-full bg-white border border-zinc-200 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="https://api.openai.com/v1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-zinc-600 mb-2">API KEY</label>
                        <input 
                          type="password"
                          value={newModelApiKey}
                          onChange={(e) => setNewModelApiKey(e.target.value)}
                          className="w-full bg-white border border-zinc-200 rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="sk-..."
                        />
                      </div>
                      <div className="flex gap-3">
                        <button 
                          type="submit"
                          className="flex-1 py-3 bg-zinc-900 text-white rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-zinc-800 transition-colors"
                        >
                          {editingModelId ? 'Update Model' : 'Save Model'}
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            setIsAddingModel(false);
                            setEditingModelId(null);
                          }}
                          className="px-6 py-3 bg-zinc-200 text-zinc-600 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-zinc-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-4">
                    {models.map(m => (
                      <div key={m.id} className={cn(
                        "p-5 rounded-2xl border transition-all",
                        m.is_active === 1 ? "bg-white border-zinc-200 shadow-sm" : "bg-zinc-50 border-zinc-100"
                      )}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={() => activateModel(m.id)}
                              className={cn(
                                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                m.is_active === 1 ? "border-emerald-500 bg-emerald-500" : "border-zinc-300 hover:border-emerald-500"
                              )}
                            >
                              {m.is_active === 1 && <div className="w-2 h-2 bg-white rounded-full" />}
                            </button>
                            <div>
                              <div className="font-bold text-zinc-900">{m.display_name}</div>
                              {!m.api_key && <div className="text-[10px] font-bold text-red-500 uppercase mt-0.5">需要配置 KEY</div>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => startEditingModel(m)}
                              className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-blue-500 transition-all"
                            >
                              <Settings className="w-5 h-5" />
                            </button>
                            {m.id !== 'default-gemini' && (
                              <button 
                                onClick={() => removeModel(m.id)}
                                className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-red-500 transition-all"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>
                        {m.is_active === 1 && (
                          <div className="grid grid-cols-2 gap-4 text-[10px] text-zinc-400 font-mono border-t border-zinc-100 pt-4">
                            <div className="truncate">BASE: {m.base_url}</div>
                            <div className="text-right">MODEL: {m.model_name}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Data Management</h3>
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-4">
                    <p className="text-xs text-zinc-500">
                      由于预览环境是临时性的，建议定期导出备份。你可以将导出的 JSON 文件保存到本地，并在下次使用时导入。
                    </p>
                    <div className="flex gap-3">
                      <button 
                        onClick={handleExportData}
                        className="flex-1 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-xl font-semibold hover:bg-zinc-100 transition-colors flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        导出备份 (JSON)
                      </button>
                      <label className="flex-1 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-xl font-semibold hover:bg-zinc-100 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                        <Plus className="w-4 h-4" />
                        导入备份
                        <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
                      </label>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Chat Settings</h3>
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-700 font-semibold">Enable Streaming Output</span>
                      <button 
                        onClick={() => setIsStreaming(!isStreaming)}
                        className={cn(
                          "w-12 h-6 rounded-full transition-colors relative",
                          isStreaming ? "bg-emerald-500" : "bg-zinc-300"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 bg-white rounded-full absolute top-1 transition-all",
                          isStreaming ? "left-7" : "left-1"
                        )} />
                      </button>
                    </div>
                    <div className="pt-4 border-t border-zinc-200 space-y-2">
                      <button
                        onClick={() => {
                          setIsSettingsOpen(false);
                          setIsContextModalOpen(true);
                        }}
                        className="w-full py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl font-semibold transition-colors"
                      >
                        View Current Context
                      </button>
                      <button
                        onClick={handleCompressContext}
                        className="w-full py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl font-semibold transition-colors"
                      >
                        Compress Chat Context
                      </button>
                      <button
                        onClick={handleClearContext}
                        className="w-full py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-semibold transition-colors"
                      >
                        Clear Chat Context
                      </button>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">System Information</h3>
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Backend Status</span>
                      <span className={cn("font-bold", backendStatus === 'ok' ? "text-emerald-500" : "text-red-500")}>
                        {backendStatus.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Total Tokens Used</span>
                      <span className="font-bold text-zinc-900">
                        {(messages.reduce((acc, m) => acc + (m.prompt_tokens || 0) + (m.completion_tokens || 0), 0)).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Active Model</span>
                      <span className="font-mono">{activeModel?.display_name || 'None'}</span>
                    </div>
                  </div>
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0 }}
        className="bg-zinc-900 text-zinc-400 flex flex-col border-r border-zinc-800 overflow-hidden"
      >
        <div className="p-4 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-2 text-white font-semibold">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-zinc-900" />
            </div>
            <span>DevFlow AI</span>
          </div>
          <button onClick={() => setIsCreatingProject(true)} className="p-1 hover:bg-zinc-800 rounded transition-colors">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Projects
          </div>
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => setActiveProject(p)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                activeProject?.id === p.id 
                  ? "bg-zinc-800 text-white shadow-sm" 
                  : "hover:bg-zinc-800/50 hover:text-zinc-200"
              )}
            >
              <FolderIcon className={cn("w-4 h-4", activeProject?.id === p.id ? "text-emerald-400" : "text-zinc-500")} />
              <span className="truncate">{p.name}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-zinc-800 space-y-1">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-zinc-800 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-zinc-800 transition-colors">
            <History className="w-4 h-4" />
            <span>History</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-16 border-b border-zinc-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <Layout className="w-5 h-5 text-zinc-500" />
            </button>
            <div className="flex flex-col">
              <h1 className="font-semibold text-lg leading-tight">{activeProject?.name || 'Select a Project'}</h1>
              {backendStatus === 'error' && (
                <span className="text-[10px] text-red-500 font-bold uppercase tracking-tighter">Backend Connection Error</span>
              )}
            </div>
          </div>

          <div className="flex items-center bg-zinc-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('chat')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                activeTab === 'chat' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <MessageSquare className="w-4 h-4" />
              Chat
            </button>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                activeTab === 'dashboard' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <CheckSquare className="w-4 h-4" />
              Workflow
            </button>
            <button 
              onClick={() => setActiveTab('docs')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                activeTab === 'docs' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <FileText className="w-4 h-4" />
              Docs
            </button>
            <button 
              onClick={() => setActiveTab('usage')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                activeTab === 'usage' ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <BarChart3 className="w-4 h-4" />
              Usage
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center overflow-hidden">
              <User className="w-5 h-5 text-zinc-500" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {activeTab === 'chat' && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full flex flex-col"
              >
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                        <Bot className="w-10 h-10" />
                      </div>
                      <h2 className="text-xl font-bold">Welcome to {activeProject?.name}</h2>
                      <p className="text-zinc-500">
                        I'm your AI Development Assistant. I can help you with requirement analysis, 
                        drawing flowcharts, and managing your development lifecycle.
                      </p>
                      <div className="grid grid-cols-2 gap-2 w-full">
                        <button 
                          onClick={() => setInput("帮我整理一下这个项目的需求确认纪要")}
                          className="p-3 text-sm bg-white border border-zinc-200 rounded-xl hover:border-emerald-500 transition-colors text-left"
                        >
                          整理需求纪要
                        </button>
                        <button 
                          onClick={() => setInput("为这个项目画一个整体流程图")}
                          className="p-3 text-sm bg-white border border-zinc-200 rounded-xl hover:border-emerald-500 transition-colors text-left"
                        >
                          绘制流程图
                        </button>
                      </div>
                    </div>
                  )}
                  {messages.map((m) => (
                    <div key={m.id} className={cn(
                      "flex gap-4 max-w-4xl mx-auto",
                      m.role === 'user' ? "flex-row-reverse" : "flex-row"
                    )}>
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        m.role === 'user' ? "bg-zinc-900 text-white" : "bg-emerald-500 text-zinc-900"
                      )}>
                        {m.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                      </div>
                      <div className={cn(
                        "p-4 rounded-2xl shadow-sm border relative group/msg",
                        m.role === 'user' 
                          ? "bg-zinc-900 text-white border-zinc-800" 
                          : "bg-white border-zinc-200 text-zinc-800"
                      )}>
                        <MarkdownRenderer 
                          content={m.content} 
                          onDocLinkClick={(docId) => {
                            const doc = documents.find(d => d.id === docId);
                            if (doc) {
                              setSelectedDoc(doc);
                            }
                          }}
                          onFixMermaid={handleFixMermaid}
                        />

                        <button 
                          onClick={() => handleCopyMessage(m.id, m.content)}
                          className={cn(
                            "absolute top-2 right-2 p-1.5 rounded-lg transition-all opacity-0 group-hover/msg:opacity-100",
                            m.role === 'user' 
                              ? "bg-zinc-800 text-zinc-400 hover:text-white" 
                              : "bg-zinc-50 text-zinc-400 hover:text-zinc-600 border border-zinc-200"
                          )}
                          title="Copy message"
                        >
                          {copiedId === m.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        {m.role === 'assistant' && (m.prompt_tokens !== undefined || m.completion_tokens !== undefined) && (
                          <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center gap-4 text-[10px] text-zinc-400 font-mono uppercase tracking-wider">
                            <div className="flex items-center gap-1">
                              <Database className="w-3 h-3" />
                              Prompt: {m.prompt_tokens || 0}
                            </div>
                            <div className="flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              Completion: {m.completion_tokens || 0}
                            </div>
                            <div className="flex items-center gap-1 font-bold text-zinc-500">
                              Total: {(m.prompt_tokens || 0) + (m.completion_tokens || 0)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-4 max-w-4xl mx-auto">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500 text-zinc-900 flex items-center justify-center shrink-0">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-sm">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-6 bg-white border-t border-zinc-200">
                  <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative">
                    <input
                      ref={chatInputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask anything about the project..."
                      className="w-full bg-zinc-100 border-none rounded-2xl py-4 pl-6 pr-14 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                      autoFocus
                    />
                    <button 
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-900 transition-all"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                  <p className="text-center text-[10px] text-zinc-400 mt-3 uppercase tracking-widest font-semibold">
                    Powered by Gemini 3.1 Pro
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full overflow-y-auto p-8"
              >
                <div className="max-w-5xl mx-auto space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">Project Lifecycle</h2>
                      <p className="text-zinc-500">Track your progress through the 7-step development standard.</p>
                    </div>
                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold">
                      <CheckSquare className="w-4 h-4" />
                      {tasks.filter(t => t.status === 'done').length} / {STEPS.length} Steps Completed
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {STEPS.map((step) => {
                      const task = tasks.find(t => t.step_number === step.id);
                      const isDoing = task?.status === 'doing';
                      const isDone = task?.status === 'done';
                      const stepDocs = documents.filter(d => d.step_number === step.id);

                      return (
                        <div 
                          key={step.id}
                          className={cn(
                            "group p-6 rounded-3xl border transition-all relative overflow-hidden flex flex-col",
                            isDone 
                              ? "bg-emerald-50 border-emerald-100" 
                              : isDoing 
                                ? "bg-blue-50 border-blue-100"
                                : "bg-white border-zinc-200 hover:border-zinc-300 hover:shadow-md"
                          )}
                        >
                          {isDone && (
                            <div className="absolute top-0 right-0 p-3">
                              <div className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center">
                                <CheckSquare className="w-4 h-4" />
                              </div>
                            </div>
                          )}
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                            isDone ? "bg-white text-emerald-600 shadow-sm" : isDoing ? "bg-white text-blue-600 shadow-sm" : "bg-zinc-100 text-zinc-500"
                          )}>
                            <step.icon className="w-6 h-6" />
                          </div>
                          <h3 className="font-bold text-lg mb-1">{step.id}. {step.title}</h3>
                          <p className="text-sm text-zinc-500 mb-4 flex-1">{step.description}</p>
                          
                          {stepDocs.length > 0 && (
                            <div className="mb-4 space-y-1">
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Documents</p>
                              {stepDocs.map(doc => (
                                <div key={doc.id} className="flex items-center gap-2 text-xs text-zinc-600 bg-white/50 p-1.5 rounded-lg border border-zinc-100">
                                  <FileText className="w-3 h-3 text-zinc-400" />
                                  <span className="truncate">{doc.title}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleToggleStepStatus(step.id)}
                              className={cn(
                                "flex-1 py-2 rounded-xl text-sm font-semibold transition-all",
                                isDone 
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" 
                                  : isDoing
                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                    : "bg-zinc-900 text-white hover:bg-zinc-800"
                              )}
                            >
                              {isDone ? 'Completed' : isDoing ? 'Finish Step' : 'Start Step'}
                            </button>
                            <button 
                              onClick={() => {
                                setUploadingStep(step.id);
                                fileInputRef.current?.click();
                              }}
                              className="p-2 bg-zinc-100 text-zinc-600 rounded-xl hover:bg-zinc-200 transition-all"
                              title="Upload Document"
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-zinc-900 rounded-3xl p-8 text-white">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-zinc-900">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold">Daily Review (LL)</h3>
                      </div>
                      <button 
                        onClick={() => {
                          if (!activeProject) {
                            alert('Please select or create a project first.');
                            return;
                          }
                          setIsReviewModalOpen(true);
                        }}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-colors"
                      >
                        New Review
                      </button>
                    </div>
                    <div className="space-y-4">
                      {reviews.length === 0 ? (
                        <p className="text-zinc-500 text-sm text-center py-4 italic">No reviews yet. Start your first daily review!</p>
                      ) : (
                        reviews.map(review => (
                          <div key={review.id} className="p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="text-zinc-500 font-mono text-xs">
                                  {new Date(review.created_at).toLocaleDateString()}
                                </div>
                                <div className={cn("font-medium", review.status === 'done' && "line-through text-zinc-500")}>
                                  {review.content}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {review.status !== 'doing' && review.status !== 'done' && (
                                  <button 
                                    onClick={() => handleUpdateReview(review.id, 'doing')}
                                    className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold hover:bg-emerald-500/30 transition-colors"
                                  >
                                    Start
                                  </button>
                                )}
                                {review.status === 'doing' && (
                                  <button 
                                    onClick={() => handleUpdateReview(review.id, 'done')}
                                    className="px-3 py-1 bg-emerald-500 text-zinc-900 rounded-lg text-xs font-semibold hover:bg-emerald-400 transition-colors"
                                  >
                                    Finish
                                  </button>
                                )}
                                {review.status === 'done' && (
                                  <span className="px-3 py-1 bg-white/10 text-zinc-400 rounded-lg text-xs font-semibold">
                                    Done
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="pl-20 pr-4">
                              <input 
                                type="text"
                                placeholder="Add remark..."
                                defaultValue={review.remark || ''}
                                onBlur={(e) => {
                                  if (e.target.value !== review.remark) {
                                    handleUpdateReview(review.id, undefined, e.target.value);
                                  }
                                }}
                                className="w-full bg-transparent border-b border-white/10 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-emerald-500 outline-none py-1 transition-colors"
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'docs' && (
              <motion.div 
                key="docs"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="h-full p-8 overflow-y-auto"
              >
                <div className="max-w-5xl mx-auto">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-2xl font-bold">Project Documents</h2>
                      <p className="text-zinc-500">All generated documentation and assets.</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsCreatingFolder(true)}
                        className="bg-white border border-zinc-200 text-zinc-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-zinc-50 transition-colors flex items-center gap-2"
                      >
                        <FolderPlus className="w-4 h-4" />
                        New Folder
                      </button>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-zinc-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Upload
                      </button>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {/* Folders & Grouped Docs */}
                    {folders.map(folder => {
                      const folderDocs = documents.filter(d => d.folder_id === folder.id);
                      return (
                        <div key={folder.id} className="space-y-4">
                          <div className="flex items-center justify-between group">
                            <div className="flex items-center gap-2 text-zinc-400">
                              <FolderIcon className="w-5 h-5" />
                              <h3 className="font-bold text-sm uppercase tracking-wider">{folder.name}</h3>
                              <span className="text-xs">({folderDocs.length})</span>
                            </div>
                            <button 
                              onClick={() => deleteFolder(folder.id)}
                              className="p-1 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {folderDocs.map(doc => (
                              <DocumentCard key={doc.id} doc={doc} onPreview={() => setSelectedDoc(doc)} onDelete={() => deleteDocument(doc.id)} />
                            ))}
                            {folderDocs.length === 0 && (
                              <div className="col-span-full py-8 border border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center text-zinc-400 text-sm">
                                <p>Empty folder</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Uncategorized Docs */}
                    {documents.filter(d => !d.folder_id).length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-zinc-400">
                          <FileIcon className="w-5 h-5" />
                          <h3 className="font-bold text-sm uppercase tracking-wider">Uncategorized</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {documents.filter(d => !d.folder_id).map(doc => (
                            <DocumentCard key={doc.id} doc={doc} onPreview={() => setSelectedDoc(doc)} onDelete={() => deleteDocument(doc.id)} />
                          ))}
                        </div>
                      </div>
                    )}

                    {documents.length === 0 && folders.length === 0 && (
                      <div className="text-center py-20 bg-white border border-dashed border-zinc-300 rounded-3xl">
                        <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                        <p className="text-zinc-500">No documents yet. Start by creating a folder or uploading a file!</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'usage' && (
              <motion.div 
                key="usage"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="h-full p-8 overflow-y-auto"
              >
                <div className="max-w-5xl mx-auto">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-2xl font-bold">Model Usage & Monitoring</h2>
                      <p className="text-zinc-500">Track token consumption and project context.</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsContextModalOpen(true)}
                        className="bg-white border border-zinc-200 text-zinc-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-zinc-50 transition-colors flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Context
                      </button>
                      <button 
                        onClick={handleCompressContext}
                        className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        Compress Context
                      </button>
                      <button 
                        onClick={handleClearContext}
                        className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Clear Context
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                          <Activity className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-zinc-500">Total Tokens</span>
                      </div>
                      <div className="text-3xl font-bold">
                        {(messages.reduce((acc, m) => acc + (m.prompt_tokens || 0) + (m.completion_tokens || 0), 0)).toLocaleString()}
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">Across {messages.length} messages</div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                          <Database className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-zinc-500">Prompt Tokens</span>
                      </div>
                      <div className="text-3xl font-bold">
                        {(messages.reduce((acc, m) => acc + (m.prompt_tokens || 0), 0)).toLocaleString()}
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">Input context usage</div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                          <Zap className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-zinc-500">Completion Tokens</span>
                      </div>
                      <div className="text-3xl font-bold">
                        {(messages.reduce((acc, m) => acc + (m.completion_tokens || 0), 0)).toLocaleString()}
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">Model output usage</div>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm mb-8">
                    <h3 className="text-lg font-bold mb-6">Token Usage Trend</h3>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={messages.filter(m => m.role === 'assistant').map((m, i) => ({
                          name: `Msg ${i + 1}`,
                          prompt: m.prompt_tokens || 0,
                          completion: m.completion_tokens || 0,
                          total: (m.prompt_tokens || 0) + (m.completion_tokens || 0)
                        }))}>
                          <defs>
                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                          <XAxis dataKey="name" hide />
                          <YAxis hide />
                          <Tooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Area type="monotone" dataKey="total" stroke="#10b981" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                      <h3 className="text-lg font-bold">Recent Logs</h3>
                      <span className="text-xs text-zinc-400 font-mono">Last {Math.min(messages.length, 10)} interactions</span>
                    </div>
                    <div className="divide-y divide-zinc-100">
                      {messages.slice(-10).reverse().map(m => (
                        <div key={m.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              m.role === 'user' ? "bg-zinc-100 text-zinc-600" : "bg-emerald-50 text-emerald-600"
                            )}>
                              {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="text-sm font-medium truncate max-w-md">{m.content.substring(0, 100)}...</div>
                              <div className="text-[10px] text-zinc-400 uppercase font-mono">{new Date(m.created_at).toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs font-mono">
                            <div className="text-zinc-500">P: <span className="text-zinc-900">{m.prompt_tokens || 0}</span></div>
                            <div className="text-zinc-500">C: <span className="text-zinc-900">{m.completion_tokens || 0}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        {isCreatingFolder && (
          <div key="modal-create-folder" className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-6">Create New Folder</h2>
              <form onSubmit={createFolder} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Folder Name</label>
                  <input 
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full bg-zinc-100 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Enter folder name..."
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsCreatingFolder(false)}
                    className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-semibold hover:bg-zinc-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={!newFolderName.trim()}
                    className="flex-1 py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 disabled:opacity-50 transition-all"
                  >
                    Create Folder
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isContextModalOpen && (
          <div key="modal-context" className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-4xl max-h-[80vh] shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Current Chat Context</h2>
                  <p className="text-zinc-500 text-sm">This is the raw data being sent to the model for the next interaction.</p>
                </div>
                <button onClick={() => setIsContextModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-zinc-400" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
                    <Settings className="w-3 h-3" />
                    System Instruction
                  </h3>
                  <div className="p-4 bg-zinc-50 rounded-2xl text-sm font-mono text-zinc-600 whitespace-pre-wrap border border-zinc-100">
                    {SYSTEM_INSTRUCTION}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
                    <FileText className="w-3 h-3" />
                    RAG Documents ({documents.length})
                  </h3>
                  <div className="space-y-2">
                    {documents.map(doc => (
                      <div key={doc.id} className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                        <div className="text-sm font-bold text-zinc-900 mb-1">{doc.title}</div>
                        <div className="text-xs text-zinc-500 truncate">{doc.content.substring(0, 200)}...</div>
                      </div>
                    ))}
                    {documents.length === 0 && <p className="text-zinc-400 text-xs italic">No documents attached to this project.</p>}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-3 h-3" />
                    Message History ({messages.length})
                  </h3>
                  <div className="space-y-3">
                    {messages.map(m => (
                      <div key={m.id} className={cn(
                        "p-4 rounded-2xl text-sm border",
                        m.role === 'user' ? "bg-white border-zinc-200" : "bg-emerald-50 border-emerald-100"
                      )}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold uppercase text-[10px] tracking-widest">{m.role}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">{m.prompt_tokens || 0} / {m.completion_tokens || 0} tokens</span>
                        </div>
                        <div className="text-zinc-700">{m.content}</div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="mt-8 pt-6 border-t border-zinc-100 flex justify-end gap-3">
                <button 
                  onClick={handleCompressContext}
                  className="px-6 py-3 bg-emerald-50 text-emerald-600 rounded-xl font-semibold hover:bg-emerald-100 transition-all flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Compress Now
                </button>
                <button 
                  onClick={() => setIsContextModalOpen(false)}
                  className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {selectedDoc && (
          <div key="modal-preview" className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-5xl h-[90vh] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <FileIconForType type={selectedDoc.type} />
                  </div>
                  <div>
                    <h3 className="font-bold">{selectedDoc.title}</h3>
                    <p className="text-xs text-zinc-400 uppercase font-mono">{selectedDoc.type}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDoc(null)}
                  className="p-2 hover:bg-zinc-100 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-8 bg-zinc-50">
                <DocPreview doc={selectedDoc} />
              </div>
            </motion.div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
