import 'dart:async';
import 'dart:typed_data';

// Flutter 3.47+ prefers package:material_ui; kept for older Flutter.
// ignore: deprecated_member_use
import 'package:flutter/material.dart';

import '../controller.dart';
import '../editor.dart';
import '../models.dart';

/// Shows a PDF that teachers can mark (with your [markTypes]) and readers can highlight and
/// annotate, without retyping it. The marks are the same as in AxiomText documents.
///
/// It runs pdf.js inside the editor engine bundled with this package (offline; nothing is
/// sent anywhere). Store [onChanged]'s annotations and pass them back as [annotations].
///
/// ```dart
/// AxiomPdfView(
///   bytes: chapterPdf,
///   markTypes: types,
///   markMode: isTeacher,
///   annotations: saved,
///   onChanged: (items) => save([for (final a in items) a.toMap()]),
///   onMarkTap: (mark) => showQuestions(mark.data),
/// )
/// ```
class AxiomPdfView extends StatefulWidget {
  /// Shows the PDF in [bytes].
  const AxiomPdfView({
    super.key,
    required this.bytes,
    this.controller,
    this.markTypes = const [],
    this.markMode = false,
    this.highlights = true,
    this.annotations = const [],
    this.onChanged,
    this.onMarkTap,
    this.selectionActions = const [],
    this.onSelectionAction,
    this.onReady,
  });

  /// The PDF file.
  final Uint8List bytes;

  /// Optional controller (to jump to a page or read the annotations).
  final AxiomTextController? controller;

  /// Your mark types (the same as in your documents).
  final List<AxiomMarkType> markTypes;

  /// Selecting text offers your mark types (teachers). Otherwise readers only highlight.
  final bool markMode;

  /// Readers can highlight and add notes.
  final bool highlights;

  /// Saved annotations to show.
  final List<AxiomPdfAnnotation> annotations;

  /// All annotations after every change: save them.
  final void Function(List<AxiomPdfAnnotation> annotations)? onChanged;

  /// A mark was tapped.
  final void Function(AxiomMark mark)? onMarkTap;

  /// Your items in the menu for selected text (e.g. "Ask AI").
  final List<AxiomSelectionAction> selectionActions;

  /// A reader picked one of [selectionActions].
  final void Function(AxiomSelectionActionEvent event)? onSelectionAction;

  /// Called with the number of pages once the PDF is shown.
  final void Function(int pageCount)? onReady;

  @override
  State<AxiomPdfView> createState() => _AxiomPdfViewState();
}

class _AxiomPdfViewState extends State<AxiomPdfView> {
  AxiomTextController? _own;
  StreamSubscription<List<AxiomPdfAnnotation>>? _changes;
  bool _opened = false;

  AxiomTextController get _controller =>
      widget.controller ?? (_own ??= AxiomTextController());

  @override
  void initState() {
    super.initState();
    _changes = _controller.onPdfChange
        .listen((items) => widget.onChanged?.call(items));
  }

  @override
  void didUpdateWidget(AxiomPdfView old) {
    super.didUpdateWidget(old);
    if (!identical(old.bytes, widget.bytes) && _opened) unawaited(_open(_controller));
  }

  @override
  void dispose() {
    unawaited(_changes?.cancel());
    _own?.dispose();
    super.dispose();
  }

  Future<void> _open(AxiomTextController controller) async {
    final pages = await controller.openPdf(
      widget.bytes,
      markTypes: widget.markTypes,
      markMode: widget.markMode,
      highlights: widget.highlights,
      annotations: widget.annotations,
      selectionActions: widget.selectionActions,
    );
    if (!mounted) return;
    setState(() => _opened = true);
    widget.onReady?.call(pages);
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Positioned.fill(
          child: AxiomTextEditor(
            controller: _controller,
            readOnly: true,
            toolbar: AxiomToolbarMode.none,
            onMarkTap: widget.onMarkTap,
            onSelectionAction: widget.onSelectionAction,
            onReady: (c) => unawaited(_open(c)),
          ),
        ),
        if (!_opened)
          const Positioned.fill(
            child: ColoredBox(
              color: Colors.transparent,
              child: Center(child: CircularProgressIndicator.adaptive()),
            ),
          ),
      ],
    );
  }
}
