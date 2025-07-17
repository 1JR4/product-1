import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from './config';
import type { Project, Agent, Feature, Task, TokenUsage, AgentCheckpoint } from '../types';

// Projects
export const projectsService = {
  async create(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'projects'), {
      ...project,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  async get(projectId: string): Promise<Project | null> {
    const docSnap = await getDoc(doc(db, 'projects', projectId));
    if (!docSnap.exists()) return null;
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate()
    } as Project;
  },

  async update(projectId: string, updates: Partial<Project>) {
    await updateDoc(doc(db, 'projects', projectId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  async delete(projectId: string) {
    await deleteDoc(doc(db, 'projects', projectId));
  },

  async list(ownerId: string): Promise<Project[]> {
    const q = query(
      collection(db, 'projects'),
      where('ownerId', '==', ownerId),
      orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    })) as Project[];
  },

  subscribe(ownerId: string, callback: (projects: Project[]) => void) {
    const q = query(
      collection(db, 'projects'),
      where('ownerId', '==', ownerId),
      orderBy('updatedAt', 'desc')
    );
    return onSnapshot(q, snapshot => {
      const projects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Project[];
      callback(projects);
    });
  }
};

// Agents
export const agentsService = {
  async create(projectId: string, agent: Omit<Agent, 'id' | 'projectId'>) {
    const docRef = await addDoc(collection(db, 'projects', projectId, 'agents'), {
      ...agent,
      projectId,
      lastHeartbeat: serverTimestamp()
    });
    return docRef.id;
  },

  async get(projectId: string, agentId: string): Promise<Agent | null> {
    const docSnap = await getDoc(doc(db, 'projects', projectId, 'agents', agentId));
    if (!docSnap.exists()) return null;
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      lastHeartbeat: data.lastHeartbeat?.toDate()
    } as Agent;
  },

  async update(projectId: string, agentId: string, updates: Partial<Agent>) {
    await updateDoc(doc(db, 'projects', projectId, 'agents', agentId), {
      ...updates,
      lastHeartbeat: serverTimestamp()
    });
  },

  async delete(projectId: string, agentId: string) {
    await deleteDoc(doc(db, 'projects', projectId, 'agents', agentId));
  },

  async list(projectId: string): Promise<Agent[]> {
    const q = query(
      collection(db, 'projects', projectId, 'agents'),
      orderBy('lastHeartbeat', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      lastHeartbeat: doc.data().lastHeartbeat?.toDate()
    })) as Agent[];
  },

  subscribe(projectId: string, callback: (agents: Agent[]) => void) {
    const q = query(
      collection(db, 'projects', projectId, 'agents'),
      orderBy('lastHeartbeat', 'desc')
    );
    return onSnapshot(q, snapshot => {
      const agents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastHeartbeat: doc.data().lastHeartbeat?.toDate()
      })) as Agent[];
      callback(agents);
    });
  }
};

// Features
export const featuresService = {
  async create(projectId: string, feature: Omit<Feature, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'projects', projectId, 'features'), {
      ...feature,
      projectId,
      progress: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  async get(projectId: string, featureId: string): Promise<Feature | null> {
    const docSnap = await getDoc(doc(db, 'projects', projectId, 'features', featureId));
    if (!docSnap.exists()) return null;
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate()
    } as Feature;
  },

  async update(projectId: string, featureId: string, updates: Partial<Feature>) {
    await updateDoc(doc(db, 'projects', projectId, 'features', featureId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  async updateProgress(projectId: string, featureId: string) {
    // Calculate progress based on completed tasks
    const tasksQuery = query(collection(db, 'projects', projectId, 'features', featureId, 'tasks'));
    const tasksSnapshot = await getDocs(tasksQuery);
    const tasks = tasksSnapshot.docs.map(doc => doc.data()) as Task[];
    
    const completedTasks = tasks.filter(task => task.status === 'done').length;
    const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
    
    await this.update(projectId, featureId, { progress });
  },

  async list(projectId: string): Promise<Feature[]> {
    const q = query(
      collection(db, 'projects', projectId, 'features'),
      orderBy('priority', 'desc'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    })) as Feature[];
  },

  subscribe(projectId: string, callback: (features: Feature[]) => void) {
    const q = query(
      collection(db, 'projects', projectId, 'features'),
      orderBy('priority', 'desc'),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, snapshot => {
      const features = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Feature[];
      callback(features);
    });
  }
};

// Tasks
export const tasksService = {
  async create(projectId: string, featureId: string, task: Omit<Task, 'id' | 'projectId' | 'featureId' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'projects', projectId, 'features', featureId, 'tasks'), {
      ...task,
      projectId,
      featureId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Update feature progress
    await featuresService.updateProgress(projectId, featureId);
    
    return docRef.id;
  },

  async update(projectId: string, featureId: string, taskId: string, updates: Partial<Task>) {
    await updateDoc(doc(db, 'projects', projectId, 'features', featureId, 'tasks', taskId), {
      ...updates,
      updatedAt: serverTimestamp(),
      ...(updates.status === 'done' && { completedAt: serverTimestamp() })
    });
    
    // Update feature progress
    await featuresService.updateProgress(projectId, featureId);
  },

  async list(projectId: string, featureId: string): Promise<Task[]> {
    const q = query(
      collection(db, 'projects', projectId, 'features', featureId, 'tasks'),
      orderBy('priority', 'desc'),
      orderBy('createdAt', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      completedAt: doc.data().completedAt?.toDate()
    })) as Task[];
  },

  subscribe(projectId: string, featureId: string, callback: (tasks: Task[]) => void) {
    const q = query(
      collection(db, 'projects', projectId, 'features', featureId, 'tasks'),
      orderBy('priority', 'desc'),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, snapshot => {
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        completedAt: doc.data().completedAt?.toDate()
      })) as Task[];
      callback(tasks);
    });
  }
};

// Token Usage Tracking
export const tokenUsageService = {
  async log(usage: Omit<TokenUsage, 'id'>) {
    await addDoc(collection(db, 'tokenUsage'), usage);
  },

  async getDailyUsage(projectId: string, date: string): Promise<TokenUsage[]> {
    const q = query(
      collection(db, 'tokenUsage'),
      where('projectId', '==', projectId),
      where('date', '==', date)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TokenUsage[];
  }
};

// Agent Checkpoints
export const checkpointsService = {
  async create(checkpoint: Omit<AgentCheckpoint, 'id' | 'timestamp'>) {
    const docRef = await addDoc(collection(db, 'checkpoints'), {
      ...checkpoint,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  },

  async getLatest(agentId: string): Promise<AgentCheckpoint | null> {
    const q = query(
      collection(db, 'checkpoints'),
      where('agentId', '==', agentId),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      timestamp: data.timestamp?.toDate()
    } as AgentCheckpoint;
  }
};