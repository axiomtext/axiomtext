// Flutter 3.47+ prefers package:material_ui / cupertino_ui; kept for older Flutter.
// ignore: deprecated_member_use
import 'package:flutter/cupertino.dart';
// ignore: deprecated_member_use
import 'package:flutter/material.dart';

import '../controller.dart';
import '../models.dart';
import 'toolbar.dart';

/// One choice in a menu.
class _Choice<T> {
  const _Choice(this.label, this.value, {this.icon, this.style});

  final String label;
  final T value;
  final IconData? icon;
  final TextStyle? style;
}

/// Wraps the picked value so a picked `null` ("default") differs from "cancelled".
class _Picked<T> {
  const _Picked(this.value);

  final T value;
}

Future<_Picked<T>?> _choose<T>(
  BuildContext context,
  AxiomTextController controller, {
  required String title,
  required List<_Choice<T>> choices,
  required T current,
  required bool cupertino,
}) {
  if (cupertino) {
    return showCupertinoModalPopup<_Picked<T>>(
      context: context,
      builder: (context) => CupertinoActionSheet(
        title: Text(title),
        actions: [
          for (final choice in choices)
            CupertinoActionSheetAction(
              isDefaultAction: choice.value == current,
              onPressed: () => Navigator.pop(context, _Picked<T>(choice.value)),
              child: Text(choice.label, style: choice.style),
            ),
        ],
        cancelButton: CupertinoActionSheetAction(
          onPressed: () => Navigator.pop(context),
          child: Text(controller.label('Cancel')),
        ),
      ),
    );
  }
  return showModalBottomSheet<_Picked<T>>(
    context: context,
    showDragHandle: true,
    isScrollControlled: true,
    builder: (context) => SafeArea(
      child: ConstrainedBox(
        constraints:
            BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.7),
        child: ListView(
          shrinkWrap: true,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 8),
              child:
                  Text(title, style: Theme.of(context).textTheme.titleMedium),
            ),
            for (final choice in choices)
              ListTile(
                leading: choice.icon == null ? null : Icon(choice.icon),
                title: Text(choice.label, style: choice.style),
                selected: choice.value == current,
                trailing:
                    choice.value == current ? const Icon(Icons.check) : null,
                onTap: () => Navigator.pop(context, _Picked<T>(choice.value)),
              ),
          ],
        ),
      ),
    ),
  );
}

/// Paragraph, headings and quote.
Future<void> showBlockStyleSheet(
  BuildContext context,
  AxiomTextController controller,
  bool cupertino,
) async {
  final text = Theme.of(context).textTheme;
  final l = controller.label;
  final state = controller.state;
  final current = state.blockquote ? 'quote' : state.block;
  final picked = await _choose<String>(
    context,
    controller,
    title: l('Text style'),
    current: current,
    cupertino: cupertino,
    choices: [
      _Choice(l('Paragraph'), 'paragraph', style: text.bodyLarge),
      _Choice(l('Heading 1'), 'heading1', style: text.headlineSmall),
      _Choice(l('Heading 2'), 'heading2', style: text.titleLarge),
      _Choice(l('Heading 3'), 'heading3', style: text.titleMedium),
      _Choice(l('Heading 4'), 'heading4', style: text.titleSmall),
      _Choice(l('Quote'), 'quote', icon: Icons.format_quote),
    ],
  );
  if (picked == null) return;
  final value = picked.value;
  if (value == 'quote') {
    await controller.execute(AxiomCommands.toggleBlockquote);
  } else if (value == 'paragraph') {
    if (state.blockquote) {
      await controller.execute(AxiomCommands.toggleBlockquote);
    }
    await controller.execute(AxiomCommands.setParagraph);
  } else {
    await controller
        .execute(AxiomCommands.setHeading, [int.parse(value.substring(7))]);
  }
  await controller.focus();
}

