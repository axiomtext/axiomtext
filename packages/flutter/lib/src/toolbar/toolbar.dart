import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../controller.dart';
import '../models.dart';
import 'sheets.dart';

/// Buttons of the native toolbar.
enum AxiomToolbarItem {
  /// Undo.
  undo,

  /// Redo.
  redo,

  /// Paragraph / headings / quote menu.
  blockStyle,

  /// Bold.
  bold,

  /// Italic.
  italic,

  /// Underline.
  underline,

  /// Strikethrough.
  strikethrough,

  /// Inline code.
  code,

  /// Subscript.
  subscript,

  /// Superscript.
  superscript,

  /// Text colour.
  textColor,

  /// Highlight colour.
  highlight,

  /// Font menu.
  fontFamily,

  /// Size menu.
  fontSize,

  /// Remove formatting.
  clearFormatting,

  /// Add or edit a link.
  link,

  /// Bulleted list.
  bulletedList,

  /// Numbered list.
  numberedList,

  /// To-do list.
  todoList,

  /// Quote.
  blockquote,

  /// Alignment menu.
  align,

  /// Decrease indent.
  outdent,

  /// Increase indent.
  indent,

  /// Insert an image from the device.
  image,

  /// Insert a table.
  table,

  /// Equation in the text.
  math,

  /// Equation on its own line.
  mathBlock,

  /// Horizontal line.
  horizontalRule,

  /// Comment on the selected text (shown when comments are turned on).
  comment,

  /// The list of comment threads (shown when comments are turned on).
  commentsPanel,

  /// A thin separator between groups.
  divider;

  /// The default toolbar.
  static const List<AxiomToolbarItem> defaults = [
    undo,
    redo,
    divider,
    blockStyle,
    bold,
    italic,
    underline,
    textColor,
    highlight,
    divider,
    math,
    image,
    table,
    link,
    comment,
    divider,
    bulletedList,
    numberedList,
    todoList,
    align,
    outdent,
    indent,
    divider,
    blockquote,
    strikethrough,
    superscript,
    subscript,
    code,
    fontFamily,
    fontSize,
    mathBlock,
    horizontalRule,
    clearFormatting,
    commentsPanel,
  ];
}

/// Look of the native toolbar and its menus.
enum AxiomToolbarStyle {
  /// Cupertino on iOS and macOS, Material elsewhere.
  adaptive,

  /// Material 3.
  material,

  /// Cupertino (iOS).
  cupertino,
}

/// A native Flutter toolbar for an `AxiomTextEditor`.
///
/// `AxiomTextEditor` shows one by default; use this widget directly to place the toolbar
/// yourself (for example in an app bar) with `AxiomTextEditor(toolbar: AxiomToolbarMode.none)`.
class AxiomToolbar extends StatelessWidget {
  /// Creates a toolbar for [controller].
  const AxiomToolbar({
    super.key,
    required this.controller,
    this.items = AxiomToolbarItem.defaults,
    this.style = AxiomToolbarStyle.adaptive,
    this.onImage,
    this.height = 48,
  });

  /// The editor's controller.
  final AxiomTextController controller;

  /// Buttons, in order.
  final List<AxiomToolbarItem> items;

  /// Material or Cupertino.
  final AxiomToolbarStyle style;

  /// Called by the image button. Without it the image button is hidden.
  final VoidCallback? onImage;

  /// Height of the bar.
  final double height;

  /// Whether [style] resolves to Cupertino on this platform.
  static bool isCupertino(BuildContext context, AxiomToolbarStyle style) => switch (style) {
        AxiomToolbarStyle.cupertino => true,
        AxiomToolbarStyle.material => false,
        AxiomToolbarStyle.adaptive => switch (Theme.of(context).platform) {
            TargetPlatform.iOS || TargetPlatform.macOS => true,
            _ => false,
          },
      };

