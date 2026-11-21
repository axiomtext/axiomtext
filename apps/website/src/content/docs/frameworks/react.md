---
title: React
description: Use AxiomText in React.
---

```bash
npm install @axiomtext/react katex
```

```jsx
import { AxiomEditor } from '@axiomtext/react';
import '@axiomtext/ui/styles.css';
import 'katex/dist/katex.min.css';

export function PostEditor({ post, onSave }) {
  return (
    <AxiomEditor
      defaultValue={post.content}
      onChange={(doc) => onSave(doc)}
      placeholder="Write your post…"
    />
  );
}
```

## Props

Every [editor option](/reference/options/) is a prop, plus:

| Prop | Type | |
|---|---|---|
| `defaultValue` | `DocumentJSON` | Starting content (uncontrolled). |
| `value` | `DocumentJSON` | Controlled content: the editor follows it when it changes. |
| `onChange` | `(doc, editor) => void` | Called after every change. |
| `onReady` | `(editor) => void` | Called once the editor exists. |
| `type` | `'classic' \| 'inline' \| 'balloon'` | Editor type (default `classic`). |
| `className`, `style` | | For the wrapper element. |

## Using the editor API

```jsx
const ref = useRef(null);
<AxiomEditor ref={ref} />;
ref.current.editor.execute('toggleBold');
```

Options other than `value` are read when the editor is created. To change them, give the component
a new `key`. Works with React 18 and 19, including StrictMode, and with Next.js client components
(`'use client'`).
