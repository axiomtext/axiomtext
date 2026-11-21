/// AxiomText for Flutter: a free rich text editor with a visual math editor built in.
///
/// ```dart
/// final controller = AxiomTextController();
///
/// AxiomTextEditor(controller: controller, placeholder: 'Start writing…');
///
/// final json = await controller.getJson(); // save this
/// ```
///
/// Same editor as the AxiomText web SDK, bundled in the package (no network needed).
/// Runs on Android, iOS, macOS and the web. See https://axiomtext.dev/frameworks/flutter/.
library;

export 'src/controller.dart'
    show
        AxiomCommands,
        AxiomCursorPosition,
        AxiomEditorException,
        AxiomMathCommand,
        AxiomTextController;
export 'src/editor.dart'
    show
        AxiomMathKeyboardMode,
        AxiomTextEditor,
        AxiomToolbarMode,
        AxiomToolbarPosition;
export 'src/math/math_keyboard.dart' show AxiomMathKeyboard;
export 'src/media.dart'
    show
        AxiomImagePickerOptions,
        AxiomImageUploader,
        imageSource,
        mimeTypeFor,
        pickAndInsertImage;
export 'src/models.dart';
export 'src/theme.dart' show AxiomEditorTheme;
export 'src/toolbar/sheets.dart' show AxiomMarkSample;
export 'src/view/markdown.dart' show markdownToDocument;
export 'src/view/pdf_view.dart' show AxiomPdfView;
export 'src/view/text_view.dart' show AxiomTextView;
export 'src/toolbar/toolbar.dart'
    show AxiomToolbar, AxiomToolbarItem, AxiomToolbarStyle;
