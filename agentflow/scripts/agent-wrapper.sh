#!/bin/bash

# AgentFlow Agent Wrapper Script
# This script wraps the execution of individual agents within tmux sessions

set -euo pipefail

# Configuration
AGENT_ID="${1:-}"
AGENT_TYPE="${2:-claude-code}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs"
STATE_DIR="$PROJECT_ROOT/.agent-states"
AGENT_LOG="$LOG_DIR/agent-$AGENT_ID.log"
AGENT_STATE="$STATE_DIR/agent-$AGENT_ID.json"

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
    echo "[$timestamp] [$level] $message" | tee -a "$AGENT_LOG"
}

# Error handling
error_exit() {
    log "ERROR" "$1"
    exit 1
}

# Cleanup function
cleanup() {
    local exit_code=$?
    log "INFO" "Agent wrapper shutting down (exit code: $exit_code)"
    
    # Update agent state
    if [[ -f "$AGENT_STATE" ]]; then
        jq '.status = "stopped" | .stoppedAt = now | .exitCode = '${exit_code}'' "$AGENT_STATE" > "$AGENT_STATE.tmp" && mv "$AGENT_STATE.tmp" "$AGENT_STATE" 2>/dev/null || true
    fi
    
    # Kill any child processes
    if [[ -n "${AGENT_PID:-}" ]]; then
        kill -TERM "$AGENT_PID" 2>/dev/null || true
        sleep 2
        kill -KILL "$AGENT_PID" 2>/dev/null || true
    fi
    
    exit $exit_code
}

# Set up signal handlers
trap cleanup EXIT
trap 'log "WARN" "Received SIGTERM, shutting down gracefully"; exit 143' TERM
trap 'log "WARN" "Received SIGINT, shutting down gracefully"; exit 130' INT

# Validation
if [[ -z "$AGENT_ID" ]]; then
    error_exit "Agent ID is required as first argument"
fi

if [[ ! "$AGENT_TYPE" =~ ^(claude-code|worker|monitor)$ ]]; then
    error_exit "Invalid agent type: $AGENT_TYPE. Must be one of: claude-code, worker, monitor"
fi

# Setup directories
mkdir -p "$LOG_DIR" "$STATE_DIR"

# Initialize agent state
init_agent_state() {
    local state='{
        "id": "'$AGENT_ID'",
        "type": "'$AGENT_TYPE'",
        "status": "starting",
        "pid": '$$',
        "startedAt": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
        "workingDirectory": "'$PROJECT_ROOT'",
        "logFile": "'$AGENT_LOG'",
        "environment": {},
        "metrics": {
            "commandsExecuted": 0,
            "uptime": 0,
            "memoryUsage": 0,
            "cpuUsage": 0
        }
    }'
    
    echo "$state" > "$AGENT_STATE"
    log "INFO" "Initialized agent state: $AGENT_STATE"
}

# Update agent status
update_status() {
    local status="$1"
    if [[ -f "$AGENT_STATE" ]]; then
        jq '.status = "'$status'" | .lastUpdate = now' "$AGENT_STATE" > "$AGENT_STATE.tmp" && mv "$AGENT_STATE.tmp" "$AGENT_STATE" 2>/dev/null || true
    fi
}

# Resource monitoring
start_monitoring() {
    while true; do
        if [[ -f "$AGENT_STATE" ]] && [[ -n "${AGENT_PID:-}" ]]; then
            # Get memory and CPU usage
            local mem_kb=$(ps -o rss= -p "$AGENT_PID" 2>/dev/null || echo "0")
            local cpu_percent=$(ps -o %cpu= -p "$AGENT_PID" 2>/dev/null || echo "0.0")
            local uptime=$(($(date +%s) - $(date -j -f "%Y-%m-%dT%H:%M:%S" "$(jq -r '.startedAt' "$AGENT_STATE" | cut -d'.' -f1)" +%s 2>/dev/null || echo $(date +%s))))
            
            # Update metrics
            jq --argjson mem "$mem_kb" --argjson cpu "$cpu_percent" --argjson uptime "$uptime" \
               '.metrics.memoryUsage = $mem | .metrics.cpuUsage = $cpu | .metrics.uptime = $uptime | .lastUpdate = now' \
               "$AGENT_STATE" > "$AGENT_STATE.tmp" && mv "$AGENT_STATE.tmp" "$AGENT_STATE" 2>/dev/null || true
        fi
        sleep 30
    done &
    
    MONITOR_PID=$!
    log "INFO" "Started resource monitoring (PID: $MONITOR_PID)"
}