  @override
  Widget build(BuildContext context) {
    final cupertino = isCupertino(context, style);
    final scheme = Theme.of(context).colorScheme;
    final background = cupertino
        ? CupertinoColors.secondarySystemBackground.resolveFrom(context)
        : scheme.surfaceContainer;
    final border = cupertino
        ? CupertinoColors.separator.resolveFrom(context)
        : scheme.outlineVariant;
    return ListenableBuilder(
      listenable: controller,
      builder: (context, _) {
        final ready = controller.isReady;
        final buttons = <Widget>[
          for (final item in items)
            if (_shown(item)) _buildItem(context, item, cupertino, ready),
        ];
        return Semantics(
          container: true,
          label: controller.label('Text style'),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: background,
              border: Border(top: BorderSide(color: border, width: 0.5)),
            ),
            child: SizedBox(
              height: height,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 4),
                children: buttons,
              ),
            ),
          ),
        );
      },
    );
  }

  bool _shown(AxiomToolbarItem item) => switch (item) {
        AxiomToolbarItem.image => onImage != null,
        AxiomToolbarItem.comment ||
        AxiomToolbarItem.commentsPanel =>
          controller.info?.comments ?? false,
        _ => true,
      };

  Widget _buildItem(BuildContext context, AxiomToolbarItem item, bool cupertino, bool ready) {
    final state = controller.state;
    final l = controller.label;

    Widget button(
      IconData icon,
      String label,
      Future<void> Function() onPressed, {
      bool? toggled,
      bool enabled = true,
      Color? indicator,
    }) =>
        _ToolbarButton(
          icon: icon,
          label: label,
          toggled: toggled,
          enabled: ready && enabled,
          cupertino: cupertino,
          indicator: indicator,
          onPressed: onPressed,
        );

    Future<void> run(String command, [List<Object?> args = const []]) async {
      await controller.execute(command, args);
    }

    Future<void> toggle(String command) => run(command);

    switch (item) {
      case AxiomToolbarItem.divider:
        return const _Divider();
      case AxiomToolbarItem.undo:
        return button(Icons.undo, l('Undo'), controller.undo, enabled: state.canUndo);
      case AxiomToolbarItem.redo:
        return button(Icons.redo, l('Redo'), controller.redo, enabled: state.canRedo);
      case AxiomToolbarItem.blockStyle:
        return button(Icons.title, l('Text style'), () => showBlockStyleSheet(context, controller, cupertino),
            toggled: state.headingLevel != null);
      case AxiomToolbarItem.bold:
        return button(Icons.format_bold, l('Bold'), () => toggle(AxiomCommands.toggleBold),
            toggled: state.isActive('bold'));
      case AxiomToolbarItem.italic:
        return button(Icons.format_italic, l('Italic'), () => toggle(AxiomCommands.toggleItalic),
            toggled: state.isActive('italic'));
      case AxiomToolbarItem.underline:
        return button(Icons.format_underlined, l('Underline'),
            () => toggle(AxiomCommands.toggleUnderline),
            toggled: state.isActive('underline'));
      case AxiomToolbarItem.strikethrough:
        return button(Icons.format_strikethrough, l('Strikethrough'),
            () => toggle(AxiomCommands.toggleStrikethrough),
            toggled: state.isActive('strikethrough'));
      case AxiomToolbarItem.code:
        return button(Icons.code, l('Code'), () => toggle(AxiomCommands.toggleCode),
            toggled: state.isActive('code'));
      case AxiomToolbarItem.subscript:
        return button(Icons.subscript, l('Subscript'), () => toggle(AxiomCommands.toggleSubscript),
            toggled: state.isActive('subscript'));
      case AxiomToolbarItem.superscript:
        return button(Icons.superscript, l('Superscript'),
            () => toggle(AxiomCommands.toggleSuperscript),
            toggled: state.isActive('superscript'));
      case AxiomToolbarItem.textColor:
        return button(
          Icons.format_color_text,
          l('Text color'),
          () => showColorSheet(context, controller, cupertino, highlight: false),
          indicator: parseCssColor(state.textColor),
        );
      case AxiomToolbarItem.highlight:
        return button(
          Icons.border_color_outlined,
          l('Highlight'),
          () => showColorSheet(context, controller, cupertino, highlight: true),
          indicator: parseCssColor(state.highlight),
        );
      case AxiomToolbarItem.fontFamily:
        return button(Icons.font_download_outlined, l('Font'),
            () => showFontSheet(context, controller, cupertino, size: false),
            toggled: state.fontFamily != null);
      case AxiomToolbarItem.fontSize:
        return button(Icons.format_size, l('Size'),
            () => showFontSheet(context, controller, cupertino, size: true),
            toggled: state.fontSize != null);
      case AxiomToolbarItem.clearFormatting:
        return button(Icons.format_clear, l('Clear formatting'),
            () => run(AxiomCommands.clearFormatting));
      case AxiomToolbarItem.link:
        return button(Icons.link, l('Link'), () => showLinkDialog(context, controller, cupertino),
            toggled: state.link != null);
      case AxiomToolbarItem.bulletedList:
        return button(Icons.format_list_bulleted, l('Bulleted list'),
            () => toggle(AxiomCommands.toggleBulletList),
            toggled: state.list == 'bullet');
      case AxiomToolbarItem.numberedList:
        return button(Icons.format_list_numbered, l('Numbered list'),
            () => toggle(AxiomCommands.toggleOrderedList),
            toggled: state.list == 'ordered');
      case AxiomToolbarItem.todoList:
        return button(Icons.checklist, l('To-do list'), () => toggle(AxiomCommands.toggleTaskList),
            toggled: state.list == 'task');
      case AxiomToolbarItem.blockquote:
        return button(Icons.format_quote, l('Quote'), () => toggle(AxiomCommands.toggleBlockquote),
            toggled: state.blockquote);
      case AxiomToolbarItem.align:
        return button(alignIcon(state.align), l('Align'),
            () => showAlignSheet(context, controller, cupertino));
      case AxiomToolbarItem.outdent:
        return button(
          Icons.format_indent_decrease,
          l('Decrease indent'),
          () => run(state.list != null ? AxiomCommands.outdentListItem : AxiomCommands.outdentBlock),
        );
      case AxiomToolbarItem.indent:
        return button(
          Icons.format_indent_increase,
          l('Increase indent'),
          () => run(state.list != null ? AxiomCommands.indentListItem : AxiomCommands.indentBlock),
        );
      case AxiomToolbarItem.image:
        return button(Icons.image_outlined, l('Image'), () async {
          onImage?.call();
        });
      case AxiomToolbarItem.table:
        return button(Icons.table_chart_outlined, l('Insert table'),
            () => showTableSheet(context, controller, cupertino),
            enabled: !state.inTable);
      case AxiomToolbarItem.math:
        return button(Icons.functions, l('Equation'), () => run(AxiomCommands.insertMath));
      case AxiomToolbarItem.mathBlock:
        return button(Icons.calculate_outlined, l('Block equation'),
            () => run(AxiomCommands.insertMathBlock));
      case AxiomToolbarItem.horizontalRule:
        return button(Icons.horizontal_rule, l('Horizontal line'),
            () => run(AxiomCommands.insertHorizontalRule));
      case AxiomToolbarItem.comment:
        return button(Icons.add_comment_outlined, l('Comment'), controller.openCommentComposer,
            enabled: !state.selectionEmpty);
      case AxiomToolbarItem.commentsPanel:
        return button(Icons.forum_outlined, l('Comments'), () => controller.toggleCommentsPanel());
    }
  }
}

