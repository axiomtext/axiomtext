import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';

import 'bridge/protocol.dart';
import 'models.dart';
import 'platform/engine_view_base.dart';

/// Where to put the cursor when focusing.
enum AxiomCursorPosition {
  /// Start of the document.
  start,

  /// End of the document.
  end,
}

/// Editing commands built into AxiomText, for [AxiomTextController.execute].
///
/// Every name the editor knows is also listed in [AxiomEngineInfo.commands].
abstract final class AxiomCommands {
  /// Bold on/off.
  static const toggleBold = 'toggleBold';

  /// Italic on/off.
  static const toggleItalic = 'toggleItalic';

  /// Underline on/off.
  static const toggleUnderline = 'toggleUnderline';

  /// Strikethrough on/off.
  static const toggleStrikethrough = 'toggleStrikethrough';

  /// Inline code on/off.
  static const toggleCode = 'toggleCode';

  /// Subscript on/off.
  static const toggleSubscript = 'toggleSubscript';

  /// Superscript on/off.
  static const toggleSuperscript = 'toggleSuperscript';

  /// Removes text formatting.
  static const clearFormatting = 'clearFormatting';

  /// Heading; argument: level 1–6.
  static const setHeading = 'setHeading';

  /// Normal paragraph.
  static const setParagraph = 'setParagraph';

  /// Bulleted list on/off.
  static const toggleBulletList = 'toggleBulletList';

  /// Numbered list on/off.
  static const toggleOrderedList = 'toggleOrderedList';

  /// To-do list on/off.
  static const toggleTaskList = 'toggleTaskList';

  /// Indent a list item.
  static const indentListItem = 'indentListItem';

  /// Outdent a list item.
  static const outdentListItem = 'outdentListItem';

  /// Indent a paragraph.
  static const indentBlock = 'indentBlock';

  /// Outdent a paragraph.
  static const outdentBlock = 'outdentBlock';

  /// Quote on/off.
  static const toggleBlockquote = 'toggleBlockquote';

  /// Horizontal line.
  static const insertHorizontalRule = 'insertHorizontalRule';

  /// Page break.
  static const insertPageBreak = 'insertPageBreak';

  /// Link; argument: address.
  static const setLink = 'setLink';

  /// Removes the link at the cursor.
  static const unsetLink = 'unsetLink';

  /// Alignment; argument: `left`, `center`, `right` or `justify`.
  static const setTextAlign = 'setTextAlign';

  /// Font; argument: CSS font list or null.
  static const setFontFamily = 'setFontFamily';

  /// Size; argument: CSS size (e.g. `18px`) or null.
  static const setFontSize = 'setFontSize';

  /// Text colour; argument: colour or null.
  static const setTextColor = 'setTextColor';

  /// Highlight; argument: colour or null.
  static const setHighlight = 'setHighlight';

  /// Table; arguments: rows, columns.
  static const insertTable = 'insertTable';

  /// Equation in the text (opens the equation editor).
  static const insertMath = 'insertMath';

  /// Equation on its own line (opens the equation editor).
  static const insertMathBlock = 'insertMathBlock';
}

/// Commands for the equation being edited with the native math keyboard.
enum AxiomMathCommand {
  /// Delete before the caret.
  deleteBackward,

  /// Delete after the caret.
  deleteForward,

  /// Caret left.
  moveToPreviousChar,

  /// Caret right.
  moveToNextChar,

  /// Caret up (e.g. from denominator to numerator).
  moveUp,

  /// Caret down.
  moveDown,

  /// Caret to the start.
  moveToMathfieldStart,

  /// Caret to the end.
  moveToMathfieldEnd,

  /// Next empty box of a template.
  moveToNextPlaceholder,

  /// Previous empty box of a template.
  moveToPreviousPlaceholder,

  /// Undo inside the equation.
  undo,

  /// Redo inside the equation.
  redo,
}

