import marked from "marked";

import hljs from "highlight.js";
import "highlight.js/styles/github.css";

import katex from "katex";
//import "katex/dist/katex.min.css"; // FIXME: doesn't work because fonts are not loading
import "katex/dist/contrib/mhchem.min.js";

import DOMPurify from "dompurify";
import type { AspectRatio } from "./DataTypes";
import _ from "lodash";

import { get } from 'svelte/store';
import { meta } from "./Stores";

function custom_processor(text: string) {
  const { title, author } = get(meta);
  const date = (new Date()).toLocaleDateString('en-SG');
  const map: [RegExp, (_: any) => string][] = [
    // FIXME potential issue: conflict with embedded code?
    [/\=\=(.+?)\=\=/g, (match: string) => {
      let expr = match.substr(2, match.length - 4);
      console.log(expr);
      return `<span class="fmt-highlight">${expr}</span>`;
    }],
    [/\\title/g, (_) => title as string],
    [/\\author/g, (_) => author as string],
    [/\\date/g, (_) => date],
    [/\\maketitle/g, (_) => `<h1>${title}</h1><h2>${author}</h2><h3>${date}</h3>`],
  ];
  map.forEach(it => {
    text = text.replace(it[0], it[1]);
  });
  return text;
}

// set up imports
let marked_render = new marked.Renderer();
let old_text = marked_render.text;
marked_render.text = function (text: string) {
  text = custom_processor(text);
  // apply old renderer
  text = old_text(text);
  return text;
};

class LRU<T> {
  max: number;
  cache: Map<string, T>

  constructor(max = 32) {
      this.max = max;
      this.cache = new Map();
  }

  get(key: string) {
      let item = this.cache.get(key);
      if (item) {
          // refresh key
          this.cache.delete(key);
          this.cache.set(key, item);
      }
      return item;
  }

  set(key: string, val: T) {
      // refresh key
      if (this.cache.has(key)) this.cache.delete(key);
      // evict oldest
      else if (this.cache.size == this.max) this.cache.delete(this.first());
      this.cache.set(key, val);
  }

  first() {
      return this.cache.keys().next().value;
  }
}

let dirtyCache = new LRU<string>();

function renderKatex(text: string) {
  let delimiters = [ 
    { left: "$$", right: "$$", options: { displayMode: true } },
    { left: "$", right: "$", options: { displayMode: false } },
  ];

  delimiters.forEach(d => {
    let re = new RegExp(_.escapeRegExp(d.left) + ".+?" + _.escapeRegExp(d.right), "g");
    text = text.replace(re, (match: string) => {
      if (!dirtyCache.get(match)) {
        let expr = match.substr(d.left.length, match.length - d.left.length - d.right.length);
        dirtyCache.set(match, katex.renderToString(expr, { throwOnError: false, ...d.options }));
      }
      return dirtyCache.get(match);
    });
  });

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
  return DOMPurify.sanitize(renderKatex(marked(s)));
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