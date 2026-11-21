import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
// Flutter 3.47+ prefers package:material_ui / cupertino_ui; kept for older Flutter.
// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'bridge/protocol.dart';
import 'controller.dart';
import 'math/math_keyboard.dart';
import 'media.dart';
import 'models.dart';
import 'platform/engine_view.dart';
import 'platform/engine_view_base.dart';
import 'theme.dart';
import 'toolbar/toolbar.dart';

/// Which toolbar the editor shows.
enum AxiomToolbarMode {
  /// A native Flutter toolbar (Material 3, or Cupertino on iOS and macOS).
  native,

  /// The web editor's own toolbar, inside the editor view.
  web,

  /// No toolbar (place an `AxiomToolbar` yourself, or none for a plain text area).
  none,
}

/// Where the native toolbar goes.
enum AxiomToolbarPosition {
  /// Above the editor.
  top,

  /// Below the editor: sits right above the on-screen keyboard on phones.
  bottom,
}

/// When the native math keyboard replaces the system keyboard while editing an equation.
enum AxiomMathKeyboardMode {
  /// On Android and iOS.
  auto,

  /// Always.
  always,

  /// Never (the web editor's own math keyboard is used).
  never,
}

/// The AxiomText rich text and math editor.
///
/// ```dart
/// final controller = AxiomTextController();
///
/// AxiomTextEditor(
///   controller: controller,
///   initialContent: AxiomContent.markdown('# Notes\n\nArea: $A = \\pi r^2$'),
///   placeholder: 'Start writing…',
/// )
/// ```
///
/// The editor fills the space it's given. Inside a scrolling list, set [shrinkWrap] so it
/// grows with its content instead.
class AxiomTextEditor extends StatefulWidget {
  /// Creates an editor.
  const AxiomTextEditor({
    super.key,
    this.controller,
    this.initialContent,
    this.placeholder,
    this.readOnly = false,
    this.autofocus = false,
    this.toolbar = AxiomToolbarMode.native,
    this.toolbarStyle = AxiomToolbarStyle.adaptive,
    this.toolbarPosition = AxiomToolbarPosition.bottom,
    this.toolbarItems = AxiomToolbarItem.defaults,
    this.theme,
    this.locale,
    this.translations,
    this.imagePicker = const AxiomImagePickerOptions(),
    this.uploadImage,
    this.onLinkTap,
    this.mathKeyboard = AxiomMathKeyboardMode.auto,
    this.documentMode = false,
    this.showWordCount = false,
    this.shrinkWrap = false,
    this.minHeight = 120,
    this.maxHeight,
    this.semanticLabel,
    this.commentAuthor,
    this.commentsOnly = false,
    this.commentModerator = false,
    this.onCommentsChanged,
    this.highlights,
    this.onHighlightsChanged,
    this.markTypes = const [],
    this.markFilter,
    this.showMarkLegend = true,
    this.markStateStyles = const {},
    this.markStates = const {},
    this.onMarkTap,
    this.selectionActions = const [],
    this.onSelectionAction,
    this.onReady,
    this.onChanged,
    this.loadingBuilder,
  });

  /// Reads and changes the content. Created internally when not given.
  final AxiomTextController? controller;

  /// Content shown when the editor starts.
  final AxiomContent? initialContent;

  /// Text shown while the editor is empty.
  final String? placeholder;

  /// Show the content without allowing changes.
  final bool readOnly;

  /// Focus the editor (and show the keyboard) once it has started.
  final bool autofocus;

  /// Native, web or no toolbar.
  final AxiomToolbarMode toolbar;

  /// Material or Cupertino look for the native toolbar and its menus.
  final AxiomToolbarStyle toolbarStyle;

  /// Native toolbar above or below the editor.
  final AxiomToolbarPosition toolbarPosition;

  /// Buttons of the native toolbar.
  final List<AxiomToolbarItem> toolbarItems;

  /// Editor colours. Defaults to the app theme ([AxiomEditorTheme.fromTheme]).
  final AxiomEditorTheme? theme;