/// Icon for an alignment value.
IconData alignIcon(String align) => switch (align) {
      'center' => Icons.format_align_center,
      'right' => Icons.format_align_right,
      'justify' => Icons.format_align_justify,
      _ => Icons.format_align_left,
    };

class _ToolbarButton extends StatelessWidget {
  const _ToolbarButton({
    required this.icon,
    required this.label,
    required this.enabled,
    required this.cupertino,
    required this.onPressed,
    this.toggled,
    this.indicator,
  });

  final IconData icon;
  final String label;
  final bool? toggled;
  final bool enabled;
  final bool cupertino;
  final Color? indicator;
  final Future<void> Function() onPressed;

  Future<void> _press() async {
    await HapticFeedback.selectionClick();
    await onPressed();
  }

  @override
  Widget build(BuildContext context) {
    final selected = toggled ?? false;
    final scheme = Theme.of(context).colorScheme;
    final foreground = cupertino
        ? (selected
            ? CupertinoTheme.of(context).primaryColor
            : CupertinoColors.label.resolveFrom(context))
        : (selected ? scheme.onSecondaryContainer : scheme.onSurfaceVariant);
    final background = selected
        ? (cupertino
            ? CupertinoColors.tertiarySystemFill.resolveFrom(context)
            : scheme.secondaryContainer)
        : Colors.transparent;

    Widget glyph = Icon(icon, size: 22, color: enabled ? foreground : foreground.withValues(alpha: 0.38));
    final color = indicator;
    if (color != null) {
      glyph = Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          glyph,
          Container(
            width: 16,
            height: 3,
            margin: const EdgeInsets.only(top: 1),
            decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2)),
          ),
        ],
      );
    }

    final Widget button = cupertino
        ? CupertinoButton(
            padding: EdgeInsets.zero,
            onPressed: enabled ? _press : null,
            child: glyph,
          )
        : IconButton(
            onPressed: enabled ? _press : null,
            tooltip: label,
            icon: glyph,
            style: IconButton.styleFrom(
              backgroundColor: background,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          );

    // One node per button for screen readers: label, toggled state and tap action together.
    return MergeSemantics(
      child: Semantics(
        button: true,
        label: cupertino ? label : null,
        enabled: enabled,
        toggled: toggled,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 1, vertical: 4),
          child: cupertino
              ? DecoratedBox(
                  decoration: BoxDecoration(
                    color: background,
                    borderRadius: BorderRadius.circular(9),
                  ),
                  child: SizedBox(width: 40, child: button),
                )
              : button,
        ),
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  const _Divider();

  @override
  Widget build(BuildContext context) => const Padding(
        padding: EdgeInsets.symmetric(horizontal: 4, vertical: 12),
        child: VerticalDivider(width: 1, thickness: 1),
      );
}

/// Reads a CSS colour like `#dc2626` (as sent by the editor); null for anything else.
Color? parseCssColor(String? css) {
  if (css == null) return null;
  final hex = RegExp(r'^#([0-9a-fA-F]{6})$').firstMatch(css.trim());
  if (hex == null) return null;
  return Color(0xff000000 | int.parse(hex.group(1)!, radix: 16));
}

/// The options the editor offers in its font and colour menus, with fallbacks before start.
List<AxiomOption> optionsFor(AxiomTextController controller, String kind) {
  final info = controller.info;
  return switch (kind) {
    'fontFamily' => info?.fontFamilies ?? const [],
    'fontSize' => info?.fontSizes ?? const [],
    'textColor' => info?.textColors ?? const [],
    _ => info?.highlightColors ?? const [],
  };
}
