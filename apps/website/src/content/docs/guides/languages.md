---
title: Languages & RTL
description: Translate the interface and write right-to-left text.
---

The interface ships in English, বাংলা (bn), हिन्दी (hi), العربية (ar), Español (es), Français (fr),
Deutsch (de), Português (pt), 简体中文 (zh) and 日本語 (ja).

```js
import bn from '@axiomtext/ui/locales/bn';
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
