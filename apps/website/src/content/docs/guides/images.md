---
title: Images
description: Uploading, wrapping text around images, captions, and moving images.
---

## Adding images

- Toolbar **Image** button: upload from the computer or insert from a URL.
- Paste a screenshot, or drag image files into the editor.

PNG, JPEG, GIF, WebP and AVIF are accepted (SVG is not, because it can contain scripts). Files are
limited to 5 MB by default.

## Where images are stored

By default images are embedded in the document (base64), which needs no server. For real sites,
upload them to your server and store the URL:

```js
import { createImagePlugin, createXhrUploadAdapter } from '@axiomtext/plugin-image';

const Image = createImagePlugin({
  upload: createXhrUploadAdapter('/api/uploads', { 'X-CSRF-Token': token }),
  maxFileSize: 10 * 1024 * 1024,
});
```

The endpoint receives a `POST` with the file as `multipart/form-data` (field `file`) and responds
with `{ "url": "https://…" }`. Or write your own adapter: `{ upload(file) { return Promise<url> } }`.

## Text wrapping

Click an image to choose:

| Option | Behaviour |
|---|---|
| **In line with text** | Sits on the text line like a large character. |
| **Wrap text, image left/right** | Floats to the side; text flows beside it for its full height. |
| **Break text** | Centered on its own line, text above and below. |
| **Text on both sides** | The paragraph becomes text, then the image, then text, like Google Docs and Notion. Each side is written separately. Drag the handle to resize the middle. |

Drag the round handle to resize. Add a caption and alt text from the image bar.

## Moving images

Drag them with the mouse, or click an image and use the arrow keys: ←/→ move it one character,
↑/↓ one line. <kbd>Alt</kbd>+<kbd>Shift</kbd>+arrows always move a selected image. Typing while an
image is selected continues after it; <kbd>Esc</kbd> returns to the text.