  /// Interface language. Defaults to the app's locale; right-to-left languages flip the editor.
  final Locale? locale;

  /// Your own interface texts, keyed by the English text: `{'Bold': 'Grassetto'}`.
  final Map<String, String>? translations;

  /// How images are picked from the device; null hides the image button.
  final AxiomImagePickerOptions? imagePicker;

  /// Uploads picked and pasted images. Without it, images are embedded in the document.
  final AxiomImageUploader? uploadImage;

  /// Called when a link is tapped in read-only mode. By default links open in the browser.
  final void Function(Uri uri)? onLinkTap;

  /// When to use the native math keyboard.
  final AxiomMathKeyboardMode mathKeyboard;

  /// A paper-like page, for long documents.
  final bool documentMode;

  /// Show word and character counts under the content.
  final bool showWordCount;

  /// Grow with the content (for use inside scroll views) instead of filling the space.
  final bool shrinkWrap;

  /// Smallest height when [shrinkWrap] is set.
  final double minHeight;

  /// Largest height when [shrinkWrap] is set; the content scrolls beyond it.
  final double? maxHeight;

  /// Name read by screen readers for the editing area.
  final String? semanticLabel;

  /// Turns on comments: the person commenting. Threads are saved inside the document.
  final AxiomCommentAuthor? commentAuthor;

  /// People can comment but not change the text (needs [commentAuthor]).
  final bool commentsOnly;

  /// The comment author may edit and delete other people's comments.
  final bool commentModerator;

  /// Called with every thread after comments change (to notify people, sync…).
  final void Function(List<AxiomCommentThread> threads)? onCommentsChanged;

  /// Turns on readers' highlights and notes for read-only content ([readOnly] must be true):
  /// the reader's saved highlights, or an empty list for none yet.
  final List<AxiomReaderHighlight>? highlights;

  /// Called with all of the reader's highlights after every change: save them for this reader.
  final void Function(List<AxiomReaderHighlight> highlights)?
      onHighlightsChanged;

  /// Marked books: the kinds of marks you offer ("Important", "Marked"…). Writers get a Mark
  /// menu (toolbar item [AxiomToolbarItem.mark], Alt+1, Alt+2…); readers get a legend, a
  /// filter and [onMarkTap].
  final List<AxiomMarkType> markTypes;

  /// Which marks to show while reading (other paragraphs fold away). Default: all.
  final AxiomMarkFilter? markFilter;

  /// Show the legend of [markTypes] above read-only content.
  final bool showMarkLegend;

  /// How a reader's own states look, e.g.
  /// `{'learned': AxiomMarkStateStyle(fade: true, badge: '✓')}`.
  final Map<String, AxiomMarkStateStyle> markStateStyles;

  /// This reader's states when the editor opens, by mark id (e.g. `{'m42': 'learned'}`).
  /// Change them later with [AxiomTextController.setMarkState]. They're never saved in the
  /// document: keep them per reader in your app.
  final Map<String, String> markStates;

  /// A reader tapped a mark (read-only): show your own sheet, e.g. questions to practise.
  final void Function(AxiomMark mark)? onMarkTap;

  /// Read-only: your items in the menu shown when a reader selects text (e.g. "Ask AI").
  final List<AxiomSelectionAction> selectionActions;

  /// A reader picked one of [selectionActions].
  final void Function(AxiomSelectionActionEvent event)? onSelectionAction;

  /// Called once the editor has started.
  final void Function(AxiomTextController controller)? onReady;

  /// Called after every change to the content.
  final VoidCallback? onChanged;

  /// Shown while the editor starts. Defaults to an empty area in the editor's colour.
  final WidgetBuilder? loadingBuilder;

  /// Loads the editor in the background so it opens instantly. Call it early (for example in
  /// `main`). [count] engines are kept ready, e.g. 3 for a list of read-only questions.
  static void prewarm({int count = 1}) => prewarmEngine(count);

