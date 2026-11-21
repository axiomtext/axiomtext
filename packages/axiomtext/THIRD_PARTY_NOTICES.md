# Third-party notices

AxiomText is MIT licensed. It includes or adapts the following third-party work.

## bijoy2unicode (adapted)

The Bijoy (SutonnyMJ) → Unicode character table and reordering rules in
`packages/convert/src/bijoy.ts` are adapted from bijoy2unicode
(https://www.npmjs.com/package/bijoy2unicode).

```
MIT License

Copyright (c) 2026 Md. Jehad (Jehadur Rahman Emran)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## pdf.js (bundled in the Flutter package)

The Flutter package's editor engine includes pdf.js (`assets/editor/pdf.js`), loaded only when a
PDF is opened. pdf.js is © Mozilla and contributors, licensed under the Apache License 2.0
(https://www.apache.org/licenses/LICENSE-2.0), https://github.com/mozilla/pdf.js. On the web,
`axiomtext/pdf` uses the `pdfjs-dist` package you install yourself.

## Libraries bundled in the Flutter engine and CDN builds

ProseMirror (MIT), KaTeX (MIT), MathLive (MIT), markdown-it (MIT) and Lucide icons (ISC); their
licences are kept in the bundled files.
