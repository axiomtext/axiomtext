import 'package:axiomtext/axiomtext.dart';
import 'package:flutter/painting.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fake_engine.dart';

void main() {
  Future<(AxiomTextController, FakeEngine)> started() async {
    final engine = FakeEngine(handlers: {
      'getComments': (_) => [
            {
              'id': 't1',
              'quote': 'boils',
              'color': 'blue',
              'resolved': false,
              'comments': [
                {
                  'id': 'm1',
                  'author': 'Ana',
                  'authorId': 'a1',
                  'text': 'At sea level',
                  'time': 1000
                },
              ],
            },
          ],
      'addComment': (_) => true,
      'getHighlights': (_) => [
            {
              'id': 'h1',
              'color': 'pink',
              'note': 'Remember',
              'anchor': {
                'exact': 'boils',
                'prefix': 'Water ',
                'suffix': ' at',
                'start': 6,
                'end': 11
              },
              'created': 5,
            },
          ],
    });
    final controller = AxiomTextController();
    // ignore: invalid_use_of_internal_member
    controller.attachEngine(engine);
    // ignore: invalid_use_of_internal_member
    await controller.start(const {});
    return (controller, engine);
  }

  test('reads comment threads', () async {
    final (controller, _) = await started();
    final threads = await controller.getComments();
    expect(threads.single.quote, 'boils');
    expect(threads.single.color, AxiomHighlightColor.blue);
    expect(threads.single.comments.single.author, 'Ana');
    expect(threads.single.comments.single.time,
        DateTime.fromMillisecondsSinceEpoch(1000));
  });

  test('sends comment actions', () async {
    final (controller, engine) = await started();
    expect(
        await controller.addComment('Nice', color: AxiomHighlightColor.green),
        isTrue);
    expect(engine.calls.last['params'],
        {'text': 'Nice', 'color': 'green', 'fill': true});
    await controller.addComment(
      'Any colour',
      color: AxiomHighlightColor.custom(const Color(0xFF1E88E5)),
      fill: false,
    );
    expect(engine.calls.last['params'],
        {'text': 'Any colour', 'color': '#1e88e5', 'fill': false});
    await controller.setCommentStyle('t1', fill: false);
    expect(engine.calls.last['params'], {'id': 't1', 'fill': false});
    await controller.replyToComment('t1', 'Thanks');
    expect(engine.calls.last['params'], {'id': 't1', 'text': 'Thanks'});
    await controller.resolveComment('t1', resolved: false);
    expect(engine.calls.last['params'], {'id': 't1', 'resolved': false});
    await controller.toggleCommentsPanel(open: true);
    expect(engine.calls.last, containsPair('method', 'toggleCommentsPanel'));
  });

  test('comment and highlight changes arrive as streams', () async {
    final (controller, engine) = await started();
    final comments = controller.onCommentsChange.first;
    final highlights = controller.onHighlightsChange.first;
    engine.emit('commentsChange', {
      'threads': [
        {
          'id': 't9',
          'quote': 'x',
          'color': 'nope',
          'resolved': true,
          'comments': <Object?>[]
        },
      ],
    });
    engine.emit('highlightsChange', {
      'items': [
        {
          'id': 'h2',
          'color': 'green',
          'anchor': {'exact': 'water', 'start': 0, 'end': 5},
          'created': 1,
        },
      ],
    });
    final threads = await comments;
    expect(threads.single.color,
        AxiomHighlightColor.yellow); // unknown colours fall back
    expect(threads.single.resolved, isTrue);
    expect((await highlights).single.text, 'water');
  });

  test('highlight colours: presets, any colour, and parsing', () {
    expect(AxiomHighlightColor.parse('#ABC'),
        AxiomHighlightColor.parse('#aabbcc'));
    expect(AxiomHighlightColor.parse('#aabbcc').name, 'custom');
    expect(AxiomHighlightColor.parse('#aabbcc').toColor(),
        const Color(0xFFAABBCC));
    expect(AxiomHighlightColor.parse('blue').isPreset, isTrue);
    expect(AxiomHighlightColor.parse('red'), AxiomHighlightColor.yellow);
    final h = AxiomReaderHighlight.fromMap({
      'id': 'h',
      'color': '#1e88e5',
      'fill': false,
      'anchor': {'exact': 'x'},
      'created': 1,
    });
    expect(h.fill, isFalse);
    expect(h.toMap()['color'], '#1e88e5');
    expect(h.toMap()['fill'], false);
  });

  test('highlights round-trip through toMap for storage', () async {
    final (controller, engine) = await started();
    final saved = await controller.getHighlights();
    expect(saved.single.note, 'Remember');
    final restored = AxiomReaderHighlight.fromMap(saved.single.toMap());
    expect(restored.toMap(), saved.single.toMap());
    await controller.setHighlights(saved);
    expect(
      (engine.calls.last['params']! as Map<String, Object?>)['items'],
      [saved.single.toMap()],
    );
  });
}
