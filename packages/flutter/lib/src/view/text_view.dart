import 'dart:convert';

import 'package:flutter/gestures.dart';
// Flutter 3.47+ prefers package:material_ui; kept for older Flutter.
// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter_math_fork/flutter_math.dart';

import '../models.dart';
import 'markdown.dart';

/// Shows AxiomText content with Flutter widgets: no WebView, so it is light enough for long
/// lists (quiz questions, answer options, feeds). Read-only.
///
/// Draws headings, paragraphs, lists, to-do lists, quotes, tables, images, columns, page
/// numbers, links, colours, equations (with `flutter_math_fork`), comments and marks. Use
/// [AxiomTextEditor] to edit, or for features this view doesn't draw.
///
/// ```dart
/// AxiomTextView(content: AxiomContent.json(question), markTypes: types, onMarkTap: practise)
/// ```
class AxiomTextView extends StatefulWidget {
  /// Shows [content] (JSON saved by the editor, or Markdown with `$…$` equations).
  const AxiomTextView({
    super.key,
    required this.content,
    this.markTypes = const [],
    this.onMarkTap,
    this.onLinkTap,
    this.style,
    this.selectable = true,
    this.pageLabel,
  });

  /// JSON or Markdown. HTML is shown as plain text: convert it with the editor first.
  final AxiomContent content;

  /// Your mark types, for their colours and styles.
  final List<AxiomMarkType> markTypes;

  /// A mark was tapped.
  final void Function(AxiomMark mark)? onMarkTap;

  /// A link was tapped.
  final void Function(Uri uri)? onLinkTap;

  /// Base text style (default: the theme's `bodyLarge`).
  final TextStyle? style;

  /// Let people select and copy the text.
  final bool selectable;

  /// Label of a page block (default: "Page 23", with Bangla, Hindi or Arabic digits in those
  /// locales).
  final String Function(int number)? pageLabel;

  @override
  State<AxiomTextView> createState() => _AxiomTextViewState();
}

class _AxiomTextViewState extends State<AxiomTextView> {
  final List<GestureRecognizer> _recognizers = [];
  Map<String, Object?>? _doc;
  AxiomContent? _parsedFrom;

  @override
  void dispose() {
    _disposeRecognizers();
    super.dispose();
  }

  void _disposeRecognizers() {
    for (final r in _recognizers) {
      r.dispose();
    }
    _recognizers.clear();
  }

  Map<String, Object?> _document() {
    final cached = _doc;
    if (cached != null && identical(_parsedFrom, widget.content)) return cached;
    final content = widget.content;
    final Map<String, Object?> doc = switch (content) {
      AxiomJsonContent(:final json) => _docOf(json),
      AxiomMarkdownContent(:final markdown) => markdownToDocument(markdown),
      AxiomHtmlContent(:final html) => {
          'type': 'doc',
          'content': [
            {
              'type': 'paragraph',
              'content': [
                {'type': 'text', 'text': html.replaceAll(RegExp(r'<[^>]*>'), '')},
              ],
            },
          ],
        },
    };
    _doc = doc;
    _parsedFrom = content;
    return doc;
  }

  static Map<String, Object?> _docOf(Map<String, Object?> json) {
    final doc = json['doc'];
    if (doc is Map<String, Object?>) return doc;
    return json['type'] == 'doc' ? json : const {'type': 'doc'};
  }

  @override
  Widget build(BuildContext context) {
    _disposeRecognizers();
    final theme = Theme.of(context);
    final renderer = _Renderer(
      context: context,
      theme: theme,
      base: widget.style ?? theme.textTheme.bodyLarge ?? const TextStyle(fontSize: 16),
      types: {for (final t in widget.markTypes) t.id: t},
      recognizers: _recognizers,
      onMarkTap: widget.onMarkTap,
      onLinkTap: widget.onLinkTap,
      pageLabel: widget.pageLabel ?? _defaultPageLabel(context),
    );
    final doc = _document();
    renderer.index(doc);
    final body = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: renderer.blocks(_children(doc)),
    );
    return widget.selectable ? SelectionArea(child: body) : body;
  }

  static String Function(int) _defaultPageLabel(BuildContext context) {
    final locale = Localizations.maybeLocaleOf(context)?.languageCode ?? 'en';
    return (n) => switch (locale) {
          'bn' => 'পৃষ্ঠা ${localDigits(n, '০')}',
          'hi' => 'पृष्ठ ${localDigits(n, '०')}',
          'ar' => 'صفحة ${localDigits(n, '٠')}',
          _ => 'Page $n',
        };
  }
}