/// Reads and changes the content of an `AxiomTextEditor` and tells you when it changes.
///
/// ```dart
/// final controller = AxiomTextController();
/// AxiomTextEditor(controller: controller);
///
/// final json = await controller.getJson();          // save this
/// await controller.execute(AxiomCommands.toggleBold);
/// controller.onChange.listen((_) => markDirty());
/// ```
///
/// Calls made before the editor has started wait for it. Dispose the controller when you
/// no longer need it.
class AxiomTextController extends ChangeNotifier {
  /// Creates a controller.
  AxiomTextController();

  EngineView? _view;
  int _nextId = 1;
  final Map<int, Completer<Object?>> _pending = {};
  Completer<AxiomEngineInfo> _ready = Completer<AxiomEngineInfo>();
  AxiomEngineInfo? _info;
  AxiomEditorState _state = AxiomEditorState.initial;
  AxiomStats _stats = AxiomStats.zero;
  AxiomMathSession? _math;
  bool _disposed = false;
  Map<String, String> _labels = const {};

  final StreamController<void> _change = StreamController<void>.broadcast();
  final StreamController<AxiomEditorState> _selection =
      StreamController<AxiomEditorState>.broadcast();
  final StreamController<void> _focus = StreamController<void>.broadcast();
  final StreamController<void> _blur = StreamController<void>.broadcast();
  final StreamController<EngineEvent> _events =
      StreamController<EngineEvent>.broadcast();
  final StreamController<List<AxiomCommentThread>> _comments =
      StreamController<List<AxiomCommentThread>>.broadcast();
  final StreamController<List<AxiomReaderHighlight>> _highlights =
      StreamController<List<AxiomReaderHighlight>>.broadcast();
  final StreamController<AxiomMark> _markTaps =
      StreamController<AxiomMark>.broadcast();
  final StreamController<AxiomSelectionActionEvent> _selectionActions =
      StreamController<AxiomSelectionActionEvent>.broadcast();
  final StreamController<List<AxiomPdfAnnotation>> _pdfChanges =
      StreamController<List<AxiomPdfAnnotation>>.broadcast();

  /// How long a call may take before it fails with a [TimeoutException].
  static const Duration callTimeout = Duration(seconds: 20);

  // ── State ──────────────────────────────────────────────────────

  /// Completes when the editor has started.
  Future<AxiomEngineInfo> get ready => _ready.future;

  /// Whether the editor has started.
  bool get isReady => _info != null;

  /// What the editor reported when it started (commands, fonts, colours), or null before.
  AxiomEngineInfo? get info => _info;

  /// Formatting at the cursor; listen to the controller (or [onSelectionChange]) for updates.
  AxiomEditorState get state => _state;

  /// Current word and character counts, updated on every change.
  AxiomStats get stats => _stats;

  /// Whether the editor has keyboard focus.
  bool get hasFocus => _state.focused;

  /// The equation being edited with the native math keyboard, or null.
  AxiomMathSession? get mathSession => _math;

  /// Interface text in the editor's language, e.g. `label('Bold')`. Falls back to English.
  String label(String english) => _labels[english] ?? english;

  // ── Events ─────────────────────────────────────────────────────

  /// Fires after every change to the content.
  Stream<void> get onChange => _change.stream;

  /// Fires when the cursor moves or the formatting at the cursor changes.
  Stream<AxiomEditorState> get onSelectionChange => _selection.stream;

  /// Fires when the editor gets focus.
  Stream<void> get onFocus => _focus.stream;

  /// Fires when the editor loses focus.
  Stream<void> get onBlur => _blur.stream;

  /// All comment threads, after every change to comments (add, reply, resolve, delete).
  Stream<List<AxiomCommentThread>> get onCommentsChange => _comments.stream;

  /// All of the reader's highlights, after every change. Save them for this reader.
  Stream<List<AxiomReaderHighlight>> get onHighlightsChange =>
      _highlights.stream;

  /// A reader tapped a mark (read-only editors with mark types).
  Stream<AxiomMark> get onMarkTap => _markTaps.stream;

  /// A reader picked one of your selection actions.
  Stream<AxiomSelectionActionEvent> get onSelectionAction =>
      _selectionActions.stream;

