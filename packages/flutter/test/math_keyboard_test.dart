import 'package:axiomtext/axiomtext.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fake_engine.dart';

void main() {
  testWidgets('keys insert LaTeX and move the caret', (tester) async {
    final semantics = tester.ensureSemantics();
    final engine = FakeEngine();
    final controller = AxiomTextController();
    // ignore: invalid_use_of_internal_member
    controller.attachEngine(engine);
    await tester.runAsync(() async {
      // ignore: invalid_use_of_internal_member
      await controller.start(const {});
    });
    engine.emit('mathEditStart', {'latex': '', 'display': false});
    await tester.pumpWidget(
      MaterialApp(home: Scaffold(bottomNavigationBar: AxiomMathKeyboard(controller: controller))),
    );

    Future<Map<String, Object?>> lastCall() async {
      for (var i = 0; i < 5; i++) {
        await tester.pump(const Duration(milliseconds: 1));
      }
      return engine.calls.last;
    }

    await tester.tap(find.bySemanticsLabel('Fraction'));
    expect((await lastCall())['params'], {'latex': r'\frac{#0}{#?}'});

    await tester.tap(find.bySemanticsLabel('Next box'));
    expect((await lastCall())['params'], {'command': 'moveToNextPlaceholder'});

    await tester.tap(find.text('αβγ'));
    await tester.pump();
    await tester.tap(find.text('θ'));
    expect((await lastCall())['params'], {'latex': r'\theta'});

    await tester.tap(find.text('Done'));
    expect((await lastCall())['method'], 'mathCommit');
    semantics.dispose();
    controller.dispose();
  });
}
