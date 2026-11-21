import 'dart:ui' show Color, Rect;

import 'package:flutter/foundation.dart';

/// Content to show when the editor starts: stored JSON, HTML or Markdown.
@immutable
sealed class AxiomContent {
  const AxiomContent();

  /// The editor's own lossless format, as returned by `AxiomTextController.getJson()`.
  const factory AxiomContent.json(Map<String, Object?> json) = AxiomJsonContent;

  /// HTML, cleaned up like a paste.
  const factory AxiomContent.html(String html) = AxiomHtmlContent;

  /// Markdown (GitHub flavoured, with `$maths$`).
  const factory AxiomContent.markdown(String markdown) = AxiomMarkdownContent;

  /// The parameters sent to the engine.
  Map<String, Object?> toParams();
}

/// Content in the editor's JSON format.
final class AxiomJsonContent extends AxiomContent {
  /// Creates JSON content.
  const AxiomJsonContent(this.json);

  /// The document.
  final Map<String, Object?> json;

  @override
  Map<String, Object?> toParams() => {'json': json};
}

/// Content as HTML.
final class AxiomHtmlContent extends AxiomContent {
  /// Creates HTML content.
  const AxiomHtmlContent(this.html);

  /// The HTML.
  final String html;

  @override
  Map<String, Object?> toParams() => {'html': html};
}

/// Content as Markdown.
final class AxiomMarkdownContent extends AxiomContent {
  /// Creates Markdown content.
  const AxiomMarkdownContent(this.markdown);

  /// The Markdown.
  final String markdown;

  @override
  Map<String, Object?> toParams() => {'markdown': markdown};
}

/// Word and character counts.
@immutable
class AxiomStats {
  /// Creates counts.
  const AxiomStats({required this.words, required this.characters});

  /// Reads counts sent by the engine.
  factory AxiomStats.fromMap(Map<String, Object?> map) => AxiomStats(
        words: _int(map['words']),
        characters: _int(map['characters']),
      );

  /// No words.
  static const AxiomStats zero = AxiomStats(words: 0, characters: 0);

  /// Number of words (counted correctly for Bangla, Chinese, Japanese, Arabic…).
  final int words;

  /// Number of characters as people see them, without line breaks.
  final int characters;

  @override
  bool operator ==(Object other) =>
      other is AxiomStats &&
      other.words == words &&
      other.characters == characters;

  @override
  int get hashCode => Object.hash(words, characters);

  @override
  String toString() => 'AxiomStats($words words, $characters characters)';
}

/// Formatting at the cursor. Native toolbars use it to show which buttons are active.
@immutable
class AxiomEditorState {
  /// Creates a state.
  const AxiomEditorState({
    this.marks = const {},
    this.block = 'paragraph',
    this.list,
    this.blockquote = false,
    this.align = 'left',
    this.fontFamily,
    this.fontSize,
    this.textColor,
    this.highlight,
    this.link,
    this.canUndo = false,
    this.canRedo = false,
    this.selectionEmpty = true,
    this.selectedNode,
    this.inTable = false,
    this.focused = false,
  });

  /// Reads the state sent by the engine.
  factory AxiomEditorState.fromMap(Map<String, Object?> map) {
    final marks = <String, bool>{};
    final rawMarks = map['marks'];
    if (rawMarks is Map<String, Object?>) {
      for (final entry in rawMarks.entries) {
        marks[entry.key] = entry.value == true;
      }
    }
    return AxiomEditorState(
      marks: marks,
      block: _string(map['block']) ?? 'paragraph',
      list: _string(map['list']),
      blockquote: map['blockquote'] == true,
      align: _string(map['align']) ?? 'left',
      fontFamily: _string(map['fontFamily']),
      fontSize: _string(map['fontSize']),
      textColor: _string(map['textColor']),
      highlight: _string(map['highlight']),
      link: _string(map['link']),
      canUndo: map['canUndo'] == true,
      canRedo: map['canRedo'] == true,
      selectionEmpty: map['empty'] != false,
      selectedNode: _string(map['selectedNode']),
      inTable: map['inTable'] == true,
      focused: map['focused'] == true,
    );
  }

