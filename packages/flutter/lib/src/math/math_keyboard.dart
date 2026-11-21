import 'dart:async';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../controller.dart';

/// A key on the math keyboard: inserts LaTeX or runs a caret command.
class _Key {
  const _Key(this.label,
      {this.latex,
      this.command,
      this.title,
      this.flex = 1,
      this.accent = false});

  final String label;
  final String? latex;
  final AxiomMathCommand? command;
  final String? title;
  final int flex;
  final bool accent;
}

const _backspace = _Key('⌫',
    command: AxiomMathCommand.deleteBackward, title: 'Delete', accent: true);
const _left = _Key('←',
    command: AxiomMathCommand.moveToPreviousChar, title: 'Left', accent: true);
const _right = _Key('→',
    command: AxiomMathCommand.moveToNextChar, title: 'Right', accent: true);
const _next = _Key('⇥',
    command: AxiomMathCommand.moveToNextPlaceholder,
    title: 'Next box',
    accent: true);

// The same templates as the web editor's math bar (packages/math/src/math-bar.ts).
const _frac = _Key('□⁄□', latex: r'\frac{#0}{#?}', title: 'Fraction');
const _power = _Key('□ⁿ', latex: r'#@^{#?}', title: 'Power');
const _sub = _Key('□ₙ', latex: r'#@_{#?}', title: 'Subscript');
const _sqrt = _Key('√□', latex: r'\sqrt{#0}', title: 'Square root');
const _root = _Key('ⁿ√□', latex: r'\sqrt[#?]{#0}', title: 'Root');

const List<(String, List<List<_Key>>)> _pages = [
  (
    '123',
    [
      [
        _Key('7', latex: '7'),
        _Key('8', latex: '8'),
        _Key('9', latex: '9'),
        _Key('÷', latex: r'\div'),
        _frac,
        _sqrt
      ],
      [
        _Key('4', latex: '4'),
        _Key('5', latex: '5'),
        _Key('6', latex: '6'),
        _Key('×', latex: r'\times'),
        _power,
        _Key('x', latex: 'x')
      ],
      [
        _Key('1', latex: '1'),
        _Key('2', latex: '2'),
        _Key('3', latex: '3'),
        _Key('−', latex: '-'),
        _Key('(', latex: '('),
        _Key(')', latex: ')')
      ],
      [
        _Key('0', latex: '0'),
        _Key('.', latex: '.'),
        _Key('=', latex: '='),
        _Key('+', latex: '+'),
        _Key('y', latex: 'y'),
        _Key('π', latex: r'\pi')
      ],
    ],
  ),
  (
    'f(x)',
    [
      [
        _frac,
        _power,
        _sub,
        _sqrt,
        _root,
        _Key('|□|', latex: r'\left|#0\right|', title: 'Absolute value')
      ],
      [
        _Key('sin', latex: r'\sin'),
        _Key('cos', latex: r'\cos'),
        _Key('tan', latex: r'\tan'),
        _Key('log', latex: r'\log'),
        _Key('ln', latex: r'\ln'),
        _Key('eˣ', latex: r'e^{#?}')
      ],
      [
        _Key('∑', latex: r'\sum_{#?}^{#?}#0', title: 'Sum'),
        _Key('∫', latex: r'\int_{#?}^{#?}#0\,d#?', title: 'Integral'),
        _Key('lim', latex: r'\lim_{#?\to#?}#0', title: 'Limit'),
        _Key('(□)', latex: r'\left(#0\right)', title: 'Parentheses'),
        _Key('v⃗', latex: r'\vec{#0}', title: 'Vector'),
        _Key('x̄', latex: r'\overline{#0}', title: 'Overline')
      ],
      [
        _Key('[ ]',
            latex: r'\begin{pmatrix}#0&#?\\#?&#?\end{pmatrix}',
            title: 'Matrix',
            flex: 2),
        _Key('{ ',
            latex: r'\begin{cases}#0&#?\\#?&#?\end{cases}',
            title: 'Cases',
            flex: 2),
        _Key('n', latex: 'n'),
        _Key('∞', latex: r'\infty')
      ],
    ],
  ),
  (
    'αβγ',
    [
      [
        _Key('α', latex: r'\alpha'),
        _Key('β', latex: r'\beta'),
        _Key('γ', latex: r'\gamma'),
        _Key('δ', latex: r'\delta'),
        _Key('ε', latex: r'\varepsilon'),
        _Key('θ', latex: r'\theta')
      ],
      [
        _Key('λ', latex: r'\lambda'),
        _Key('μ', latex: r'\mu'),
        _Key('π', latex: r'\pi'),
        _Key('ρ', latex: r'\rho'),
        _Key('σ', latex: r'\sigma'),
        _Key('τ', latex: r'\tau')
      ],
      [
        _Key('φ', latex: r'\varphi'),
        _Key('χ', latex: r'\chi'),
        _Key('ψ', latex: r'\psi'),
        _Key('ω', latex: r'\omega'),
        _Key('Δ', latex: r'\Delta'),
        _Key('Σ', latex: r'\Sigma')
      ],
      [
        _Key('Γ', latex: r'\Gamma'),
        _Key('Θ', latex: r'\Theta'),
        _Key('Λ', latex: r'\Lambda'),
        _Key('Π', latex: r'\Pi'),
        _Key('Φ', latex: r'\Phi'),
        _Key('Ω', latex: r'\Omega')
      ],
    ],
  ),
  (
    '≤∀',
    [
      [
        _Key('<', latex: '<'),
        _Key('>', latex: '>'),
        _Key('≤', latex: r'\leq'),
        _Key('≥', latex: r'\geq'),
        _Key('≠', latex: r'\neq'),
        _Key('≈', latex: r'\approx')
      ],
      [
        _Key('±', latex: r'\pm'),
        _Key('·', latex: r'\cdot'),
        _Key('°', latex: r'^\circ'),
        _Key('%', latex: r'\%'),
        _Key('∂', latex: r'\partial'),
        _Key('∇', latex: r'\nabla')
      ],
      [
        _Key('∈', latex: r'\in'),
        _Key('∉', latex: r'\notin'),
        _Key('⊂', latex: r'\subset'),
        _Key('∪', latex: r'\cup'),
        _Key('∩', latex: r'\cap'),
        _Key('∅', latex: r'\emptyset')
      ],
      [
        _Key('→', latex: r'\to'),
        _Key('⇒', latex: r'\Rightarrow'),
        _Key('⇔', latex: r'\Leftrightarrow'),
        _Key('∀', latex: r'\forall'),
        _Key('∃', latex: r'\exists'),
        _Key('∴', latex: r'\therefore')
      ],
    ],
  ),
];