  /// All annotations of the open PDF, after every change ([AxiomPdfView]).
  Stream<List<AxiomPdfAnnotation>> get onPdfChange => _pdfChanges.stream;

  /// The document as JSON, at most once per [debounce] while the user types.
  ///
  /// Handy for autosave: `controller.contentStream().listen(save)`.
  Stream<Map<String, Object?>> contentStream({
    Duration debounce = const Duration(milliseconds: 500),
  }) {
    late StreamController<Map<String, Object?>> out;
    StreamSubscription<void>? subscription;
    Timer? timer;
    out = StreamController<Map<String, Object?>>(
      onListen: () {
        subscription = onChange.listen((_) {
          timer?.cancel();
          timer = Timer(debounce, () async {
            try {
              final json = await getJson();
              if (!out.isClosed) out.add(json);
            } on Object catch (error, stack) {
              if (!out.isClosed) out.addError(error, stack);
            }
          });
        });
      },
      onCancel: () async {
        timer?.cancel();
        await subscription?.cancel();
      },
    );
    return out.stream;
  }

  // ── Content ────────────────────────────────────────────────────

  /// The document in the editor's lossless JSON format. Store this.
  Future<Map<String, Object?>> getJson() async {
    final value = await _call('getJson');
    if (value is Map<String, Object?>) return value;
    throw StateError('The editor returned no document.');
  }

  /// The document as HTML, ready to show on a website (equations already rendered).
  Future<String> getHtml() async => _asString(await _call('getHtml'));

  /// The document as Markdown.
  Future<String> getMarkdown() async => _asString(await _call('getMarkdown'));

  /// The document as plain text.
  Future<String> getText() async => _asString(await _call('getText'));

  /// Word and character counts.
  Future<AxiomStats> getStats() async {
    final value = await _call('getStats');
    return value is Map<String, Object?>
        ? AxiomStats.fromMap(value)
        : AxiomStats.zero;
  }

  /// Replaces the document with stored JSON (older formats are upgraded).
  Future<void> setJson(Map<String, Object?> json) =>
      _call('setJson', {'json': json});

  /// Replaces the document with HTML.
  Future<void> setHtml(String html) => _call('setHtml', {'html': html});

  /// Replaces the document with Markdown.
  Future<void> setMarkdown(String markdown) =>
      _call('setMarkdown', {'markdown': markdown});

  /// Replaces the document with any supported content.
  Future<void> setContent(AxiomContent content) => switch (content) {
        AxiomJsonContent(:final json) => setJson(json),
        AxiomHtmlContent(:final html) => setHtml(html),
        AxiomMarkdownContent(:final markdown) => setMarkdown(markdown),
      };

  /// Inserts HTML at the cursor, cleaned like a paste.
  Future<void> insertHtml(String html) => _call('insertHtml', {'html': html});

  /// Inserts text at the cursor (maths in `$…$` becomes equations).
  Future<void> insertText(String text) => _call('insertText', {'text': text});

  /// Inserts an image. [src] is an `https:` address or a `data:` URL. Returns false if refused.
  Future<bool> insertImage(String src, {String alt = ''}) async =>
      await _call('insertImage', {'src': src, 'alt': alt}) == true;

  /// Inserts an equation; with an empty [latex] the equation editor opens.
  Future<bool> insertMath(String latex, {bool block = false}) async =>
      await _call('insertMath', {'latex': latex, 'block': block}) == true;

  // ── Commands ───────────────────────────────────────────────────

  /// Runs an editing command (see [AxiomCommands]). Returns false if it can't run here.
  Future<bool> execute(String command, [List<Object?> args = const []]) async =>
      await _call('execute', {'command': command, 'args': args}) == true;

  /// Whether a command can run at the cursor.
  Future<bool> canExecute(String command,
          [List<Object?> args = const []]) async =>
      await _call('canExecute', {'command': command, 'args': args}) == true;

  /// Undo.
  Future<bool> undo() async => await _call('undo') == true;

