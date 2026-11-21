import 'package:flutter/material.dart';

/// Colours and font of the editor, sent to the engine as CSS variables (`--ax-*`).
///
/// By default `AxiomTextEditor` builds one from the app's `Theme.of(context)`, so the editor
/// matches Material 3 colours and follows light and dark mode.
@immutable
class AxiomEditorTheme {
  /// Creates a theme from CSS variables, e.g. `{'accent': '#6750a4'}` for `--ax-accent`.
  const AxiomEditorTheme({required this.dark, this.variables = const {}, this.background});

  /// Builds the editor theme from a Flutter theme.
  ///
  /// [fontFamily] is a CSS font list such as `'Inter, system-ui, sans-serif'`. Flutter's own
  /// fonts aren't visible inside the editor, so only fonts installed on the device work.
  factory AxiomEditorTheme.fromTheme(ThemeData theme, {String? fontFamily}) {
    final c = theme.colorScheme;
    final dark = theme.brightness == Brightness.dark;
    return AxiomEditorTheme(
      dark: dark,
      background: c.surface,
      variables: {
        'bg': cssColor(c.surface),
        'canvas': cssColor(c.surfaceContainerLowest),
        'surface': cssColor(c.surface),
        'surface-raised': cssColor(c.surfaceContainerHigh),
        'surface-hover': cssColor(c.surfaceContainerHighest),
        'surface-muted': cssColor(c.surfaceContainerLow),
        'fg': cssColor(c.onSurface),
        'fg-muted': cssColor(c.onSurfaceVariant),
        'fg-subtle': cssColor(c.outline),
        'border': cssColor(c.outlineVariant),
        'border-strong': cssColor(c.outline),
        'accent': cssColor(c.primary),
        'accent-hover': cssColor(Color.lerp(c.primary, c.onPrimary, 0.12)!),
        'accent-fg': cssColor(c.onPrimary),
        'accent-soft': cssColor(c.primaryContainer),
        'accent-soft-fg': cssColor(c.onPrimaryContainer),
        'ring': cssColor(c.primary.withValues(alpha: 0.28)),
        'selection': cssColor(c.primary.withValues(alpha: 0.28)),
        'danger': cssColor(c.error),
        if (fontFamily != null) 'font': fontFamily,
      },
    );
  }

  /// Dark mode.
  final bool dark;

  /// CSS variable overrides without the `--ax-` prefix.
  final Map<String, String> variables;

  /// Colour behind the editor while it loads.
  final Color? background;

  /// The parameters sent to the engine.
  Map<String, Object?> toParams() => {'dark': dark, 'vars': variables};

  /// A CSS colour, e.g. `rgb(103 80 164 / 1.000)`.
  static String cssColor(Color color) {
    final argb = color.toARGB32();
    final a = ((argb >> 24) & 0xff) / 255;
    return 'rgb(${(argb >> 16) & 0xff} ${(argb >> 8) & 0xff} ${argb & 0xff} / ${a.toStringAsFixed(3)})';
  }

  @override
  bool operator ==(Object other) =>
      other is AxiomEditorTheme &&
      other.dark == dark &&
      other.background == background &&
      _mapEquals(other.variables, variables);

  @override
  int get hashCode => Object.hash(dark, background, Object.hashAllUnordered(variables.entries.map((e) => '${e.key}=${e.value}')));
}

bool _mapEquals(Map<String, String> a, Map<String, String> b) {
  if (a.length != b.length) return false;
  for (final entry in a.entries) {
    if (b[entry.key] != entry.value) return false;
  }
  return true;
}
