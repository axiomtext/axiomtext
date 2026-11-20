import { InputRule } from 'prosemirror-inputrules';
import type { MarkType } from 'prosemirror-model';

/**
 * Input rule that turns `**text**`-style markdown into a mark while typing.
 * The regex must end with `$`, start at the opening delimiter and capture the text in group 1.
 */
export function markInputRule(pattern: RegExp, markType: MarkType): InputRule {
  return new InputRule(pattern, (state, match, start, end) => {
    const text = match[1];
    if (!text) return null;
    const textStart = start + match[0].indexOf(text);
    const textEnd = textStart + text.length;
    const tr = state.tr;
    // `end` excludes the delimiter character being typed, which is never inserted.
    if (textEnd < end) tr.delete(textEnd, end);
    if (textStart > start) tr.delete(start, textStart);
    tr.addMark(start, start + text.length, markType.create());
    tr.removeStoredMark(markType);
    return tr;
  });
}
