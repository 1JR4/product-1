import { ref, get, set, push } from 'firebase/database';
import { realtimeDb } from '../firebase/config';

export interface RateLimit {
  requests: number;
  windowMs: number;
  max: number;
  message?: string;
}

export interface TokenLimit {
  inputTokens: number;
  outputTokens: number;
  maxInputTokensPerHour: number;
  maxOutputTokensPerHour: number;
  maxCostPerDay: number;
  currentCost: number;
}

export interface SecurityConfig {
  rateLimits: {
    api: RateLimit;
    agents: RateLimit;
    messages: RateLimit;
  };
  tokenLimits: TokenLimit;
  blockedIPs: string[];
  suspiciousActivity: {
    threshold: number;
    actions: string[];
  };
}

export class RateLimiter {
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  async checkRateLimit(
    identifier: string, 
    type: 'api' | 'agents' | 'messages'
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const limit = this.config.rateLimits[type];
    const now = Date.now();
    const windowStart = now - limit.windowMs;
    
    const requestsRef = ref(realtimeDb, `rateLimits/${identifier}/${type}`);
    const snapshot = await get(requestsRef);
    const requests = snapshot.val() || [];
    
    // Filter requests within the current window
    const validRequests = requests.filter((timestamp: number) => timestamp > windowStart);
    
    if (validRequests.length >= limit.max) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.min(...validRequests) + limit.windowMs
      };
    }
    
    // Add current request
    validRequests.push(now);
    await set(requestsRef, validRequests);
    
    return {
      allowed: true,
      remaining: limit.max - validRequests.length,
      resetTime: now + limit.windowMs
    };
  }

  async checkTokenLimit(
    agentId: string,
    inputTokens: number,
    outputTokens: number,
    cost: number
  ): Promise<{ allowed: boolean; reason?: string }> {
    const now = new Date();
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Check hourly token limits
    const hourlyUsageRef = ref(realtimeDb, `tokenUsage/${agentId}/hourly/${hourStart.getTime()}`);
    const hourlySnapshot = await get(hourlyUsageRef);
    const hourlyUsage = hourlySnapshot.val() || { inputTokens: 0, outputTokens: 0, cost: 0 };
    
    if (hourlyUsage.inputTokens + inputTokens > this.config.tokenLimits.maxInputTokensPerHour) {
      return { allowed: false, reason: 'Hourly input token limit exceeded' };
    }
    
    if (hourlyUsage.outputTokens + outputTokens > this.config.tokenLimits.maxOutputTokensPerHour) {
      return { allowed: false, reason: 'Hourly output token limit exceeded' };
    }
    
    // Check daily cost limit
    const dailyUsageRef = ref(realtimeDb, `tokenUsage/${agentId}/daily/${dayStart.getTime()}`);
    const dailySnapshot = await get(dailyUsageRef);
    const dailyUsage = dailySnapshot.val() || { cost: 0 };
    
    if (dailyUsage.cost + cost > this.config.tokenLimits.maxCostPerDay) {
      return { allowed: false, reason: 'Daily cost limit exceeded' };
    }
    
    // Update usage
    await set(hourlyUsageRef, {
      inputTokens: hourlyUsage.inputTokens + inputTokens,
      outputTokens: hourlyUsage.outputTokens + outputTokens,
      cost: hourlyUsage.cost + cost
    });
    
    await set(dailyUsageRef, {
      cost: dailyUsage.cost + cost
    });
    
    return { allowed: true };
  }

  async logSuspiciousActivity(
    identifier: string,
    activity: string,
    metadata?: any
  ): Promise<void> {
    const activityRef = push(ref(realtimeDb, `security/suspicious/${identifier}`));
    await set(activityRef, {
      activity,
      timestamp: Date.now(),
      metadata: metadata || {}
    });
    
    // Check if threshold is exceeded
    const recentRef = ref(realtimeDb, `security/suspicious/${identifier}`);
    const snapshot = await get(recentRef);
    const activities = snapshot.val() || {};
    
    const recentActivities = Object.values(activities).filter(
      (item: any) => item.timestamp > Date.now() - 60 * 60 * 1000 // Last hour
    );
    
    if (recentActivities.length >= this.config.suspiciousActivity.threshold) {
      await this.triggerSecurityActions(identifier, recentActivities);
    }
  }

  private async triggerSecurityActions(identifier: string, activities: any[]): Promise<void> {
    for (const action of this.config.suspiciousActivity.actions) {
      switch (action) {
        case 'block_ip':
          await this.blockIP(identifier);
          break;
        case 'suspend_agent':
          await this.suspendAgent(identifier);
          break;
        case 'alert_admin':
          await this.alertAdmin(identifier, activities);
          break;
        case 'increase_monitoring':
          await this.increaseMonitoring(identifier);
          break;
      }
    }
  }

  private async blockIP(ip: string): Promise<void> {
    const blockedIPsRef = ref(realtimeDb, 'security/blockedIPs');
    const snapshot = await get(blockedIPsRef);
    const blockedIPs = snapshot.val() || [];
    
    if (!blockedIPs.includes(ip)) {
      blockedIPs.push(ip);
      await set(blockedIPsRef, blockedIPs);
    }
  }

  private async suspendAgent(agentId: string): Promise<void> {
    const suspendedRef = ref(realtimeDb, `security/suspendedAgents/${agentId}`);
    await set(suspendedRef, {
      suspended: true,
      timestamp: Date.now(),
      reason: 'Suspicious activity detected'
    });
  }

  private async alertAdmin(identifier: string, activities: any[]): Promise<void> {
    const alertRef = push(ref(realtimeDb, 'security/alerts'));
    await set(alertRef, {
      identifier,
      activities,
      timestamp: Date.now(),
      severity: 'high',
      message: `Suspicious activity detected for ${identifier}`
    });
  }

  private async increaseMonitoring(identifier: string): Promise<void> {
    const monitoringRef = ref(realtimeDb, `security/enhancedMonitoring/${identifier}`);
    await set(monitoringRef, {
      enabled: true,
      timestamp: Date.now(),
      duration: 24 * 60 * 60 * 1000 // 24 hours
    });
  }

  async isBlocked(identifier: string): Promise<boolean> {
    const blockedIPsRef = ref(realtimeDb, 'security/blockedIPs');
    const snapshot = await get(blockedIPsRef);
    const blockedIPs = snapshot.val() || [];
    return blockedIPs.includes(identifier);
  }

  async isAgentSuspended(agentId: string): Promise<boolean> {
    const suspendedRef = ref(realtimeDb, `security/suspendedAgents/${agentId}`);
    const snapshot = await get(suspendedRef);
    const data = snapshot.val();
    return data?.suspended === true;
  }

  // Cleanup old data
  async cleanup(): Promise<void> {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
    
    // Clean up rate limit data
    const rateLimitsRef = ref(realtimeDb, 'rateLimits');
    const snapshot = await get(rateLimitsRef);
    const data = snapshot.val() || {};
    
    for (const [identifier, types] of Object.entries(data)) {
      for (const [type, requests] of Object.entries(types as any)) {
        const validRequests = (requests as number[]).filter(timestamp => timestamp > cutoff);
        await set(ref(realtimeDb, `rateLimits/${identifier}/${type}`), validRequests);
      }
    }
    
    // Clean up suspicious activity logs
    const suspiciousRef = ref(realtimeDb, 'security/suspicious');
    const suspiciousSnapshot = await get(suspiciousRef);
    const suspiciousData = suspiciousSnapshot.val() || {};
    
    for (const [identifier, activities] of Object.entries(suspiciousData)) {
      const recentActivities = Object.fromEntries(
        Object.entries(activities as any).filter(([_, activity]: [string, any]) => 
          activity.timestamp > cutoff
        )
      );
      await set(ref(realtimeDb, `security/suspicious/${identifier}`), recentActivities);
    }
  }
}

// Default security configuration
export const defaultSecurityConfig: SecurityConfig = {
  rateLimits: {
    api: {
      requests: 0,
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per 15 minutes
      message: 'Too many API requests'
    },
    agents: {
      requests: 0,
      windowMs: 60 * 1000, // 1 minute
      max: 10, // 10 agent operations per minute
      message: 'Too many agent operations'
    },
    messages: {
      requests: 0,
      windowMs: 60 * 1000, // 1 minute
      max: 50, // 50 messages per minute
      message: 'Too many messages'
    }
  },
  tokenLimits: {
    inputTokens: 0,
    outputTokens: 0,
    maxInputTokensPerHour: 50000,
    maxOutputTokensPerHour: 25000,
    maxCostPerDay: 100,
    currentCost: 0
  },
  blockedIPs: [],
  suspiciousActivity: {
    threshold: 5, // 5 suspicious activities per hour
    actions: ['alert_admin', 'increase_monitoring']
  }
};

// Export singleton instance
export const rateLimiter = new RateLimiter(defaultSecurityConfig);