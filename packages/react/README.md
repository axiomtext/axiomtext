# @axiomtext/react

The [AxiomText](https://axiomtext.dev) editor (free rich text + math) as a React component.

```bash
npm install @axiomtext/react katex
```

```jsx
import { AxiomEditor } from '@axiomtext/react';
import '@axiomtext/ui/styles.css';
import 'katex/dist/katex.min.css';

<AxiomEditor defaultValue={saved} onChange={(doc) => save(doc)} />;
```

Props: every editor option, plus `value` / `defaultValue`, `onChange`, `onReady`,
`type` (`classic` | `inline` | `balloon`), `className`, `style`. Docs: https://axiomtext.dev/frameworks/react/
