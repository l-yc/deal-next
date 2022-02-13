<script lang="ts">
  import { onMount } from "svelte";

  import Modal from "./components/Modal.svelte";
  import SlidePreview from "./components/SlidePreview.svelte";
  import { getRatioStyle, getScaledStyle as getBoundedScale } from "./lib/Renderer";
  import type { Theme } from "./lib/Theme";
  import { themes, generateScopedStyle } from "./lib/Theme";
  import type { Keybind } from "./lib/Keybindings";
  import { registerDocumentKeybindings } from "./lib/Keybindings";
  import { exportSlides_, exportTypes, importSlides_ } from "./lib/IO";

  import { createEditor } from "./lib/Editor";
  import type { EditorView } from "@codemirror/basic-setup";

  import * as _ from "lodash";

  import Heroicon from "@martinse/svelte-heroicons";
  import {
    desktopComputer,
    adjustments,
    cog,
    informationCircle,
    documentDownload,
    upload,
    refresh,
  } from "@martinse/svelte-heroicons/dist/solid";

  import { meta, settings, slides } from "./lib/Stores";

  // refs
  let importedSlides: HTMLInputElement,
    editor: Element,
    editorNotes: Element,
    editorStyle: Element,
    previewWrapper: HTMLElement;

  // user input data
  let cm = null as EditorView | null;
  let cmNotes = null as EditorView | null;
  let cmStyle = null as EditorView | null;
  let editorTab = 'content';
  let activeSlideIndex = 0;
  $: activeSlide = $slides[activeSlideIndex];
  $: activeTheme = themes[$settings.theme] as Theme;

  // ratio and sizing
  let previewScale = 1;

  let exportModalVisible = false;
  let importModalVisible = false;
  let helpModalVisible = false;
  let metaModalVisible = false;
  let settingsModalVisible = false;

  // mounted
  onMount(() => {
    cm = createEditor(editor, 'content', updateCurrentSlide,
        keybindings.global.concat(keybindings.editor)
    );
    cmNotes = createEditor(editorNotes, 'notes', updateCurrentSlide,
        keybindings.global.concat(keybindings.editor)
    );
    cmStyle = createEditor(editorStyle, 'style', updateCurrentSlide,
        keybindings.global.concat(keybindings.editor)
    );

    previewWrapper.onfullscreenchange = (event) => {
      let elem = event.target;
      let isFullscreen = document.fullscreenElement === elem;
      if (isFullscreen)
        previewScale = getBoundedScale(
          $settings.ratio, 
          previewWrapper.offsetWidth, 
          previewWrapper.offsetHeight
        );
      else
        previewScale = 1;
    }
    
    loadSlide(0);
  });

  const keybindings: { global: Keybind[], doc: Keybind[], editor: Keybind[] } = {
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
      {
        keys: ["Ctrl-s"],
        description: "Save slide (debugging feature)",
        run: () => saveSlides(),
      },
      {
        keys: ["Ctrl-o"],
        description: "Open slide (debugging feature)",
        run: () => openSlides(),
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

  // methods
  export function prevSlide() {
    if (activeSlideIndex > 0) {
      loadSlide(activeSlideIndex - 1);
    }
  }

  export function nextSlide() {
    if (activeSlideIndex < $slides.length - 1) {
      loadSlide(activeSlideIndex + 1);
    }
  }

  export function newSlide(slide = { content: "", notes: "" }) {
    $slides = [...$slides, slide];
    loadSlide($slides.length - 1);
  }

  export function duplicateSlide() {
    let dup = _.cloneDeep(activeSlide);
    newSlide(dup);
  }

  export function deleteSlide() {
    $slides = $slides.filter((e, i) => i !== activeSlideIndex);
    if ($slides.length === 0) newSlide();
    activeSlideIndex = Math.min(activeSlideIndex, $slides.length-1);
    loadSlide(activeSlideIndex);
  }

  export function gotoSlide() {
    let slideNo: number = parseInt(window.prompt("Enter slide number:"));
    if (isNaN(slideNo)) {
      alert("Input must be a number")
      return;
    }

    if (slideNo < 1 || slideNo > $slides.length) {
      alert("Input out of range");
      return;
    }
    --slideNo;

    loadSlide(slideNo);
  }

  export function moveSlide() {
    let slideNo: number = parseInt(window.prompt("Enter slide number:"));
    if (isNaN(slideNo)) {
      alert("Input must be a number")
      return;
    }

    if (slideNo < 1 || slideNo > $slides.length) {
      alert("Input out of range");
      return;
    }
    --slideNo;

    $slides.splice(slideNo, 0, $slides.splice(activeSlideIndex, 1)[0]);
    $slides = $slides; // trigger update
    loadSlide(slideNo);
  }

  export function loadSlide(slideNo: number) {
    activeSlideIndex = slideNo;
    activeSlide = $slides[slideNo]; // not sure why the reactivity is slow
    cm?.dispatch({
      changes: {
        from: 0,
        to: cm.state.doc.length,
        insert: activeSlide.content,
      },
    });
    cmNotes?.dispatch({
      changes: {
        from: 0,
        to: cmNotes.state.doc.length,
        insert: activeSlide.notes,
      },
    });
    cmStyle?.dispatch({
      changes: {
        from: 0,
        to: cmStyle.state.doc.length,
        insert: activeSlide.style,
      },
    });
  }

  function updateCurrentSlide(key: 'content' | 'notes' | 'style', data: string) {
    activeSlide[key] = data;
    activeSlide = activeSlide; // trigger update
    //$slides[activeSlideIndex] = activeSlide; // TEMPORARY FIX: updating this renders all slide preview instead of only this slide
  }

  function toggleFullscreen() {
    (previewWrapper as HTMLElement).requestFullscreen();
  }

  function saveSlides() {
    let backup = {
      meta: $meta,
      settings: $settings,
      slides: $slides,
    };

    let key = backup.meta.title;
    if (window.localStorage.getItem(key) && 
        !window.confirm(`Overwrite "${key}"?`)) {
      return;
    }

    window.localStorage.setItem(key, JSON.stringify(backup));
  }

  function openSlides() {
    let key: string = window.prompt("(DBG) Enter key:");
    let data = window.localStorage.getItem(key);
    if (!data) {
      alert("Invalid key");
      return;
    }

    const parsed = JSON.parse(data);
    $meta = parsed.meta;
    $settings = parsed.settings;
    $slides = parsed.slides;
    loadSlide(0);
  }

  function showExportSlidesModal() {
    exportModalVisible = true;
  }

  function closeExportSlidesModal() {
    exportModalVisible = false;
  }

  function exportSlides(typ: string) {
    exportSlides_(typ, $meta, $settings, $slides, activeTheme);
  }

  function showImportSlidesModal() {
    importModalVisible = true;
  }

  function closeImportSlidesModal() {
    importModalVisible = false;
  }

  function importSlides() {
    importSlides_(importedSlides)
      .then(data => {
        $meta = data.meta;
        $settings = data.settings;
        $slides = data.slides;
        closeImportSlidesModal();
        loadSlide(0);
      })
      .catch(err => alert(err));
  }

  function showHelpModal() {
    helpModalVisible = true;
  }

  function closeHelpModal() {
    helpModalVisible = false;
  }

  function showMetaModal() {
    metaModalVisible = true;
  }

  function closeMetaModal() {
    metaModalVisible = false;
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
          <div slot="body" class="overflow-y-auto" style="max-height: 60vh">
            Press <pre class="inline rounded bg-gray-100 p-1 text-xs">Esc</pre> to restore normal keybindings when in the editor.
            Use \newline instead of \\.
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
      <input
        bind:value={$meta.title}
        size={$meta.title.length}
        type="text"
        class="text-center border-b-2 border-black"
      />
      <button on:click={showMetaModal} class="btn btn-icon">
        <Heroicon icon={adjustments} class="h-6 w-6" />
      </button>
      {#if metaModalVisible}
        <Modal on:close={closeMetaModal}>
          <div slot="header">Meta</div>
          <div slot="body">
            <ul>
              <li>
                <label for="$meta.author" class="mr-2">Author:</label>
                <input
                  bind:value={$meta.author}
                  name="$meta.author"
                  size={$meta.author.length}
                  type="text"
                  class="text-center border-b-2 border-black"
                />
              </li>
            </ul>
          </div>
          <div slot="footer" class="flex justify-center">
            <button class="btn" on:click={closeMetaModal}>All done!</button>
          </div>
        </Modal>
      {/if}
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
                <label for="$settings.ratio" class="mr-2">Ratio:</label>
                <input
                  bind:value={$settings.ratio}
                  name="$settings.ratio"
                  size={$settings.ratio.length}
                  type="text"
                  class="text-center border-b-2 border-black"
                />
              </li>
              <li>
                <label for="$settings.theme" class="mr-2">Theme:</label>
                <select
                  bind:value={$settings.theme}
                  name="$settings.theme"
                  class="dropdown"
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
        Slide: {activeSlideIndex + 1} / {$slides.length}
      </div>
    </div>
  </div>
  <div id="workspace" class="flex-1 grid grid-cols-2 gap-4">
    <div id="editor-pane" class="p-4 col-span-1">
      <h1 class="mb-4">Editor</h1>
      <div class="border-2 border-black">
        <div class="flex">
          <button class="btn" on:click={() => {editorTab = 'content'}}>Content</button>
          <button class="btn" on:click={() => {editorTab = 'notes'}}>Notes</button>
          <button class="btn" on:click={() => {editorTab = 'style'}}>Style</button>
        </div>
        <div style={editorTab != 'content' ? 'display:none;' : ''} class="" bind:this={editor}></div>
        <div style={editorTab != 'notes' ? 'display:none;' : ''} class="" bind:this={editorNotes}></div>
        <div style={editorTab != 'style' ? 'display:none;' : ''} class="" bind:this={editorStyle}></div>
      </div>
    </div>
    <div id="preview-pane" class="p-4 col-span-1">
      {@html generateScopedStyle(activeTheme, ".slide")}
      {#each $slides as slide, slideIndex}
        {#if slide.style}
          {@html generateScopedStyle(slide.style, `.slide-${slideIndex+1}`)}
        {/if}
      {/each}

      <h1 class="mb-4 flex items-center">
        Preview
        <!--<button class="ml-1 p-1 rounded hover:bg-gray-100 flex items-center" on:click={(e) => refreshSlide()}>
          <Heroicon icon={refresh} class="h-5 w-5" />
        </button>-->
      </h1>
      <div
        id="preview-wrapper"
        bind:this={previewWrapper}
        class="flex flex-col items-center justify-center"
      >
        <SlidePreview 
          style={getRatioStyle($settings.ratio, previewScale)}
          content={activeSlide.content}
          index={activeSlideIndex+1}
          on:click={(e) => nextSlide()}
        />
      </div>

      <!-- slide preview bar -->
      <div class="relative overflow-x-auto" style="height: 8rem">
        {#each $slides as slide, slideIndex}
          <SlidePreview 
            style={getRatioStyle($settings.ratio, 0.2) + `; top: 2rem; left: ${slideIndex*10}rem; transform-origin: left top;`}
            content={slide.content}
            index={slideIndex+1}
            isNav={true}
            on:click={(e) => loadSlide(slideIndex)}
          />
        {/each}
      </div>
    </div>
  </div>
</main>

<style lang="postcss" windi:safelist>
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

  .dropdown {
    @apply
        block appearance-none w-full bg-white
        border border-gray-400 hover:border-gray-500
        px-4 py-2 pr-8
        rounded shadow leading-tight
        focus:outline-none focus:shadow-outline;
  }
</style>
