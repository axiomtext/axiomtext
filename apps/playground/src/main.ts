import { BasicStyles } from '@axiomtext/plugin-basic-styles';
import { Heading } from '@axiomtext/plugin-heading';
import { createEditor } from '@axiomtext/view';
import './style.css';

const element = document.getElementById('editor');
const toolbar = document.getElementById('toolbar');
const jsonOut = document.getElementById('json');
const htmlOut = document.getElementById('html');
if (!element || !toolbar || !jsonOut || !htmlOut) throw new Error('Playground markup missing');

const editor = createEditor({
  element,
  plugins: [BasicStyles, Heading],
  placeholder: 'Start writing… (Ctrl/Cmd+B bold, Ctrl/Cmd+Alt+1 heading)',
  ariaLabel: 'Document body',
});

const buttons: [label: string, run: () => boolean][] = [
  ['B', () => editor.execute('toggleBold')],
  ['I', () => editor.execute('toggleItalic')],
  ['U', () => editor.execute('toggleUnderline')],
  ['S', () => editor.execute('toggleStrikethrough')],
  ['Code', () => editor.execute('toggleCode')],
  ['H1', () => editor.execute('setHeading', 1)],
  ['H2', () => editor.execute('setHeading', 2)],
  ['¶', () => editor.execute('setParagraph')],
  ['Undo', () => editor.undo()],
  ['Redo', () => editor.redo()],
];

for (const [label, run] of buttons) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.setAttribute('aria-label', label);
  // Keep the selection in the editor when clicking toolbar buttons.
  button.addEventListener('mousedown', (e) => e.preventDefault());
  button.addEventListener('click', () => {
    run();
    editor.focus();
  });
  toolbar.appendChild(button);
}

const render = (): void => {
  jsonOut.textContent = JSON.stringify(editor.getJSON(), null, 2);
  htmlOut.textContent = editor.getHTML();
};
editor.on('change', render);
render();
editor.focus();
