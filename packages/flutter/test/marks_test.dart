import 'package:axiomtext/axiomtext.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fake_engine.dart';

void main() {
  Future<(AxiomTextController, FakeEngine)> started() async {
    final engine = FakeEngine(handlers: {
      'setMark': (_) => 'm1',
      'getMarks': (_) => [
            {
              'id': 'm1',
              'type': 'important',
              'text': 'photosynthesis',
              'data': {
                'questionIds': ['q1', 'q2']
              },
              'badge': '2',
              'page': 23,
              'anchor': {'exact': 'photosynthesis', 'prefix': 'by ', 'suffix': ' in'},
            },
          ],
      'getPages': (_) => [
            {'number': 23, 'index': 0},
          ],
      'getNotebook': (_) => [
            {
              'highlight': {
                'id': 'h1',
                'color': 'yellow',
                'anchor': {'exact': 'leaves'},
                'created': 1,
              },
              'text': 'leaves',
              'orphaned': false,
              'page': 23,
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

  test('mark types are sent with a #rrggbb colour and style', () {
    const type = AxiomMarkType(
      id: 'pyq',
      label: 'পূর্বের বছরের প্রশ্ন',
      color: Color(0xFFB45309),
      style: AxiomMarkStyle.box,
    );
    expect(type.toMap(), {
      'id': 'pyq',
      'label': 'পূর্বের বছরের প্রশ্ন',
      'color': '#b45309',
      'style': 'box',
    });
  });

  test('marks, data and badges', () async {
    final (controller, engine) = await started();
    expect(
        await controller.setMark('important', data: {'note': 'Learn'}), 'm1');
    expect(engine.calls.last['params'], {
      'type': 'important',
      'data': {'note': 'Learn'},
    });
    await controller.setMarkBadge('m1', '3');
    expect(engine.calls.last['params'], {'id': 'm1', 'badge': '3'});
    await controller.removeMark('m1');
    expect(engine.calls.last['params'], {'id': 'm1'});

    final marks = await controller.getMarks();
    expect(marks.single.type, 'important');
    expect(marks.single.data, {
      'questionIds': ['q1', 'q2']
    });
    expect(marks.single.page, 23);
    expect(await controller.getMarkData('m1'), {
      'questionIds': ['q1', 'q2']
    });
  });

  test('pages, filters and the notebook', () async {
    final (controller, engine) = await started();
    expect((await controller.getPages()).single.number, 23);
    await controller.scrollToPage(23);
    expect(engine.calls.last['params'], {'number': 23});
    await controller.setMarkFilter(AxiomMarkFilter.types(['important']));
    expect(engine.calls.last['params'], {
      'filter': ['important']
    });
    await controller.setMarkFilter(AxiomMarkFilter.marked);
    expect(engine.calls.last['params'], {'filter': 'marked'});
    await controller.setMarkFilter(
        AxiomMarkFilter.query(excludeStates: ['learned']));
    expect(engine.calls.last['params'], {
      'filter': {
        'excludeStates': ['learned']
      }
    });
    final notes = await controller.notebook();
    expect(notes.single.text, 'leaves');
    expect(notes.single.page, 23);
    await controller.revealHighlight('h1');
    expect(engine.calls.last['params'], {'id': 'h1'});
  });

  test('taps and selection actions arrive as streams', () async {
    final (controller, engine) = await started();
    final tap = controller.onMarkTap.first;
    final action = controller.onSelectionAction.first;
    engine.emit('markTap', {
      'id': 'm1',
      'type': 'pyq',
      'text': 'boils',
      'data': {
        'questionIds': ['q9']
      },
      'badge': null,
      'page': 4,
      'rect': {'left': 10, 'top': 20, 'right': 60, 'bottom': 40},
    });
    engine.emit('selectionAction', {
      'actionId': 'ask',
      'text': 'Roots',
      'anchor': {'exact': 'Roots'},
      'page': 23,
    });
    final mark = await tap;
    expect(mark.type, 'pyq');
    expect(mark.rect, const Rect.fromLTRB(10, 20, 60, 40));
    expect((await action).actionId, 'ask');
  });

  test('PDF mode: open, save and restore annotations', () async {
    final engine = FakeEngine(handlers: {
      'openPdf': (_) => {'pageCount': 12},
      'getPdfAnnotations': (_) => [
            {
              'id': 'a1',
              'kind': 'mark',
              'type': 'pyq',
              'page': 3,
              'anchor': {'exact': 'osmosis'},
              'rects': [
                {'x': 0.1, 'y': 0.2, 'w': 0.3, 'h': 0.02},
              ],
              'created': 1,
            },
          ],
    });
    final controller = AxiomTextController();
    // ignore: invalid_use_of_internal_member
    controller.attachEngine(engine);
    // ignore: invalid_use_of_internal_member
    await controller.start(const {});
    final pages = await controller.openPdf(
      Uint8List.fromList([37, 80, 68, 70]),
      markMode: true,
    );
    expect(pages, 12);
    final params = engine.calls.last['params']! as Map<String, Object?>;
    expect(params['data'], 'JVBERg==');
    expect(params['mode'], 'mark');
    final saved = await controller.getPdfAnnotations();
    expect(saved.single.isMark, isTrue);
    expect(saved.single.page, 3);
    expect(saved.single.text, 'osmosis');
    // Round-trips through toMap for storage.
    expect(AxiomPdfAnnotation.fromMap(saved.single.toMap()).toMap(),
        saved.single.toMap());
    final changes = controller.onPdfChange.first;
    engine.emit('pdfChange', {
      'annotations': [saved.single.toMap()],
    });
    expect((await changes).single.id, 'a1');
  });

  test('readers\' states and PDF marks', () async {
    final (controller, engine) = await started();
    await controller.setMarkState('m1', 'learned');
    expect(engine.calls.last['method'], 'setMarkStates');
    expect(engine.calls.last['params'], {
      'states': {'m1': 'learned'},
      'replace': false,
    });
    await controller.setMarkStates({'m1': null, 'm2': 'learned'}, replace: true);
    expect(engine.calls.last['params'], {
      'states': {'m1': null, 'm2': 'learned'},
      'replace': true,
    });
    expect(const AxiomMarkStateStyle(fade: true, badge: '✓').toMap(),
        {'fade': true, 'badge': '✓'});
    expect(await controller.getPdfMarks(), isEmpty);
  });
}