  /// Nothing selected, nothing formatted.
  static const AxiomEditorState initial = AxiomEditorState();

  /// Active text formats: `bold`, `italic`, `underline`, `strikethrough`, `code`,
  /// `subscript`, `superscript`, `link`.
  final Map<String, bool> marks;

  /// `paragraph` or `heading1` … `heading6`.
  final String block;

  /// `bullet`, `ordered`, `task` or null.
  final String? list;

  /// Whether the cursor is in a quote.
  final bool blockquote;

  /// `left`, `center`, `right` or `justify`.
  final String align;

  /// CSS font family at the cursor, or null for the default font.
  final String? fontFamily;

  /// CSS font size at the cursor (e.g. `18px`), or null for the default size.
  final String? fontSize;

  /// Text colour at the cursor (e.g. `#dc2626`), or null.
  final String? textColor;

  /// Highlight colour at the cursor, or null.
  final String? highlight;

  /// Link address at the cursor, or null.
  final String? link;

  /// Whether there is something to undo.
  final bool canUndo;

  /// Whether there is something to redo.
  final bool canRedo;

  /// True when nothing is selected (just a cursor).
  final bool selectionEmpty;

  /// Type of a node selected as a whole (`image`, `math_inline`, …), or null.
  final String? selectedNode;

  /// Whether the cursor is in a table.
  final bool inTable;

  /// Whether the editor has keyboard focus.
  final bool focused;

  /// Whether a text format is active, e.g. `isActive('bold')`.
  bool isActive(String mark) => marks[mark] ?? false;

  /// Heading level at the cursor (1–6), or null in a paragraph.
  int? get headingLevel => block.startsWith('heading')
      ? int.tryParse(block.substring('heading'.length))
      : null;

  @override
  bool operator ==(Object other) =>
      other is AxiomEditorState &&
      mapEquals(other.marks, marks) &&
      other.block == block &&
      other.list == list &&
      other.blockquote == blockquote &&
      other.align == align &&
      other.fontFamily == fontFamily &&
      other.fontSize == fontSize &&
      other.textColor == textColor &&
      other.highlight == highlight &&
      other.link == link &&
      other.canUndo == canUndo &&
      other.canRedo == canRedo &&
      other.selectionEmpty == selectionEmpty &&
      other.selectedNode == selectedNode &&
      other.inTable == inTable &&
      other.focused == focused;

  @override
  int get hashCode => Object.hash(
        Object.hashAllUnordered(
            marks.entries.where((e) => e.value).map((e) => e.key)),
        block,
        list,
        blockquote,
        align,
        fontFamily,
        fontSize,
        textColor,
        highlight,
        link,
        canUndo,
        canRedo,
        selectionEmpty,
        selectedNode,
        inTable,
        focused,
      );
}

/// A choice in a font or colour list.
@immutable
class AxiomOption {
  /// Creates an option.
  const AxiomOption({required this.label, required this.value});

  /// Text shown to the user (already translated).
  final String label;

  /// Value passed to the command; null means "default" (removes the format).
  final String? value;
}

/// What the engine reported when it started.
@immutable
class AxiomEngineInfo {
  /// Creates engine info.
  const AxiomEngineInfo({
    required this.commands,
    this.comments = false,
    this.marks = false,
    required this.language,
    required this.textDirection,
    this.fontFamilies = const [],
    this.fontSizes = const [],
    this.textColors = const [],
    this.highlightColors = const [],
  });

  /// Reads the `ready` data sent by the engine.
  factory AxiomEngineInfo.fromMap(Map<String, Object?> map) {
    List<AxiomOption> options(Object? raw, String labelKey) => [
          if (raw is List<Object?>)
            for (final item in raw)
              if (item is Map<String, Object?>)
                AxiomOption(
                    label: _string(item[labelKey]) ?? '',
                    value: _string(item['value'])),
        ];
    final sizes = map['fontSizes'];
    return AxiomEngineInfo(
      commands: [
        if (map['commands'] is List<Object?>)
          for (final c in map['commands']! as List<Object?>)
            if (c is String) c,
      ],
      comments: map['comments'] == true,
      marks: map['marks'] == true,
      language: _string(map['language']) ?? 'en',
      textDirection: map['dir'] == 'rtl' ? 'rtl' : 'ltr',
      fontFamilies: options(map['fontFamilies'], 'label'),
      fontSizes: [
        if (sizes is List<Object?>)
          for (final s in sizes)
            AxiomOption(label: _string(s) ?? '', value: _string(s)),
      ],
      textColors: options(map['textColors'], 'name'),
      highlightColors: options(map['highlightColors'], 'name'),
    );
  }