/// Left, center, right, justify.
Future<void> showAlignSheet(
  BuildContext context,
  AxiomTextController controller,
  bool cupertino,
) async {
  final l = controller.label;
  final picked = await _choose<String>(
    context,
    controller,
    title: l('Align'),
    current: controller.state.align,
    cupertino: cupertino,
    choices: [
      _Choice(l('Align left'), 'left', icon: alignIcon('left')),
      _Choice(l('Align center'), 'center', icon: alignIcon('center')),
      _Choice(l('Align right'), 'right', icon: alignIcon('right')),
      _Choice(l('Justify'), 'justify', icon: alignIcon('justify')),
    ],
  );
  if (picked == null) return;
  await controller.execute(AxiomCommands.setTextAlign, [picked.value]);
  await controller.focus();
}

/// Font or size menu.
Future<void> showFontSheet(
  BuildContext context,
  AxiomTextController controller,
  bool cupertino, {
  required bool size,
}) async {
  final l = controller.label;
  final options = optionsFor(controller, size ? 'fontSize' : 'fontFamily');
  final picked = await _choose<String?>(
    context,
    controller,
    title: l(size ? 'Size' : 'Font'),
    current: size ? controller.state.fontSize : controller.state.fontFamily,
    cupertino: cupertino,
    choices: [
      for (final option in options)
        _Choice(
          option.value == null
              ? l(size ? 'Default size' : 'Default font')
              : option.label,
          option.value,
          style: size || option.value == null
              ? null
              : TextStyle(fontFamily: _firstFont(option.value!)),
        ),
    ],
  );
  if (picked == null) return;
  await controller.execute(
    size ? AxiomCommands.setFontSize : AxiomCommands.setFontFamily,
    [picked.value],
  );
  await controller.focus();
}

String _firstFont(String css) =>
    css.split(',').first.replaceAll('"', '').trim();

/// Text colour or highlight swatches.
Future<void> showColorSheet(
  BuildContext context,
  AxiomTextController controller,
  bool cupertino, {
  required bool highlight,
}) async {
  final l = controller.label;
  final options = optionsFor(controller, highlight ? 'highlight' : 'textColor');
  final current =
      highlight ? controller.state.highlight : controller.state.textColor;

  Widget body(BuildContext context) => SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l(highlight ? 'Highlight' : 'Text color'),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                for (final option in options)
                  _Swatch(
                    color: parseCssColor(option.value) ?? Colors.transparent,
                    label: option.label,
                    selected: option.value == current,
                    onTap: () =>
                        Navigator.pop(context, _Picked<String?>(option.value)),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            TextButton.icon(
              onPressed: () =>
                  Navigator.pop(context, const _Picked<String?>(null)),
              icon: const Icon(Icons.format_color_reset),
              label: Text(l('Remove color')),
            ),
          ],
        ),
      );

  final _Picked<String?>? picked;
  if (cupertino) {
    picked = await showCupertinoModalPopup<_Picked<String?>>(
      context: context,
      builder: (context) => CupertinoPopupSurface(
        child: Material(
          type: MaterialType.transparency,
          child: SafeArea(
            child: Padding(
                padding: const EdgeInsets.only(top: 20), child: body(context)),
          ),
        ),
      ),
    );
  } else {
    picked = await showModalBottomSheet<_Picked<String?>>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(child: body(context)),
    );
  }
  if (picked == null) return;
  await controller.execute(
    highlight ? AxiomCommands.setHighlight : AxiomCommands.setTextColor,
    [picked.value],
  );
  await controller.focus();
}

