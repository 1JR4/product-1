#!/bin/bash

# AgentFlow Tmux Environment Setup Script
# This script sets up the optimal tmux environment for running multiple agents

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TMUX_CONF="$PROJECT_ROOT/.tmux.conf"
TMUX_SESSION_DIR="$PROJECT_ROOT/.tmux-sessions"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [${level}] $message"
}

# Error handling
error_exit() {
    log "ERROR" "$1"
    exit 1
}

# Check if tmux is installed
check_tmux() {
    log "INFO" "Checking tmux installation..."
    
    if ! command -v tmux &> /dev/null; then
        log "ERROR" "tmux is not installed"
        echo ""
        echo "Please install tmux:"
        echo "  macOS: brew install tmux"
        echo "  Ubuntu/Debian: sudo apt-get install tmux"
        echo "  CentOS/RHEL: sudo yum install tmux"
        echo ""
        exit 1
    fi
    
    local tmux_version=$(tmux -V | cut -d' ' -f2)
    log "INFO" "Found tmux version: $tmux_version"
    
    # Check minimum version (2.0+)
    if [[ $(echo "$tmux_version" | cut -d'.' -f1) -lt 2 ]]; then
        log "WARN" "tmux version $tmux_version may not support all features. Recommended: 2.0+"
    fi
}

# Create tmux configuration
create_tmux_config() {
    log "INFO" "Creating tmux configuration..."
    
    cat > "$TMUX_CONF" << 'EOF'
# AgentFlow Tmux Configuration
# Optimized for running multiple agent sessions

# Basic settings
set -g default-terminal "screen-256color"
set -g history-limit 10000
set -g buffer-limit 20
set -g display-time 1500
set -g remain-on-exit off
set -g repeat-time 300

# Key bindings
unbind C-b
set -g prefix C-a
bind C-a send-prefix

# Session management
bind r source-file ~/.tmux.conf \; display-message "Config reloaded..."
bind c new-window -c "#{pane_current_path}"
bind '"' split-window -c "#{pane_current_path}"
bind % split-window -h -c "#{pane_current_path}"

# Window navigation
bind -n M-Left previous-window
bind -n M-Right next-window
bind -n M-h previous-window
bind -n M-l next-window

# Pane navigation
bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R

# Pane resizing
bind -r H resize-pane -L 5
bind -r J resize-pane -D 5
bind -r K resize-pane -U 5
bind -r L resize-pane -R 5

# Window status
set -g base-index 1
set -g pane-base-index 1
set -g renumber-windows on

# Status bar
set -g status-interval 5
set -g status-left-length 30
set -g status-right-length 150
set -g status-left '#[fg=green][#S] '
set -g status-right '#[fg=yellow]#(uptime | cut -d "," -f 3-) #[fg=blue]%H:%M:%S'

# Colors (agent-friendly theme)
set -g status-bg colour235
set -g status-fg colour136
set -g window-status-current-style fg=colour166,bg=default,bright
set -g pane-border-style fg=colour235
set -g pane-active-border-style fg=colour240
set -g message-style bg=colour235,fg=colour166

# Agent-specific settings
set -g allow-rename off
set -g automatic-rename off
set -g set-titles on
set -g set-titles-string '#H:#S.#I.#P #W #T'

# Mouse support (optional, uncomment if needed)
# set -g mouse on

# Logging support
bind-key P pipe-pane -o 'cat >>~/tmux-#W.log' \; display-message 'Toggled logging to ~/tmux-#W.log'

# Agent session templates
bind-key M-c new-session -d -s "agent-code" \; \
    rename-window "claude-code" \; \
    send-keys "echo 'Claude Code Agent Session'" Enter \; \
    split-window -h \; \
    send-keys "echo 'Agent Monitor'" Enter \; \
    select-pane -t 0

bind-key M-w new-session -d -s "agent-worker" \; \
    rename-window "worker" \; \
    send-keys "echo 'Worker Agent Session'" Enter \; \
    split-window -v \; \
    send-keys "echo 'Task Queue'" Enter \; \
    select-pane -t 0

bind-key M-m new-session -d -s "agent-monitor" \; \
    rename-window "monitor" \; \
    send-keys "echo 'Monitor Agent Session'" Enter \; \
    split-window -h \; \
    send-keys "echo 'System Metrics'" Enter \; \
    split-window -v \; \
    send-keys "echo 'Health Checks'" Enter \; \
    select-pane -t 0

# Agent management commands
bind-key M-a command-prompt -p "Agent ID:" "new-session -d -s 'agent-%1' 'bash $PROJECT_ROOT/scripts/agent-wrapper.sh %1 claude-code'"
bind-key M-k command-prompt -p "Kill Agent Session:" "kill-session -t 'agent-%1'"
bind-key M-l list-sessions
EOF

    log "INFO" "Tmux configuration created at $TMUX_CONF"
}

