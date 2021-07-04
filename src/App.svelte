<script lang="ts">
  import { onMount } from "svelte";

  import Modal from "./lib/Modal.svelte";

  import * as _ from "lodash";
  import marked from "marked";
  import DOMPurify from "dompurify";
  import hljs from "highlight.js";
  import "highlight.js/styles/github.css";
  import katex from "katex";
  import "katex/dist/katex.min.css";
  import "katex/dist/contrib/mhchem.min.js";

  import { basicSetup, EditorState, EditorView } from "@codemirror/basic-setup";
  import { ViewUpdate, keymap } from "@codemirror/view";

  import FileSaver from "file-saver";

  import Heroicon from "@martinse/svelte-heroicons";
  import {
    desktopComputer,
    cog,
    informationCircle,
    documentDownload,
    upload,
  } from "@martinse/svelte-heroicons/dist/solid";

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

  // refs
  let importedSlides, editor, preview, previewWrapper;

  // data
  let cm = null as EditorView | null;
  let title = "Untitled";
  let slides = [{ content: "", notes: "" }];
  let activeSlideIndex = 0;

  let themeDefault = `
slide {
  background-color: white;
  padding: 1rem;
}

h1 {
  font-size: 1.6rem;
}

li {
  list-style: disc inside;
}
`;

  let theme = {
    default: themeDefault,
  };

  $: activeTheme = theme.default;
  $: activeThemeOutput = generateScopedStyle(activeTheme, "#preview");

  function generateScopedStyle(styles: string, scope: string): string {
    let doc = document.implementation.createHTMLDocument(""),
      styleElement = document.createElement("style");

    styleElement.textContent = styles;
    // the style will only be parsed once it is added to a document
    doc.body.appendChild(styleElement);

    let newStyle = "";
    for (let rule of styleElement.sheet.cssRules) {
      if (rule instanceof CSSStyleRule) {
        if (rule.selectorText == "slide") {
          rule.selectorText = `${scope}`;
        } else {
          rule.selectorText = `${scope} ${rule.selectorText}`;
        }
      }
      newStyle += rule.cssText;
    }

    console.log("loading theme", newStyle);
    // svelte-preprocess is trying to parse the style tag, so we split it up ???
    return `<st` + `yle data-theme>${newStyle}</st` + `yle>`;
  }

  let exportModalVisible = false;
  let importModalVisible = false;
  let helpModalVisible = false;
  let settingsModalVisible = false;

  let exportTypes = [
    { type: "deal", description: "deal file" },
    { type: "pdf", description: "chrome only" },
  ];

  let settings = {
    ratio: "",
    theme: "default",
  };

  let keybindings = [
    {
      key: "Alt-[",
      description: "Navigate to previous slide",
      run: (v: EditorView) => {
        prevSlide();
        return true;
      },
    },
    {
      key: "Alt-]",
      description: "Navigate to next slide",
      run: (v: EditorView) => {
        nextSlide();
        return true;
      },
    },
    {
      key: "Alt-n",
      description: "Create a new slide",
      run: (v: EditorView) => {
        newSlide();
        return true;
      },
    },
    {
      key: "Alt-m",
      description: "Duplicate current slide",
      run: (v: EditorView) => {
        duplicateSlide();
        return true;
      },
    },
  ];

  // computed
  $: ratioStyle = (() => {
    let x = settings.ratio.split(":");
    let n = parseInt(x[1]),
      d = parseInt(x[0]);

    if (!preview) return "";
    let w = 30,
      h = (w * n) / d;
    return `width: ${w}rem; height: ${h}rem`;
  })();
  $: activeSlide = slides[activeSlideIndex];
  $: output = DOMPurify.sanitize(marked(activeSlide.content));

  // mounted
  onMount(() => {
    settings.ratio = "4:3";
    cm = new EditorView({
      parent: <Element>editor,
      state: EditorState.create({
        doc: "",
        extensions: [
          basicSetup,
          EditorView.updateListener.of((v: ViewUpdate) => {
            if (v.docChanged) {
              updateCurrentSlide(v.state.doc.toString());
            }
          }),
          EditorView.domEventHandlers({
            paste(event: ClipboardEvent, v: EditorView) {
              let items = (
                // @ts-ignore originalEvent for newer chrome version
                event.clipboardData || event.originalEvent.clipboardData
              )?.items;
              for (let index in items) {
                let item = items[index];
                if (item.kind === "file") {
                  let blob = item.getAsFile();
                  let reader = new FileReader();
                  reader.onload = function (event: ProgressEvent<FileReader>) {
                    if (!event.target) return;
                    v.dispatch(
                      v.state.replaceSelection(
                        `<img src="${event.target.result}" />`
                      )
                    );
                  }; // data url!
                  reader.readAsDataURL(blob);
                }
              }
            },
          }),
          keymap.of(keybindings),
        ],
      }),
    });
  });

  document.onkeydown = function (event: KeyboardEvent) {
    if (!event.target) return;
    if (!(event.target as HTMLElement).matches("body")) return; // ignore key press in code editor
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowUp":
        prevSlide();
        break;

      case "ArrowRight":
      case "ArrowDown":
      case "Spacebar":
      case "Enter":
        nextSlide();
        break;
    }
  };

  // methods
  function prevSlide() {
    if (activeSlideIndex > 0) {
      loadSlide(activeSlideIndex - 1);
    }
  }

  function nextSlide() {
    if (activeSlideIndex < slides.length - 1) {
      loadSlide(activeSlideIndex + 1);
    }
  }

  function newSlide(slide = { content: "", notes: "" }) {
    slides = [...slides, slide];
    loadSlide(slides.length - 1);
  }

  function duplicateSlide() {
    let dup = _.cloneDeep(activeSlide);
    newSlide(dup);
  }

  function loadSlide(slideNo: number) {
    activeSlideIndex = slideNo;
    activeSlide = slides[slideNo]; // not sure why the reactivity is slow
    cm?.dispatch({
      changes: {
        from: 0,
        to: cm.state.doc.length,
        insert: activeSlide.content,
      },
    });
  }

  function updateCurrentSlide(content: string) {
    activeSlide.content = content;
  }

  function toggleFullscreen() {
    (previewWrapper as HTMLElement).requestFullscreen();
  }

  function showExportSlidesModal() {
    exportModalVisible = true;
  }

  function closeExportSlidesModal() {
    exportModalVisible = false;
  }

  function exportSlides(typ: string) {
    if (typ === "deal") {
      let exportData = {
        settings: settings,
        slides: slides,
      };
      let blob = new Blob([JSON.stringify(exportData)], {
        type: "text/plain;charset=utf-8",
      });
      FileSaver.saveAs(blob, title + ".deal");
    } else if (typ == "pdf") {
      const prtHtml = slides
        .map(
          (s) =>
            `<div class="slide border-2 border-black" style="${ratioStyle}">${DOMPurify.sanitize(
              marked(s.content)
            )}</div>`
        )
        .join("<footer></footer>");

      let stylesHtml = "";
      for (const node of [
        ...Array.from(
          document.querySelectorAll('link[rel="stylesheet"], style')
        ),
      ])
        if (node instanceof HTMLElement && !("theme" in node.dataset)) {
          // we will add the theme css ourselves
          stylesHtml += node.outerHTML;
        }
      stylesHtml += generateScopedStyle(activeTheme, ".slide");

      // add print css using pagedjs
      let x = settings.ratio.split(":");
      let n = parseInt(x[1]),
        d = parseInt(x[0]);
      let w = "30rem",
        h = (30 * n) / d + "rem";
      console.log(n / d);
      stylesHtml +=
        `<st` +
        `yle>
        @page {
          margin: 0mm 0mm;
          size: ${w} ${h};
        }
      </st` +
        `yle>`;
      stylesHtml +=
        `<scr` +
        `ipt src="https://unpkg.com/pagedjs/dist/paged.polyfill.js"></scr` +
        `ipt>`;

      const WinPrint = <Window>(
        window.open(
          "",
          "",
          "left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0"
        )
      );

      WinPrint.document.write(`<!DOCTYPE html>
        <html>
          <head>
            ${stylesHtml}
          </head>
          <body>
            ${prtHtml}
          </body>
        </html>`);

      WinPrint.document.close();
      WinPrint.focus();
    } else {
      console.log(typ);
      alert("Error: unimplemented!");
    }
  }

  function showImportSlidesModal() {
    importModalVisible = true;
  }

  function closeImportSlidesModal() {
    importModalVisible = false;
  }

  function importSlides() {
    let f = (importedSlides as HTMLInputElement)?.files?.[0];
    if (!f) {
      alert("No slides selected.");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", (evt) => {
      if (!f || !evt.target || !evt.target.result) {
        alert("Failed to import slides.");
        return;
      }

      let importData = JSON.parse(evt.target.result as string);
      title = f.name.replace(/\.deal$/, "");
      settings = importData.settings;
      slides = importData.slides;

      closeImportSlidesModal();
      loadSlide(0);
    });
    reader.readAsText(f);
  }

  function showHelpModal() {
    helpModalVisible = true;
  }

  function closeHelpModal() {
    helpModalVisible = false;
  }

  function showSettingsModal() {
    settingsModalVisible = true;
  }

  function closeSettingsModal() {
    settingsModalVisible = false;
  }
