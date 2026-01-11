export type BlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'task'
  | 'bulletList'
  | 'numberedList'
  | 'code';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  metadata?: {
    completed?: boolean; // for tasks
    taskId?: string; // for tasks - references Task entity in DB
    language?: string; // for code blocks
  };
}