  /// Every command the editor understands (for `AxiomTextController.execute`).
  final List<String> commands;

  /// Whether comments are turned on (the editor was given a comment author).
  final bool comments;

  /// Whether mark types were given (marked books).
  final bool marks;

  /// Interface language in use.
  final String language;

  /// `ltr` or `rtl`.
  final String textDirection;

  /// Fonts offered in the font menu (first is the default font, value null).
  final List<AxiomOption> fontFamilies;

  /// Sizes offered in the size menu (first is the default size, value null).
  final List<AxiomOption> fontSizes;

  /// Text colours offered in the colour menu.
  final List<AxiomOption> textColors;

  /// Highlight colours offered in the highlight menu.
  final List<AxiomOption> highlightColors;
}

/// An equation being edited, while the native math keyboard is in use.
@immutable
class AxiomMathSession {
  /// Creates a session.
  const AxiomMathSession({required this.latex, required this.display});

  /// The equation's LaTeX so far.
  final String latex;

  /// True for a block (display) equation, false for one inside a line of text.
  final bool display;

  /// A copy with new LaTeX.
  AxiomMathSession withLatex(String latex) =>
      AxiomMathSession(latex: latex, display: display);
}

/// An image picked on the device or pasted into the editor, ready to upload.
@immutable
class AxiomImageFile {
  /// Creates an image file.
  const AxiomImageFile(
      {required this.bytes, required this.name, required this.mimeType});

  /// The file's bytes.
  final Uint8List bytes;

  /// File name, e.g. `photo.jpg`.
  final String name;

  /// MIME type, e.g. `image/jpeg`.
  final String mimeType;
}

String? _string(Object? value) => value is String ? value : null;
int _int(Object? value) => value is num ? value.toInt() : 0;

/// A highlight colour for comments and reader highlights: one of the six presets (which adapt
/// to light and dark themes) or any colour.
@immutable
class AxiomHighlightColor {
  const AxiomHighlightColor._(this.value);

  /// Any colour, e.g. `AxiomHighlightColor.custom(const Color(0xFF1E88E5))`.
  factory AxiomHighlightColor.custom(Color color) {
    final rgb = color.toARGB32() & 0xFFFFFF;
    return AxiomHighlightColor._('#${rgb.toRadixString(16).padLeft(6, '0')}');
  }

  /// Yellow.
  static const yellow = AxiomHighlightColor._('yellow');

  /// Green.
  static const green = AxiomHighlightColor._('green');

  /// Blue.
  static const blue = AxiomHighlightColor._('blue');

  /// Pink.
  static const pink = AxiomHighlightColor._('pink');

  /// Purple.
  static const purple = AxiomHighlightColor._('purple');

  /// Orange.
  static const orange = AxiomHighlightColor._('orange');

  /// The six presets.
  static const List<AxiomHighlightColor> values = [
    yellow,
    green,
    blue,
    pink,
    purple,
    orange
  ];

  static const Map<String, int> _presetRgb = {
    'yellow': 0xFACC15,
    'green': 0x22C55E,
    'blue': 0x3B82F6,
    'pink': 0xEC4899,
    'purple': 0xA855F7,
    'orange': 0xF97316,
  };

  /// The value sent to the editor and stored in documents: a preset name or `#rrggbb`.
  final String value;

  /// The preset name, or `custom` for any other colour.
  String get name => isPreset ? value : 'custom';

  /// Whether this is one of the six presets.
  bool get isPreset => _presetRgb.containsKey(value);

