import { afterEach, describe, expect, it } from 'vitest';
import { createTestView } from '@axiomtext/test-utils';
import type { TestView } from '@axiomtext/test-utils';
import {
  FontFamily,
  FontSize,
  Highlight,
  TextColor,
  getStyleValue,
  setFontFamily,
  setFontSize,
  setHighlight,
  setTextColor,
} from '../src';

let t: TestView;
afterEach(() => t.destroy());

describe('font plugins', () => {
  it('applies family, size, color and highlight', () => {
    t = createTestView([FontFamily, FontSize, TextColor, Highlight]);
    t.type('styled');
    t.select(1, 7);
    const { state, dispatch } = t.view;
    expect(setFontFamily('Georgia, serif')(state, dispatch)).toBe(true);
    expect(setFontSize('20px')(t.view.state, t.view.dispatch)).toBe(true);
    expect(setTextColor('#d92d20')(t.view.state, t.view.dispatch)).toBe(true);
    expect(setHighlight('#fef08a')(t.view.state, t.view.dispatch)).toBe(true);
    const html = t.html();
    expect(html).toContain('font-family: Georgia, serif;');
    expect(html).toContain('font-size: 20px;');
    expect(html).toContain('color: #d92d20;');
    expect(html).toContain('<mark style="background-color: #fef08a;">');
    expect(getStyleValue(t.view.state, 'text_color', 'color')).toBe('#d92d20');
  });

  it('refuses unsafe CSS values', () => {
    t = createTestView([TextColor, FontFamily]);
    t.type('x');
    t.select(1, 2);
    expect(setTextColor('red; background:url(evil)')(t.view.state, t.view.dispatch)).toBe(false);
    expect(setFontFamily('x;}body{display:none')(t.view.state, t.view.dispatch)).toBe(false);
    expect(t.html()).not.toContain('style');
  });

  it('removes a style with null', () => {
    t = createTestView([TextColor]);
    t.type('x');
    t.select(1, 2);
    setTextColor('blue')(t.view.state, t.view.dispatch);
    setTextColor(null)(t.view.state, t.view.dispatch);
    expect(t.html()).not.toContain('color');
  });
});