# Create session management scripts
create_session_scripts() {
    log "INFO" "Creating session management scripts..."
    
    mkdir -p "$TMUX_SESSION_DIR"
    
    # Create agent launcher script
    cat > "$TMUX_SESSION_DIR/launch-agent.sh" << 'EOF'
#!/bin/bash
# Launch a new agent in its own tmux session

AGENT_ID="$1"
AGENT_TYPE="${2:-claude-code}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

if [[ -z "$AGENT_ID" ]]; then
    echo "Usage: $0 <agent_id> [agent_type]"
    exit 1
fi

SESSION_NAME="agent-$AGENT_ID"

# Check if session already exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "Session $SESSION_NAME already exists"
    tmux attach-session -t "$SESSION_NAME"
    exit 0
fi

# Create new session
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"
tmux rename-window -t "$SESSION_NAME" "$AGENT_TYPE"

# Start the agent
tmux send-keys -t "$SESSION_NAME" "bash '$PROJECT_ROOT/scripts/agent-wrapper.sh' '$AGENT_ID' '$AGENT_TYPE'" Enter

# Create monitoring pane
tmux split-window -h -t "$SESSION_NAME"
tmux send-keys -t "$SESSION_NAME" "watch -n 5 'cat $PROJECT_ROOT/.agent-states/agent-$AGENT_ID.json 2>/dev/null | jq .'" Enter

# Select main pane
tmux select-pane -t "$SESSION_NAME:0.0"

echo "Agent $AGENT_ID started in session $SESSION_NAME"
echo "Attach with: tmux attach-session -t $SESSION_NAME"
EOF

    # Create session monitor script
    cat > "$TMUX_SESSION_DIR/monitor-sessions.sh" << 'EOF'
#!/bin/bash
# Monitor all agent sessions

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "AgentFlow Session Monitor"
echo "========================"
echo ""

# List all agent sessions
echo "Active Agent Sessions:"
tmux list-sessions 2>/dev/null | grep "agent-" | while read session; do
    session_name=$(echo "$session" | cut -d':' -f1)
    agent_id=$(echo "$session_name" | sed 's/agent-//')
    
    # Get agent status if available
    status_file="$PROJECT_ROOT/.agent-states/agent-$agent_id.json"
    if [[ -f "$status_file" ]]; then
        status=$(jq -r '.status' "$status_file" 2>/dev/null || echo "unknown")
        echo "  $session_name: $status"
    else
        echo "  $session_name: no status file"
    fi
done

echo ""
echo "All Sessions:"
tmux list-sessions 2>/dev/null || echo "No tmux sessions found"

echo ""
echo "System Overview:"
echo "  Load: $(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')"
echo "  Memory: $(free -h 2>/dev/null | awk 'NR==2{printf "%.1f/%.1f GB", $3/1024, $2/1024}' || echo "N/A")"
echo "  Agents: $(ls -1 $PROJECT_ROOT/.agent-states/agent-*.json 2>/dev/null | wc -l)"
EOF

    # Create cleanup script
    cat > "$TMUX_SESSION_DIR/cleanup-sessions.sh" << 'EOF'
#!/bin/bash
# Cleanup dead agent sessions

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Cleaning up dead agent sessions..."

# Get all agent sessions
tmux list-sessions 2>/dev/null | grep "agent-" | cut -d':' -f1 | while read session_name; do
    agent_id=$(echo "$session_name" | sed 's/agent-//')
    status_file="$PROJECT_ROOT/.agent-states/agent-$agent_id.json"
    
    if [[ -f "$status_file" ]]; then
        status=$(jq -r '.status' "$status_file" 2>/dev/null || echo "unknown")
        if [[ "$status" == "stopped" || "$status" == "failed" ]]; then
            echo "Killing dead session: $session_name ($status)"
            tmux kill-session -t "$session_name"
        fi
    else
        echo "Killing session with no status file: $session_name"
        tmux kill-session -t "$session_name"
    fi
done

echo "Cleanup complete"
EOF

    # Make scripts executable
    chmod +x "$TMUX_SESSION_DIR"/*.sh
    
    log "INFO" "Session management scripts created in $TMUX_SESSION_DIR"
}

# Create tmux environment helpers
create_helpers() {
    log "INFO" "Creating tmux helper functions..."
    
    cat > "$PROJECT_ROOT/.tmux-helpers.sh" << 'EOF'
#!/bin/bash
# AgentFlow Tmux Helper Functions

# Source this file in your shell to get helpful functions:
# source ./.tmux-helpers.sh

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Launch an agent
agent_start() {
    local agent_id="$1"
    local agent_type="${2:-claude-code}"
    
    if [[ -z "$agent_id" ]]; then
        echo "Usage: agent_start <agent_id> [agent_type]"
        return 1
    fi
    
    bash "$PROJECT_ROOT/.tmux-sessions/launch-agent.sh" "$agent_id" "$agent_type"
}

# Stop an agent
agent_stop() {
    local agent_id="$1"
    
    if [[ -z "$agent_id" ]]; then
        echo "Usage: agent_stop <agent_id>"
        return 1
    fi
    
    # Create shutdown signal
    echo "" > "$PROJECT_ROOT/.agent-states/shutdown-$agent_id"
    
    # Kill tmux session after delay
    sleep 2
    tmux kill-session -t "agent-$agent_id" 2>/dev/null || true
    
    echo "Agent $agent_id stopped"
}

# List agents
agent_list() {
    bash "$PROJECT_ROOT/.tmux-sessions/monitor-sessions.sh"
}

# Attach to agent session
agent_attach() {
    local agent_id="$1"
    
    if [[ -z "$agent_id" ]]; then
        echo "Usage: agent_attach <agent_id>"
        return 1
    fi
    
    tmux attach-session -t "agent-$agent_id"
}

# Show agent status
agent_status() {
    local agent_id="$1"
    
    if [[ -z "$agent_id" ]]; then
        echo "All agent statuses:"
        for state_file in "$PROJECT_ROOT/.agent-states"/agent-*.json; do
            if [[ -f "$state_file" ]]; then
                local id=$(basename "$state_file" | sed 's/agent-//' | sed 's/.json//')
                local status=$(jq -r '.status' "$state_file" 2>/dev/null || echo "unknown")
                printf "  %-20s %s\n" "$id" "$status"
            fi
        done
    else
        local status_file="$PROJECT_ROOT/.agent-states/agent-$agent_id.json"
        if [[ -f "$status_file" ]]; then
            jq . "$status_file"
        else
            echo "No status file for agent $agent_id"
        fi
    fi
}

# Cleanup dead sessions
agent_cleanup() {
    bash "$PROJECT_ROOT/.tmux-sessions/cleanup-sessions.sh"
}

# Start the monitor
agent_monitor() {
    cd "$PROJECT_ROOT"
    node scripts/monitor-agents.js
}

echo "AgentFlow tmux helpers loaded!"
echo "Available commands:"
echo "  agent_start <id> [type]  - Start an agent"
echo "  agent_stop <id>          - Stop an agent"
echo "  agent_list               - List all agents"
echo "  agent_attach <id>        - Attach to agent session"
echo "  agent_status [id]        - Show agent status"
echo "  agent_cleanup            - Clean up dead sessions"
echo "  agent_monitor            - Start the web monitor"
EOF

    log "INFO" "Helper functions created at $PROJECT_ROOT/.tmux-helpers.sh"
}

# Setup tmux server configuration
setup_tmux_server() {
    log "INFO" "Setting up tmux server configuration..."
    
    # Kill existing tmux server if running
    if tmux list-sessions &>/dev/null; then
        log "WARN" "Existing tmux sessions found. They will remain active."
        log "INFO" "To start fresh, run: tmux kill-server"
    fi
    
    # Start tmux server with our config
    tmux start-server
    
    # Load configuration
    if [[ -f "$TMUX_CONF" ]]; then
        tmux source-file "$TMUX_CONF"
        log "INFO" "Tmux configuration loaded"
    fi
}

# Validate setup
validate_setup() {
    log "INFO" "Validating tmux setup..."
    
    # Check if tmux server is running
    if ! tmux list-sessions &>/dev/null && ! tmux new-session -d -s test-session &>/dev/null; then
        error_exit "Failed to start tmux server"
    fi
    
    # Clean up test session
    tmux kill-session -t test-session 2>/dev/null || true
    
    # Check configuration
    if [[ ! -f "$TMUX_CONF" ]]; then
        error_exit "Tmux configuration file not found"
    fi
    
    # Check scripts
    if [[ ! -d "$TMUX_SESSION_DIR" ]]; then
        error_exit "Session scripts directory not found"
    fi
    
    log "INFO" "Tmux setup validation passed"
}

# Main setup function
main() {
    log "INFO" "Starting AgentFlow tmux environment setup..."
    
    check_tmux
    create_tmux_config
    create_session_scripts
    create_helpers
    setup_tmux_server
    validate_setup
    
    log "INFO" "✅ AgentFlow tmux environment setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Source the helper functions:"
    echo "   source ./.tmux-helpers.sh"
    echo ""
    echo "2. Start an agent:"
    echo "   agent_start my-agent claude-code"
    echo ""
    echo "3. Monitor agents:"
    echo "   agent_monitor"
    echo ""
    echo "4. List active agents:"
    echo "   agent_list"
    echo ""
    echo "Configuration files:"
    echo "  Tmux config: $TMUX_CONF"
    echo "  Session scripts: $TMUX_SESSION_DIR"
    echo "  Helper functions: $PROJECT_ROOT/.tmux-helpers.sh"
}

# Help function
show_help() {
    cat << EOF
AgentFlow Tmux Setup Script

This script sets up an optimized tmux environment for running AgentFlow agents.

Usage: $0 [options]

Options:
    --help, -h          Show this help message
    --force             Force overwrite existing configuration
    --no-server         Don't start tmux server
    --minimal           Create minimal configuration only

The setup creates:
    - Optimized tmux configuration (.tmux.conf)
    - Session management scripts (.tmux-sessions/)
    - Helper functions (.tmux-helpers.sh)
    - Pre-configured session templates

EOF
}

# Parse command line arguments
FORCE=false
NO_SERVER=false
MINIMAL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_help
            exit 0
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --no-server)
            NO_SERVER=true
            shift
            ;;
        --minimal)
            MINIMAL=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Check for existing configuration
if [[ -f "$TMUX_CONF" ]] && [[ "$FORCE" != true ]]; then
    echo "Tmux configuration already exists at $TMUX_CONF"
    echo "Use --force to overwrite"
    exit 1
fi

# Run main setup
main