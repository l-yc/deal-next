import marked from "marked";

import hljs from "highlight.js";
import "highlight.js/styles/github.css";

import katex from "katex";
import "katex/dist/katex.min.css";
import "katex/dist/contrib/mhchem.min.js";

import DOMPurify from "dompurify";
import type { AspectRatio } from "./DataTypes";

// set up imports
let marked_render = new marked.Renderer();
let old_text = marked_render.text;
marked_render.text = function (text: string) {
  var isTeXInline = /\$(.*)\$/g.test(text);
  var isTeXLine = /^\$\$(\s*.*\s*)\$\$$/.test(text);

  console.log(text, isTeXInline, isTeXLine);
  if (!isTeXLine && isTeXInline) {
    text = text.replace(
      /(\$([^\$]*)\$)+/g,
      function (_$1: string, $2: string) {
        // prevent conflict with code
        if ($2.indexOf("<code>") >= 0 || $2.indexOf("</code>") >= 0) {
          return $2;
        } else {
          let raw = $2.replace(/\$/g, "").replace(/[^\\](%)/g, (match) => {
            return match[0] + "\\" + "%";
          });
          var html = katex.renderToString(raw, { throwOnError: false });
          return html;
        }
      }
    );
  } else if (isTeXLine) {
    let raw = text.replace(/\$/g, "").replace(/[^\\](%)/g, (match) => {
      return match[0] + "\\" + "%";
    });
    text = katex.renderToString(raw, { throwOnError: false, displayMode: true });
  }
  // apply old renderer
  text = old_text(text);
  return text;
};

// Set options
// `highlight` example uses https://highlightjs.org
marked.setOptions({
  renderer: marked_render,
  highlight: function (code: string, lang: string) {
    const language = hljs.getLanguage(lang) ? lang : "plaintext";
    return hljs.highlight(code, { language }).value;
  },
  pedantic: false,
  gfm: true,
  breaks: false,
  sanitize: false,
  smartLists: true,
  smartypants: false,
  xhtml: false,
});

function renderMarkdown(s: string): string {
  return DOMPurify.sanitize(marked(s));
}

function getRatioStyle(aspectRatio: AspectRatio, scale: number): string {
  let x = aspectRatio.split(":");
  let n = parseInt(x[1]),
    d = parseInt(x[0]);
  let w = 30, h = (w * n) / d;
  return `width: ${w}rem; height: ${h}rem; transform: scale(${scale})`;
};

function getScaledStyle(aspectRatio: AspectRatio, boundWidth: number, boundHeight: number): number {
  let ratio = aspectRatio.split(":");
  let frac = parseInt(ratio[1]) / parseInt(ratio[0]);

  let width = Math.min(boundWidth, boundHeight / frac);

  const w = 30; // rem
  let px = w * parseFloat(getComputedStyle(document.documentElement).fontSize);
  let scale = width / px;
  return scale;
}

export { renderMarkdown, getRatioStyle, getScaledStyle };