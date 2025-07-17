import { ref, push, set, get, onValue, off, serverTimestamp, onDisconnect } from 'firebase/database';
import { realtimeDb } from './config';
import type { AgentMessage, AgentHeartbeat, ProjectSharedMemory } from '../types';

// Agent Messages
export const messagesService = {
  async send(message: Omit<AgentMessage, 'id' | 'timestamp' | 'read'>) {
    const messageRef = push(ref(realtimeDb, `agents/${message.toAgentId}/inbox`));
    await set(messageRef, {
      ...message,
      id: messageRef.key,
      timestamp: serverTimestamp(),
      read: false
    });
    
    // Also store in outbox
    const outboxRef = push(ref(realtimeDb, `agents/${message.fromAgentId}/outbox`));
    await set(outboxRef, {
      ...message,
      id: messageRef.key,
      timestamp: serverTimestamp(),
      read: false
    });
  },

  subscribeToInbox(agentId: string, callback: (messages: AgentMessage[]) => void) {
    const inboxRef = ref(realtimeDb, `agents/${agentId}/inbox`);
    const unsubscribe = onValue(inboxRef, snapshot => {
      const data = snapshot.val();
      const messages = data ? Object.values(data) as AgentMessage[] : [];
      callback(messages.sort((a, b) => b.timestamp - a.timestamp));
    });
    return () => off(inboxRef, 'value', unsubscribe);
  },

  async markAsRead(agentId: string, messageId: string) {
    await set(ref(realtimeDb, `agents/${agentId}/inbox/${messageId}/read`), true);
  },

  async clearInbox(agentId: string) {
    await set(ref(realtimeDb, `agents/${agentId}/inbox`), null);
  }
};

// Agent Heartbeats
export const heartbeatService = {
  async updateHeartbeat(heartbeat: AgentHeartbeat) {
    const heartbeatRef = ref(realtimeDb, `agents/${heartbeat.agentId}/heartbeat`);
    await set(heartbeatRef, {
      ...heartbeat,
      timestamp: serverTimestamp()
    });
    
    // Set up disconnect cleanup
    const disconnectRef = onDisconnect(heartbeatRef);
    await disconnectRef.set({
      ...heartbeat,
      status: 'offline',
      timestamp: serverTimestamp()
    });
  },

  subscribeToHeartbeat(agentId: string, callback: (heartbeat: AgentHeartbeat | null) => void) {
    const heartbeatRef = ref(realtimeDb, `agents/${agentId}/heartbeat`);
    const unsubscribe = onValue(heartbeatRef, snapshot => {
      const data = snapshot.val();
      callback(data as AgentHeartbeat | null);
    });
    return () => off(heartbeatRef, 'value', unsubscribe);
  },

  subscribeToAllHeartbeats(projectId: string, callback: (heartbeats: Record<string, AgentHeartbeat>) => void) {
    // This would need to be implemented with a Cloud Function to efficiently query agents by project
    // For now, we'll subscribe to individual agents when we know their IDs
  },

  async getLastHeartbeat(agentId: string): Promise<AgentHeartbeat | null> {
    const snapshot = await get(ref(realtimeDb, `agents/${agentId}/heartbeat`));
    return snapshot.val() as AgentHeartbeat | null;
  }
};

