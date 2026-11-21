---
title: Flutter
description: The AxiomText rich text and math editor for Flutter on Android, iOS, macOS and the web, with comments and readers' highlights.
---

The [`axiomtext`](https://pub.dev/packages/axiomtext) package is the same editor as the web
version, bundled inside the package so it works offline with no server. Free and MIT licensed.

| Android | iOS | macOS | Web | Windows, Linux |
| ------- | --- | ----- | --- | -------------- |
| ✓       | ✓   | ✓     | ✓   | not yet        |

Needs Flutter 3.27 or later.

## Install

```bash
flutter pub add axiomtext
```

**iOS:** add to `ios/Runner/Info.plist` (for the photo picker):

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>Add photos to your documents.</string>
<key>NSCameraUsageDescription</key>
<string>Take photos for your documents.</string>
```

**macOS:** in `macos/Runner/DebugProfile.entitlements` and `Release.entitlements`, add
`com.apple.security.network.client` (the system WebView needs it, even offline) and
`com.apple.security.files.user-selected.read-only` (photo picker), both `<true/>`.

Android and the web need no setup.

## Use

```dart
import 'package:axiomtext/axiomtext.dart';

final controller = AxiomTextController();

Scaffold(
  body: AxiomTextEditor(
    controller: controller,
    initialContent: AxiomContent.markdown('# Notes\n\nArea: \$A = \\pi r^2\$'),
    placeholder: 'Start writing…',
  ),
);

// Save and load
final json = await controller.getJson(); // store this (lossless)
final html = await controller.getHtml(); // show it on a website
await controller.setJson(json);

// Autosave at most twice a second
controller.contentStream().listen(saveToDatabase);
```

Put the editor where it can fill the space, such as a `Scaffold` body. Inside a scrolling list,
use `shrinkWrap: true` so it grows with its content.

## What you get

- A **native toolbar** in Material 3 or Cupertino style that sits above the keyboard, with menus
  for text style, fonts, colours, alignment, tables and links. Prefer the editor's own toolbar?
  Use `toolbar: AxiomToolbarMode.web`.
- A **native math keyboard** on phones: numbers, fractions, powers, roots, functions, Greek
  letters and symbols, plus a LaTeX box. Maths pasted from ChatGPT or Wikipedia stays an
  equation.
- **Comments** and **readers' highlights**, with any colour (see below).
- **Photos** from the library or camera. Give `uploadImage` to send them to your server;
  without it they're embedded in the document.
- The app's **theme** (light and dark) and **language** (10 languages, right-to-left included)
  are applied automatically.

## Controller

| Method | What it does |
| --- | --- |
| `getJson()` / `getHtml()` / `getMarkdown()` / `getText()` | Read the document |
| `setJson()` / `setHtml()` / `setMarkdown()` | Replace the document |
| `execute(AxiomCommands.toggleBold)` | Run a command (`setHeading`, `insertTable`, …) |
| `insertImage(url)` / `insertMath(latex)` / `insertText()` | Insert at the cursor |
| `undo()` / `redo()` / `focus()` / `unfocus()` | History and keyboard |
| `setEditable(false)` | Read-only |
| `state`, `stats`, `onChange`, `onSelectionChange` | Formatting at the cursor, word count, events |

## Options

```dart
AxiomTextEditor(
  toolbar: AxiomToolbarMode.native,          // native (default), web or none
  toolbarStyle: AxiomToolbarStyle.adaptive,  // Cupertino on iOS/macOS, Material elsewhere
  toolbarPosition: AxiomToolbarPosition.bottom,
  toolbarItems: [AxiomToolbarItem.bold, AxiomToolbarItem.math, AxiomToolbarItem.image],
  readOnly: false,
  locale: const Locale('bn'),                // defaults to the app's locale
  theme: AxiomEditorTheme.fromTheme(Theme.of(context), fontFamily: 'Georgia, serif'),
  uploadImage: (file) => myApi.upload(file.bytes, file.name), // returns the image URL
  onLinkTap: (uri) => launchUrl(uri),        // read-only mode
  mathKeyboard: AxiomMathKeyboardMode.auto,  // native math keyboard on Android and iOS
  documentMode: false,                       // paper-like page
  shrinkWrap: false,                         // grow with content inside lists
)
```

## Comments and readers' highlights

```dart
// Comments while writing (threads are saved inside the document):
AxiomTextEditor(
  controller: controller,
  commentAuthor: const AxiomCommentAuthor(name: 'Ana Silva', id: 'user-42'),
  onCommentsChanged: (threads) => notify(threads),
);

// A reading view where readers highlight and take notes, like a marked-up book:
AxiomTextEditor(
  readOnly: true,
  initialContent: AxiomContent.json(chapter),
  highlights: [for (final m in savedMaps) AxiomReaderHighlight.fromMap(m)],
  onHighlightsChanged: (items) => save([for (final h in items) h.toMap()]),
);
```

Select text, then **Comment** on the toolbar; tap a highlight to see its thread or note.
`commentsOnly: true` lets reviewers comment without changing the text, and
`commentModerator: true` may edit or delete anyone's messages.

**Colours.** Each comment and highlight has a colour (one of six presets, or any colour) and a
background setting: highlighted (the default) or only underlined. People pick them in the
editor's colour picker; from code:

```dart
await controller.addComment(
  'Check this',
  color: AxiomHighlightColor.custom(const Color(0xFF1E88E5)), // or AxiomHighlightColor.blue
  fill: false, // underline only
);
await controller.setCommentStyle(threadId, color: AxiomHighlightColor.green, fill: true);

final threads = await controller.getComments();
threads.first.color.toColor(); // a Color for your own UI
threads.first.fill;            // background on or off
```

The controller also has `replyToComment`, `resolveComment`, `deleteCommentThread`,
`toggleCommentsPanel`, `getHighlights` and `setHighlights`, and the streams
`onCommentsChange` and `onHighlightsChange`. See
[Comments & highlights](/guides/comments/) for how they work.

## Marked books and PDFs

Named marks with app data, page numbers, a legend, reading filters and tap events, the same as on
the web:

```dart
AxiomTextEditor(
  readOnly: true,
  initialContent: AxiomContent.json(chapter),
  markTypes: const [
    AxiomMarkType(id: 'important', label: 'গুরুত্বপূর্ণ', color: Color(0xFF16A34A)),
    AxiomMarkType(id: 'pyq', label: 'পূর্বের বছরের প্রশ্ন', color: Color(0xFFB45309),
        style: AxiomMarkStyle.box),
  ],
  onMarkTap: (mark) => showQuestions(mark.data?['questionIds'], mark.page),
  selectionActions: const [AxiomSelectionAction(id: 'ask', label: 'Ask AI')],
  onSelectionAction: (event) => askAi(event.text),
);
```

Writers get `AxiomToolbarItem.mark` and `AxiomToolbarItem.page` on the toolbar. The controller has
`setMark`, `removeMark`, `setMarkData`, `getMarkData`, `setMarkBadge`, `getMarks`, `getPages`,
`insertPage`, `scrollToPage`, `setMarkFilter`, `notebook()` and `revealHighlight`. See
[marked books](/guides/marked-books/).

`AxiomPdfView(bytes: pdf, markTypes: …, markMode: isTeacher)` shows an existing PDF with the same
marks, highlights and notes. See [PDF annotation](/guides/pdf-annotation/).

## Native view (no WebView)

`AxiomTextView` draws content with Flutter widgets: headings, lists, tables, images, links,
colours, page numbers, comments, marks (with badges and taps) and equations (via
`flutter_math_fork`). It's read-only and light enough for long lists such as quiz questions and
answer options.

```dart
ListView.builder(
  itemCount: questions.length,
  itemBuilder: (context, i) => AxiomTextView(
    content: AxiomContent.json(questions[i]), // or AxiomContent.markdown('Solve \$x^2 = 4\$')
    markTypes: markTypes,
    onMarkTap: practise,
  ),
);
```

Use `AxiomTextEditor` to edit, or for anything the native view doesn't draw.

## Faster first open

```dart
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  AxiomTextEditor.prewarm(); // loads the editor in the background
  // For a screen with several read-only editors: AxiomTextEditor.prewarm(count: 3);
  runApp(const MyApp());
}
```

Long chapters open fast: equations render as they come near the screen and paragraphs far
below aren't laid out until you scroll to them. With `shrinkWrap: true` the editor reports its
exact height, growing and shrinking with the content.

## Same documents everywhere

JSON saved from Flutter opens in the web editor and the other way round. HTML from
`getHtml()` displays on your website with `axiomtext/content.css`, exactly like in the app,
comments and colours included (see
[Showing content on your website](/guides/website-rendering/)).

## Security

The editor runs from files inside your app with a strict Content Security Policy: it can't load
scripts or make network requests. Messages between Dart and the editor are plain JSON, checked
against a fixed list of allowed methods and events; nothing is ever run as code. Links never
open inside the editor.

## Example app

The package's [`example/`](https://github.com/axiomtext/axiomtext/tree/main/packages/flutter/example)
has five demos: notes with comments, math homework, a document, a reading view with highlights,
and a comment box. The full API is on [pub.dev](https://pub.dev/documentation/axiomtext/latest/).
