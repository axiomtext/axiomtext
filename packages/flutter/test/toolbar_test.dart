import 'package:axiomtext/axiomtext.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fake_engine.dart';

/// Lets taps finish: haptics, the call and the fake engine's answer.
Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 5; i++) {
    await tester.pump(const Duration(milliseconds: 1));
  }
}

void main() {
  Future<(AxiomTextController, FakeEngine)> pumpToolbar(
    WidgetTester tester, {
    AxiomToolbarStyle style = AxiomToolbarStyle.material,
  }) async {
    final engine = FakeEngine(handlers: {'execute': (_) => true});
    final controller = AxiomTextController();
    // ignore: invalid_use_of_internal_member
    controller.attachEngine(engine);
    await tester.runAsync(() async {
      // ignore: invalid_use_of_internal_member
      await controller.start(const {});
    });
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          bottomNavigationBar: AxiomToolbar(controller: controller, style: style, onImage: () {}),
        ),
      ),
    );
    return (controller, engine);
  }

  testWidgets('buttons run commands and show the state at the cursor', (tester) async {
    final (controller, engine) = await pumpToolbar(tester);
    final semantics = tester.ensureSemantics();

    await tester.tap(find.byTooltip('Bold'));
    await settle(tester);
    expect(engine.calls.last['params'], {'command': 'toggleBold', 'args': <Object?>[]});

    engine.emit('state', {
      'marks': {'bold': true},
      'canUndo': true,
    });
    await tester.pump();
    expect(
      tester.getSemantics(find.byTooltip('Bold')),
      containsSemantics(isButton: true, isToggled: true, hasTapAction: true),
    );
    // Undo is enabled now; redo isn't.
    expect(tester.getSemantics(find.byTooltip('Undo')), containsSemantics(isEnabled: true));
    expect(tester.getSemantics(find.byTooltip('Redo')), containsSemantics(isEnabled: false));
    semantics.dispose();
    controller.dispose();
  });

  testWidgets('the heading menu sets a heading', (tester) async {
    final (controller, engine) = await pumpToolbar(tester);
    await tester.tap(find.byTooltip('Text style'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Heading 2'));
    await tester.pumpAndSettle();
    await settle(tester);
    expect(
      engine.calls.where((c) => c['method'] == 'execute').last['params'],
      {'command': 'setHeading', 'args': [2]},
    );
    controller.dispose();
  });

  testWidgets('the table picker inserts the size tapped', (tester) async {
    final semantics = tester.ensureSemantics();
    final (controller, engine) = await pumpToolbar(tester);
    await tester.dragUntilVisible(
      find.byTooltip('Insert table'),
      find.byType(ListView),
      const Offset(-200, 0),
    );
    await tester.tap(find.byTooltip('Insert table'));
    await tester.pumpAndSettle();
    await tester.tap(find.bySemanticsLabel('4 × 2'));
    await tester.pumpAndSettle();
    await settle(tester);
    expect(
      engine.calls.where((c) => c['method'] == 'execute').last['params'],
      {'command': 'insertTable', 'args': [2, 4]},
    );
    semantics.dispose();
    controller.dispose();
  });

  testWidgets('Cupertino style builds and runs commands', (tester) async {
    final semantics = tester.ensureSemantics();
    final (controller, engine) = await pumpToolbar(tester, style: AxiomToolbarStyle.cupertino);
    await tester.tap(find.bySemanticsLabel('Italic'));
    await settle(tester);
    expect(engine.calls.last['params'], {'command': 'toggleItalic', 'args': <Object?>[]});
    semantics.dispose();
    controller.dispose();
  });
}