  /// The colour, for drawing swatches in your app.
  Color toColor() => Color(0xFF000000 |
      (_presetRgb[value] ?? int.parse(value.substring(1), radix: 16)));

  /// Reads a preset name or a `#rrggbb` / `#rgb` colour; anything else becomes yellow.
  static AxiomHighlightColor parse(Object? value) {
    if (value is AxiomHighlightColor) return value;
    if (value is! String) return yellow;
    final v = value.trim().toLowerCase();
    if (_presetRgb.containsKey(v)) return AxiomHighlightColor._(v);
    if (RegExp(r'^#[0-9a-f]{6}$').hasMatch(v)) return AxiomHighlightColor._(v);
    if (RegExp(r'^#[0-9a-f]{3}$').hasMatch(v)) {
      return AxiomHighlightColor._(
          '#${v.substring(1).split('').map((c) => '$c$c').join()}');
    }
    return yellow;
  }

  @override
  bool operator ==(Object other) =>
      other is AxiomHighlightColor && other.value == value;

  @override
  int get hashCode => value.hashCode;

  @override
  String toString() => 'AxiomHighlightColor($value)';
}

/// The person writing comments.
@immutable
class AxiomCommentAuthor {
  /// Creates an author. [id] is your app's id for the person (decides who may edit what).
  const AxiomCommentAuthor({required this.name, this.id});

  /// Display name.
  final String name;

  /// Your app's id for the person.
  final String? id;

  /// The parameters sent to the engine.
  Map<String, Object?> toMap() => {'name': name, if (id != null) 'id': id};
}

/// One message in a comment thread.
@immutable
class AxiomComment {
  /// Creates a message.
  const AxiomComment({
    required this.id,
    required this.author,
    required this.text,
    required this.time,
    this.authorId,
    this.edited,
  });

  /// Reads a message sent by the engine.
  factory AxiomComment.fromMap(Map<String, Object?> map) => AxiomComment(
        id: _string(map['id']) ?? '',
        author: _string(map['author']) ?? '',
        authorId: _string(map['authorId']),
        text: _string(map['text']) ?? '',
        time: DateTime.fromMillisecondsSinceEpoch(_int(map['time'])),
        edited: map['edited'] is num
            ? DateTime.fromMillisecondsSinceEpoch(
                (map['edited']! as num).toInt())
            : null,
      );

  /// Unique id.
  final String id;

  /// Display name of the writer.
  final String author;

  /// Your app's id for the writer.
  final String? authorId;

  /// The message.
  final String text;

  /// When it was written.
  final DateTime time;

  /// When it was last edited, if ever.
  final DateTime? edited;
}

/// A discussion attached to a range of text. Threads are saved inside the document.
@immutable
class AxiomCommentThread {
  /// Creates a thread.
  const AxiomCommentThread({
    required this.id,
    required this.quote,
    required this.color,
    required this.resolved,
    required this.comments,
    this.fill = true,
  });

  /// Reads a thread sent by the engine.
  factory AxiomCommentThread.fromMap(Map<String, Object?> map) =>
      AxiomCommentThread(
        id: _string(map['id']) ?? '',
        quote: _string(map['quote']) ?? '',
        color: AxiomHighlightColor.parse(map['color']),
        fill: map['fill'] != false,
        resolved: map['resolved'] == true,
        comments: [
          if (map['comments'] is List<Object?>)
            for (final c in map['comments']! as List<Object?>)
              if (c is Map<String, Object?>) AxiomComment.fromMap(c),
        ],
      );

  /// Unique id.
  final String id;

  /// The commented text.
  final String quote;

  /// Highlight colour.
  final AxiomHighlightColor color;

  /// Whether the background is coloured (true) or the text only underlined.
  final bool fill;

  /// Resolved threads are kept but no longer highlighted.
  final bool resolved;

  /// The messages, oldest first.
  final List<AxiomComment> comments;
}

