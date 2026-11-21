import 'dart:async';

import 'package:axiomtext/axiomtext.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fake_engine.dart';

Future<(AxiomTextController, FakeEngine)> started({
  Map<String, Object? Function(Map<String, Object?>)>? handlers,
}) async {
  final engine = FakeEngine(handlers: handlers);
  final controller = AxiomTextController();
  // ignore: invalid_use_of_internal_member
  controller.attachEngine(engine);
  // ignore: invalid_use_of_internal_member
  await controller.start({'markdown': '# Hi'});
  return (controller, engine);
}

void main() {
  test('starts the engine and reports what it supports', () async {
    final (controller, engine) = await started();
    expect(controller.isReady, isTrue);
    expect(engine.methods.first, 'init');
    expect(engine.calls.first['params'], {'markdown': '# Hi'});
    expect(controller.info!.commands, contains('toggleBold'));
    expect(controller.info!.fontFamilies.first.value, isNull);
    expect(controller.info!.textColors.single.label, 'Red');
    expect(controller.label('Bold'), 'Bold');
  });

  test('calls made before start wait for the editor', () async {
    final engine = FakeEngine(handlers: {'getText': (_) => 'hello'});
    final controller = AxiomTextController();
    // ignore: invalid_use_of_internal_member
    controller.attachEngine(engine);
    final text = controller.getText();
    expect(engine.calls, isEmpty);
    // ignore: invalid_use_of_internal_member
    await controller.start(const {});
    expect(await text, 'hello');
  });

  test('sends commands with their arguments', () async {
    final (controller, engine) = await started(handlers: {'execute': (_) => true});
    expect(await controller.execute(AxiomCommands.setHeading, [2]), isTrue);
    expect(engine.calls.last['params'], {
      'command': 'setHeading',
      'args': [2],
    });
    await controller.focus(at: AxiomCursorPosition.end);
    expect(engine.calls.last['params'], {'position': 'end'});
    await controller.mathCommand(AxiomMathCommand.moveToNextPlaceholder);
    expect(engine.calls.last['params'], {'command': 'moveToNextPlaceholder'});
  });

  test('content in and out in every format', () async {
    final (controller, engine) = await started(handlers: {
      'getJson': (_) => {'version': 1, 'doc': {'type': 'doc'}},
      'getHtml': (_) => '<p>x</p>',
      'getMarkdown': (_) => 'x',
      'getStats': (_) => {'words': 1, 'characters': 1},
    });
    expect((await controller.getJson())['version'], 1);
    expect(await controller.getHtml(), '<p>x</p>');
    expect(await controller.getMarkdown(), 'x');
    expect(await controller.getStats(), const AxiomStats(words: 1, characters: 1));
    await controller.setContent(const AxiomContent.html('<p>y</p>'));
    expect(engine.calls.last, containsPair('method', 'setHtml'));
  });

  test('refusals become AxiomEditorException', () async {
    final (controller, _) = await started(handlers: {
      'execute': (_) => throw Exception('Unknown command "nope".'),
    });
    expect(controller.execute('nope'), throwsA(isA<AxiomEditorException>()));
  });

  test('events update state, stats and streams', () async {
    final (controller, engine) = await started();
    var notified = 0;
    controller.addListener(() => notified++);
    final changes = <void>[];
    final sub = controller.onChange.listen(changes.add);
    final focus = controller.onFocus.first;

    engine.emit('state', {
      'marks': {'bold': true},
      'block': 'heading2',
      'list': 'bullet',
      'align': 'center',
      'canUndo': true,
      'focused': true,
    });
    engine.emit('change', {'words': 5, 'characters': 21});
    engine.emit('focus');
    await focus;
    await pumpEventQueue();

    expect(controller.state.isActive('bold'), isTrue);
    expect(controller.state.headingLevel, 2);
    expect(controller.state.list, 'bullet');
    expect(controller.state.align, 'center');
    expect(controller.hasFocus, isTrue);
    expect(controller.stats.words, 5);
    expect(changes, hasLength(1));
    expect(notified, greaterThanOrEqualTo(2));

    // The same state again doesn't notify.
    final before = notified;
    engine.emit('state', {
      'marks': {'bold': true},
      'block': 'heading2',
      'list': 'bullet',
      'align': 'center',
      'canUndo': true,
      'focused': true,
    });
    expect(notified, before);
    await sub.cancel();
  });

  test('math sessions follow the engine', () async {
    final (controller, engine) = await started();
    engine.emit('mathEditStart', {'latex': '', 'display': true});
    expect(controller.mathSession?.display, isTrue);
    engine.emit('mathEditChange', {'latex': r'\frac12'});
    expect(controller.mathSession?.latex, r'\frac12');
    engine.emit('mathEditEnd');
    expect(controller.mathSession, isNull);
  });

  test('contentStream debounces changes into JSON', () async {
    final (controller, engine) = await started(handlers: {
      'getJson': (_) => {'version': 1, 'doc': {'type': 'doc'}},
    });
    final docs = <Map<String, Object?>>[];
    final sub = controller
        .contentStream(debounce: const Duration(milliseconds: 20))
        .listen(docs.add);
    engine
      ..emit('change', {'words': 1, 'characters': 1})
      ..emit('change', {'words': 2, 'characters': 2})
      ..emit('change', {'words': 3, 'characters': 3});
    await Future<void>.delayed(const Duration(milliseconds: 80));
    expect(docs, hasLength(1));
    await sub.cancel();
  });

  test('closing the editor fails pending calls instead of hanging', () async {
    final engine = FakeEngine(handlers: {'getText': (_) => 'never'});
    final controller = AxiomTextController();
    // ignore: invalid_use_of_internal_member
    controller.attachEngine(engine);
    // ignore: invalid_use_of_internal_member
    await controller.start(const {});
    // Swallow the answer so the call stays pending.
    engine.onMessage = null;
    final pending = controller.getText();
    // ignore: invalid_use_of_internal_member
    controller.detachEngine();
    await expectLater(pending, throwsStateError);
  });
}
