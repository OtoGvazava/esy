// The back office's skeleton pieces, on the kit's own (components/skeleton).
// A screen's skeleton is drawn with the screen's own boxes — the same cards,
// grids and classes — and these stand in for what goes inside them:
//
//   SkIn     a bar inside a line of text. It sits in the line rather than
//            replacing it, so the line keeps the height its font gives it
//            and the stand-in is exactly as tall as the text to come:
//              <b className="bx-h3"><SkIn w="40%" /></b>
//            It needs an element of its own to be the line: straight inside
//            a flex row it would be a box, as tall as the bar alone.
//   SkField  a labelled input (the kit's .fld): the label's line, the field.
import { Sk } from '../components/skeleton/Skeleton';

/** A bar in a line of text, a little shorter than its letters, as the kit's bars are. */
export function SkIn({ w = '60%', style }) {
  return <Sk w={w} h="0.8em" r={6} style={{ display: 'inline-block', verticalAlign: 'middle', ...style }} />;
}

/** A labelled field: its label, then the 50 px input (or `h` for a taller one). */
export function SkField({ w = '34%', h = 50, className = '', style }) {
  return (
    <span aria-hidden="true" className={`bx-fld${className ? ` ${className}` : ''}`} style={style}>
      <span><SkIn w={w} /></span>
      <Sk h={h} r="var(--k-r-in)" />
    </span>
  );
}
