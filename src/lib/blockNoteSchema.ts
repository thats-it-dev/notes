import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';

// Remove unsupported block types
const {
  image: _image,
  video: _video,
  audio: _audio,
  file: _file,
  ...supportedBlockSpecs
} = defaultBlockSpecs;

export const schema = BlockNoteSchema.create({
  blockSpecs: supportedBlockSpecs,
});

export type CustomSchema = typeof schema;
