# Firebase Setup for AgentFlow

This directory contains the complete Firebase setup for the AgentFlow application, including Firestore, Realtime Database, Storage, and Functions integration.

## 📁 File Structure

```
lib/firebase/
├── config.ts           # Firebase initialization and configuration
├── firestore.ts        # Firestore database services and types
├── realtime.ts         # Realtime Database services and types
├── storage.ts          # Firebase Storage services and utilities
├── index.ts            # Main exports for easy importing
├── test-connection.ts  # Test script to verify Firebase setup
└── README.md          # This file
```

## 🚀 Quick Start

### 1. Environment Setup

Copy the environment template:
```bash
cp .env.local.example .env.local
```

Update `.env.local` with your Firebase project configuration:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
# ... other variables
```

### 2. Import Services

```typescript
// Import individual services
import { userService, agentService, flowService } from '@/lib/firebase';

// Import Firebase instances
import { auth, db, storage } from '@/lib/firebase';

// Import types
import type { User, Agent, Flow } from '@/lib/firebase';
```

### 3. Test Connection

```bash
npx tsx lib/firebase/test-connection.ts
```

## 📊 Firestore Services

### User Management
```typescript
import { userService } from '@/lib/firebase';

// Create a user
const userId = await userService.create({
  email: 'user@example.com',
  displayName: 'John Doe',
  role: 'user'
});

// Get user by ID
const user = await userService.getById(userId);

// Update user
await userService.update(userId, { displayName: 'Jane Doe' });
```

### Agent Management
```typescript
import { agentService } from '@/lib/firebase';

// Create an agent
const agentId = await agentService.create({
  name: 'My Agent',
  description: 'AI assistant for automation',
  configuration: { model: 'gpt-4' },
  ownerId: 'user123',
  isActive: true
});
```

### Flow Management
```typescript
import { flowService } from '@/lib/firebase';

// Create a flow
const flowId = await flowService.create({
  name: 'Data Processing Flow',
  description: 'Automated data processing pipeline',
  steps: [
    { id: 'step1', type: 'action', configuration: {}, order: 1 }
  ],
  ownerId: 'user123',
  isPublic: false,
  status: 'draft'
});
```

## ⚡ Realtime Database Services

### Live Sessions
```typescript
import { realtimeService } from '@/lib/firebase';

// Create a live session
const sessionId = await realtimeService.createLiveSession({
  userId: 'user123',
  flowId: 'flow456',
  status: 'active',
  participants: ['user123', 'user456']
});

// Listen to session changes
realtimeService.onLiveSessionChange(sessionId, (session) => {
  console.log('Session updated:', session);
});
```

### Chat Messages
```typescript
// Send a chat message
await realtimeService.sendChatMessage({
  sessionId: 'session123',
  userId: 'user123',
  userName: 'John Doe',
  message: 'Hello, world!',
  type: 'text'
});

// Listen to chat messages
realtimeService.onChatMessages('session123', (messages) => {
  console.log('New messages:', messages);
});
```

### User Presence
```typescript
// Set user presence
await realtimeService.setUserPresence('user123', {
  displayName: 'John Doe',
  status: 'online'
});

// Listen to all user presence
realtimeService.onUserPresence((users) => {
  console.log('Online users:', users.filter(u => u.status === 'online'));
});
```

## 📦 Storage Services

### File Upload with Progress
```typescript
import { storageService } from '@/lib/firebase';

const uploadTask = storageService.uploadFile(
  'uploads/myfile.pdf',
  file,
  { contentType: 'application/pdf' },
  (progress) => console.log(`Upload: ${progress.percentage}%`),
  (error) => console.error('Upload failed:', error),
  (downloadURL) => console.log('Upload complete:', downloadURL)
);
```

### User Avatar Upload
```typescript
// Upload user avatar with automatic sizing and naming
const avatarURL = await storageService.uploadUserAvatar(
  'user123',
  avatarFile,
  (progress) => setUploadProgress(progress.percentage)
);
```

### Flow and Agent Assets
```typescript
// Upload flow diagram
const diagramURL = await storageService.uploadFlowAsset(
  'flow123',
  diagramFile,
  'diagram'
);

// Upload agent configuration
const configURL = await storageService.uploadAgentAsset(
  'agent123',
  configFile,
  'config'
);
```

## 🔒 Security Rules

### Firestore Rules
The `firestore.rules` file provides comprehensive security including:
- User-based access control
- Admin permissions
- Public/private resource separation
- Data validation

### Realtime Database Rules
The `database.rules.json` file secures:
- Live session management
- Chat message validation
- User presence tracking
- System status monitoring

## 🎯 TypeScript Support

All services include full TypeScript support with:
- Interface definitions for all data types
- Generic service classes for CRUD operations
- Type-safe query builders
- Comprehensive error handling

### Available Types
```typescript
// Core types
type User = {
  id?: string;
  email: string;
  displayName?: string;
  role?: 'admin' | 'user';
  // ...
};

type Agent = {
  id?: string;
  name: string;
  description?: string;
  configuration: Record<string, any>;
  ownerId: string;
  isActive: boolean;
  // ...
};

type Flow = {
  id?: string;
  name: string;
  description?: string;
  steps: FlowStep[];
  ownerId: string;
  isPublic: boolean;
  status: 'draft' | 'published' | 'archived';
  // ...
};
```

## 🛠 Deployment

### Deploy Security Rules
```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Realtime Database rules
firebase deploy --only database

# Deploy all rules
firebase deploy --only firestore:rules,database
```

### Initialize Collections
The services will automatically create collections when first used, but you may want to initialize with sample data for testing.

## 🔧 Advanced Usage

### Custom Queries
```typescript
// Get published flows only
const publishedFlows = await flowService.getWhere('status', '==', 'published', 10);

// Real-time subscription with custom query
const unsubscribe = flowService.onSnapshot(
  (flows) => setFlows(flows),
  (error) => console.error('Subscription error:', error)
);
```

### Batch Operations
```typescript
import { realtimeService } from '@/lib/firebase';

// Batch update multiple paths
await realtimeService.batchUpdate({
  'flowStates/flow1/status': 'completed',
  'flowStates/flow2/status': 'failed',
  'systemStatus/lastUpdated': Date.now()
});
```

### Error Handling
```typescript
import { handleFirestoreError } from '@/lib/firebase';

try {
  await userService.create(userData);
} catch (error) {
  handleFirestoreError(error); // Converts Firebase errors to user-friendly messages
}
```

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Realtime Database Rules](https://firebase.google.com/docs/database/security)
- [Firebase Storage Security](https://firebase.google.com/docs/storage/security)

## 🐛 Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**
   - Ensure `.env.local` exists and variables start with `NEXT_PUBLIC_`
   - Restart the development server after adding new variables

2. **Permission Denied Errors**
   - Check Firestore and Realtime Database security rules
   - Ensure user is authenticated before accessing protected resources

3. **Storage Upload Failures**
   - Verify file size limits
   - Check file type restrictions
   - Ensure proper content-type headers

4. **TypeScript Errors**
   - Run `npm run build` to check for type errors
   - Ensure all imports use correct paths

### Debug Mode
Set environment variable to enable debug logging:
```env
NEXT_PUBLIC_FIREBASE_DEBUG=true
```