</script>

<main>
  <div id="toolbar" class="grid grid-cols-3 gap-4">
    <div class="col-span-1 flex flex-row items-center justify-start">
      <button on:click={showExportSlidesModal} class="btn btn-icon">
        <Heroicon icon={documentDownload} class="h-6 w-6" />Export
      </button>
      {#if exportModalVisible}
        <Modal on:close={closeExportSlidesModal}>
          <div slot="header">Select a file type</div>
          <div slot="body">
            {#each exportTypes as { type, description }}
              <button on:click={(e) => exportSlides(type)} class="btn">
                .{type}
                <p>({description})</p>
              </button>
            {/each}
          </div>
          <div slot="footer" class="flex justify-center">
            <button class="btn" on:click={closeExportSlidesModal}
              >Dismiss</button
            >
          </div>
        </Modal>
      {/if}

      <button on:click={showImportSlidesModal} class="btn btn-icon">
        <Heroicon icon={upload} class="h-6 w-6" />Import
      </button>
      {#if importModalVisible}
        <Modal on:close={closeImportSlidesModal}>
          <div slot="header">Select a file</div>
          <div slot="body">
            <input bind:this={importedSlides} type="file" accept=".deal" />
          </div>
          <div slot="footer" class="flex justify-center">
            <button class="btn" on:click={importSlides}>Import</button>
          </div>
        </Modal>
      {/if}

      <button on:click={showHelpModal} class="btn btn-icon">
        <Heroicon icon={informationCircle} class="h-6 w-6" />Help
      </button>
      {#if helpModalVisible}
        <Modal on:close={closeHelpModal}>
          <div slot="header">Help</div>
          <div slot="body">
            <ul>
              {#each keybindings as kb}
                <li>
                  <pre
                    class="inline rounded bg-gray-100 p-1 text-xs">{kb.key}</pre>
                  :
                  {kb.description}
                </li>
              {/each}
            </ul>
          </div>
          <div slot="footer" class="flex justify-center">
            <button class="btn" on:click={closeHelpModal}>Got it!</button>
          </div>
        </Modal>
      {/if}

      <!-- To hide under dropdown menu -->
      <!--<button on:click="prevSlide" class="btn">Prev</button>
      <button on:click="nextSlide" class="btn">Next</button>
      <button on:click="newSlide" class="btn">New</button>-->
    </div>

    <div class="col-span-1 flex flex-row items-center justify-center">
      <div class="px-4">
        <input
          bind:value={title}
          size={title.length}
          type="text"
          class="text-center border-b-2 border-black"
        />
      </div>
    </div>

    <div class="col-span-1 flex flex-row items-center justify-end">
      <button on:click={toggleFullscreen} class="btn btn-icon">
        <Heroicon icon={desktopComputer} class="h-6 w-6" />Present
      </button>
      <button on:click={showSettingsModal} class="btn btn-icon">
        <Heroicon icon={cog} class="h-6 w-6" />Settings
      </button>
      {#if settingsModalVisible}
        <Modal on:close={closeSettingsModal}>
          <div slot="header">Settings</div>
          <div slot="body">
            <ul>
              <li>
                <label for="settings.ratio" class="mr-2">Ratio:</label>
                <input
                  bind:value={settings.ratio}
                  name="settings.ratio"
                  size={settings.ratio.length}
                  type="text"
                  class="text-center border-b-2 border-black"
                />
              </li>
              <li>
                <label for="settings.theme" class="mr-2">Theme:</label>
                <select
                  bind:value={settings.theme}
                  name="settings.theme"
                  class="
                    block
                    appearance-none
                    w-full
                    bg-white
                    border border-gray-400
                    hover:border-gray-500
                    px-4
                    py-2
                    pr-8
                    rounded
                    shadow
                    leading-tight
                    focus:outline-none
                    focus:shadow-outline
                  "
                >
                  <option>default</option>
                </select>
              </li>
            </ul>
          </div>
          <div slot="footer" class="flex justify-center">
            <button class="btn" on:click={closeSettingsModal}>All done!</button>
          </div>
        </Modal>
      {/if}

      <div class="px-4">
        Slide: {activeSlideIndex + 1} / {slides.length}
      </div>
    </div>
  </div>
  <div id="workspace" class="flex-1 grid grid-cols-2 gap-4">
    <div id="editor-pane" class="p-4 col-span-1">
      <h1 class="mb-4">Editor</h1>
      <div bind:this={editor} />
    </div>
    <div id="preview-pane" class="p-4 col-span-1">
      <h1 class="mb-4">Preview</h1>
      {@html activeThemeOutput}
      <div
        id="preview-wrapper"
        bind:this={previewWrapper}
        class="flex items-center justify-center"
      >
        <div
          id="preview"
          class="slide"
          bind:this={preview}
          style={ratioStyle}
          on:click={nextSlide}
        >
          {@html output}
        </div>
      </div>
    </div>
  </div>
</main>

<style lang="postcss">
  /* app slides */
  h1 {
    @apply text-2xl;
  }

  .btn {
    @apply font-semibold py-2 px-4 rounded hover:bg-gray-100;
  }

  .btn-icon {
    @apply flex flex-row;
  }

  #preview {
    @apply border-2 border-black;
  }
</style>