// Project Shared Memory
export const sharedMemoryService = {
  async updateSharedMemory(projectId: string, updates: Partial<ProjectSharedMemory['context']>) {
    const memoryRef = ref(realtimeDb, `projects/${projectId}/sharedMemory`);
    const snapshot = await get(memoryRef);
    const currentMemory = snapshot.val() as ProjectSharedMemory | null;
    
    const updatedMemory: ProjectSharedMemory = {
      projectId,
      context: {
        ...currentMemory?.context,
        ...updates
      },
      lastUpdated: serverTimestamp() as any
    };
    
    await set(memoryRef, updatedMemory);
  },

  async addDecision(projectId: string, decision: string, rationale: string, agentId: string) {
    const memoryRef = ref(realtimeDb, `projects/${projectId}/sharedMemory/context/decisions`);
    const decisionsRef = push(memoryRef);
    await set(decisionsRef, {
      decision,
      rationale,
      timestamp: serverTimestamp(),
      agentId
    });
  },

  async addBlocker(projectId: string, blocker: string) {
    const blockerRef = push(ref(realtimeDb, `projects/${projectId}/sharedMemory/context/blockers`));
    await set(blockerRef, blocker);
  },

  async removeBlocker(projectId: string, blockerKey: string) {
    await set(ref(realtimeDb, `projects/${projectId}/sharedMemory/context/blockers/${blockerKey}`), null);
  },

  subscribeToSharedMemory(projectId: string, callback: (memory: ProjectSharedMemory | null) => void) {
    const memoryRef = ref(realtimeDb, `projects/${projectId}/sharedMemory`);
    const unsubscribe = onValue(memoryRef, snapshot => {
      const data = snapshot.val();
      callback(data as ProjectSharedMemory | null);
    });
    return () => off(memoryRef, 'value', unsubscribe);
  },

  async getSharedMemory(projectId: string): Promise<ProjectSharedMemory | null> {
    const snapshot = await get(ref(realtimeDb, `projects/${projectId}/sharedMemory`));
    return snapshot.val() as ProjectSharedMemory | null;
  }
};

// Live Activity Feed
export const activityService = {
  async logActivity(projectId: string, agentId: string, action: string, details?: any) {
    const activityRef = push(ref(realtimeDb, `projects/${projectId}/activity`));
    await set(activityRef, {
      agentId,
      action,
      details,
      timestamp: serverTimestamp()
    });
  },

  subscribeToActivity(projectId: string, callback: (activities: any[]) => void) {
    const activityRef = ref(realtimeDb, `projects/${projectId}/activity`);
    const unsubscribe = onValue(activityRef, snapshot => {
      const data = snapshot.val();
      const activities = data ? Object.values(data) : [];
      callback(activities.sort((a: any, b: any) => b.timestamp - a.timestamp));
    });
    return () => off(activityRef, 'value', unsubscribe);
  }
};

// Agent Presence
export const presenceService = {
  async setOnline(agentId: string, projectId: string) {
    const presenceRef = ref(realtimeDb, `projects/${projectId}/presence/${agentId}`);
    await set(presenceRef, {
      status: 'online',
      timestamp: serverTimestamp()
    });
    
    // Set up disconnect cleanup
    const disconnectRef = onDisconnect(presenceRef);
    await disconnectRef.set({
      status: 'offline',
      timestamp: serverTimestamp()
    });
  },

  async setOffline(agentId: string, projectId: string) {
    await set(ref(realtimeDb, `projects/${projectId}/presence/${agentId}`), {
      status: 'offline',
      timestamp: serverTimestamp()
    });
  },

  subscribeToPresence(projectId: string, callback: (presence: Record<string, { status: string; timestamp: number }>) => void) {
    const presenceRef = ref(realtimeDb, `projects/${projectId}/presence`);
    const unsubscribe = onValue(presenceRef, snapshot => {
      const data = snapshot.val();
      callback(data || {});
    });
    return () => off(presenceRef, 'value', unsubscribe);
  }
};

// Notifications
export const notificationsService = {
  async send(userId: string, notification: {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    data?: any;
  }) {
    const notificationRef = push(ref(realtimeDb, `users/${userId}/notifications`));
    await set(notificationRef, {
      ...notification,
      id: notificationRef.key,
      timestamp: serverTimestamp(),
      read: false
    });
  },

  subscribeToNotifications(userId: string, callback: (notifications: any[]) => void) {
    const notificationsRef = ref(realtimeDb, `users/${userId}/notifications`);
    const unsubscribe = onValue(notificationsRef, snapshot => {
      const data = snapshot.val();
      const notifications = data ? Object.values(data) : [];
      callback(notifications.sort((a: any, b: any) => b.timestamp - a.timestamp));
    });
    return () => off(notificationsRef, 'value', unsubscribe);
  },

  async markAsRead(userId: string, notificationId: string) {
    await set(ref(realtimeDb, `users/${userId}/notifications/${notificationId}/read`), true);
  }
};