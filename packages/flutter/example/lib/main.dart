import 'dart:async';

import 'package:axiomtext/axiomtext.dart';
// Flutter 3.47+ prefers package:material_ui / cupertino_ui; kept for older Flutter.
// ignore: deprecated_member_use
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // Load the editor engine while the home screen appears, so the first editor opens instantly.
  AxiomTextEditor.prewarm();
  runApp(const ExampleApp());
}

/// Languages the editor's interface supports.
const languages = {
  'en': 'English',
  'bn': 'বাংলা',
  'hi': 'हिन्दी',
  'ar': 'العربية',
  'es': 'Español',
  'fr': 'Français',
  'de': 'Deutsch',
  'pt': 'Português',
  'zh': '简体中文',
  'ja': '日本語',
};

class ExampleApp extends StatefulWidget {
  const ExampleApp({super.key});

  @override
  State<ExampleApp> createState() => _ExampleAppState();
}

class _ExampleAppState extends State<ExampleApp> {
  ThemeMode _mode = ThemeMode.system;
  Locale _locale = const Locale('en');

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AxiomText',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(colorSchemeSeed: const Color(0xff4f46e5)),
      darkTheme: ThemeData(
        colorSchemeSeed: const Color(0xff4f46e5),
        brightness: Brightness.dark,
      ),
      themeMode: _mode,
      locale: _locale,
      supportedLocales: [for (final code in languages.keys) Locale(code)],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      home: HomePage(
        mode: _mode,
        locale: _locale,
        onMode: (mode) => setState(() => _mode = mode),
        onLocale: (locale) => setState(() => _locale = locale),
      ),
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({
    super.key,
    required this.mode,
    required this.locale,
    required this.onMode,
    required this.onLocale,
  });

  final ThemeMode mode;
  final Locale locale;
  final ValueChanged<ThemeMode> onMode;
  final ValueChanged<Locale> onLocale;

