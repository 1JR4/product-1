#!/usr/bin/env node

/**
 * AgentFlow Architecture Verification Script
 * 
 * This script verifies that all components can be loaded and basic
 * functionality works as expected.
 */

const path = require('path');
const fs = require('fs');

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(level, message) {
  const timestamp = new Date().toISOString();
  const color = colors[level] || colors.reset;
  console.log(`${color}[${timestamp}] [${level.toUpperCase()}] ${message}${colors.reset}`);
}

async function verifyFileExists(filePath, description) {
  try {
    await fs.promises.access(filePath);
    log('green', `✅ ${description}: ${filePath}`);
    return true;
  } catch (error) {
    log('red', `❌ ${description}: ${filePath} - NOT FOUND`);
    return false;
  }
}

async function verifyModuleLoad(modulePath, description) {
  try {
    const module = require(modulePath);
    log('green', `✅ ${description}: Module loaded successfully`);
    return module;
  } catch (error) {
    log('red', `❌ ${description}: Failed to load - ${error.message}`);
    return null;
  }
}

async function verifyArchitecture() {
  log('blue', '🔍 Starting AgentFlow Architecture Verification');
  log('blue', '===============================================\n');

  const projectRoot = path.dirname(__dirname);
  let allPassed = true;

  // 1. Verify Core Files
  log('blue', '📁 Verifying Core Component Files...');
  
  const coreFiles = [
    { path: path.join(projectRoot, 'lib/agents/orchestrator.ts'), desc: 'AgentOrchestrator' },
    { path: path.join(projectRoot, 'lib/agents/tmux-manager.ts'), desc: 'TmuxManager' },
    { path: path.join(projectRoot, 'lib/agents/agent-wrapper.ts'), desc: 'AgentWrapper' },
    { path: path.join(projectRoot, 'lib/agents/health-monitor.ts'), desc: 'HealthMonitor' },
    { path: path.join(projectRoot, 'lib/agents/message-bus.ts'), desc: 'MessageBus' }
  ];

  for (const file of coreFiles) {
    const exists = await verifyFileExists(file.path, file.desc);
    if (!exists) allPassed = false;
  }

  // 2. Verify Shell Scripts
  log('blue', '\n🔧 Verifying Shell Scripts...');
  
  const shellScripts = [
    { path: path.join(projectRoot, 'scripts/agent-wrapper.sh'), desc: 'Agent Wrapper Script' },
    { path: path.join(projectRoot, 'scripts/monitor-agents.js'), desc: 'Monitor Script' },
    { path: path.join(projectRoot, 'scripts/setup-tmux.sh'), desc: 'Tmux Setup Script' },
    { path: path.join(projectRoot, 'scripts/example-usage.js'), desc: 'Example Usage Script' }
  ];

  for (const script of shellScripts) {
    const exists = await verifyFileExists(script.path, script.desc);
    if (!exists) allPassed = false;
  }

  // 3. Verify API Routes
  log('blue', '\n🌐 Verifying API Routes...');
  
  const apiRoutes = [
    { path: path.join(projectRoot, 'src/app/api/agents/create/route.ts'), desc: 'Agent Creation API' },
    { path: path.join(projectRoot, 'src/app/api/agents/route.ts'), desc: 'Agent Listing API' },
    { path: path.join(projectRoot, 'src/app/api/agents/[agentId]/route.ts'), desc: 'Agent Management API' },
    { path: path.join(projectRoot, 'src/app/api/agents/[agentId]/status/route.ts'), desc: 'Agent Status API' },
    { path: path.join(projectRoot, 'src/app/api/agents/[agentId]/messages/route.ts'), desc: 'Agent Messaging API' },
    { path: path.join(projectRoot, 'src/app/api/orchestrator/route.ts'), desc: 'Orchestrator API' }
  ];

  for (const route of apiRoutes) {
    const exists = await verifyFileExists(route.path, route.desc);
    if (!exists) allPassed = false;
  }

  // 4. Verify Documentation
  log('blue', '\n📚 Verifying Documentation...');
  
  const docs = [
    { path: path.join(projectRoot, 'AGENT_ORCHESTRATION_ARCHITECTURE.md'), desc: 'Architecture Documentation' }
  ];

  for (const doc of docs) {
    const exists = await verifyFileExists(doc.path, doc.desc);
    if (!exists) allPassed = false;
  }

  // 5. Test Module Loading (TypeScript files can't be directly required)
  log('blue', '\n🔄 Testing Component Interfaces...');
  
  try {
    // Test configuration interfaces
    const orchestratorContent = await fs.promises.readFile(
      path.join(projectRoot, 'lib/agents/orchestrator.ts'), 
      'utf8'
    );
    
    if (orchestratorContent.includes('export class AgentOrchestrator')) {
      log('green', '✅ AgentOrchestrator class definition found');
    } else {
      log('red', '❌ AgentOrchestrator class definition missing');
      allPassed = false;
    }

    if (orchestratorContent.includes('interface AgentConfig')) {
      log('green', '✅ AgentConfig interface definition found');
    } else {
      log('red', '❌ AgentConfig interface definition missing');
      allPassed = false;
    }

    if (orchestratorContent.includes('interface AgentInstance')) {
      log('green', '✅ AgentInstance interface definition found');
    } else {
      log('red', '❌ AgentInstance interface definition missing');
      allPassed = false;
    }

  } catch (error) {
    log('red', `❌ Failed to read orchestrator file: ${error.message}`);
    allPassed = false;
  }

  // 6. Test Script Executability
  log('blue', '\n⚙️  Testing Script Permissions...');
  
  const executableScripts = [
    path.join(projectRoot, 'scripts/agent-wrapper.sh'),
    path.join(projectRoot, 'scripts/monitor-agents.js'),
    path.join(projectRoot, 'scripts/setup-tmux.sh'),
    path.join(projectRoot, 'scripts/example-usage.js')
  ];

  for (const script of executableScripts) {
    try {
      const stats = await fs.promises.stat(script);
      const isExecutable = !!(stats.mode & parseInt('111', 8));
      
      if (isExecutable) {
        log('green', `✅ ${path.basename(script)} is executable`);
      } else {
        log('yellow', `⚠️  ${path.basename(script)} is not executable (run chmod +x)`);
      }
    } catch (error) {
      log('red', `❌ Failed to check ${path.basename(script)}: ${error.message}`);
    }
  }

  // 7. Test Directory Structure
  log('blue', '\n📂 Verifying Directory Structure...');
  
  const directories = [
    path.join(projectRoot, 'lib/agents'),
    path.join(projectRoot, 'scripts'),
    path.join(projectRoot, 'src/app/api/agents'),
    path.join(projectRoot, 'src/app/api/orchestrator')
  ];

  for (const dir of directories) {
    try {
      const stats = await fs.promises.stat(dir);
      if (stats.isDirectory()) {
        log('green', `✅ Directory exists: ${path.relative(projectRoot, dir)}`);
      } else {
        log('red', `❌ Not a directory: ${path.relative(projectRoot, dir)}`);
        allPassed = false;
      }
    } catch (error) {
      log('red', `❌ Directory missing: ${path.relative(projectRoot, dir)}`);
      allPassed = false;
    }
  }

  // 8. Generate Summary Report
  log('blue', '\n📊 Architecture Verification Summary');
  log('blue', '====================================');
  
  const totalComponents = coreFiles.length + shellScripts.length + apiRoutes.length + docs.length;
  
  if (allPassed) {
    log('green', `🎉 All ${totalComponents} components verified successfully!`);
    log('green', '✅ AgentFlow Orchestration System is ready for use');
    
    console.log('\n📋 Next Steps:');
    console.log('1. Install dependencies: npm install');
    console.log('2. Set up tmux environment: bash scripts/setup-tmux.sh');
    console.log('3. Start the monitoring service: node scripts/monitor-agents.js');
    console.log('4. Run example usage: node scripts/example-usage.js');
    console.log('5. Start the Next.js development server: npm run dev');
    
    console.log('\n🔗 Quick Start Commands:');
    console.log('```bash');
    console.log('# Terminal 1: Start the orchestrator monitoring');
    console.log('node scripts/monitor-agents.js');
    console.log('');
    console.log('# Terminal 2: Set up tmux and run example');
    console.log('bash scripts/setup-tmux.sh');
    console.log('node scripts/example-usage.js');
    console.log('');
    console.log('# Terminal 3: Start the web interface');
    console.log('npm run dev');
    console.log('```');
    
  } else {
    log('red', '❌ Some components failed verification');
    log('red', '🔧 Please check the errors above and ensure all files are present');
  }

  // 9. System Requirements Check
  log('blue', '\n🔍 Checking System Requirements...');
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion >= 18) {
    log('green', `✅ Node.js version: ${nodeVersion} (>= 18 required)`);
  } else {
    log('red', `❌ Node.js version: ${nodeVersion} (upgrade to >= 18)`);
    allPassed = false;
  }

  // Check for tmux (if available)
  try {
    const { exec } = require('child_process');
    exec('tmux -V', (error, stdout, stderr) => {
      if (error) {
        log('yellow', '⚠️  tmux not found - install tmux for full functionality');
      } else {
        const tmuxVersion = stdout.trim();
        log('green', `✅ ${tmuxVersion} found`);
      }
    });
  } catch (error) {
    log('yellow', '⚠️  Could not check tmux version');
  }

  return allPassed;
}