/// A reader's own highlight with an optional note, on read-only content.
///
/// Store these per reader (for example with [toMap] in your database) and pass them back
/// when the reader opens the content again. They stay on the same words even if the
/// content is edited later.
@immutable
class AxiomReaderHighlight {
  /// Creates a highlight from its parts (usually you get these from the editor).
  const AxiomReaderHighlight({
    required this.id,
    required this.color,
    required this.text,
    required this.anchor,
    required this.created,
    this.fill = true,
    this.note,
    this.updated,
    this.page,
  });

  /// Reads a highlight saved with [toMap] or sent by the editor.
  factory AxiomReaderHighlight.fromMap(Map<String, Object?> map) {
    final anchor = map['anchor'] is Map<String, Object?>
        ? map['anchor']! as Map<String, Object?>
        : const <String, Object?>{};
    return AxiomReaderHighlight(
      id: _string(map['id']) ?? '',
      color: AxiomHighlightColor.parse(map['color']),
      fill: map['fill'] != false,
      text: _string(anchor['exact']) ?? '',
      anchor: anchor,
      note: _string(map['note']),
      created: DateTime.fromMillisecondsSinceEpoch(_int(map['created'])),
      page: map['page'] is num ? (map['page']! as num).toInt() : null,
      updated: map['updated'] is num
          ? DateTime.fromMillisecondsSinceEpoch(
              (map['updated']! as num).toInt())
          : null,
    );
  }

  /// Unique id.
  final String id;

  /// Highlight colour.
  final AxiomHighlightColor color;

  /// Whether the background is coloured (true) or the text only underlined.
  final bool fill;

  /// The highlighted text.
  final String text;

  /// Where it is in the content (quote, context and position). Keep it as is.
  final Map<String, Object?> anchor;

  /// The reader's note, if any.
  final String? note;

  /// When it was made.
  final DateTime created;

  /// When it was last changed.
  final DateTime? updated;

  /// Number of the page block before it when it was made, or null.
  final int? page;

  /// A JSON-ready map to store.
  Map<String, Object?> toMap() => {
        'id': id,
        'color': color.value,
        if (!fill) 'fill': false,
        if (note != null) 'note': note,
        'anchor': anchor,
        'created': created.millisecondsSinceEpoch,
        if (updated != null) 'updated': updated!.millisecondsSinceEpoch,
        if (page != null) 'page': page,
      };
}

// ── Marked books ─────────────────────────────────────────────────

/// How a mark type looks.
enum AxiomMarkStyle {
  /// A coloured background.
  fill,

  /// A coloured underline.
  underline,

  /// A double underline.
  double,

  /// A box around the text.
  box,
}

/// A kind of mark your app offers, e.g. "Important" in green.
///
/// Writers apply marks from the toolbar's Mark menu (or Alt+1, Alt+2…); readers see them, can
/// filter by them and tap them ([AxiomTextEditor.onMarkTap]).
@immutable
class AxiomMarkType {
  /// Creates a mark type. [id] is stored in documents: keep it stable.
  const AxiomMarkType({
    required this.id,
    required this.label,
    required this.color,
    this.style = AxiomMarkStyle.fill,
  });

  /// Stable id (letters, digits, `-` and `_`).
  final String id;

  /// Name shown in the menu and legend.
  final String label;

  /// The mark's colour.
  final Color color;

  /// How it looks.
  final AxiomMarkStyle style;

  /// A starting set: Important (green fill), Marked (blue underline) and Past exam question
  /// (amber box). Most apps pass their own list instead, with their own labels and colours.
  static const List<AxiomMarkType> defaults = [
    AxiomMarkType(id: 'important', label: 'Important', color: Color(0xFF16A34A)),
    AxiomMarkType(
        id: 'marked',
        label: 'Marked',
        color: Color(0xFF2563EB),
        style: AxiomMarkStyle.underline),
    AxiomMarkType(
        id: 'pyq',
        label: 'Past exam question',
        color: Color(0xFFB45309),
        style: AxiomMarkStyle.box),
  ];

  /// The parameters sent to the engine.
  Map<String, Object?> toMap() => {
        'id': id,
        'label': label,
        'color': '#${(color.toARGB32() & 0xFFFFFF).toRadixString(16).padLeft(6, '0')}',
        'style': style.name,
      };
}

