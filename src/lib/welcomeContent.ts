// Welcome note content as BlockNote blocks
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const welcomeBlocks: any[] = [
  {
    id: "welcome-heading",
    type: "heading",
    props: { level: 1 },
    content: [{ type: "text", text: "notes, that's it", styles: {} }],
    children: []
  },
  {
    id: "welcome-intro",
    type: "paragraph",
    props: {},
    content: [{ type: "text", text: "This is a very simple notes app.", styles: {} }],
    children: []
  },
  {
    id: "welcome-intro2",
    type: "paragraph",
    props: {},
    content: [{ type: "text", text: "it supports slash commands, task lists, and tags, and markdown", styles: {} }],
    children: []
  },
  {
    id: "welcome-intro3",
    type: "paragraph",
    props: {},
    content: [{ type: "text", text: "Your notes are stored locally and never leave your device.", styles: {} }],
    children: []
  },
  {
    id: "welcome-intro4",
    type: "paragraph",
    props: {},
    content: [{ type: "text", text: "I may add a multi-device sync in the future.", styles: {} }],
    children: []
  },
  {
    id: "welcome-intro5",
    type: "paragraph",
    props: {},
    content: [{ type: "text", text: "until then, enjoy a very minimal writing experience.", styles: {} }],
    children: []
  },
  {
    id: "welcome-features-heading",
    type: "heading",
    props: { level: 2 },
    content: [{ type: "text", text: "Getting Started", styles: {} }],
    children: []
  },
  {
    id: "welcome-feature-1",
    type: "bulletListItem",
    props: {},
    content: [
      { type: "text", text: "Press ", styles: {} },
      { type: "text", text: "Cmd+K or ⌘", styles: { bold: true } },
      { type: "text", text: " to open the command palette", styles: {} }
    ],
    children: []
  },
  {
    id: "welcome-feature-2",
    type: "bulletListItem",
    props: {},
    content: [
      { type: "text", text: "Type ", styles: {} },
      { type: "text", text: "/", styles: { bold: true } },
      { type: "text", text: " to see formatting options", styles: {} }
    ],
    children: []
  },
  {
    id: "welcome-feature-3",
    type: "bulletListItem",
    props: {},
    content: [
      { type: "text", text: "Use ", styles: {} },
      { type: "text", text: "#tags", styles: { bold: true } },
      { type: "text", text: " anywhere to organize notes", styles: {} }
    ],
    children: []
  },
  {
    id: "welcome-feature-4",
    type: "bulletListItem",
    props: {},
    content: [
      { type: "text", text: "Search by tag with ", styles: {} },
      { type: "text", text: "#tagname", styles: { bold: true } },
      { type: "text", text: " in the command palette", styles: {} }
    ],
    children: []
  },
  {
    id: "welcome-checklist-heading",
    type: "heading",
    props: { level: 2 },
    content: [{ type: "text", text: "Try it out", styles: {} }],
    children: []
  },
  {
    id: "welcome-task-1",
    type: "checkListItem",
    props: { checked: false },
    content: [{ type: "text", text: "Create a new note from the command palette", styles: {} }],
    children: []
  },
  {
    id: "welcome-task-2",
    type: "checkListItem",
    props: { checked: false },
    content: [{ type: "text", text: "Add a #tag to this note", styles: {} }],
    children: []
  },
  {
    id: "welcome-task-3",
    type: "checkListItem",
    props: { checked: false },
    content: [{ type: "text", text: "Install this app to your home screen", styles: {} }],
    children: []
  },
  {
    id: "welcome-end",
    type: "paragraph",
    props: {},
    content: [],
    children: []
  }
];