  /// Redo.
  Future<bool> redo() async => await _call('redo') == true;

  /// Focuses the editor (shows the keyboard), optionally moving the cursor.
  Future<void> focus({AxiomCursorPosition? at}) =>
      _call('focus', {if (at != null) 'position': at.name});

  /// Removes focus (hides the keyboard).
  Future<void> unfocus() => _call('blur');

  /// Switches between editing and read-only.
  Future<void> setEditable(bool editable) =>
      _call('setEditable', {'editable': editable});

  // ── Comments ───────────────────────────────────────────────────

  /// Every comment thread in the document, in reading order.
  Future<List<AxiomCommentThread>> getComments() async =>
      _threads(await _call('getComments'));

  /// Comments on the selected text, as the editor's comment author. Returns false without a
  /// selection.
  /// [color] can be a preset or any colour ([AxiomHighlightColor.custom]); with
  /// `fill: false` the text is underlined instead of getting a coloured background.
  Future<bool> addComment(
    String text, {
    AxiomHighlightColor color = AxiomHighlightColor.yellow,
    bool fill = true,
  }) async =>
      await _call(
          'addComment', {'text': text, 'color': color.value, 'fill': fill}) ==
      true;

  /// Changes a thread's colour and/or whether its background is coloured.
  Future<bool> setCommentStyle(String threadId,
          {AxiomHighlightColor? color, bool? fill}) async =>
      await _call('setCommentStyle', {
        'id': threadId,
        if (color != null) 'color': color.value,
        if (fill != null) 'fill': fill,
      }) ==
      true;

  /// Replies to a thread.
  Future<bool> replyToComment(String threadId, String text) async =>
      await _call('replyToComment', {'id': threadId, 'text': text}) == true;

  /// Resolves a thread (or with `resolved: false`, reopens it).
  Future<bool> resolveComment(String threadId, {bool resolved = true}) async =>
      await _call('resolveComment', {'id': threadId, 'resolved': resolved}) ==
      true;

  /// Deletes a thread and its highlight (the text stays).
  Future<bool> deleteCommentThread(String threadId) async =>
      await _call('deleteCommentThread', {'id': threadId}) == true;

  /// Opens the box for a new comment on the selected text.
  Future<void> openCommentComposer() => _call('openCommentComposer');

  /// Shows or hides the list of all comment threads.
  Future<void> toggleCommentsPanel({bool? open}) =>
      _call('toggleCommentsPanel', {if (open != null) 'open': open});

  // ── Reader highlights ──────────────────────────────────────────

  /// The reader's highlights (read-only editors with highlights turned on).
  Future<List<AxiomReaderHighlight>> getHighlights() async =>
      _readerHighlights(await _call('getHighlights'));

  /// Replaces the reader's highlights (e.g. after loading them for another reader).
  Future<void> setHighlights(List<AxiomReaderHighlight> highlights) =>
      _call('setHighlights', {
        'items': [for (final h in highlights) h.toMap()]
      });

  /// The reader's highlights in reading order with their current text and page, for a
  /// "My notes" screen.
  Future<List<AxiomNotebookEntry>> notebook() async {
    final value = await _call('getNotebook');
    return [
      if (value is List<Object?>)
        for (final e in value)
          if (e is Map<String, Object?>) AxiomNotebookEntry.fromMap(e),
    ];
  }

  /// Scrolls to a reader highlight and opens its note.
  Future<void> revealHighlight(String id) =>
      _call('revealHighlight', {'id': id});

  // ── Marks (marked books) ───────────────────────────────────────

  /// Marks the selected text with a mark type. Returns the new mark's id, or null without a
  /// selection or for an unknown type. [data] is any JSON object kept with the mark.
  Future<String?> setMark(
    String typeId, {
    String? id,
    Map<String, Object?>? data,
    String? badge,
  }) async {
    final value = await _call('setMark', {
      'type': typeId,
      if (id != null) 'id': id,
      if (data != null) 'data': data,
      if (badge != null) 'badge': badge,
    });
    return value is String ? value : null;
  }

