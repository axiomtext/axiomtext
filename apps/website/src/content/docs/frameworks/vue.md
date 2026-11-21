---
title: Vue
description: Use AxiomText in Vue 3.
---

```bash
npm install @axiomtext/vue katex
```

```vue
<script setup>
import { ref } from 'vue';
import { AxiomEditor } from '@axiomtext/vue';
import '@axiomtext/ui/styles.css';
import 'katex/dist/katex.min.css';

const doc = ref(savedDocument);
</script>

<template>
  <AxiomEditor v-model="doc" placeholder="Write something…" />
</template>
```

## Props and events

| Prop | Type | |
|---|---|---|
| `v-model` / `modelValue` | `DocumentJSON` | The content, kept in sync both ways. |
| `type` | `'classic' \| 'inline' \| 'balloon'` | Editor type (default `classic`). |
| `plugins` | `AxiomPlugin[]` | Features (default: all). |
| `placeholder`, `language`, `translations`, `editable` | | Common options. |
| `options` | `object` | Any other [editor option](/reference/options/). |

| Event | |
|---|---|
| `update:modelValue` | After every change. |
| `ready` | With the editor, once created. |

Get the editor with a template ref: `editorRef.value.editor`. Works with Nuxt in client-only
components (`<ClientOnly>`).
