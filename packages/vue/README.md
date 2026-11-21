# @axiomtext/vue

The [AxiomText](https://axiomtext.dev) editor (free rich text + math) as a Vue 3 component.

```bash
npm install axiomtext @axiomtext/vue
```

```vue
<script setup>
import { AxiomEditor } from '@axiomtext/vue';
import 'axiomtext/styles.css';
const doc = ref(saved);
</script>

<template><AxiomEditor v-model="doc" /></template>
```

Docs: https://axiomtext.dev/frameworks/vue/
