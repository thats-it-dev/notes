export interface Note {
  id: string;
  title: string;
  content: any; // BlockNote JSON structure (use any for now)
  markdownCache: string; // Generated markdown for search
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  lastOpenedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  noteId: string;
  blockId: string; // Changed from lineNumber
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  name: string;
  usageCount: number;
  lastUsedAt: Date;
}

export interface ParsedContent {
  title: string;
  tags: string[];
  tasks: Array<{
    title: string;
    completed: boolean;
    lineNumber: number;
    tags: string[];
  }>;
}