  /// Whether this platform can show the editor (Android, iOS, macOS and the web).
  static bool get isSupported => engineSupported;

  @override
  State<AxiomTextEditor> createState() => _AxiomTextEditorState();
}

class _AxiomTextEditorState extends State<AxiomTextEditor> {
  AxiomTextController? _ownController;
  EngineView? _view;
  StreamSubscription<EngineEvent>? _events;
  StreamSubscription<void>? _changes;
  StreamSubscription<List<AxiomCommentThread>>? _commentChanges;
  StreamSubscription<List<AxiomReaderHighlight>>? _highlightChanges;
  StreamSubscription<AxiomMark>? _markTaps;
  StreamSubscription<AxiomSelectionActionEvent>? _selectionActions;
  bool _started = false;
  bool _ready = false;
  double? _contentHeight;
  AxiomEditorTheme? _sentTheme;
  String? _sentLanguage;

  AxiomTextController get _controller =>
      widget.controller ?? (_ownController ??= AxiomTextController());

  bool get _useMathKeyboard => switch (widget.mathKeyboard) {
        AxiomMathKeyboardMode.always => true,
        AxiomMathKeyboardMode.never => false,
        AxiomMathKeyboardMode.auto => !kIsWeb &&
            (defaultTargetPlatform == TargetPlatform.android ||
                defaultTargetPlatform == TargetPlatform.iOS),
      };

  @override
  void initState() {
    super.initState();
    if (engineSupported) _attach();
  }