class _Swatch extends StatelessWidget {
  const _Swatch({
    required this.color,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final Color color;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      button: true,
      selected: selected,
      label: label,
      onTap: onTap,
      excludeSemantics: true,
      child: Tooltip(
        message: label,
        child: InkResponse(
          onTap: onTap,
          radius: 24,
          child: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
              border: Border.all(
                color: selected ? scheme.primary : scheme.outlineVariant,
                width: selected ? 3 : 1,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Table size picker: tap a cell in the grid.
Future<void> showTableSheet(
  BuildContext context,
  AxiomTextController controller,
  bool cupertino,
) async {
  Widget body(BuildContext context) => _TableGrid(
        title: controller.label('Insert table'),
        onPick: (rows, cols) => Navigator.pop(context, (rows, cols)),
      );
  final (int, int)? size;
  if (cupertino) {
    size = await showCupertinoModalPopup<(int, int)>(
      context: context,
      builder: (context) => CupertinoPopupSurface(
        child: Material(
            type: MaterialType.transparency,
            child: SafeArea(child: body(context))),
      ),
    );
  } else {
    size = await showModalBottomSheet<(int, int)>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => SafeArea(child: body(context)),
    );
  }
  if (size == null) return;
  await controller.execute(AxiomCommands.insertTable, [size.$1, size.$2]);
  await controller.focus();
}

class _TableGrid extends StatefulWidget {
  const _TableGrid({required this.title, required this.onPick});

  final String title;
  final void Function(int rows, int cols) onPick;

  @override
  State<_TableGrid> createState() => _TableGridState();
}

class _TableGridState extends State<_TableGrid> {
  static const int _rows = 8;
  static const int _cols = 6;
  int _r = 3;
  int _c = 3;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    // Scrolls on short screens (e.g. a phone held sideways) instead of being cut off.
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('${widget.title}: $_c × $_r',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 16),
          for (var r = 1; r <= _rows; r++)
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var c = 1; c <= _cols; c++)
                  GestureDetector(
                    onTapDown: (_) => setState(() {
                      _r = r;
                      _c = c;
                    }),
                    onTap: () => widget.onPick(r, c),
                    child: Semantics(
                      button: true,
                      label: '$c × $r',
                      child: Container(
                        width: 34,
                        height: 28,
                        margin: const EdgeInsets.all(2),
                        decoration: BoxDecoration(
                          color: r <= _r && c <= _c
                              ? scheme.primaryContainer
                              : scheme.surface,
                          border: Border.all(
                            color: r <= _r && c <= _c
                                ? scheme.primary
                                : scheme.outlineVariant,
                          ),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

/// Add, change or remove a link.
Future<void> showLinkDialog(
  BuildContext context,
  AxiomTextController controller,
  bool cupertino,
) async {
  final l = controller.label;
  final existing = controller.state.link;
  final text = TextEditingController(text: existing ?? 'https://');

  // Returns the address, '' to remove the link, or null when cancelled.
  final String? result;
  if (cupertino) {
    result = await showCupertinoDialog<String>(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: Text(l('Link')),
        content: Padding(
          padding: const EdgeInsets.only(top: 12),
          child: CupertinoTextField(
            controller: text,
            autofocus: true,
            keyboardType: TextInputType.url,
            placeholder: l('Link address'),
            onSubmitted: (value) => Navigator.pop(context, value.trim()),
          ),
        ),
        actions: [
          CupertinoDialogAction(
            onPressed: () => Navigator.pop(context),
            child: Text(l('Cancel')),
          ),
          if (existing != null)
            CupertinoDialogAction(
              isDestructiveAction: true,
              onPressed: () => Navigator.pop(context, ''),
              child: Text(l('Remove link')),
            ),
          CupertinoDialogAction(
            isDefaultAction: true,
            onPressed: () => Navigator.pop(context, text.text.trim()),
            child: Text(l('Save')),
          ),
        ],
      ),
    );
  } else {
    result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l('Link')),
        content: TextField(
          controller: text,
          autofocus: true,
          keyboardType: TextInputType.url,
          decoration: InputDecoration(labelText: l('Link address')),
          onSubmitted: (value) => Navigator.pop(context, value.trim()),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(l('Cancel'))),
          if (existing != null)
            TextButton(
              onPressed: () => Navigator.pop(context, ''),
              child: Text(l('Remove link')),
            ),
          FilledButton(
            onPressed: () => Navigator.pop(context, text.text.trim()),
            child: Text(l('Save')),
          ),
        ],
      ),
    );
  }
  // (The text controller is left to the garbage collector: the dialog may still be animating.)
  if (result == null) return;
  if (result.isEmpty || result == 'https://') {
    await controller.execute(AxiomCommands.unsetLink);
  } else {
    await controller.execute(AxiomCommands.setLink, [result]);
  }
  await controller.focus();
}

/// A sample of how a mark type looks, for menus and legends.
class AxiomMarkSample extends StatelessWidget {
  /// Draws [label] in [type]'s style.
  const AxiomMarkSample({super.key, required this.type, this.label});

  /// The mark type.
  final AxiomMarkType type;

  /// Text to draw (default: the type's label).
  final String? label;

  @override
  Widget build(BuildContext context) {
    final color = type.color;
    final base = DefaultTextStyle.of(context).style;
    final text = Text(
      label ?? type.label,
      style: switch (type.style) {
        AxiomMarkStyle.underline => base.copyWith(
            decoration: TextDecoration.underline,
            decorationColor: color,
            decorationThickness: 2,
          ),
        AxiomMarkStyle.double => base.copyWith(
            decoration: TextDecoration.underline,
            decorationStyle: TextDecorationStyle.double,
            decorationColor: color,
          ),
        _ => base,
      },
    );
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOutCubic,
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
      decoration: switch (type.style) {
        AxiomMarkStyle.fill => BoxDecoration(
            color: color.withValues(alpha: 0.26),
            borderRadius: BorderRadius.circular(4),
          ),
        AxiomMarkStyle.box => BoxDecoration(
            border: Border.all(color: color, width: 1.5),
            borderRadius: BorderRadius.circular(4),
          ),
        _ => const BoxDecoration(),
      },
      child: text,
    );
  }
}

/// Mark the selection with one of [types], or remove the mark there.
Future<void> showMarkSheet(
  BuildContext context,
  AxiomTextController controller,
  List<AxiomMarkType> types,
  bool cupertino,
) async {
  final l = controller.label;
  // null: remove; a type id: apply it.
  final _Picked<String?>? picked;
  if (cupertino) {
    picked = await showCupertinoModalPopup<_Picked<String?>>(
      context: context,
      builder: (context) => CupertinoActionSheet(
        title: Text(l('Mark')),
        actions: [
          for (final type in types)
            CupertinoActionSheetAction(
              onPressed: () => Navigator.pop(context, _Picked<String?>(type.id)),
              child: DefaultTextStyle.merge(
                style: TextStyle(
                    color: CupertinoColors.label.resolveFrom(context)),
                child: AxiomMarkSample(type: type),
              ),
            ),
          CupertinoActionSheetAction(
            isDestructiveAction: true,
            onPressed: () => Navigator.pop(context, const _Picked<String?>(null)),
            child: Text(l('Remove mark')),
          ),
        ],
        cancelButton: CupertinoActionSheetAction(
          onPressed: () => Navigator.pop(context),
          child: Text(l('Cancel')),
        ),
      ),
    );
  } else {
    picked = await showModalBottomSheet<_Picked<String?>>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => SafeArea(
        child: ConstrainedBox(
          constraints: BoxConstraints(
              maxHeight: MediaQuery.sizeOf(context).height * 0.7),
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.only(bottom: 8),
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 8),
                child: Text(l('Mark'),
                    style: Theme.of(context).textTheme.titleMedium),
              ),
              for (final type in types)
                ListTile(
                  leading: Icon(Icons.bookmark, color: type.color),
                  title: Align(
                    alignment: AlignmentDirectional.centerStart,
                    child: AxiomMarkSample(type: type),
                  ),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                  onTap: () =>
                      Navigator.pop(context, _Picked<String?>(type.id)),
                ),
              const Divider(indent: 16, endIndent: 16),
              ListTile(
                leading: const Icon(Icons.format_color_reset_outlined),
                title: Text(l('Remove mark')),
                onTap: () =>
                    Navigator.pop(context, const _Picked<String?>(null)),
              ),
            ],
          ),
        ),
      ),
    );
  }
  if (picked == null) return;
  final id = picked.value;
  if (id == null) {
    await controller.removeMark();
  } else {
    await controller.setMark(id);
  }
  await controller.focus();
}