  /// Removes a mark: [id] everywhere, or without an id the marks in the selection.
  Future<bool> removeMark([String? id]) async =>
      await _call('removeMark', {if (id != null) 'id': id}) == true;

  /// Replaces a mark's data (null clears it).
  Future<bool> setMarkData(String id, Map<String, Object?>? data) async =>
      await _call('setMarkData', {'id': id, 'data': data}) == true;

  /// A mark's data, or null.
  Future<Map<String, Object?>?> getMarkData(String id) async {
    for (final mark in await getMarks()) {
      if (mark.id == id) return mark.data;
    }
    return null;
  }

  /// Shows a small badge on a mark, e.g. a question count (null removes it).
  Future<bool> setMarkBadge(String id, String? badge) async =>
      await _call('setMarkBadge', {'id': id, 'badge': badge}) == true;

  /// Every mark in the document, in reading order.
  Future<List<AxiomMark>> getMarks() async {
    final value = await _call('getMarks');
    return [
      if (value is List<Object?>)
        for (final m in value)
          if (m is Map<String, Object?>) AxiomMark.fromMap(m),
    ];
  }

  /// Every page-number block, in order.
  Future<List<AxiomPage>> getPages() async {
    final value = await _call('getPages');
    return [
      if (value is List<Object?>)
        for (final p in value)
          if (p is Map<String, Object?>) AxiomPage.fromMap(p),
    ];
  }

  /// Inserts a page-number block before the current paragraph (continuing the numbering
  /// when [number] is omitted).
  Future<bool> insertPage([int? number]) async =>
      await _call('insertPage', {if (number != null) 'number': number}) ==
      true;

  /// Scrolls to a page.
  Future<bool> scrollToPage(int number) async =>
      await _call('scrollToPage', {'number': number}) == true;

  /// Which marks to show while reading; other paragraphs fold away.
  Future<void> setMarkFilter(AxiomMarkFilter filter) =>
      _call('setMarkFilter', {'filter': filter.toJson()});

  // ── PDF annotation ─────────────────────────────────────────────

  /// Shows a PDF (its bytes) instead of the document, with marks and highlights. Returns the
  /// number of pages. Usually done for you by [AxiomPdfView].
  Future<int> openPdf(
    Uint8List bytes, {
    List<AxiomMarkType> markTypes = const [],
    bool markMode = false,
    bool highlights = true,
    List<AxiomPdfAnnotation> annotations = const [],
    List<AxiomSelectionAction> selectionActions = const [],
  }) async {
    final value = await _call('openPdf', {
      'data': base64Encode(bytes),
      'markTypes': [for (final t in markTypes) t.toMap()],
      'mode': markMode ? 'mark' : 'read',
      'highlights': highlights,
      'annotations': [for (final a in annotations) a.toMap()],
      'selectionActions': [for (final a in selectionActions) a.toMap()],
    });
    return value is Map<String, Object?> && value['pageCount'] is num
        ? (value['pageCount']! as num).toInt()
        : 0;
  }

  /// The open PDF's annotations.
  Future<List<AxiomPdfAnnotation>> getPdfAnnotations() async =>
      _pdfAnnotations(await _call('getPdfAnnotations'));

  /// Replaces the open PDF's annotations.
  Future<void> setPdfAnnotations(List<AxiomPdfAnnotation> annotations) =>
      _call('setPdfAnnotations', {
        'items': [for (final a in annotations) a.toMap()],
      });

  /// Shows a page of the open PDF (1-based).
  Future<void> scrollToPdfPage(int page) =>
      _call('pdfScrollToPage', {'page': page});

  static List<AxiomPdfAnnotation> _pdfAnnotations(Object? value) => [
        if (value is List<Object?>)
          for (final a in value)
            if (a is Map<String, Object?>) AxiomPdfAnnotation.fromMap(a),
      ];

  static List<AxiomCommentThread> _threads(Object? value) => [
        if (value is List<Object?>)
          for (final t in value)
            if (t is Map<String, Object?>) AxiomCommentThread.fromMap(t),
      ];