  @override
  Widget build(BuildContext context) {
    final demos = [
      (
        Icons.sticky_note_2_outlined,
        'Notes',
        'Native toolbar above the keyboard, autosave, word count',
        const NotesPage(),
      ),
      (
        Icons.functions,
        'Math homework',
        'Equations with the native math keyboard',
        const MathPage(),
      ),
      (
        Icons.description_outlined,
        'Document',
        "The editor's own toolbar, paper-like page, export",
        const DocumentPage(),
      ),
      (
        Icons.auto_stories_outlined,
        'Reading view',
        'Highlight passages and add notes, like a marked-up book',
        const ReadingPage(),
      ),
      (
        Icons.bookmark_border,
        'Marked book',
        'Teachers mark a chapter; students filter, tap and practise',
        const MarkedBookPage(),
      ),
      (
        Icons.quiz_outlined,
        'Quiz list',
        'Questions with equations, drawn natively (no WebView)',
        const QuizPage(),
      ),
      (
        Icons.chat_bubble_outline,
        'Comment box',
        'Grows with its content inside a scrolling list',
        const CommentPage(),
      ),
    ];
    return Scaffold(
      appBar: AppBar(
        title: const Text('AxiomText'),
        actions: [
          PopupMenuButton<String>(
            tooltip: 'Language',
            icon: const Icon(Icons.translate),
            initialValue: locale.languageCode,
            onSelected: (code) => onLocale(Locale(code)),
            itemBuilder: (context) => [
              for (final entry in languages.entries)
                PopupMenuItem(value: entry.key, child: Text(entry.value)),
            ],
          ),
          IconButton(
            tooltip: 'Light or dark',
            icon: Icon(
              Theme.of(context).brightness == Brightness.dark
                  ? Icons.light_mode_outlined
                  : Icons.dark_mode_outlined,
            ),
            onPressed: () => onMode(
              Theme.of(context).brightness == Brightness.dark
                  ? ThemeMode.light
                  : ThemeMode.dark,
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (!AxiomTextEditor.isSupported)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child:
                    Text('AxiomText runs on Android, iOS, macOS and the web.'),
              ),
            ),
          for (final (icon, title, subtitle, page) in demos)
            Card(
              clipBehavior: Clip.antiAlias,
              child: ListTile(
                leading: Icon(icon),
                title: Text(title),
                subtitle: Text(subtitle),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute<void>(builder: (_) => page),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Notes: native toolbar, autosave to memory, word count in the app bar.
class NotesPage extends StatefulWidget {
  const NotesPage({super.key});

  @override
  State<NotesPage> createState() => _NotesPageState();
}

/// Stands in for your database.
Map<String, Object?>? savedNote;

class _NotesPageState extends State<NotesPage> {
  final _controller = AxiomTextController();
  StreamSubscription<Map<String, Object?>>? _autosave;
  String _status = '';

  @override
  void initState() {
    super.initState();
    // Saves at most twice a second while typing.
    _autosave = _controller.contentStream().listen((json) {
      savedNote = json;
      if (mounted) setState(() => _status = 'Saved');
    });
  }

  @override
  void dispose() {
    _autosave?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final saved = savedNote;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notes'),
        actions: [
          ListenableBuilder(
            listenable: _controller,
            builder: (context, _) => Center(
              child: Padding(
                padding: const EdgeInsets.only(right: 16),
                child: Text('${_controller.stats.words} words  $_status'),
              ),
            ),
          ),
        ],
      ),
      body: AxiomTextEditor(
        controller: _controller,
        initialContent: saved != null
            ? AxiomContent.json(saved)
            : const AxiomContent.markdown(
                '# Shopping list\n\n'
                '- [x] Milk\n- [ ] Bread\n- [ ] Coffee\n\n'
                'Try **bold**, lists, colours and links from the toolbar.',
              ),
        placeholder: 'Start writing…',
        // Select text, then the comment button. Threads are saved inside the note.
        commentAuthor: const AxiomCommentAuthor(name: 'You', id: 'you'),
        onChanged: () => setState(() => _status = 'Editing…'),
      ),
    );
  }
}

/// Math homework: inline and block equations, native math keyboard on phones.
class MathPage extends StatelessWidget {
  const MathPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Math homework')),
      body: const AxiomTextEditor(
        initialContent: AxiomContent.markdown(
          '## Exercise 1\n\n'
          r'Solve $x^2 - 5x + 6 = 0$.'
          '\n\n'
          r'$$x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$$'
          '\n\n'
          'Tap any equation to edit it, or use the ∑ buttons to add one. '
          'Paste maths from ChatGPT or Wikipedia and it stays an equation.',
        ),
        toolbarItems: [
          AxiomToolbarItem.undo,
          AxiomToolbarItem.redo,
          AxiomToolbarItem.divider,
          AxiomToolbarItem.math,
          AxiomToolbarItem.mathBlock,
          AxiomToolbarItem.divider,
          AxiomToolbarItem.bold,
          AxiomToolbarItem.italic,
          AxiomToolbarItem.numberedList,
          AxiomToolbarItem.image,
        ],
      ),
    );
  }
}

/// A long document with the web toolbar, export to HTML and Markdown.
class DocumentPage extends StatefulWidget {
  const DocumentPage({super.key});

  @override
  State<DocumentPage> createState() => _DocumentPageState();
}

class _DocumentPageState extends State<DocumentPage> {
  final _controller = AxiomTextController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _export(String format) async {
    final text = format == 'HTML'
        ? await _controller.getHtml()
        : await _controller.getMarkdown();
    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => SafeArea(
        child: SizedBox(
          height: MediaQuery.sizeOf(context).height * 0.6,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: SelectableText(text,
                style: const TextStyle(fontFamily: 'monospace')),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Document'),
        actions: [
          PopupMenuButton<String>(
            tooltip: 'Export',
            icon: const Icon(Icons.ios_share),
            onSelected: _export,
            itemBuilder: (context) => const [
              PopupMenuItem(value: 'HTML', child: Text('Show HTML')),
              PopupMenuItem(value: 'Markdown', child: Text('Show Markdown')),
            ],
          ),
        ],
      ),
      body: AxiomTextEditor(
        controller: _controller,
        toolbar: AxiomToolbarMode.web,
        documentMode: true,
        showWordCount: true,
        initialContent: const AxiomContent.html(
          '<h1>Project report</h1>'
          '<p>This page uses the editor\'s own toolbar and a paper-like page.</p>'
          '<table><tr><th>Item</th><th>Cost</th></tr><tr><td>Design</td><td>\$1,200</td></tr></table>'
          '<p>Energy: <span data-type="math-inline" data-latex="E = mc^2"></span></p>',
        ),
      ),
    );
  }
}

/// An editor inside a scrolling list that grows with its content.
class CommentPage extends StatelessWidget {
  const CommentPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Comment box')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          for (var i = 1; i <= 3; i++)
            Card(
              child: ListTile(
                title: Text('Comment $i'),
                subtitle:
                    const Text('Earlier comments are plain Flutter widgets.'),
              ),
            ),
          const SizedBox(height: 12),
          Card(
            clipBehavior: Clip.antiAlias,
            child: AxiomTextEditor(
              shrinkWrap: true,
              minHeight: 140,
              maxHeight: 360,
              toolbarPosition: AxiomToolbarPosition.top,
              toolbarItems: const [
                AxiomToolbarItem.bold,
                AxiomToolbarItem.italic,
                AxiomToolbarItem.link,
                AxiomToolbarItem.bulletedList,
                AxiomToolbarItem.math,
              ],
              placeholder: 'Write a comment…',
            ),
          ),
        ],
      ),
    );
  }
}