# Health check endpoint
start_health_check() {
    local port=${AGENT_HEALTH_PORT:-$((8000 + $(echo $AGENT_ID | od -An -N4 -tu4) % 1000))}
    
    # Simple HTTP health check server
    while true; do
        echo -e "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n$(cat "$AGENT_STATE" 2>/dev/null || echo '{}')" | nc -l -p "$port" -q 1 2>/dev/null || true
        sleep 1
    done &
    
    HEALTH_PID=$!
    log "INFO" "Started health check server on port $port (PID: $HEALTH_PID)"
}

# Claude Code agent implementation
run_claude_code_agent() {
    log "INFO" "Starting Claude Code agent"
    
    # Check if claude command is available
    if ! command -v claude &> /dev/null; then
        log "WARN" "Claude CLI not found, simulating agent behavior"
        simulate_claude_agent
        return
    fi
    
    # Start interactive Claude session
    local claude_cmd="claude --interactive --project-dir='$PROJECT_ROOT'"
    
    # Add any agent-specific parameters
    if [[ -n "${CLAUDE_MODEL:-}" ]]; then
        claude_cmd="$claude_cmd --model='$CLAUDE_MODEL'"
    fi
    
    if [[ -n "${CLAUDE_CONFIG:-}" ]]; then
        claude_cmd="$claude_cmd --config='$CLAUDE_CONFIG'"
    fi
    
    log "INFO" "Executing: $claude_cmd"
    
    # Execute Claude with proper signal handling
    eval "$claude_cmd" &
    AGENT_PID=$!
    
    # Wait for the process to complete
    wait $AGENT_PID
    local exit_code=$?
    
    log "INFO" "Claude agent exited with code: $exit_code"
    return $exit_code
}

# Simulated Claude agent for testing
simulate_claude_agent() {
    log "INFO" "Running simulated Claude agent"
    
    local iteration=0
    while true; do
        iteration=$((iteration + 1))
        
        # Simulate some work
        log "INFO" "Iteration $iteration: Processing tasks..."
        
        # Update command count
        if [[ -f "$AGENT_STATE" ]]; then
            jq '.metrics.commandsExecuted = .metrics.commandsExecuted + 1' "$AGENT_STATE" > "$AGENT_STATE.tmp" && mv "$AGENT_STATE.tmp" "$AGENT_STATE" 2>/dev/null || true
        fi
        
        # Simulate variable work duration
        sleep $((RANDOM % 10 + 5))
        
        # Occasionally simulate errors (5% chance)
        if [[ $((RANDOM % 20)) -eq 0 ]]; then
            log "ERROR" "Simulated error occurred in iteration $iteration"
            return 1
        fi
        
        # Check for shutdown signal
        if [[ -f "$STATE_DIR/shutdown-$AGENT_ID" ]]; then
            log "INFO" "Shutdown signal received"
            rm -f "$STATE_DIR/shutdown-$AGENT_ID"
            break
        fi
    done
    
    log "INFO" "Simulated agent completed normally"
    return 0
}

# Worker agent implementation
run_worker_agent() {
    log "INFO" "Starting worker agent"
    
    # Worker agents process specific tasks from the queue
    while true; do
        # Check for tasks in the task queue
        local task_file="$STATE_DIR/tasks-$AGENT_ID.json"
        
        if [[ -f "$task_file" ]]; then
            log "INFO" "Processing task from $task_file"
            
            # Process the task (simplified implementation)
            local task_result='{
                "status": "completed",
                "completedAt": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
                "result": "Task processed successfully"
            }'
            
            echo "$task_result" > "${task_file}.result"
            rm -f "$task_file"
            
            # Update metrics
            if [[ -f "$AGENT_STATE" ]]; then
                jq '.metrics.commandsExecuted = .metrics.commandsExecuted + 1' "$AGENT_STATE" > "$AGENT_STATE.tmp" && mv "$AGENT_STATE.tmp" "$AGENT_STATE" 2>/dev/null || true
            fi
        fi
        
        # Check for shutdown
        if [[ -f "$STATE_DIR/shutdown-$AGENT_ID" ]]; then
            log "INFO" "Worker agent shutdown requested"
            rm -f "$STATE_DIR/shutdown-$AGENT_ID"
            break
        fi
        
        sleep 5
    done
    
    log "INFO" "Worker agent completed"
    return 0
}