  void _attach() {
    final view = createEngineView();
    _view = view;
    _controller.attachEngine(view);
    view.onExternalNavigation = _openLink;
    _events = _controller.engineEvents.listen(_onEvent);
    _changes = _controller.onChange.listen((_) => widget.onChanged?.call());
    _commentChanges = _controller.onCommentsChange
        .listen((threads) => widget.onCommentsChanged?.call(threads));
    _highlightChanges = _controller.onHighlightsChange
        .listen((items) => widget.onHighlightsChanged?.call(items));
    _markTaps =
        _controller.onMarkTap.listen((mark) => widget.onMarkTap?.call(mark));
    _selectionActions = _controller.onSelectionAction
        .listen((event) => widget.onSelectionAction?.call(event));
    view.onLoaded = _start;
    // A prewarmed engine is loaded already: start after the first frame, when the theme and
    // locale can be read.
    if (view.isLoaded) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _start());
    }
  }

  void _detach() {
    unawaited(_events?.cancel());
    unawaited(_changes?.cancel());
    unawaited(_commentChanges?.cancel());
    unawaited(_highlightChanges?.cancel());
    unawaited(_markTaps?.cancel());
    unawaited(_selectionActions?.cancel());
    _markTaps = null;
    _selectionActions = null;
    _events = null;
    _changes = null;
    _commentChanges = null;
    _highlightChanges = null;
    _controller.detachEngine();
    _view?.dispose();
    _view = null;
    _started = false;
    _ready = false;
    _sentTheme = null;
    _sentLanguage = null;
  }

  @override
  void didUpdateWidget(AxiomTextEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller && engineSupported) {
      // A new controller: start again with the current content.
      final previous = oldWidget.controller ?? _ownController;
      unawaited(_restart(previous));
      return;
    }
    if (_ready) {
      if (oldWidget.readOnly != widget.readOnly) {
        unawaited(_controller.setEditable(!widget.readOnly));
      }
      _syncThemeAndLanguage();
    }
  }

  Future<void> _restart(AxiomTextController? previous) async {
    Map<String, Object?>? json;
    try {
      if (previous != null && previous.isReady) json = await previous.getJson();
    } on Object {
      json = null;
    }
    if (!mounted) return;
    previous?.detachEngine();
    _detach();
    if (widget.controller != null) {
      _ownController?.dispose();
      _ownController = null;
    }
    _pendingContent = json == null ? null : AxiomContent.json(json);
    setState(_attach);
  }

  AxiomContent? _pendingContent;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_ready) _syncThemeAndLanguage();
  }

  AxiomEditorTheme _theme(BuildContext context) =>
      widget.theme ?? AxiomEditorTheme.fromTheme(Theme.of(context));

  String _language(BuildContext context) {
    final locale = widget.locale ?? Localizations.maybeLocaleOf(context);
    if (locale == null) return 'en';
    final country = locale.countryCode;
    return country == null || country.isEmpty
        ? locale.languageCode
        : '${locale.languageCode}-$country';
  }

  void _syncThemeAndLanguage() {
    final theme = _theme(context);
    if (theme != _sentTheme) {
      _sentTheme = theme;
      unawaited(_controller.setTheme(theme.toParams()));
      final background = theme.background;
      if (background != null) unawaited(_view?.setBackground(background));
    }
    final language = _language(context);
    if (language != _sentLanguage) {
      _sentLanguage = language;
      unawaited(_controller.setLanguage(language, widget.translations));
    }
  }

  Future<void> _start() async {
    if (_started || !mounted) return;
    _started = true;
    final theme = _theme(context);
    final language = _language(context);
    _sentTheme = theme;
    _sentLanguage = language;
    final background = theme.background;
    if (background != null) unawaited(_view?.setBackground(background));
    final content = _pendingContent ?? widget.initialContent;
    _pendingContent = null;
    try {
      final info = await _controller.start({
        ...?content?.toParams(),
        if (widget.placeholder != null) 'placeholder': widget.placeholder,
        'editable': !widget.readOnly,
        'toolbar': widget.toolbar == AxiomToolbarMode.web ? 'web' : 'none',
        'language': language,
        if (widget.translations != null) 'translations': widget.translations,
        'theme': theme.toParams(),
        'autofocus': widget.autofocus,
        'hostImagePicker': widget.imagePicker != null,
        'hostUploads': widget.uploadImage != null,
        'hostMathKeyboard': _useMathKeyboard,
        'document': widget.documentMode,
        'statusBar': widget.showWordCount,
        'reportHeight': widget.shrinkWrap,
        if (widget.semanticLabel != null) 'ariaLabel': widget.semanticLabel,
        if (widget.commentAuthor != null)
          'comments': {
            'author': widget.commentAuthor!.toMap(),
            if (widget.commentModerator) 'moderator': true,
            if (widget.commentsOnly) 'only': true,
          },
        if (widget.highlights != null)
          'highlights': {
            'items': [for (final h in widget.highlights!) h.toMap()],
          },
        if (widget.markTypes.isNotEmpty)
          'marks': {
            'types': [for (final t in widget.markTypes) t.toMap()],
            if (widget.markFilter != null)
              'filter': widget.markFilter!.toJson(),
            if (!widget.showMarkLegend) 'legend': false,
            if (widget.markStateStyles.isNotEmpty)
              'states': {
                for (final e in widget.markStateStyles.entries)
                  e.key: e.value.toMap(),
              },
            if (widget.markStates.isNotEmpty) 'initialStates': widget.markStates,
          },
        if (widget.selectionActions.isNotEmpty)
          'selectionActions': [
            for (final a in widget.selectionActions) a.toMap()
          ],
      });
      if (!mounted) return;
      setState(() => _ready = true);
      // The theme or language may have changed while the editor was loading.
      _syncThemeAndLanguage();
      widget.onReady?.call(_controller);
      assert(info.commands.isNotEmpty, 'The editor started without commands.');
    } on Object catch (error) {
      debugPrint('AxiomText: the editor could not start: $error');
    }
  }

  Future<void> _onEvent(EngineEvent event) async {
    switch (event.name) {
      case 'pickImage':
        await _pickImage();
      case 'uploadImage':
        await _upload(event.data);
      case 'linkTap':
        final href = event.data['href'];
        final uri = href is String ? Uri.tryParse(href) : null;
        if (uri != null) _openLink(uri);
      case 'height':
        final height = event.data['height'];
        if (height is num && widget.shrinkWrap && mounted) {
          setState(() => _contentHeight = height.toDouble());
        }
      default:
        break;
    }
  }

  Future<void> _pickImage() async {
    final options = widget.imagePicker;
    if (options == null || !mounted) return;
    await pickAndInsertImage(
      context,
      _controller,
      options: options,
      upload: widget.uploadImage,
      cupertino: AxiomToolbar.isCupertino(context, widget.toolbarStyle),
    );
  }

  /// A pasted or dropped image: upload it with the app's uploader and answer the engine.
  Future<void> _upload(Map<String, Object?> data) async {
    final id = data['requestId'];
    final base64Data = data['base64'];
    final upload = widget.uploadImage;
    if (id is! int) return;
    if (upload == null || base64Data is! String) {
      await _controller.resolveUpload(id, error: 'Uploads are not set up.');
      return;
    }
    try {
      final file = AxiomImageFile(
        bytes: base64Decode(base64Data),
        name: data['name'] is String ? data['name']! as String : 'image',
        mimeType:
            data['mime'] is String ? data['mime']! as String : 'image/png',
      );
      await _controller.resolveUpload(id, url: await upload(file));
    } on Object catch (error) {
      await _controller.resolveUpload(id, error: error.toString());
    }
  }

  void _openLink(Uri uri) {
    final handler = widget.onLinkTap;
    if (handler != null) {
      handler(uri);
      return;
    }
    if (!const {'http', 'https', 'mailto', 'tel'}.contains(uri.scheme)) return;
    unawaited(launchUrl(uri, mode: LaunchMode.externalApplication));
  }

  @override
  void dispose() {
    _detach();
    _ownController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = _theme(context);
    final background =
        theme.background ?? Theme.of(context).colorScheme.surface;
    final view = _view;

    Widget editor;
    if (view == null) {
      editor = Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            'AxiomText runs on Android, iOS, macOS and the web.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
      );
    } else {
      editor = Stack(
        children: [
          Positioned.fill(child: ColoredBox(color: background)),
          Positioned.fill(child: view.build(context)),
          if (!_ready)
            Positioned.fill(
              child: IgnorePointer(
                child: widget.loadingBuilder?.call(context) ??
                    ColoredBox(color: background),
              ),
            ),
        ],
      );
    }

    if (widget.shrinkWrap) {
      final height = (_contentHeight ?? widget.minHeight)
          .clamp(widget.minHeight, widget.maxHeight ?? double.infinity)
          .toDouble();
      editor = SizedBox(height: height, child: editor);
    } else {
      editor = Expanded(child: editor);
    }

    final cupertino = AxiomToolbar.isCupertino(context, widget.toolbarStyle);
    final toolbar = widget.toolbar == AxiomToolbarMode.native && view != null
        ? AxiomToolbar(
            controller: _controller,
            items: widget.commentsOnly
                ? const [
                    AxiomToolbarItem.comment,
                    AxiomToolbarItem.commentsPanel
                  ]
                : widget.readOnly
                    ? const []
                    : widget.toolbarItems,
            style: widget.toolbarStyle,
            onImage: widget.imagePicker == null ? null : _pickImage,
            markTypes: widget.markTypes,
          )
        : null;
    final showToolbar =
        toolbar != null && (!widget.readOnly || widget.commentsOnly);

    return Semantics(
      container: true,
      label: widget.semanticLabel,
      child: ListenableBuilder(
        listenable: _controller,
        builder: (context, _) {
          final math = _useMathKeyboard && _controller.mathSession != null;
          return Column(
            mainAxisSize:
                widget.shrinkWrap ? MainAxisSize.min : MainAxisSize.max,
            children: [
              if (showToolbar &&
                  widget.toolbarPosition == AxiomToolbarPosition.top)
                toolbar,
              editor,
              if (math)
                AxiomMathKeyboard(controller: _controller, cupertino: cupertino)
              else if (showToolbar &&
                  widget.toolbarPosition == AxiomToolbarPosition.bottom)
                toolbar,
            ],
          );
        },
      ),
    );
  }
}
