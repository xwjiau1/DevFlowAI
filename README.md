<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# DevFlowAI - AI 辅助开发工作流管理系统

## 🌟 项目简介

DevFlowAI 是一个集成了 AI 辅助功能的开发工作流管理系统，旨在帮助开发团队提升协作效率，简化项目管理流程，并通过 AI 能力加速开发过程。

## ✨ 核心功能

### 🤖 AI 对话系统
- 与 AI 进行自然语言对话，获取开发建议和解决方案
- 支持流式输出，提供实时响应体验
- 集成 Google Gemini 和 OpenAI API，灵活切换 AI 模型
- 支持 Markdown 格式渲染，包括代码高亮和 Mermaid 图表

### 📊 项目管理
- 项目创建和管理
- 任务跟踪和状态管理
- 工作流程可视化（7个标准开发步骤）
- 项目统计分析和可视化图表

### 📁 文档管理
- 支持多种文档格式上传（图片、视频、PDF、Word、Markdown 等）
- Word 文档智能解析和内容提取
- 文档分类和版本管理

### 🎨 用户界面
- 现代化的响应式设计
- 深色/浅色主题切换
- 流畅的动画效果和过渡
- 直观的操作界面和导航

### 📈 数据分析
- 对话历史记录和统计
- Token 使用量监控
- 开发进度可视化

## 🛠️ 技术栈

### 前端
- **框架**: React 19 + TypeScript
- **样式**: Tailwind CSS 3
- **UI 组件**: Lucide React (图标), Recharts (图表)
- **动画**: Framer Motion
- **渲染**: React Markdown, Mermaid.js
- **构建工具**: Vite

### 后端
- **运行时**: Node.js
- **框架**: Express
- **数据库**: SQLite (better-sqlite3)
- **AI 集成**: Google Gemini API, OpenAI API

### 其他依赖
- dotenv (环境变量管理)
- mammoth (Word 文档解析)
- date-fns (日期处理)
- react-redux (状态管理)

## 📦 安装步骤

### 前提条件
- Node.js 18+ 环境
- npm 或 yarn 包管理器
- Google Gemini API 密钥 或 OpenAI API 密钥

### 安装过程

1. **克隆项目**
```bash
git clone <repository-url>
cd DevFlowAI
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑 .env 文件，添加您的 API 密钥
# GEMINI_API_KEY=your-gemini-api-key
# OPENAI_API_KEY=your-openai-api-key
```

4. **启动开发服务器**
```bash
npm run dev
```

5. **访问应用**
打开浏览器访问 `http://localhost:5173`

## 🚀 使用说明

### 项目创建和管理
1. 点击左侧导航栏的 "项目" 图标
2. 点击 "创建新项目" 按钮
3. 填写项目名称和描述
4. 点击 "创建" 按钮

### 与 AI 对话
1. 选择一个项目
2. 在聊天输入框中输入您的问题或需求
3. 点击发送按钮或按 Enter 键
4. 等待 AI 响应，支持流式输出

### 文档上传
1. 进入项目详情页面
2. 点击 "上传文档" 按钮
3. 选择要上传的文档文件
4. 系统将自动解析文档内容

### 任务管理
1. 进入项目的任务页面
2. 点击 "添加任务" 按钮
3. 填写任务标题和描述
4. 设置任务状态和优先级
5. 保存任务

### 工作流程管理
1. 进入项目的工作流程页面
2. 查看当前项目在开发流程中的位置
3. 点击步骤卡片查看详细信息
4. 完成步骤后更新状态

## 🎨 主题切换
- 点击右上角的主题切换按钮
- 选择 "浅色" 或 "深色" 主题
- 系统将自动保存您的主题偏好

## 📊 统计分析
- 查看项目的 Token 使用统计
- 分析对话历史和响应时间
- 监控开发进度和任务完成情况

## 🔧 开发命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 代码检查
npm run lint

# 清理构建文件
npm run clean
```

## 📝 项目结构

```
DevFlowAI/
├── src/
│   ├── components/          # React 组件
│   │   ├── MarkdownRenderer.tsx  # Markdown 渲染器
│   │   ├── Mermaid.tsx      # Mermaid 图表渲染器
│   │   └── ErrorBoundary.tsx     # 错误边界
│   ├── context/             # React Context
│   │   └── ThemeContext.tsx      # 主题管理
│   ├── services/            # 服务层
│   │   └── geminiService.ts      # Gemini API 服务
│   ├── App.tsx              # 主应用组件
│   ├── main.tsx             # 应用入口
│   ├── types.ts             # TypeScript 类型定义
│   └── index.css            # 全局样式
├── server.ts                # 后端服务器
├── devflow.db               # SQLite 数据库
├── .env.example             # 环境变量示例
├── package.json             # 项目配置
├── tailwind.config.js       # Tailwind 配置
├── tsconfig.json            # TypeScript 配置
└── vite.config.ts           # Vite 配置
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

