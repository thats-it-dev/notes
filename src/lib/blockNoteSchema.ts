import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';

// Use default schema for now
// We'll add custom tag inline content later
export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
  },
});

export type CustomSchema = typeof schema;
