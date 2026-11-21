# @axiomtext/vue

The [AxiomText](https://axiomtext.dev) editor (free rich text + math) as a Vue 3 component.

```bash
npm install @axiomtext/vue katex
```

```vue
<script setup>
import { AxiomEditor } from '@axiomtext/vue';
import '@axiomtext/ui/styles.css';
import 'katex/dist/katex.min.css';
const doc = ref(saved);
</script>

<template><AxiomEditor v-model="doc" /></template>
```

Docs: https://axiomtext.dev/frameworks/vue/
