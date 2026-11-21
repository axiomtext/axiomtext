---
title: Languages & RTL
description: Translate the interface and write right-to-left text.
---

The interface ships in English, বাংলা (bn), हिन्दी (hi), العربية (ar), Español (es), Français (fr),
Deutsch (de), Português (pt), 简体中文 (zh) and 日本語 (ja).

```js
import bn from 'axiomtext/locales/bn';
createClassicEditor({ element, language: 'bn', translations: bn });
```

Each language is a separate file (about 3 KB gzip), so you only load what you use. With the CDN build,
use `await AxiomText.loadTranslations('bn')`.

## Right-to-left

Arabic, Urdu, Hebrew and Persian switch the whole editor to right-to-left: toolbar order, lists,
indentation and quotes. Equations always stay left-to-right.

## Your own translations

Message ids are the English texts, so a translation is a simple object:

```js
createClassicEditor({ element, language: 'it', translations: { Bold: 'Grassetto', Italic: 'Corsivo' } });
```

Anything not translated stays in English. Native speakers are welcome to improve the bundled
translations on GitHub.

## Typing in any language

Input methods (IMEs) for languages such as Japanese, Chinese, Korean, Bangla and Hindi work as
expected; Japanese and Bangla composition are covered by automated tests. Word count uses the
browser's language-aware word breaking.

## Bijoy to Unicode

Text from old Bangla Word files, PDFs and textbooks is often in **Bijoy** (SutonnyMJ and other
"MJ" fonts): Latin letters that only look like Bangla in that font. When such text is pasted,
AxiomText turns it into real Unicode Bangla, which searches, copies and displays correctly
everywhere, and shows a short notice with **Keep original** in case you want it as it was.

- Text in a Bijoy font (Word and web pages say so in the pasted HTML) is always converted.
  Mixed paragraphs work: only the Bijoy parts change.
- Plain text is converted only when it clearly looks like Bijoy. English is never converted.
- `editor.execute('convertSelectionFromBijoy')` converts selected text that was pasted as it was.

For import scripts, `convertBijoy(text)` and `looksLikeBijoy(text)` work anywhere, including
your server (`axiomtext/server`):

```js
import { convertBijoy } from 'axiomtext';

convertBijoy('Avgvi †mvbvi evsjv'); // "আমার সোনার বাংলা"
```

The conversion table is adapted from the MIT-licensed
[bijoy2unicode](https://www.npmjs.com/package/bijoy2unicode) package.
