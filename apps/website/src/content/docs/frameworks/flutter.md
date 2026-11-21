---
title: Flutter
description: The AxiomText editor and math editor in Flutter apps on Android, iOS, macOS and the web.
---

The Flutter package is the same editor as the web version, bundled inside the package so it works
offline. It runs on Android, iOS, macOS and Flutter Web.

```bash
flutter pub add axiomtext
```

```dart
import 'package:axiomtext/axiomtext.dart';

final controller = AxiomTextController();

AxiomTextEditor(
  controller: controller,
  initialContent: AxiomContent.markdown('# Notes'),
  placeholder: 'Start writing…',
);

final json = await controller.getJson(); // save this
await controller.execute(AxiomCommands.toggleBold);
```

## What you get

- A **native toolbar** in Material 3 or Cupertino style that sits above the keyboard, with menus
  for text style, fonts, colours, alignment, tables and links. Prefer the editor's own toolbar?
  Use `toolbar: AxiomToolbarMode.web`.
- A **native math keyboard** on phones: numbers, fractions, powers, roots, functions, Greek
  letters and symbols, plus a LaTeX box.
- **Photos** from the library or camera. Give `uploadImage` to send them to your server;
  without it they're embedded in the document.
- The app's **theme** (light and dark) and **language** (10 languages, right-to-left included)
  are applied automatically.

## Platform setup

**iOS** `Info.plist`: `NSPhotoLibraryUsageDescription` and `NSCameraUsageDescription`.

**macOS** entitlements: `com.apple.security.network.client` (needed by the system WebView, even
offline) and `com.apple.security.files.user-selected.read-only`.

## Same documents everywhere

JSON saved from Flutter opens in the web editor and the other way round. HTML from
`getHtml()` displays on your website with `axiomtext/content.css`, exactly like in the app
(see [Showing content on your website](/guides/website-rendering/)).

The full API and options are in the
[package README](https://github.com/axiomtext/axiomtext/tree/main/packages/flutter).
