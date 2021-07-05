import marked from "marked";

import hljs from "highlight.js";
import "highlight.js/styles/github.css";

import katex from "katex";
import "katex/dist/katex.min.css";
import "katex/dist/contrib/mhchem.min.js";

import DOMPurify from "dompurify";

// set up imports
let marked_render = new marked.Renderer();
let old_paragraph = marked_render.paragraph;
marked_render.paragraph = function (text: string) {
  var isTeXInline = /\$(.*)\$/g.test(text);
  var isTeXLine = /^\$\$(\s*.*\s*)\$\$$/.test(text);

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
    text = katex.renderToString(raw, { throwOnError: false });
  }
  // apply old renderer
  text = old_paragraph(text);
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

export default function renderMarkdown(s: string): string {
  return DOMPurify.sanitize(marked(s));
}