/// Stands in for your database: this reader's highlights.
List<Map<String, Object?>> savedHighlights = [];

/// A read-only chapter: readers highlight and add notes; a notebook lists them.
class ReadingPage extends StatefulWidget {
  const ReadingPage({super.key});

  @override
  State<ReadingPage> createState() => _ReadingPageState();
}

class _ReadingPageState extends State<ReadingPage> {
  final _controller = AxiomTextController();
  List<AxiomReaderHighlight> _highlights = [
    for (final map in savedHighlights) AxiomReaderHighlight.fromMap(map),
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _openNotebook() {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: _highlights.isEmpty
            ? const Padding(
                padding: EdgeInsets.all(24),
                child: Text('Select text in the chapter to highlight it.'),
              )
            : ListView(
                shrinkWrap: true,
                children: [
                  for (final h in _highlights)
                    ListTile(
                      leading: Icon(
                        h.fill ? Icons.circle : Icons.circle_outlined,
                        color: _swatch(h.color),
                      ),
                      title: Text('“${h.text}”'),
                      subtitle: h.note == null ? null : Text(h.note!),
                    ),
                ],
              ),
      ),
    );
  }

  static Color _swatch(AxiomHighlightColor color) => color.toColor();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reading view'),
        actions: [
          IconButton(
            tooltip: 'Notebook',
            icon: Badge(
              isLabelVisible: _highlights.isNotEmpty,
              label: Text('${_highlights.length}'),
              child: const Icon(Icons.menu_book_outlined),
            ),
            onPressed: _openNotebook,
          ),
        ],
      ),
      body: AxiomTextEditor(
        controller: _controller,
        readOnly: true,
        initialContent: const AxiomContent.markdown(
          '# Chapter 1: Water\n\n'
          r'Water boils at 100 °C at sea level. Its formula is $H_2O$.'
          '\n\n'
          'Ice is less dense than liquid water, which is why it floats. '
          'Select any words to highlight them, then tap a highlight to add a note.',
        ),
        highlights: _highlights,
        onHighlightsChanged: (items) {
          savedHighlights = [for (final h in items) h.toMap()];
          setState(() => _highlights = items);
        },
      ),
    );
  }
}


// ── Marked book ─────────────────────────────────────────────────

const _markTypes = [
  AxiomMarkType(
      id: 'important', label: 'Important', color: Color(0xFF16A34A)),
  AxiomMarkType(
      id: 'marked',
      label: 'Marked',
      color: Color(0xFF2563EB),
      style: AxiomMarkStyle.underline),
  AxiomMarkType(
      id: 'pyq',
      label: 'Past exam question',
      color: Color(0xFFB45309),
      style: AxiomMarkStyle.box),
];

Map<String, Object?> _text(String text, [String? type, String? id, int? questions]) => {
      'type': 'text',
      'text': text,
      if (type != null)
        'marks': [
          {
            'type': 'marker',
            'attrs': {
              'type': type,
              'id': id,
              'data': {
                'questionIds': [for (var i = 0; i < (questions ?? 0); i++) 'q$id$i'],
              },
              'badge': '${questions ?? 0}',
            },
          },
        ],
    };

