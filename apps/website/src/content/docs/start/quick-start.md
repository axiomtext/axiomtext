---
title: Quick start
description: Create your first editor in a minute.
---

```html
<div id="editor"></div>
```

```js
import { createClassicEditor } from 'axiomtext';
import 'axiomtext/styles.css';

const { editor } = createClassicEditor({
  element: document.querySelector('#editor'),
  placeholder: 'Start writing…',
});

// Save whenever the content changes.
editor.on('change', () => {
  const json = editor.getJSON(); // store this in your database
  const html = editor.getHTML(); // or this, to show on your website
});
```

## Loading saved content

```js
createClassicEditor({ element, content: savedJson });
// or later:
editor.setJSON(savedJson);
```

Store the JSON: it is the lossless format and is upgraded automatically when the format changes.
Use the HTML to show the content on your website (see [Showing content on your website](/guides/website-rendering/)).

## Next steps

- [Editor types](/guides/editor-types/): classic, inline or balloon
- [Math](/guides/math/): what your users can do with equations
- [Saving & loading](/guides/saving/): JSON, HTML, Markdown and autosave
