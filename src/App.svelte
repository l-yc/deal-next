<script lang="ts">
  import { onMount } from "svelte";

  import Modal from "./lib/Modal.svelte";
  import renderMarkdown from "./lib/Renderer";
  import { theme, generateScopedStyle } from "./lib/Theme";
  import type { Keybind } from "./lib/Keybindings";
  import { registerDocumentKeybindings } from "./lib/Keybindings";

  import * as _ from "lodash";

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

  // refs
  let importedSlides: HTMLInputElement,
    editor: Element,
    preview: HTMLElement,
    previewWrapper: HTMLElement;

  // data
  let cm = null as EditorView | null;
  let title = "Untitled";
  let slides = [{ content: "", notes: "" }];
  for (let i = 0; i < 5; ++i) slides.push({ content: "# " + i, notes: ""});
  let activeSlideIndex = 0;

  $: activeTheme = theme.default;
  $: activeThemeOutput = generateScopedStyle(activeTheme, "#preview");

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

  let keybindings: { global: Keybind[], doc: Keybind[], editor: Keybind[] } = {
    global: [
      {
        keys: ["Ctrl-Alt-n"],
        description: "Create a new slide",
        run: () => newSlide(),
      },
      {
        keys: ["Ctrl-Alt-m"],
        description: "Duplicate current slide",
        run: () => duplicateSlide(),
      },
      {
        keys: ["Ctrl-Alt-d"],
        description: "Delete current slide",
        run: () => deleteSlide(),
      },
      {
        keys: ["Ctrl-g"],
        description: "Go to slide",
        run: () => gotoSlide(),
      },
      {
        keys: ["Ctrl-Alt-g"],
        description: "Move slide to",
        run: () => moveSlide(),
      },
    ],

    doc: [
      {
        keys: ["ArrowLeft", "ArrowUp", "Backspace"],
        description: "Navigate to previous slide",
        run: () => prevSlide(),
      },
      {
        keys: ["ArrowRight", "ArrowDown", " ", "Enter"],
        description: "Navigate to next slide",
        run: () => nextSlide(),
      },
    ],

    editor: [
      {
        keys: ["Ctrl-Alt-ArrowLeft", "Ctrl-Alt-ArrowUp"],
        description: "Navigate to previous slide",
        run: () => prevSlide(),
      },
      {
        keys: ["Ctrl-Alt-ArrowRight", "Ctrl-Alt-ArrowDown"],
        description: "Navigate to next slide",
        run: () => nextSlide(),
      },
    ],
  };

  registerDocumentKeybindings(keybindings.global.concat(keybindings.doc));

  function transformKeybindingsForEditor(keybindings: Keybind[]) {
    let ret = keybindings
      .map((kb) => {
        return kb.keys.map((c) => {
          return {
            key: c,
            description: kb.description,
            run: (v: EditorView) => {
              kb.run();
              return true;
            },
          };
        });
      })
      .reduce((a, b) => a.concat(b));
    return ret;
  }

  function getScaledStyle(boundWidth: number, boundHeight: number): number {
    let ratio = settings.ratio.split(":");
    let frac = parseInt(ratio[1]) / parseInt(ratio[0]);

    let width = Math.min(boundWidth, boundHeight / frac);

    const w = 30; // rem
    let px = w * parseFloat(getComputedStyle(document.documentElement).fontSize);
    let scale = width / px;
    return scale;
  }

  let previewScale = 1;

  // computed
  $: ratioStyle = (() => {
    let x = settings.ratio.split(":");
    let n = parseInt(x[1]),
      d = parseInt(x[0]);
    let w = 30, h = (w * n) / d;
    return `width: ${w}rem; height: ${h}rem; transform: scale(${previewScale})`;
  })();
  $: activeSlide = slides[activeSlideIndex];
  $: output = renderMarkdown(activeSlide.content);

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
              let items = // @ts-ignore originalEvent for newer chrome version
              (event.clipboardData || event.originalEvent.clipboardData)?.items;
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
          keymap.of(
            transformKeybindingsForEditor(
              keybindings.global.concat(keybindings.editor)
            )
          ),
        ],
      }),
    });

    previewWrapper.onfullscreenchange = (event) => {
      let elem = event.target;
      let isFullscreen = document.fullscreenElement === elem;
      if (isFullscreen)
        previewScale = getScaledStyle(previewWrapper.offsetWidth, previewWrapper.offsetHeight);
      else
        previewScale = 1;
    }
  });

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

  function deleteSlide() {
    slides = slides.filter((e, i) => i !== activeSlideIndex);
    if (slides.length === 0) newSlide();
    activeSlideIndex = Math.min(activeSlideIndex, slides.length-1);
    loadSlide(activeSlideIndex);
  }

  function gotoSlide() {
    let slideNo: number = parseInt(window.prompt("Enter slide number:"));
    if (isNaN(slideNo)) {
      alert("Input must be a number")
      return;
    }

    if (slideNo < 1 || slideNo > slides.length) {
      alert("Input out of range");
      return;
    }
    --slideNo;

    loadSlide(slideNo);
  }

  function moveSlide() {
    let slideNo: number = parseInt(window.prompt("Enter slide number:"));
    if (isNaN(slideNo)) {
      alert("Input must be a number")
      return;
    }

    if (slideNo < 1 || slideNo > slides.length) {
      alert("Input out of range");
      return;
    }
    --slideNo;

    slides.splice(slideNo, 0, slides.splice(activeSlideIndex, 1)[0]);
    slides = slides; // trigger update
    loadSlide(slideNo);
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
            `<div class="slide border-2 border-black" style="${ratioStyle}">
              ${renderMarkdown(s.content)}
            </div>`
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
          <div slot="body" class="overflow-y-auto">
            {#each Object.entries(keybindings) as [typ, kbg]}
              <h3 class="font-semi-bold ml-2">{typ}</h3>
              <ul class="p-2">
                {#each kbg as kb}
                  <li>
                    {#each kb.keys as c}
                      <pre
                        class="inline rounded bg-gray-100 p-1 text-xs">{c}</pre>
                    {/each}:
                    {kb.description}
                  </li>
                {/each}
              </ul>
            {/each}
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
        class="flex flex-col items-center justify-center"
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

      <!-- slide preview bar -->
      <div class="relative overflow-x-auto" style="height: 8rem">
        {@html generateScopedStyle(activeTheme, ".slide-preview")}
        {#each slides as slide, i}
          <div 
            class="absolute slide-preview border-grey border-2 flex-shrink-0"
            style="{ratioStyle}; top: 2rem; left: {i*10}rem; transform: scale(0.2); transform-origin: left top;"
          >
            {@html renderMarkdown(slide.content)}
          </div>
        {/each}
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
