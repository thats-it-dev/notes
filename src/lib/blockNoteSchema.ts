import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';
import { CustomCheckListItem } from './customCheckListItem';

// Remove unsupported block types
const {
  image: _image,
  video: _video,
  audio: _audio,
  file: _file,
  checkListItem: _checkListItem, // Remove default to use custom
  ...supportedBlockSpecs
} = defaultBlockSpecs;

export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...supportedBlockSpecs,
    // Use our custom checkListItem with due date rendering
    checkListItem: CustomCheckListItem(),
  },
});

export type CustomSchema = typeof schema;