/// [n] in another script's digits, given that script's zero (e.g. '০' for Bangla).
String localDigits(int n, String zero) {
  final base = zero.codeUnitAt(0);
  return String.fromCharCodes(
    n.toString().codeUnits.map((c) => c >= 48 && c <= 57 ? base + c - 48 : c),
  );
}

List<Map<String, Object?>> _children(Map<String, Object?> node) => [
      if (node['content'] is List<Object?>)
        for (final c in node['content']! as List<Object?>)
          if (c is Map<String, Object?>) c,
    ];

Map<String, Object?> _attrs(Map<String, Object?> node) =>
    node['attrs'] is Map<String, Object?>
        ? node['attrs']! as Map<String, Object?>
        : const {};

/// What the view knows about each mark before drawing (its full text, page and parts).
class _MarkInfo {
  _MarkInfo(this.type, this.data, this.badge, this.page);
  final String type;
  final Map<String, Object?>? data;
  final String? badge;
  final int? page;
  final StringBuffer text = StringBuffer();
  int parts = 0;
}

class _Renderer {
  _Renderer({
    required this.context,
    required this.theme,
    required this.base,
    required this.types,
    required this.recognizers,
    required this.onMarkTap,
    required this.onLinkTap,
    required this.pageLabel,
  });

  final BuildContext context;
  final ThemeData theme;
  final TextStyle base;
  final Map<String, AxiomMarkType> types;
  final List<GestureRecognizer> recognizers;
  final void Function(AxiomMark mark)? onMarkTap;
  final void Function(Uri uri)? onLinkTap;
  final String Function(int) pageLabel;

  final Map<String, _MarkInfo> _marks = {};
  final Map<String, int> _partsLeft = {};

  /// Collects each mark's text, page and number of parts (for badges after the last part).
  void index(Map<String, Object?> doc) {
    int? page;
    void visit(Map<String, Object?> node) {
      if (node['type'] == 'page') {
        final n = _attrs(node)['number'];
        if (n is num) page = n.toInt();
        return;
      }
      if (node['type'] == 'text') {
        for (final mark in _marksOf(node)) {
          if (mark['type'] != 'marker') continue;
          final a = _attrs(mark);
          final id = a['id'];
          if (id is! String) continue;
          final info = _marks.putIfAbsent(
            id,
            () => _MarkInfo(
              a['type'] is String ? a['type']! as String : '',
              a['data'] is Map<String, Object?>
                  ? a['data']! as Map<String, Object?>
                  : null,
              a['badge']?.toString(),
              page,
            ),
          );
          if (info.parts > 0) info.text.write(' ');
          info.text.write(node['text']);
          info.parts++;
        }
        return;
      }
      _children(node).forEach(visit);
    }

    visit(doc);
    _partsLeft
      ..clear()
      ..addAll({for (final e in _marks.entries) e.key: e.value.parts});
  }

  static List<Map<String, Object?>> _marksOf(Map<String, Object?> node) => [
        if (node['marks'] is List<Object?>)
          for (final m in node['marks']! as List<Object?>)
            if (m is Map<String, Object?>) m,
      ];

  // ── Blocks ─────────────────────────────────────────────────────

  List<Widget> blocks(List<Map<String, Object?>> nodes) {
    final out = <Widget>[];
    for (final node in nodes) {
      final widget = block(node);
      if (widget == null) continue;
      if (out.isNotEmpty) out.add(const SizedBox(height: 10));
      out.add(widget);
    }
    return out;
  }