  static List<AxiomReaderHighlight> _readerHighlights(Object? value) => [
        if (value is List<Object?>)
          for (final h in value)
            if (h is Map<String, Object?>) AxiomReaderHighlight.fromMap(h),
      ];

  // ── Math keyboard ──────────────────────────────────────────────

  /// Inserts LaTeX into the equation being edited (`#0` keeps the selection, `#?` is a box).
  Future<void> mathInsert(String latex) =>
      _call('mathInsert', {'latex': latex});

  /// Moves the caret or deletes in the equation being edited.
  Future<void> mathCommand(AxiomMathCommand command) =>
      _call('mathCommand', {'command': command.name});

  /// Finishes editing the equation.
  Future<void> mathCommit() => _call('mathCommit');

  /// Stops editing the equation without changes.
  Future<void> mathCancel() => _call('mathCancel');

  /// Shows or hides the LaTeX text box of the equation being edited.
  Future<void> mathToggleLatex() => _call('mathToggleLatex');

  // ── Used by AxiomTextEditor ───────────────────────────────────

  /// Events for the editor widget (image picking, uploads, links, height).
  @internal
  Stream<EngineEvent> get engineEvents => _events.stream;

  /// Connects the controller to an engine view.
  @internal
  void attachEngine(EngineView view) {
    if (_disposed) return;
    if (_view != null && _view != view) detachEngine();
    _view = view;
    view.onMessage = _handleMessage;
  }

  /// Disconnects from the engine view (the editor widget was removed).
  @internal
  void detachEngine() {
    _view?.onMessage = null;
    _view = null;
    _info = null;
    _math = null;
    for (final pending in _pending.values) {
      if (!pending.isCompleted) {
        pending.completeError(StateError('The editor was closed.'));
      }
    }
    _pending.clear();
    if (_ready.isCompleted) _ready = Completer<AxiomEngineInfo>();
  }

  /// Starts the editor in the attached engine.
  @internal
  Future<AxiomEngineInfo> start(Map<String, Object?> params) async {
    final value = await _call('init', params, false);
    final info = AxiomEngineInfo.fromMap(
        value is Map<String, Object?> ? value : const <String, Object?>{});
    await _setReady(info);
    return info;
  }

  /// Applies a theme while the editor runs.
  @internal
  Future<void> setTheme(Map<String, Object?> theme) => _call('setTheme', theme);

  /// Changes the interface language while the editor runs.
  @internal
  Future<void> setLanguage(
      String language, Map<String, String>? translations) async {
    await _call('setLanguage', {
      'language': language,
      if (translations != null) 'translations': translations,
    });
    await _loadLabels();
    notifyListeners();
  }

  /// Answers an `uploadImage` request with the uploaded image's address or an error.
  @internal
  Future<void> resolveUpload(int requestId, {String? url, String? error}) =>
      _call(
        'resolveUpload',
        {
          'requestId': requestId,
          if (url != null) 'url': url,
          if (error != null) 'error': error
        },
      );

  /// English texts of the native toolbar and keyboard, translated by the engine.
  static const List<String> uiTexts = [
    'Undo', 'Redo', 'Text style', 'Paragraph', 'Heading 1', 'Heading 2',
    'Heading 3', //
    'Heading 4', 'Quote', 'Bold', 'Italic', 'Underline', 'Strikethrough',
    'Code',
    'Subscript', 'Superscript', 'Text color', 'Highlight', 'Font', 'Size',
    'Default font',
    'Default size', 'Clear formatting', 'Link', 'Remove link', 'Bulleted list',
    'Numbered list', 'To-do list', 'Align', 'Align left', 'Align center',
    'Align right',
    'Justify', 'Increase indent', 'Decrease indent', 'Image', 'Insert table',
    'Equation',
    'Block equation', 'Horizontal line', 'Done', 'Cancel', 'Remove color',
    'Insert',
    'Upload from computer', 'Take a photo', 'Edit as LaTeX', 'Rows', 'Columns',
    'Save',
    'Link address', 'Choose a photo', 'Comment', 'Comments', 'Mark',
    'Remove mark', 'Page number',
  ];

