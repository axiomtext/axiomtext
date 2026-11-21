import 'package:axiomtext/axiomtext.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

const _types = [
  AxiomMarkType(id: 'important', label: 'Important', color: Color(0xFF16A34A)),
  AxiomMarkType(
      id: 'pyq',
      label: 'Past exam',
      color: Color(0xFFB45309),
      style: AxiomMarkStyle.box),
];

Map<String, Object?> _chapter() => {
      'version': 1,
      'doc': {
        'type': 'doc',
        'content': [
          {
            'type': 'page',
            'attrs': {'number': 23},
          },
          {
            'type': 'heading',
            'attrs': {'level': 2},
            'content': [
              {'type': 'text', 'text': 'Photosynthesis'},
            ],
          },
          {
            'type': 'paragraph',
            'content': [
              {'type': 'text', 'text': 'Plants make food by '},
              {
                'type': 'text',
                'text': 'photosynthesis',
                'marks': [
                  {'type': 'bold'},
                  {
                    'type': 'marker',
                    'attrs': {
                      'type': 'important',
                      'id': 'm1',
                      'data': {
                        'questionIds': ['q1', 'q2'],
                      },
                      'badge': '2',
                    },
                  },
                ],
              },
              {'type': 'text', 'text': '. '},
              {
                'type': 'math_inline',
                'attrs': {'latex': r'6CO_2 + 6H_2O'},
              },
            ],
          },
          {
            'type': 'bullet_list',
            'content': [
              {
                'type': 'list_item',
                'content': [
                  {
                    'type': 'paragraph',
                    'content': [
                      {'type': 'text', 'text': 'Light'},
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };

Future<void> _pump(WidgetTester tester, Widget child) => tester.pumpWidget(
      MaterialApp(home: Scaffold(body: SingleChildScrollView(child: child))),
    );

void main() {
  testWidgets('draws headings, marks with badges, pages and equations without a WebView',
      (tester) async {
    await _pump(
      tester,
      AxiomTextView(
          content: AxiomContent.json(_chapter()), markTypes: _types),
    );
    expect(find.text('Photosynthesis'), findsOneWidget);
    expect(find.text('Page 23'), findsOneWidget);
    expect(find.text('2'), findsOneWidget); // the badge
    expect(find.textContaining('photosynthesis', findRichText: true),
        findsWidgets);
    expect(find.text('•'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('a learned mark is faded and gets the state badge', (tester) async {
    await _pump(
      tester,
      AxiomTextView(
        content: AxiomContent.json(_chapter()),
        markTypes: _types,
        markStates: const {'m1': 'learned'},
        markStateStyles: const {
          'learned': AxiomMarkStateStyle(fade: true, badge: '✓'),
        },
      ),
    );
    expect(find.text('2 ✓'), findsOneWidget);
    TextSpan? marked;
    for (final rich in tester.widgetList<RichText>(find.byType(RichText))) {
      rich.text.visitChildren((span) {
        if (span is TextSpan && span.text == 'photosynthesis') marked = span;
        return marked == null;
      });
    }
    expect(marked?.style?.color?.a, closeTo(0.45, 0.01));
  });

  testWidgets('tapping a mark reports it with its data and page', (tester) async {
    AxiomMark? tapped;
    await _pump(
      tester,
      AxiomTextView(
        content: AxiomContent.json(_chapter()),
        markTypes: _types,
        selectable: false,
        onMarkTap: (m) => tapped = m,
      ),
    );
    // The mark's text span carries the tap handler.
    TapGestureRecognizer? recognizer;
    for (final rich in tester.widgetList<RichText>(find.byType(RichText))) {
      rich.text.visitChildren((span) {
        if (span is TextSpan && span.text == 'photosynthesis') {
          recognizer = span.recognizer as TapGestureRecognizer?;
          return false;
        }
        return true;
      });
    }
    recognizer?.onTap?.call();
    expect(tapped?.id, 'm1');
    expect(tapped?.data, {
      'questionIds': ['q1', 'q2'],
    });
    expect(tapped?.page, 23);
  });

  testWidgets('Markdown with equations, lists and tables', (tester) async {
    await _pump(
      tester,
      const AxiomTextView(
        content: AxiomContent.markdown(
            '# Title\n\nArea: \$A = \\pi r^2\$\n\n- [x] done\n- [ ] todo\n\n| a | b |\n|---|---|\n| 1 | 2 |\n'),
      ),
    );
    expect(find.text('Title'), findsOneWidget);
    expect(find.byIcon(Icons.check_box), findsOneWidget);
    expect(find.byType(Table), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  test('Markdown equations become math nodes', () {
    final doc = markdownToDocument('Hello \$x^2\$');
    final para = (doc['content']! as List).first as Map<String, Object?>;
    expect((para['content']! as List).last, {
      'type': 'math_inline',
      'attrs': {'latex': 'x^2'},
    });
  });
}
