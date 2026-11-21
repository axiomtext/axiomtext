# AxiomText for Flutter

A free, MIT-licensed rich text editor for Flutter with a **visual math editor** built in. It's
the same editor as the [AxiomText](https://axiomtext.dev) web SDK, bundled inside the package,
so it works offline with no server.

- Headings, lists, to-do lists, quotes, links, fonts, colours, alignment, tables, images
- Inline and block equations: tap to edit, a native math keyboard on phones, LaTeX if you
  prefer, and maths pasted from ChatGPT or Wikipedia stays an equation
- A native Material 3 or Cupertino toolbar that sits above the keyboard, or the editor's own toolbar
- Comments (threads, replies, resolve) saved in the document, and readers' own highlights and
  notes on read-only content
- Marked books: your own mark types (Important, Past exam question…) with app data, badges, tap
  events, page numbers, a legend and reading filters; the same marks on existing PDFs
- `AxiomTextView`: content drawn natively (no WebView) for long lists of questions
- JSON (lossless), HTML and Markdown in and out
- Follows your app's theme, light and dark, and its locale: 10 interface languages including
  Arabic (right to left) and Bangla
- Photos from the library or camera, uploaded to your server or embedded in the document

| Android | iOS | macOS | Web | Windows, Linux |
| ------- | --- | ----- | --- | -------------- |
| ✓       | ✓   | ✓     | ✓   | not yet        |

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

**macOS:** in `macos/Runner/DebugProfile.entitlements` and `Release.entitlements` add
`com.apple.security.network.client` (the system WebView needs it, even offline) and
`com.apple.security.files.user-selected.read-only` (photo picker), both `<true/>`.

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
final json = await controller.getJson();      // store this (lossless)
final html = await controller.getHtml();      // show it on a website
await controller.setJson(json);

// Autosave at most twice a second
controller.contentStream().listen(saveToDatabase);
```

Put the editor where it can fill the space (for example a `Scaffold` body). Inside a scrolling
list, use `shrinkWrap: true` so it grows with its content.

### Controller

| Method                                                    | What it does                                    |
| --------------------------------------------------------- | ----------------------------------------------- |
| `getJson()` / `getHtml()` / `getMarkdown()` / `getText()` | Read the document                               |
| `setJson()` / `setHtml()` / `setMarkdown()`               | Replace the document                            |
| `execute(AxiomCommands.toggleBold)`                       | Run a command (`setHeading`, `insertTable`, …)  |
| `insertImage(url)` / `insertMath(latex)` / `insertText()` | Insert at the cursor                            |
| `undo()` / `redo()` / `focus()` / `unfocus()`             | History and keyboard                            |
| `setEditable(false)`                                      | Read-only                                       |
| `state`, `stats`, `onChange`, `onSelectionChange`         | Formatting at the cursor, word count, events    |

### Options

```dart
AxiomTextEditor(
  toolbar: AxiomToolbarMode.native,          // native (default), web or none
  toolbarStyle: AxiomToolbarStyle.adaptive,  // Cupertino on iOS/macOS, Material elsewhere
  toolbarPosition: AxiomToolbarPosition.bottom,
  toolbarItems: [AxiomToolbarItem.bold, AxiomToolbarItem.math, AxiomToolbarItem.image],
  readOnly: false,
  locale: const Locale('bn'),                // defaults to the app's locale
  theme: AxiomEditorTheme.fromTheme(Theme.of(context), fontFamily: 'Georgia, serif'),
  uploadImage: (file) => myApi.upload(file.bytes, file.name),   // returns the image URL
  onLinkTap: (uri) => launchUrl(uri),        // read-only mode
  mathKeyboard: AxiomMathKeyboardMode.auto,  // native math keyboard on Android and iOS
  documentMode: false,                       // paper-like page
  shrinkWrap: false,                         // grow with content inside lists
)
```

Without `uploadImage`, images are embedded in the document as base64, which needs no server.

### Comments and readers' highlights

```dart
// Comments while writing (threads are saved inside the document):
AxiomTextEditor(
  commentAuthor: const AxiomCommentAuthor(name: 'Ana', id: 'user-42'),
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

Select text → **Comment** on the toolbar; tap a highlight to see its thread or note.
`commentsOnly: true` lets reviewers comment without changing the text.

Colours are a preset or any colour, with the background highlighted (default) or the text
only underlined:

```dart
await controller.addComment(
  'Check this',
  color: AxiomHighlightColor.custom(const Color(0xFF1E88E5)),
  fill: false,
);
await controller.setCommentStyle(threadId, color: AxiomHighlightColor.green, fill: true);
```

### Marked books

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

await controller.setMark('important', data: {'questionIds': ['q1', 'q2']}, badge: '2');
await controller.getMarks();        // with text, data and page
await controller.insertPage(23);
await controller.scrollToPage(23);
await controller.setMarkFilter(AxiomMarkFilter.marked); // fold unmarked paragraphs
await controller.notebook();        // the reader's highlights, for a "My notes" screen
```

Writers get the Mark menu (`AxiomToolbarItem.mark`, Alt+1…9) and `AxiomToolbarItem.page`.

### PDFs

```dart
AxiomPdfView(
  bytes: pdfBytes,
  markTypes: markTypes,
  markMode: isTeacher, // teachers mark; students highlight and take notes
  annotations: [for (final m in saved) AxiomPdfAnnotation.fromMap(m)],
  onChanged: (items) => save([for (final a in items) a.toMap()]),
  onMarkTap: (mark) => showQuestions(mark.data),
);
```

### Native view (no WebView)

```dart
AxiomTextView(content: AxiomContent.json(question), markTypes: markTypes, onMarkTap: practise)
AxiomTextView(content: AxiomContent.markdown(r'Solve $x^2 = 4$'))
```

Draws headings, lists, tables, images, links, colours, page numbers, comments, marks and
equations with Flutter widgets: light enough for long lists. Read-only.

### Faster first open

```dart
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  AxiomTextEditor.prewarm(); // loads the editor in the background (count: 3 for several views)
  runApp(const MyApp());
}
```

### Showing saved content

Render `getHtml()` on a website with the `axiomtext/content.css` stylesheet (see
[the docs](https://axiomtext.dev/guides/website-rendering/)), or show it in Flutter with a
read-only editor: `AxiomTextEditor(readOnly: true, initialContent: AxiomContent.json(saved))`.

## Security

The editor runs from files inside your app with a strict Content Security Policy: it can't load
scripts or make network requests. Messages between Dart and the editor are plain JSON, checked
against a fixed list of allowed methods and events; nothing is ever evaluated as code. Links
never open inside the editor.

## Example

[`example/`](example) has demos for notes, math homework, a document, a reading view, a marked
book, a native quiz list and a comment box.

## License

MIT. Built on [ProseMirror](https://prosemirror.net), [KaTeX](https://katex.org) and
[MathLive](https://mathlive.io).
