import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  updateMetadata,
  UploadTask,
  UploadTaskSnapshot,
  FullMetadata
} from 'firebase/storage';
import { storage } from './config';

// Type definitions for Storage operations
export interface FileUploadOptions {
  customMetadata?: Record<string, string>;
  contentType?: string;
  cacheControl?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  contentLanguage?: string;
}

export interface FileUploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
  state: 'paused' | 'running' | 'success' | 'canceled' | 'error';
}

export interface StorageFile {
  name: string;
  fullPath: string;
  size: number;
  timeCreated: string;
  updated: string;
  contentType?: string;
  downloadURL: string;
  metadata?: FullMetadata;
}

export interface UploadProgressCallback {
  (progress: FileUploadProgress): void;
}

export interface UploadErrorCallback {
  (error: Error): void;
}

export interface UploadCompleteCallback {
  (downloadURL: string, metadata: FullMetadata): void;
}

// Storage paths constants
export const STORAGE_PATHS = {
  USER_AVATARS: 'avatars',
  FLOW_ASSETS: 'flows',
  AGENT_ASSETS: 'agents',
  EXECUTION_LOGS: 'executions/logs',
  EXECUTION_OUTPUTS: 'executions/outputs',
  TEMP_FILES: 'temp',
  DOCUMENTS: 'documents',
  IMAGES: 'images',
  VIDEOS: 'videos',
  AUDIO: 'audio'
} as const;

// Storage service class
export class StorageService {
  // File upload with progress tracking
  uploadFile(
    path: string,
    file: File | Blob,
    options?: FileUploadOptions,
    onProgress?: UploadProgressCallback,
    onError?: UploadErrorCallback,
    onComplete?: UploadCompleteCallback
  ): UploadTask {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file, options);

    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        const progress: FileUploadProgress = {
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
          percentage: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
          state: snapshot.state as 'paused' | 'running' | 'success' | 'canceled' | 'error'
        };
        
