import 'package:markdown/markdown.dart' as md;

/// `$…$` (inline) and `$$…$$` (block) equations.
class _MathSyntax extends md.InlineSyntax {
  _MathSyntax() : super(r'\$\$([^$]+?)\$\$|\$([^$\n]+?)\$');

  @override
  bool onMatch(md.InlineParser parser, Match match) {
    final block = match[1];
    final element = md.Element.empty(block != null ? 'math-block' : 'math')
      ..attributes['latex'] = (block ?? match[2] ?? '').trim();
    parser.addNode(element);
    return true;
  }
}

/// Markdown (GitHub style, with `$…$` equations) as an AxiomText document.
Map<String, Object?> markdownToDocument(String markdown) {
  final document = md.Document(
    extensionSet: md.ExtensionSet.gitHubFlavored,
    inlineSyntaxes: [_MathSyntax()],
    encodeHtml: false,
  );
  final nodes = document.parseLines(markdown.replaceAll('\r\n', '\n').split('\n'));
  final content = _blocks(nodes);
  return {
    'type': 'doc',
    'content': content.isEmpty ? [{'type': 'paragraph'}] : content,
  };
}

List<Map<String, Object?>> _blocks(List<md.Node> nodes) {
  final out = <Map<String, Object?>>[];
  final loose = <md.Node>[];
  void flushLoose() {
    if (loose.isEmpty) return;
    final inline = _inline(List.of(loose), const []);
    loose.clear();
    if (inline.isNotEmpty) out.add({'type': 'paragraph', 'content': inline});
  }

  for (final node in nodes) {
    if (node is md.Element && _isBlock(node.tag)) {
      flushLoose();
      out.addAll(_block(node));
    } else {
      loose.add(node);
    }
  }
  flushLoose();
  return out;
}

const _blockTags = {
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'hr', //
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'math-block',
};
bool _isBlock(String tag) => _blockTags.contains(tag);

List<Map<String, Object?>> _block(md.Element el) {
  final children = el.children ?? const <md.Node>[];
  switch (el.tag) {
    case 'p':
      // A paragraph with only a $$…$$ equation is a block equation.
      if (children.length == 1 &&
          children.first is md.Element &&
          (children.first as md.Element).tag == 'math-block') {
        return _block(children.first as md.Element);
      }
      final inline = _inline(children, const []);
      return inline.isEmpty ? const [] : [{'type': 'paragraph', 'content': inline}];
    case 'h1' || 'h2' || 'h3' || 'h4' || 'h5' || 'h6':
      return [
        {
          'type': 'heading',
          'attrs': {'level': int.parse(el.tag.substring(1))},
          'content': _inline(children, const []),
        },
      ];
    case 'math-block':
      return [
        {
          'type': 'math_block',
          'attrs': {'latex': el.attributes['latex'] ?? ''},
        },
      ];
    case 'blockquote':
      return [
        {'type': 'blockquote', 'content': _blocks(children)},
      ];
    case 'hr':
      return [
        {'type': 'horizontal_rule'},
      ];
    case 'pre':
      return [
        {
          'type': 'code_block',
          'content': [
            {'type': 'text', 'text': el.textContent.replaceAll(RegExp(r'\n$'), '')},
          ],
        },
      ];
    case 'ul' || 'ol':
      final items = children.whereType<md.Element>().where((e) => e.tag == 'li').toList();
      final tasks = items.isNotEmpty &&
          items.every((li) => (li.children ?? const []).any((c) => c is md.Element && c.tag == 'input'));
      return [
        {
          'type': tasks ? 'task_list' : (el.tag == 'ol' ? 'ordered_list' : 'bullet_list'),
          if (el.tag == 'ol' && !tasks)
            'attrs': {'start': int.tryParse(el.attributes['start'] ?? '') ?? 1},
          'content': [
            for (final li in items)
              {
                'type': tasks ? 'task_item' : 'list_item',
                if (tasks)
                  'attrs': {
                    'checked': (li.children ?? const [])
                        .whereType<md.Element>()
                        .any((c) => c.tag == 'input' && c.attributes.containsKey('checked')),
                  },
                'content': _listItemBlocks(li),
              },
          ],
        },
      ];
    case 'table':
      final rows = <Map<String, Object?>>[];
      void collect(md.Element e) {
        for (final child in (e.children ?? const <md.Node>[]).whereType<md.Element>()) {
          if (child.tag == 'tr') {
            rows.add({
              'type': 'table_row',
              'content': [
                for (final cell in (child.children ?? const <md.Node>[]).whereType<md.Element>())
                  {
                    'type': cell.tag == 'th' ? 'table_header' : 'table_cell',
                    'content': [
                      {
                        'type': 'paragraph',
                        'content': _inline(cell.children ?? const [], const []),
                      },
                    ],
                  },
              ],
            });
          } else {
            collect(child);
          }
        }
      }

      collect(el);
      return [
        {'type': 'table', 'content': rows},
      ];
    default:
      return _blocks(children);
  }
}

List<Map<String, Object?>> _listItemBlocks(md.Element li) {
  final children = (li.children ?? const <md.Node>[])
      .where((c) => !(c is md.Element && c.tag == 'input'))
      .toList();
  final blocks = _blocks(children);
  return blocks.isEmpty ? [{'type': 'paragraph'}] : blocks;
}

List<Map<String, Object?>> _inline(List<md.Node> nodes, List<Map<String, Object?>> marks) {
  final out = <Map<String, Object?>>[];
  for (final node in nodes) {
    if (node is md.Text) {
      final text = node.text;
      if (text.isEmpty) continue;
      out.add({'type': 'text', 'text': text, if (marks.isNotEmpty) 'marks': marks});
      continue;
    }
    if (node is! md.Element) continue;
    final children = node.children ?? const <md.Node>[];
    Map<String, Object?>? mark;
    switch (node.tag) {
      case 'strong':
        mark = {'type': 'bold'};
      case 'em':
        mark = {'type': 'italic'};
      case 'del':
        mark = {'type': 'strikethrough'};
      case 'code':
        out.add({
          'type': 'text',
          'text': node.textContent,
          'marks': [...marks, {'type': 'code'}],
        });
        continue;
      case 'a':
        mark = {
          'type': 'link',
          'attrs': {'href': node.attributes['href'] ?? ''},
        };
      case 'br':
        out.add({'type': 'hard_break'});
        continue;
      case 'math':
        out.add({
          'type': 'math_inline',
          'attrs': {'latex': node.attributes['latex'] ?? ''},
        });
        continue;
      case 'img':
        out.add({
          'type': 'image',
          'attrs': {'src': node.attributes['src'] ?? '', 'alt': node.attributes['alt'] ?? ''},
        });
        continue;
    }
    out.addAll(_inline(children, mark == null ? marks : [...marks, mark]));
  }
  return out;
}