/// The on-screen math keyboard shown while an equation is edited (FLT-007).
///
/// `AxiomTextEditor` shows it automatically on phones and tablets; it replaces the system
/// keyboard, which can't type maths well.
class AxiomMathKeyboard extends StatefulWidget {
  /// Creates a math keyboard for [controller].
  const AxiomMathKeyboard(
      {super.key, required this.controller, this.cupertino = false});

  /// The editor's controller.
  final AxiomTextController controller;

  /// iOS look.
  final bool cupertino;

  @override
  State<AxiomMathKeyboard> createState() => _AxiomMathKeyboardState();
}

class _AxiomMathKeyboardState extends State<AxiomMathKeyboard> {
  int _page = 0;

  AxiomTextController get _c => widget.controller;

  Future<void> _press(_Key key) async {
    // Don't wait for the vibration: the action runs at once.
    unawaited(HapticFeedback.selectionClick());
    final command = key.command;
    final latex = key.latex;
    if (command != null) {
      await _c.mathCommand(command);
    } else if (latex != null) {
      await _c.mathInsert(latex);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final cupertino = widget.cupertino;
    final background = cupertino
        ? CupertinoColors.systemGrey5.resolveFrom(context)
        : scheme.surfaceContainerHigh;
    final keyColor = cupertino
        ? CupertinoColors.systemBackground.resolveFrom(context)
        : scheme.surfaceContainerLowest;
    final accentKey = cupertino
        ? CupertinoColors.systemGrey3.resolveFrom(context)
        : scheme.secondaryContainer;
    final ink = cupertino
        ? CupertinoColors.label.resolveFrom(context)
        : scheme.onSurface;
    final rows = _pages[_page].$2;

    Widget key(_Key k) => Expanded(
          flex: k.flex,
          child: Padding(
            padding: const EdgeInsets.all(3),
            child: Semantics(
              button: true,
              label: k.title ?? k.label,
              onTap: () => _press(k),
              excludeSemantics: true,
              child: Material(
                color: k.accent ? accentKey : keyColor,
                borderRadius: BorderRadius.circular(cupertino ? 6 : 10),
                elevation: cupertino ? 0 : 0.5,
                child: InkWell(
                  borderRadius: BorderRadius.circular(cupertino ? 6 : 10),
                  onTap: () => _press(k),
                  child: Center(
                    child: Text(
                      k.label,
                      style: TextStyle(
                          fontSize: k.label.length > 3 ? 15 : 20, color: ink),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );

    return ListenableBuilder(
      listenable: _c,
      builder: (context, _) => Material(
        color: background,
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(4, 4, 4, 6),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    for (var i = 0; i < _pages.length; i++)
                      Padding(
                        padding: const EdgeInsets.only(right: 4),
                        child: ChoiceChip(
                          label: Text(_pages[i].$1),
                          selected: _page == i,
                          showCheckmark: false,
                          visualDensity: VisualDensity.compact,
                          onSelected: (_) => setState(() => _page = i),
                        ),
                      ),
                    const Spacer(),
                    IconButton(
                      tooltip: _c.label('Edit as LaTeX'),
                      icon: const Icon(Icons.data_object),
                      onPressed: _c.mathToggleLatex,
                    ),
                    FilledButton(
                      onPressed: _c.mathCommit,
                      child: Text(_c.label('Done')),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                SizedBox(
                  height: 4 * 48,
                  child: Column(
                    children: [
                      for (final row in rows)
                        Expanded(
                            child:
                                Row(children: [for (final k in row) key(k)])),
                    ],
                  ),
                ),
                SizedBox(
                  height: 48,
                  child: Row(children: [
                    key(_left),
                    key(_right),
                    key(_next),
                    key(_backspace)
                  ]),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
