import 'package:axiomtext/axiomtext.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('CSS colours keep alpha', () {
    expect(AxiomEditorTheme.cssColor(const Color(0xff6750a4)), 'rgb(103 80 164 / 1.000)');
    expect(AxiomEditorTheme.cssColor(const Color(0x80000000)), 'rgb(0 0 0 / 0.502)');
  });

  test('maps a Material 3 theme to editor variables', () {
    final light = AxiomEditorTheme.fromTheme(ThemeData(colorSchemeSeed: Colors.indigo));
    final dark = AxiomEditorTheme.fromTheme(
      ThemeData(colorSchemeSeed: Colors.indigo, brightness: Brightness.dark),
      fontFamily: 'Inter, sans-serif',
    );
    expect(light.dark, isFalse);
    expect(dark.dark, isTrue);
    expect(light.variables['accent'], startsWith('rgb('));
    expect(light.variables, isNot(contains('font')));
    expect(dark.variables['font'], 'Inter, sans-serif');
    expect(dark.toParams(), containsPair('dark', true));
    expect(
      AxiomEditorTheme.fromTheme(ThemeData(colorSchemeSeed: Colors.indigo)),
      equals(light),
    );
  });
}