  Widget? block(Map<String, Object?> node) {
    final attrs = _attrs(node);
    switch (node['type']) {
      case 'paragraph':
        return _text(node, base, attrs);
      case 'heading':
        final level = attrs['level'] is num ? (attrs['level']! as num).toInt() : 1;
        final t = theme.textTheme;
        final style = switch (level) {
              1 => t.headlineMedium,
              2 => t.headlineSmall,
              3 => t.titleLarge,
              4 => t.titleMedium,
              _ => t.titleSmall,
            } ??
            base;
        return Padding(
          padding: const EdgeInsets.only(top: 6),
          child: _text(node, style.copyWith(fontWeight: FontWeight.w700), attrs),
        );
      case 'blockquote':
        return Container(
          padding: const EdgeInsetsDirectional.only(start: 14, top: 2, bottom: 2),
          decoration: BoxDecoration(
            border: BorderDirectional(
              start: BorderSide(color: theme.colorScheme.outlineVariant, width: 3),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: blocks(_children(node)),
          ),
        );
      case 'bullet_list':
      case 'ordered_list':
      case 'task_list':
        return _list(node);
      case 'horizontal_rule':
        return const Divider(height: 24);
      case 'page_break':
        return const SizedBox(height: 8);
      case 'page':
        final n = attrs['number'] is num ? (attrs['number']! as num).toInt() : 1;
        return _page(n);
      case 'math_block':
        return Center(
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: _math(attrs['latex']?.toString() ?? '', display: true),
          ),
        );
      case 'image':
        return _image(attrs);
      case 'table':
        return _table(node);
      case 'columns':
        return _columns(node);
      case 'code_block':
        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            _plainText(node),
            style: base.copyWith(fontFamily: 'monospace', fontSize: (base.fontSize ?? 16) * 0.9),
          ),
        );
      default:
        final children = _children(node);
        if (children.isEmpty) return null;
        final inline = children.every((c) => c['type'] == 'text' || c['type'] == 'math_inline');
        return inline
            ? _text(node, base, attrs)
            : Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: blocks(children));
    }
  }

  static String _plainText(Map<String, Object?> node) {
    if (node['type'] == 'text') return node['text']?.toString() ?? '';
    return _children(node).map(_plainText).join();
  }

  Widget _text(Map<String, Object?> node, TextStyle style, Map<String, Object?> attrs) {
    final align = switch (attrs['textAlign']) {
      'center' => TextAlign.center,
      'right' => TextAlign.right,
      'justify' => TextAlign.justify,
      _ => TextAlign.start,
    };
    return Text.rich(
      TextSpan(style: style, children: inline(_children(node), style)),
      textAlign: align,
    );
  }

  Widget _list(Map<String, Object?> node) {
    final type = node['type'];
    final start = _attrs(node)['start'] is num ? (_attrs(node)['start']! as num).toInt() : 1;
    final items = _children(node);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < items.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 28,
                  child: switch (type) {
                    'ordered_list' => Text('${start + i}.', style: base),
                    'task_list' => Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Icon(
                          _attrs(items[i])['checked'] == true
                              ? Icons.check_box
                              : Icons.check_box_outline_blank,
                          size: (base.fontSize ?? 16) * 1.15,
                          color: theme.colorScheme.primary,
                        ),
                      ),
                    _ => Text('•', style: base.copyWith(fontWeight: FontWeight.w700)),
                  },
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: blocks(_children(items[i])),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _page(int n) {
    final scheme = theme.colorScheme;
    return Padding(
      padding: const EdgeInsets.only(top: 14, bottom: 4),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
            decoration: BoxDecoration(
              color: scheme.surface,
              border: Border.all(color: scheme.outlineVariant),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              pageLabel(n),
              style: theme.textTheme.labelMedium?.copyWith(
                color: scheme.onSurfaceVariant,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(child: Divider(color: scheme.outlineVariant, height: 1)),
        ],
      ),
    );
  }

  Widget _math(String latex, {required bool display}) => Math.tex(
        latex,
        mathStyle: display ? MathStyle.display : MathStyle.text,
        textStyle: base,
        onErrorFallback: (error) => Text(
          latex,
          style: base.copyWith(color: theme.colorScheme.error, fontFamily: 'monospace'),
        ),
      );

  Widget? _image(Map<String, Object?> attrs) {
    final src = attrs['src']?.toString() ?? '';
    final alt = attrs['alt']?.toString() ?? '';
    Widget? image;
    if (src.startsWith('data:image/')) {
      final comma = src.indexOf(',');
      if (comma > 0 && src.substring(0, comma).endsWith(';base64')) {
        try {
          image = Image.memory(base64Decode(src.substring(comma + 1)), semanticLabel: alt);
        } on FormatException {
          image = null;
        }
      }
    } else if (src.startsWith('https://') || src.startsWith('http://')) {
      image = Image.network(
        src,
        semanticLabel: alt,
        errorBuilder: (_, __, ___) => const SizedBox.shrink(),
      );
    }
    if (image == null) return null;
    final width = attrs['width'] is num ? (attrs['width']! as num).toDouble() : null;
    final caption = attrs['caption']?.toString() ?? '';
    return Column(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: width == null
              ? image
              : FractionallySizedBox(widthFactor: (width / 100).clamp(0.1, 1.0), child: image),
        ),
        if (caption.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(
              caption,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
          ),
      ],
    );
  }

  Widget _table(Map<String, Object?> node) {
    final rows = _children(node);
    final columns = rows.fold<int>(0, (n, r) => _children(r).length > n ? _children(r).length : n);
    if (columns == 0) return const SizedBox.shrink();
    final border = theme.colorScheme.outlineVariant;
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: ConstrainedBox(
        constraints: BoxConstraints(minWidth: MediaQuery.sizeOf(context).width * 0.5),
        child: Table(
          defaultColumnWidth: const IntrinsicColumnWidth(),
          border: TableBorder.all(color: border, borderRadius: BorderRadius.circular(6)),
          children: [
            for (final row in rows)
              TableRow(
                children: [
                  for (var c = 0; c < columns; c++)
                    if (c < _children(row).length)
                      Container(
                        constraints: const BoxConstraints(minWidth: 60, maxWidth: 320),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        color: _children(row)[c]['type'] == 'table_header'
                            ? theme.colorScheme.surfaceContainerHighest
                            : null,
                        child: DefaultTextStyle.merge(
                          style: _children(row)[c]['type'] == 'table_header'
                              ? const TextStyle(fontWeight: FontWeight.w700)
                              : null,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: blocks(_children(_children(row)[c])),
                          ),
                        ),
                      )
                    else
                      const SizedBox.shrink(),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget _columns(Map<String, Object?> node) {
    final columns = _children(node);
    final widths = _attrs(node)['widths'];
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var i = 0; i < columns.length; i++) ...[
          if (i > 0) const SizedBox(width: 16),
          Expanded(
            flex: widths is List<Object?> && i < widths.length && widths[i] is num
                ? ((widths[i]! as num) * 10).round().clamp(1, 1000)
                : 10,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: blocks(_children(columns[i])),
            ),
          ),
        ],
      ],
    );
  }

  // ── Inline content ─────────────────────────────────────────────

  List<InlineSpan> inline(List<Map<String, Object?>> nodes, TextStyle style) {
    final spans = <InlineSpan>[];
    for (final node in nodes) {
      switch (node['type']) {
        case 'text':
          spans.addAll(_textSpans(node, style));
        case 'hard_break':
          spans.add(const TextSpan(text: '\n'));
        case 'math_inline':
          spans.add(WidgetSpan(
            alignment: PlaceholderAlignment.middle,
            child: _math(_attrs(node)['latex']?.toString() ?? '', display: false),
          ));
        case 'image':
          final image = _image(_attrs(node));
          if (image != null) spans.add(WidgetSpan(child: image));
        default:
          spans.addAll(inline(_children(node), style));
      }
    }
    return spans;
  }

  List<InlineSpan> _textSpans(Map<String, Object?> node, TextStyle parent) {
    final text = node['text']?.toString() ?? '';
    var style = const TextStyle();
    final decorations = <TextDecoration>[];
    Color? decorationColor;
    TextDecorationStyle? decorationStyle;
    GestureRecognizer? recognizer;
    var script = 0; // 1 superscript, -1 subscript
    String? markId;
    final scheme = theme.colorScheme;

    for (final mark in _marksOf(node)) {
      final a = _attrs(mark);
      switch (mark['type']) {
        case 'bold':
          style = style.copyWith(fontWeight: FontWeight.w700);
        case 'italic':
          style = style.copyWith(fontStyle: FontStyle.italic);
        case 'underline':
          decorations.add(TextDecoration.underline);
        case 'strikethrough':
          decorations.add(TextDecoration.lineThrough);
        case 'code':
          style = style.copyWith(
            fontFamily: 'monospace',
            backgroundColor: scheme.surfaceContainerHighest,
            fontSize: (parent.fontSize ?? 16) * 0.92,
          );
        case 'superscript':
          script = 1;
        case 'subscript':
          script = -1;
        case 'text_color':
          final c = _cssColor(a['color']);
          if (c != null) style = style.copyWith(color: c);
        case 'highlight':
          final c = _cssColor(a['color']);
          if (c != null) style = style.copyWith(backgroundColor: c);
        case 'font_family':
          final family = a['family']?.toString().split(',').first.replaceAll(RegExp('["\']'), '').trim();
          if (family != null && family.isNotEmpty) style = style.copyWith(fontFamily: family);
        case 'font_size':
          final px = double.tryParse(a['size']?.toString().replaceAll('px', '') ?? '');
          if (px != null) style = style.copyWith(fontSize: px);
        case 'link':
          final href = a['href']?.toString();
          style = style.copyWith(color: scheme.primary);
          decorations.add(TextDecoration.underline);
          final uri = href == null ? null : Uri.tryParse(href);
          if (uri != null && onLinkTap != null) {
            recognizer = TapGestureRecognizer()..onTap = () => onLinkTap!(uri);
          }
        case 'comment':
          if (a['resolved'] != true) {
            final color = AxiomHighlightColor.parse(a['color']).toColor();
            if (a['fill'] == false) {
              decorations.add(TextDecoration.underline);
              decorationColor = color;
            } else {
              style = style.copyWith(backgroundColor: color.withValues(alpha: 0.28));
            }
          }
        case 'marker':
          final id = a['id']?.toString();
          final type = types[a['type']?.toString()];
          final color = type?.color ?? const Color(0xFFEAB308);
          switch (type?.style ?? AxiomMarkStyle.fill) {
            case AxiomMarkStyle.fill:
              style = style.copyWith(backgroundColor: color.withValues(alpha: 0.26));
            case AxiomMarkStyle.underline:
              decorations.add(TextDecoration.underline);
              decorationColor = color;
            case AxiomMarkStyle.double:
              decorations.add(TextDecoration.underline);
              decorationColor = color;
              decorationStyle = TextDecorationStyle.double;
            case AxiomMarkStyle.box:
              style = style.copyWith(
                background: Paint()
                  ..style = PaintingStyle.stroke
                  ..strokeWidth = 1.5
                  ..color = color,
              );
          }
          if (id != null) {
            markId = id;
            final info = _marks[id];
            if (info != null && onMarkTap != null) {
              recognizer = TapGestureRecognizer()
                ..onTap = () => onMarkTap!(AxiomMark(
                      id: id,
                      type: info.type,
                      text: info.text.toString(),
                      data: info.data,
                      badge: info.badge,
                      page: info.page,
                    ));
            }
          }
      }
    }
    if (decorations.isNotEmpty) {
      style = style.copyWith(
        decoration: TextDecoration.combine(decorations),
        decorationColor: decorationColor,
        decorationStyle: decorationStyle,
        decorationThickness: decorationColor != null ? 2 : null,
      );
    }
    if (recognizer != null) recognizers.add(recognizer);

    final spans = <InlineSpan>[];
    if (script != 0) {
      final size = (style.fontSize ?? parent.fontSize ?? 16) * 0.72;
      spans.add(WidgetSpan(
        alignment: script > 0 ? PlaceholderAlignment.top : PlaceholderAlignment.bottom,
        child: Text(text, style: parent.merge(style).copyWith(fontSize: size)),
      ));
    } else {
      spans.add(TextSpan(text: text, style: style, recognizer: recognizer));
    }

    // A mark's badge goes after its last part.
    if (markId != null) {
      final left = (_partsLeft[markId] ?? 0) - 1;
      _partsLeft[markId] = left;
      final info = _marks[markId];
      final badge = info?.badge;
      if (left == 0 && badge != null && badge.isNotEmpty) {
        final color = types[info!.type]?.color ?? const Color(0xFFEAB308);
        spans.add(WidgetSpan(
          alignment: PlaceholderAlignment.top,
          child: Container(
            margin: const EdgeInsetsDirectional.only(start: 3),
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
            decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(10)),
            child: Text(
              badge,
              style: TextStyle(
                color: Colors.white,
                fontSize: (parent.fontSize ?? 16) * 0.62,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ));
      }
    }
    return spans;
  }

  static Color? _cssColor(Object? value) {
    final css = value?.toString().trim() ?? '';
    final hex = RegExp(r'^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$').firstMatch(css);
    if (hex != null) {
      var h = hex.group(1)!;
      if (h.length == 3) h = h.split('').map((c) => '$c$c').join();
      return Color(0xFF000000 | int.parse(h, radix: 16));
    }
    final rgb = RegExp(r'^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+%?))?\s*\)$')
        .firstMatch(css);
    if (rgb != null) {
      int c(int i) => int.parse(rgb.group(i)!).clamp(0, 255);
      var alpha = 1.0;
      final a = rgb.group(4);
      if (a != null) {
        alpha = a.endsWith('%')
            ? (double.tryParse(a.substring(0, a.length - 1)) ?? 100) / 100
            : double.tryParse(a) ?? 1;
      }
      return Color.fromRGBO(c(1), c(2), c(3), alpha.clamp(0, 1));
    }
    return null;
  }
}