/// A mark in the document.
@immutable
class AxiomMark {
  /// Creates a mark (usually you get these from the editor).
  const AxiomMark({
    required this.id,
    required this.type,
    required this.text,
    this.data,
    this.badge,
    this.page,
    this.anchor = const {},
    this.rect,
  });

  /// Reads a mark sent by the engine.
  factory AxiomMark.fromMap(Map<String, Object?> map) {
    final rect = map['rect'];
    return AxiomMark(
      id: _string(map['id']) ?? '',
      type: _string(map['type']) ?? '',
      text: _string(map['text']) ?? '',
      data: map['data'] is Map<String, Object?>
          ? map['data']! as Map<String, Object?>
          : null,
      badge: _string(map['badge']),
      page: map['page'] is num ? (map['page']! as num).toInt() : null,
      anchor: map['anchor'] is Map<String, Object?>
          ? map['anchor']! as Map<String, Object?>
          : const {},
      rect: rect is Map<String, Object?>
          ? Rect.fromLTRB(
              _double(rect['left']),
              _double(rect['top']),
              _double(rect['right']),
              _double(rect['bottom']),
            )
          : null,
    );
  }

  /// Unique id of this mark.
  final String id;

  /// The mark type's id.
  final String type;

  /// The marked text.
  final String text;

  /// Your app's data on the mark (question ids, a note…), or null.
  final Map<String, Object?>? data;

  /// The small label shown on the mark, or null.
  final String? badge;

  /// Number of the page block before it, or null.
  final int? page;

  /// The quote with some context (`exact`, `prefix`, `suffix`).
  final Map<String, Object?> anchor;

  /// Where it is in the editor (taps only), in the editor view's coordinates.
  final Rect? rect;
}

/// A page-number block.
@immutable
class AxiomPage {
  /// Creates a page.
  const AxiomPage({required this.number, required this.index});

  /// Reads a page sent by the engine.
  factory AxiomPage.fromMap(Map<String, Object?> map) => AxiomPage(
        number: _int(map['number']),
        index: _int(map['index']),
      );

  /// The page number.
  final int number;

  /// Index among the document's top-level blocks.
  final int index;
}

/// How marks look for a reader state set with [AxiomTextController.setMarkState], e.g.
/// `learned`.
@immutable
class AxiomMarkStateStyle {
  /// Creates a style, e.g. `AxiomMarkStateStyle(fade: true, badge: '✓')`.
  const AxiomMarkStateStyle({this.fade = false, this.badge});

  /// Fade the mark and its text.
  final bool fade;

  /// A badge after the mark (after its own badge), e.g. `'✓'`.
  final String? badge;

  /// The parameters sent to the engine.
  Map<String, Object?> toMap() => {
        if (fade) 'fade': true,
        if (badge != null) 'badge': badge,
      };
}

/// Which marks to show while reading; other paragraphs fold into "… 3 paragraphs".
@immutable
class AxiomMarkFilter {
  const AxiomMarkFilter._(this._value);

  /// Everything (no folding).
  static const all = AxiomMarkFilter._('all');

  /// Only paragraphs with a mark.
  static const marked = AxiomMarkFilter._('marked');

  /// Only paragraphs with these mark types.
  factory AxiomMarkFilter.types(List<String> typeIds) =>
      AxiomMarkFilter._(List<String>.unmodifiable(typeIds));

  /// Marks of [types] (any when null) whose reader state is in [states] and not in
  /// [excludeStates]. "Not learned yet": `AxiomMarkFilter.query(excludeStates: ['learned'])`.
  factory AxiomMarkFilter.query({
    List<String>? types,
    List<String>? states,
    List<String>? excludeStates,
  }) =>
      AxiomMarkFilter._(Map<String, Object?>.unmodifiable({
        if (types != null) 'types': List<String>.unmodifiable(types),
        if (states != null) 'states': List<String>.unmodifiable(states),
        if (excludeStates != null)
          'excludeStates': List<String>.unmodifiable(excludeStates),
      }));

  final Object _value;

  /// The value sent to the engine.
  Object toJson() => _value;
}

