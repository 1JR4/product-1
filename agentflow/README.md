# AgentFlow: Multi-Agent Development Orchestrator

AgentFlow is a comprehensive web-based GUI tool for orchestrating multiple Claude Code agents to autonomously develop software projects. Built with Next.js 14, TypeScript, Firebase, and designed for production-scale agent management.

## 🎯 Overview

AgentFlow enables teams to coordinate AI agents in complex development workflows, providing real-time monitoring, intelligent task distribution, and comprehensive progress tracking for autonomous software development.

## 🚀 Key Features

### Agent Orchestration
- **Multi-Agent Coordination**: Manage hierarchical teams of Claude Code agents
- **Intelligent Task Distribution**: Automatic task assignment based on agent capabilities  
- **Real-time Communication**: Inter-agent messaging and coordination
- **Health Monitoring**: Continuous agent health checks with automatic recovery

### Project Management
- **Dynamic Backlog Management**: Smart feature and task breakdown
- **Progress Tracking**: Real-time progress visualization and analytics
- **Kanban Workflows**: Drag-and-drop task management
- **Milestone Tracking**: Automated milestone detection and reporting

### Security & Monitoring
- **Rate Limiting**: Comprehensive API and token usage controls
- **Cost Tracking**: Real-time cost monitoring with budget alerts
- **Security Monitoring**: Suspicious activity detection and response
- **Audit Logging**: Complete audit trail for all agent activities

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Firebase (Firestore, Realtime Database, Storage, Functions)
- **Orchestration**: Tmux, Node.js, Shell Scripts
- **Security**: Rate limiting, IP blocking, Activity monitoring
- **AI Integration**: Claude Code API, Anthropic API

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Firebase and Claude API keys

# Start development server
npm run dev

# Start agent monitoring (in separate terminal)  
npm run agents:monitor
```

Visit `http://localhost:3000` to access AgentFlow.

## 📖 Usage Guide

### Creating Your First Project

1. **Navigate to Projects** → Click "Create New Project"
2. **Configure Project** → Set name, description, tech stack
3. **Add Agents** → Create agent hierarchy (Product Manager → Developers → QA)
4. **Define Features** → Add features and break down into tasks
5. **Start Development** → Agents automatically begin work coordination

### Agent Hierarchy Example

```
Product Manager (Opus)
├── Project Manager (Opus)
│   ├── Architect (Opus)
│   ├── Senior Dev (Opus)
│   │   ├── Frontend Dev (Sonnet)
│   │   └── Backend Dev (Sonnet)
│   └── QA Lead (Sonnet)
│       └── Tester (Haiku)
└── DevOps (Sonnet)
```

## 🔧 Configuration

### Environment Variables

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_database_url

# Claude API
CLAUDE_API_KEY=your_claude_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Agent Configuration
TMUX_SESSION_PREFIX=agentflow
MAX_AGENTS_PER_PROJECT=10
TOKEN_RATE_LIMIT_PER_HOUR=50000
MAX_COST_PER_DAY=100
```

## 📄 License

This project is licensed under the MIT License.

---

**AgentFlow** - Orchestrating the future of AI-driven development 🤖✨