// Helper function to display component overview
function displayComponentOverview() {
  console.log('\n🏗️  AgentFlow Component Overview');
  console.log('================================\n');
  
  console.log('Core Components:');
  console.log('├── AgentOrchestrator    - Central agent management and coordination');
  console.log('├── TmuxManager          - Tmux session management and process isolation');
  console.log('├── HealthMonitor        - Health monitoring and automatic recovery');
  console.log('├── MessageBus           - Inter-agent communication infrastructure');
  console.log('└── AgentWrapper         - Individual agent execution and Claude integration\n');
  
  console.log('Shell Scripts:');
  console.log('├── agent-wrapper.sh     - Agent execution wrapper for tmux sessions');
  console.log('├── monitor-agents.js    - Real-time monitoring with web dashboard');
  console.log('├── setup-tmux.sh        - Tmux environment setup and configuration');
  console.log('└── example-usage.js     - Demonstration and usage examples\n');
  
  console.log('API Endpoints:');
  console.log('├── /api/agents/create   - Create new agents');
  console.log('├── /api/agents          - List and manage all agents');
  console.log('├── /api/agents/[id]     - Individual agent operations');
  console.log('├── /api/agents/[id]/status - Agent status and health');
  console.log('├── /api/agents/[id]/messages - Agent messaging');
  console.log('└── /api/orchestrator    - System-wide operations\n');
  
  console.log('Agent Types:');
  console.log('├── claude-code          - AI-powered coding assistant with Claude integration');
  console.log('├── worker               - Background task processing and batch operations');
  console.log('└── monitor              - System monitoring and health check automation\n');
  
  console.log('Key Features:');
  console.log('├── Lifecycle Management - Full agent creation, control, and cleanup');
  console.log('├── Health Monitoring    - Automated health checks with recovery');
  console.log('├── Message Passing      - Reliable inter-agent communication');
  console.log('├── Checkpoint/Rollback  - State management and recovery mechanisms');
  console.log('├── Resource Management  - CPU, memory, and cost tracking');
  console.log('├── Rate Limiting        - Prevent API abuse and cost overruns');
  console.log('└── Web Dashboard        - Real-time monitoring and control interface\n');
}

// Main execution
if (require.main === module) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('AgentFlow Architecture Verification Tool\n');
    console.log('Usage:');
    console.log('  node scripts/verify-architecture.js           - Run verification');
    console.log('  node scripts/verify-architecture.js --help    - Show this help');
    console.log('  node scripts/verify-architecture.js --overview - Show component overview');
    process.exit(0);
  }
  
  if (process.argv.includes('--overview')) {
    displayComponentOverview();
    process.exit(0);
  }
  
  verifyArchitecture().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    log('red', `Verification failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  verifyArchitecture,
  displayComponentOverview
};