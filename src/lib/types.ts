export interface Note {
  id: string;
  title: string;
  content: string;
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
  lineNumber: number;
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