# Monitor agent implementation
run_monitor_agent() {
    log "INFO" "Starting monitor agent"
    
    while true; do
        # Monitor system resources and other agents
        local total_agents=$(ls -1 "$STATE_DIR"/agent-*.json 2>/dev/null | wc -l)
        local running_agents=$(grep -l '"status": "running"' "$STATE_DIR"/agent-*.json 2>/dev/null | wc -l)
        
        log "INFO" "System status: $running_agents/$total_agents agents running"
        
        # Monitor system resources
        local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
        local memory_usage=$(free | awk 'NR==2{printf "%.1f", $3*100/$2}' 2>/dev/null || echo "N/A")
        
        log "INFO" "System load: $load_avg, Memory usage: $memory_usage%"
        
        # Update metrics
        if [[ -f "$AGENT_STATE" ]]; then
            jq --argjson total "$total_agents" --argjson running "$running_agents" \
               '.metrics.totalAgents = $total | .metrics.runningAgents = $running | .metrics.commandsExecuted = .metrics.commandsExecuted + 1' \
               "$AGENT_STATE" > "$AGENT_STATE.tmp" && mv "$AGENT_STATE.tmp" "$AGENT_STATE" 2>/dev/null || true
        fi
        
        # Check for shutdown
        if [[ -f "$STATE_DIR/shutdown-$AGENT_ID" ]]; then
            log "INFO" "Monitor agent shutdown requested"
            rm -f "$STATE_DIR/shutdown-$AGENT_ID"
            break
        fi
        
        sleep 10
    done
    
    log "INFO" "Monitor agent completed"
    return 0
}

# Main execution
main() {
    log "INFO" "Starting agent wrapper for $AGENT_ID (type: $AGENT_TYPE)"
    log "INFO" "Project root: $PROJECT_ROOT"
    log "INFO" "Log file: $AGENT_LOG"
    log "INFO" "State file: $AGENT_STATE"
    
    # Initialize
    init_agent_state
    update_status "starting"
    
    # Start monitoring
    start_monitoring
    start_health_check
    
    # Update status to running
    update_status "running"
    log "INFO" "Agent $AGENT_ID is now running"
    
    # Run the appropriate agent type
    case "$AGENT_TYPE" in
        "claude-code")
            run_claude_code_agent
            ;;
        "worker")
            run_worker_agent
            ;;
        "monitor")
            run_monitor_agent
            ;;
        *)
            error_exit "Unknown agent type: $AGENT_TYPE"
            ;;
    esac
    
    local exit_code=$?
    log "INFO" "Agent execution completed with exit code: $exit_code"
    
    # Update final status
    if [[ $exit_code -eq 0 ]]; then
        update_status "completed"
    else
        update_status "failed"
    fi
    
    return $exit_code
}

# Help function
show_help() {
    cat << EOF
Usage: $0 <agent_id> [agent_type]

Arguments:
    agent_id    Unique identifier for the agent
    agent_type  Type of agent to run (claude-code|worker|monitor)
                Default: claude-code

Environment Variables:
    CLAUDE_MODEL       Model to use for Claude agents
    CLAUDE_CONFIG      Configuration file for Claude
    AGENT_HEALTH_PORT  Port for health check server

Examples:
    $0 agent-001 claude-code
    $0 worker-001 worker
    $0 monitor-001 monitor

Files:
    Logs:           $LOG_DIR/agent-<id>.log
    State:          $STATE_DIR/agent-<id>.json
    Tasks:          $STATE_DIR/tasks-<id>.json
    Shutdown:       $STATE_DIR/shutdown-<id>

EOF
}

# Check for help request
if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    show_help
    exit 0
fi

# Run main function
main "$@"