        if (onProgress) {
          onProgress(progress);
        }
      },
      (error) => {
        if (onError) {
          onError(new Error(`Upload failed: ${error.message}`));
        }
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const metadata = await getMetadata(uploadTask.snapshot.ref);
          
          if (onComplete) {
            onComplete(downloadURL, metadata);
          }
        } catch (error) {
          if (onError) {
            onError(new Error(`Failed to get download URL: ${error}`));
          }
        }
      }
    );

    return uploadTask;
  }

  // Simple file upload without progress tracking
  async uploadFileSimple(
    path: string,
    file: File | Blob,
    options?: FileUploadOptions
  ): Promise<{ downloadURL: string; metadata: FullMetadata }> {
    const storageRef = ref(storage, path);
    const uploadResult = await uploadBytes(storageRef, file, options);
    const downloadURL = await getDownloadURL(uploadResult.ref);
    const metadata = await getMetadata(uploadResult.ref);
    
    return { downloadURL, metadata };
  }

  // Upload user avatar
  async uploadUserAvatar(
    userId: string,
    file: File,
    onProgress?: UploadProgressCallback
  ): Promise<string> {
    const filename = `${userId}_${Date.now()}.${file.name.split('.').pop()}`;
    const path = `${STORAGE_PATHS.USER_AVATARS}/${filename}`;
    
    return new Promise((resolve, reject) => {
      this.uploadFile(
        path,
        file,
        {
          contentType: file.type,
          customMetadata: {
            userId,
            uploadedAt: new Date().toISOString()
          }
        },
        onProgress,
        reject,
        (downloadURL) => resolve(downloadURL)
      );
    });
  }

  // Upload flow asset (diagrams, configs, etc.)
  async uploadFlowAsset(
    flowId: string,
    file: File,
    assetType: 'diagram' | 'config' | 'template' | 'other' = 'other'
  ): Promise<string> {
    const filename = `${flowId}_${assetType}_${Date.now()}.${file.name.split('.').pop()}`;
    const path = `${STORAGE_PATHS.FLOW_ASSETS}/${flowId}/${filename}`;
    
    const { downloadURL } = await this.uploadFileSimple(path, file, {
      contentType: file.type,
      customMetadata: {
        flowId,
        assetType,
        originalName: file.name,
        uploadedAt: new Date().toISOString()
      }
    });
    
    return downloadURL;
  }

  // Upload agent asset
  async uploadAgentAsset(
    agentId: string,
    file: File,
    assetType: 'avatar' | 'config' | 'template' | 'other' = 'other'
  ): Promise<string> {
    const filename = `${agentId}_${assetType}_${Date.now()}.${file.name.split('.').pop()}`;
    const path = `${STORAGE_PATHS.AGENT_ASSETS}/${agentId}/${filename}`;
    
    const { downloadURL } = await this.uploadFileSimple(path, file, {
      contentType: file.type,
      customMetadata: {
        agentId,
        assetType,
        originalName: file.name,
        uploadedAt: new Date().toISOString()
      }
    });
    
    return downloadURL;
  }

  // Upload execution output files
  async uploadExecutionOutput(
    executionId: string,
    file: File | Blob,
    filename: string
  ): Promise<string> {
    const path = `${STORAGE_PATHS.EXECUTION_OUTPUTS}/${executionId}/${filename}`;
    
    const { downloadURL } = await this.uploadFileSimple(path, file, {
      customMetadata: {
        executionId,
        uploadedAt: new Date().toISOString()
      }
    });
    
    return downloadURL;
  }

  // Upload execution logs
  async uploadExecutionLogs(
    executionId: string,
    logs: string,
    format: 'txt' | 'json' = 'txt'
  ): Promise<string> {
    const filename = `${executionId}_logs_${Date.now()}.${format}`;
    const path = `${STORAGE_PATHS.EXECUTION_LOGS}/${filename}`;
    
    const blob = new Blob([logs], { 
      type: format === 'json' ? 'application/json' : 'text/plain' 
    });
    
    const { downloadURL } = await this.uploadFileSimple(path, blob, {
      contentType: blob.type,
      customMetadata: {
        executionId,
        logFormat: format,
        uploadedAt: new Date().toISOString()
      }
    });
    
    return downloadURL;
  }

  // Get file download URL
  async getDownloadURL(path: string): Promise<string> {
    const storageRef = ref(storage, path);
    return await getDownloadURL(storageRef);
  }

  // Delete file
  async deleteFile(path: string): Promise<void> {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  }

  // Get file metadata
  async getFileMetadata(path: string): Promise<FullMetadata> {
    const storageRef = ref(storage, path);
    return await getMetadata(storageRef);
  }

  // Update file metadata
  async updateFileMetadata(
    path: string,
    metadata: Partial<FileUploadOptions>
  ): Promise<FullMetadata> {
    const storageRef = ref(storage, path);
    return await updateMetadata(storageRef, metadata);
  }

  // List files in a directory
  async listFiles(path: string): Promise<StorageFile[]> {
    const storageRef = ref(storage, path);
    const result = await listAll(storageRef);
    
    const files = await Promise.all(
      result.items.map(async (itemRef) => {
        const metadata = await getMetadata(itemRef);
        const downloadURL = await getDownloadURL(itemRef);
        
        return {
          name: itemRef.name,
          fullPath: itemRef.fullPath,
          size: metadata.size,
          timeCreated: metadata.timeCreated,
          updated: metadata.updated,
          contentType: metadata.contentType,
          downloadURL,
          metadata
        } as StorageFile;
      })
    );
    
    return files;
  }

  // List user's files
  async listUserFiles(userId: string, fileType?: keyof typeof STORAGE_PATHS): Promise<StorageFile[]> {
    let basePath = '';
    
    if (fileType) {
      basePath = STORAGE_PATHS[fileType];
    }
    
    // For user-specific files, we'll search in relevant directories
    const paths = fileType 
      ? [basePath] 
      : [STORAGE_PATHS.USER_AVATARS, STORAGE_PATHS.DOCUMENTS];
    
    const allFiles: StorageFile[] = [];
    
    for (const path of paths) {
      try {
        const files = await this.listFiles(path);
        // Filter files that belong to this user (based on metadata or path)
        const userFiles = files.filter(file => 
          file.metadata?.customMetadata?.userId === userId ||
          file.fullPath.includes(userId)
        );
        allFiles.push(...userFiles);
      } catch (error) {
        console.warn(`Could not list files in ${path}:`, error);
      }
    }
    
    return allFiles;
  }

  // Clean up temp files (older than specified hours)
  async cleanupTempFiles(olderThanHours: number = 24): Promise<number> {
    const tempFiles = await this.listFiles(STORAGE_PATHS.TEMP_FILES);
    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
    let deletedCount = 0;
    
    for (const file of tempFiles) {
      const fileTime = new Date(file.timeCreated).getTime();
      if (fileTime < cutoffTime) {
        try {
          await this.deleteFile(file.fullPath);
          deletedCount++;
        } catch (error) {
          console.warn(`Could not delete temp file ${file.fullPath}:`, error);
        }
      }
    }
    
    return deletedCount;
  }

  // Generate a unique filename
  generateUniqueFilename(originalName: string, prefix: string = ''): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    const baseName = originalName.replace(/\.[^/.]+$/, "");
    
    return `${prefix}${prefix ? '_' : ''}${baseName}_${timestamp}_${randomString}.${extension}`;
  }

  // Get file size in human readable format
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export service instance
export const storageService = new StorageService();

// Utility functions
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

export const isVideoFile = (file: File): boolean => {
  return file.type.startsWith('video/');
};

export const isAudioFile = (file: File): boolean => {
  return file.type.startsWith('audio/');
};

export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

export const validateFileSize = (file: File, maxSizeMB: number): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};