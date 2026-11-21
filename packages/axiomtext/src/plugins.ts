/** The feature plugins (no interface code), shared by the editor and server-side rendering. */
import type { AxiomPlugin } from '@axiomtext/core';
import { MathPlugin } from '@axiomtext/math';
import { BasicStyles } from '@axiomtext/plugin-basic-styles';
import { Indent, TextAlignment } from '@axiomtext/plugin-block-format';
import { Blockquote, PageBreak } from '@axiomtext/plugin-blockquote';
import { Columns } from '@axiomtext/plugin-columns';
import { Comments } from '@axiomtext/plugin-comments';
import { Marks, Pages } from '@axiomtext/plugin-marks';
import { BijoyPaste } from '@axiomtext/plugin-bijoy';
import { FontFamily, FontSize, Highlight, TextColor } from '@axiomtext/plugin-font';
import { Heading } from '@axiomtext/plugin-heading';
import { Image } from '@axiomtext/plugin-image';
import { Link } from '@axiomtext/plugin-link';
import { List } from '@axiomtext/plugin-list';
import { Table } from '@axiomtext/plugin-table';

/** Every feature plugin, in a sensible order. */
export const ALL_PLUGINS: readonly AxiomPlugin[] = [
  BasicStyles,
  Heading,
  List,
  Blockquote,
  PageBreak,
  Link,
  MathPlugin,
  Table,
  Image,
  Columns,
  FontFamily,
  FontSize,
  TextColor,
  Highlight,
  TextAlignment,
  Indent,
  Comments,
  Marks,
  Pages,
  BijoyPaste,
];