  Future<void> _loadLabels() async {
    try {
      final value = await _call('translate', {'texts': uiTexts}, false);
      if (value is Map<String, Object?>) {
        _labels = {
          for (final entry in value.entries)
            if (entry.value is String) entry.key: entry.value! as String,
        };
      }
    } on Object {
      _labels = const {};
    }
  }

  Future<void> _setReady(AxiomEngineInfo info) async {
    _info = info;
    await _loadLabels();
    if (!_ready.isCompleted) _ready.complete(info);
    notifyListeners();
  }

  void _handleMessage(String raw) {
    final message = EngineMessage.parse(raw);
    switch (message) {
      case null:
        return;
      case EngineResult(:final id, :final ok, :final value, :final error):
        final pending = _pending.remove(id);
        if (pending == null || pending.isCompleted) return;
        if (ok) {
          pending.complete(value);
        } else {
          pending.completeError(
              AxiomEditorException(error ?? 'The editor refused the call.'));
        }
      case final EngineEvent event:
        _handleEvent(event, event.name, event.data);
    }
  }

  void _handleEvent(EngineEvent event, String name, Map<String, Object?> data) {
    switch (name) {
      case 'change':
        _stats = AxiomStats.fromMap(data);
        _change.add(null);
        notifyListeners();
      case 'state':
        final next = AxiomEditorState.fromMap(data);
        if (next == _state) return;
        _state = next;
        _selection.add(next);
        notifyListeners();
      case 'focus':
        _focus.add(null);
      case 'blur':
        _blur.add(null);
      case 'mathEditStart':
        _math = AxiomMathSession(
            latex: _asString(data['latex']), display: data['display'] == true);
        notifyListeners();
      case 'mathEditChange':
        final math = _math;
        if (math != null) {
          _math = math.withLatex(_asString(data['latex']));
          notifyListeners();
        }
      case 'mathEditEnd':
        _math = null;
        notifyListeners();
      case 'commentsChange':
        _comments.add(_threads(data['threads']));
      case 'highlightsChange':
        _highlights.add(_readerHighlights(data['items']));
      case 'markTap':
        _markTaps.add(AxiomMark.fromMap(data));
      case 'selectionAction':
        _selectionActions.add(AxiomSelectionActionEvent.fromMap(data));
      case 'pdfChange':
        _pdfChanges.add(_pdfAnnotations(data['annotations']));
      default:
        break;
    }
    _events.add(event);
  }

  Future<Object?> _call(
    String method, [
    Map<String, Object?>? params,
    bool waitForReady = true,
  ]) async {
    if (_disposed) throw StateError('This AxiomTextController was disposed.');
    if (waitForReady && !isReady) await ready.timeout(callTimeout);
    final view = _view;
    if (view == null) {
      throw StateError('No editor is attached to this controller.');
    }
    final id = _nextId++;
    final completer = Completer<Object?>();
    _pending[id] = completer;
    await view.send(encodeCall(id, method, params));
    return completer.future.timeout(
      callTimeout,
      onTimeout: () {
        _pending.remove(id);
        throw TimeoutException(
            'The editor did not answer "$method".', callTimeout);
      },
    );
  }

  @override
  void dispose() {
    _disposed = true;
    detachEngine();
    unawaited(_change.close());
    unawaited(_selection.close());
    unawaited(_focus.close());
    unawaited(_blur.close());
    unawaited(_events.close());
    unawaited(_comments.close());
    unawaited(_highlights.close());
    unawaited(_markTaps.close());
    unawaited(_selectionActions.close());
    unawaited(_pdfChanges.close());
    super.dispose();
  }
}

/// The editor refused a call (for example an unknown command).
class AxiomEditorException implements Exception {
  /// Creates the exception.
  const AxiomEditorException(this.message);

  /// What went wrong.
  final String message;

  @override
  String toString() => 'AxiomEditorException: $message';
}

String _asString(Object? value) => value is String ? value : '';
