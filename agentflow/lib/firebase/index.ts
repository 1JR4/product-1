// Firebase configuration and main exports
export { default as app, db, realtimeDb, storage, functions } from './config';

// Firestore services
export {
  projectsService,
  agentsService,
  featuresService,
  tasksService,
  tokenUsageService,
  checkpointsService
} from './firestore';

// Realtime services
export {
  messagesService,
  heartbeatService,
  sharedMemoryService,
  activityService,
  presenceService,
  notificationsService
} from './realtime';

// Types
export type {
  Project,
  Agent,
  Feature,
  Task,
  AgentMessage,
  AgentHeartbeat,
  ProjectSharedMemory,
  TokenUsage,
  AgentCheckpoint
} from '../types';