final Map<String, Object?> _chapter = {
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
        'content': [_text('Photosynthesis')],
      },
      {
        'type': 'paragraph',
        'content': [
          _text('Green plants make their own food by '),
          _text('photosynthesis', 'important', 'm1', 3),
          _text(', using light captured by chlorophyll.'),
        ],
      },
      {
        'type': 'paragraph',
        'content': [
          _text('Water enters the roots by '),
          _text('osmosis', 'pyq', 'm2', 2),
          _text(' and travels up the xylem.'),
        ],
      },
      {
        'type': 'paragraph',
        'content': [_text('Leaves are thin and flat, so light reaches most cells.')],
      },
      {
        'type': 'page',
        'attrs': {'number': 24},
      },
      {
        'type': 'paragraph',
        'content': [
          _text('The rate depends on '),
          _text('light, carbon dioxide and temperature', 'marked', 'm3', 1),
          _text('.'),
        ],
      },
    ],
  },
};

/// A chapter that teachers mark and students read.
class MarkedBookPage extends StatefulWidget {
  const MarkedBookPage({super.key});

  @override
  State<MarkedBookPage> createState() => _MarkedBookPageState();
}

class _MarkedBookPageState extends State<MarkedBookPage> {
  bool _teacher = false;
  Map<String, Object?> _content = _chapter;
  final _controller = AxiomTextController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _switch(bool teacher) async {
    if (_controller.isReady) _content = await _controller.getJson();
    setState(() => _teacher = teacher);
  }

  void _showQuestions(AxiomMark mark) {
    AxiomMarkType? type;
    for (final t in _markTypes) {
      if (t.id == mark.type) type = t;
    }
    final count = (mark.data?['questionIds'] as List<Object?>?)?.length ?? 0;
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${type?.label ?? 'Mark'}${mark.page != null ? ' · page ${mark.page}' : ''}',
                style: TextStyle(color: type?.color, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 6),
              Text('“${mark.text}”', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: count == 0 ? null : () => Navigator.pop(context),
                icon: const Icon(Icons.play_arrow_rounded),
                label: Text('Practise $count question${count == 1 ? '' : 's'}'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Marked book'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: SegmentedButton<bool>(
              segments: const [
                ButtonSegment(value: false, label: Text('Student')),
                ButtonSegment(value: true, label: Text('Teacher')),
              ],
              selected: {_teacher},
              onSelectionChanged: (s) => unawaited(_switch(s.first)),
            ),
          ),
        ],
      ),
      body: AxiomTextEditor(
        key: ValueKey(_teacher),
        controller: _controller,
        initialContent: AxiomContent.json(_content),
        readOnly: !_teacher,
        markTypes: _markTypes,
        onMarkTap: _showQuestions,
        highlights: _teacher ? null : const [],
        selectionActions: const [AxiomSelectionAction(id: 'ask', label: 'Ask AI')],
        onSelectionAction: (e) => ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Asking about “${e.text}”'))),
      ),
    );
  }
}

// ── Quiz list (native view) ─────────────────────────────────────

/// Many short questions with equations, drawn with Flutter widgets (no WebView).
class QuizPage extends StatelessWidget {
  const QuizPage({super.key});

  static const _questions = [
    'Solve for \$x\$: \$x^2 - 5x + 6 = 0\$',
    'What is \$\\frac{d}{dx} \\sin x\$?',
    'The area of a circle of radius \$r\$ is **\$\\pi r^2\$**. Find it for \$r = 3\$.',
    'Which gas do plants take in during *photosynthesis*?\n\n- Oxygen\n- Carbon dioxide\n- Nitrogen',
    '\$\$\\int_0^1 x^2\\,dx = ?\$\$',
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Quiz list')),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _questions.length * 8,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, i) => Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Question ${i + 1}',
                    style: Theme.of(context).textTheme.labelLarge),
                const SizedBox(height: 8),
                AxiomTextView(
                  content: AxiomContent.markdown(
                      _questions[i % _questions.length]),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