# DevFlowAI - AI-Assisted Development Workflow Management System

## 🌟 Project Overview

DevFlowAI is an AI-assisted development workflow management system designed to help development teams improve collaboration efficiency, simplify project management processes, and accelerate development through AI capabilities.

## ✨ Core Features

### 🤖 AI Chat System
- Natural language conversation with AI for development advice and solutions
- Streaming output support for real-time response experience
- Integration with Google Gemini and OpenAI APIs for flexible AI model switching
- Markdown rendering support, including code highlighting and Mermaid diagrams

### 📊 Project Management
- Project creation and management
- Task tracking and status management
- Workflow visualization (7 standard development steps)
- Project statistics and visual charts

### 📁 Document Management
- Support for multiple document format uploads (images, videos, PDFs, Word, Markdown, etc.)
- Intelligent Word document parsing and content extraction
- Document classification and version management

### 🎨 User Interface
- Modern responsive design
- Dark/light theme switching
- Smooth animations and transitions
- Intuitive operation interface and navigation

### 📈 Data Analysis
- Conversation history and statistics
- Token usage monitoring
- Development progress visualization

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS 3
- **UI Components**: Lucide React (icons), Recharts (charts)
- **Animations**: Framer Motion
- **Rendering**: React Markdown, Mermaid.js
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js
- **Framework**: Express
- **Database**: SQLite (better-sqlite3)
- **AI Integration**: Google Gemini API, OpenAI API

### Other Dependencies
- dotenv (environment variable management)
- mammoth (Word document parsing)
- date-fns (date handling)
- react-redux (state management)

## 📦 Installation Steps

### Prerequisites
- Node.js 18+ environment
- npm or yarn package manager
- Google Gemini API key or OpenAI API key

### Installation Process

1. **Clone the project**
```bash
git clone <repository-url>
cd DevFlowAI
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
# Copy environment variable example file
cp .env.example .env

# Edit .env file, add your API keys
# GEMINI_API_KEY=your-gemini-api-key
# OPENAI_API_KEY=your-openai-api-key
```

4. **Start development server**
```bash
npm run dev
```

5. **Access the application**
Open your browser and visit `http://localhost:5173`

## 🚀 Usage Instructions

### Project Creation and Management
1. Click the "Projects" icon in the left navigation bar
2. Click the "Create New Project" button
3. Fill in project name and description
4. Click the "Create" button

### AI Conversation
1. Select a project
2. Enter your question or requirement in the chat input box
3. Click the send button or press Enter
4. Wait for AI response, streaming output is supported

### Document Upload
1. Enter the project details page
2. Click the "Upload Document" button
3. Select the document file to upload
4. The system will automatically parse the document content

### Task Management
1. Enter the project's task page
2. Click the "Add Task" button
3. Fill in task title and description
4. Set task status and priority
5. Save the task

### Workflow Management
1. Enter the project's workflow page
2. View the current project position in the development workflow
3. Click step cards to view detailed information
4. Update status after completing steps

## 🎨 Theme Switching
- Click the theme toggle button in the upper right corner
- Select "Light" or "Dark" theme
- The system will automatically save your theme preference

## 📊 Statistical Analysis
- View project token usage statistics
- Analyze conversation history and response time
- Monitor development progress and task completion

## 🔧 Development Commands

```bash
# Development mode
npm run dev

# Build production version
npm run build

# Preview production build
npm run preview

# Code linting
npm run lint

# Clean build files
npm run clean
```

## 📝 Project Structure

```
DevFlowAI/
├── src/
│   ├── components/          # React components
│   │   ├── MarkdownRenderer.tsx  # Markdown renderer
│   │   ├── Mermaid.tsx      # Mermaid chart renderer
│   │   └── ErrorBoundary.tsx     # Error boundary
│   ├── context/             # React Context
│   │   └── ThemeContext.tsx      # Theme management
│   ├── services/            # Service layer
│   │   └── geminiService.ts      # Gemini API service
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Application entry
│   ├── types.ts             # TypeScript type definitions
│   └── index.css            # Global styles
├── server.ts                # Backend server
├── devflow.db               # SQLite database
├── .env.example             # Environment variable example
├── package.json             # Project configuration
├── tailwind.config.js       # Tailwind configuration
├── tsconfig.json            # TypeScript configuration
└── vite.config.ts           # Vite configuration
```

## 📄 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please submit Issues and Pull Requests.