/// An item you add to the menu shown when a reader selects text.
@immutable
class AxiomSelectionAction {
  /// Creates an action, e.g. `AxiomSelectionAction(id: 'ask', label: 'Ask AI')`.
  const AxiomSelectionAction({required this.id, required this.label});

  /// Your id, sent back in [AxiomSelectionActionEvent.actionId].
  final String id;

  /// Button text.
  final String label;

  /// The parameters sent to the engine.
  Map<String, Object?> toMap() => {'id': id, 'label': label};
}

/// A reader picked one of your [AxiomSelectionAction]s.
@immutable
class AxiomSelectionActionEvent {
  /// Creates an event.
  const AxiomSelectionActionEvent({
    required this.actionId,
    required this.text,
    required this.anchor,
    this.page,
  });

  /// Reads an event sent by the engine.
  factory AxiomSelectionActionEvent.fromMap(Map<String, Object?> map) =>
      AxiomSelectionActionEvent(
        actionId: _string(map['actionId']) ?? '',
        text: _string(map['text']) ?? '',
        anchor: map['anchor'] is Map<String, Object?>
            ? map['anchor']! as Map<String, Object?>
            : const {},
        page: map['page'] is num ? (map['page']! as num).toInt() : null,
      );

  /// Which action.
  final String actionId;

  /// The selected text.
  final String text;

  /// Where it is (the same anchor model as reader highlights).
  final Map<String, Object?> anchor;

  /// Number of the page block before it, or null.
  final int? page;
}

/// A reader highlight in reading order, for a "My notes" screen.
@immutable
class AxiomNotebookEntry {
  /// Creates an entry.
  const AxiomNotebookEntry({
    required this.highlight,
    required this.text,
    required this.orphaned,
    this.page,
  });

  /// Reads an entry sent by the engine.
  factory AxiomNotebookEntry.fromMap(Map<String, Object?> map) {
    final raw = map['highlight'];
    final highlight = AxiomReaderHighlight.fromMap(
        raw is Map<String, Object?> ? raw : const <String, Object?>{});
    return AxiomNotebookEntry(
      highlight: highlight,
      text: _string(map['text']) ?? highlight.text,
      orphaned: map['orphaned'] == true,
      page: map['page'] is num ? (map['page']! as num).toInt() : null,
    );
  }

  /// The highlight.
  final AxiomReaderHighlight highlight;

  /// The highlighted text as it is now.
  final String text;

  /// True when its text is no longer in the document.
  final bool orphaned;

  /// Number of the page block before it, or null.
  final int? page;
}

double _double(Object? value) => value is num ? value.toDouble() : 0;

// ── PDF annotation ───────────────────────────────────────────────

/// A mark or highlight on a PDF ([AxiomPdfView]). Store [toMap] and pass it back later.
@immutable
class AxiomPdfAnnotation {
  const AxiomPdfAnnotation._(this._map);

  /// Reads an annotation saved with [toMap] or sent by the view.
  factory AxiomPdfAnnotation.fromMap(Map<String, Object?> map) =>
      AxiomPdfAnnotation._(Map.unmodifiable(map));

  final Map<String, Object?> _map;

  /// Unique id.
  String get id => _string(_map['id']) ?? '';

  /// A teacher's mark (one of your mark types) or a reader's highlight.
  bool get isMark => _map['kind'] == 'mark';

  /// Mark type id (marks).
  String? get type => _string(_map['type']);

  /// Highlight colour (highlights).
  AxiomHighlightColor get color => AxiomHighlightColor.parse(_map['color']);

  /// 1-based page number.
  int get page => _int(_map['page']);

  /// The marked text.
  String get text {
    final anchor = _map['anchor'];
    return anchor is Map<String, Object?> ? _string(anchor['exact']) ?? '' : '';
  }

  /// A reader's note (highlights).
  String? get note => _string(_map['note']);

  /// Your app's data (marks).
  Map<String, Object?>? get data =>
      _map['data'] is Map<String, Object?> ? _map['data']! as Map<String, Object?> : null;

  /// A JSON-ready map to store (keeps the position on the page).
  Map<String, Object?> toMap() => _map;
}
