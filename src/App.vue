<template>
  <main id="app" class="flex flex-col">
    <div id="toolbar" class="grid grid-cols-3 gap-4">
      <div class="col-span-1 flex flex-row items-center justify-start">
        <button @click="showExportSlidesModal" class="btn btn-icon">
          <DocumentDownloadIcon class="h-6 w-6"></DocumentDownloadIcon>Export
        </button>
        <Modal v-show="exportModalVisible" @close="closeExportSlidesModal">
          <template v-slot:header>Select a file type</template>
          <template v-slot:body>
            <button
              v-for="typ in exportTypes"
              :key="typ"
              @click="exportSlides(typ)"
              class="btn"
            >
              .{{ typ }}
            </button>
          </template>
          <template v-slot:footer>
            <button class="btn" @click="closeExportSlidesModal">Cancel</button>
          </template>
        </Modal>

        <button @click="showImportSlidesModal" class="btn btn-icon">
          <UploadIcon class="h-6 w-6"></UploadIcon>Import
        </button>
        <Modal v-show="importModalVisible" @close="closeImportSlidesModal">
          <template v-slot:header>Select a file</template>
          <template v-slot:body>
            <input ref="importedSlides" type="file" accept=".deal" />
          </template>
          <template v-slot:footer>
            <button class="btn" @click="importSlides">Import</button>
          </template>
        </Modal>

        <button @click="showHelpModal" class="btn btn-icon">
          <InformationCircleIcon class="h-6 w-6"></InformationCircleIcon>Help
        </button>
        <Modal v-show="helpModalVisible" @close="closeHelpModal">
          <template v-slot:header>Help</template>
          <template v-slot:body>
            <ul>
              <li v-for="kb in keybindings" :key="kb.key">
                <pre class="inline rounded bg-gray-100 p-1 text-xs">{{
                  kb.key
                }}</pre>
                :
                {{ kb.description }}
              </li>
            </ul>
          </template>
          <template v-slot:footer>
            <button class="btn" @click="closeHelpModal">Got it!</button>
          </template>
        </Modal>

        <!-- To hide under dropdown menu -->
        <!--<button @click="prevSlide" class="btn">Prev</button>
        <button @click="nextSlide" class="btn">Next</button>
        <button @click="newSlide" class="btn">New</button>-->
      </div>

      <div class="col-span-1 flex flex-row items-center justify-center">
        <div class="px-4">
          <input
            v-model="title"
            :size="title.length"
            type="text"
            class="text-center border-b-2 border-black"
          />
        </div>
      </div>

      <div class="col-span-1 flex flex-row items-center justify-end">
        <button @click="toggleFullscreen" class="btn btn-icon">
          <DesktopComputerIcon class="h-6 w-6"></DesktopComputerIcon>Present
        </button>
        <button @click="showSettingsModal" class="btn btn-icon">
          <CogIcon class="h-6 w-6"></CogIcon>Settings
        </button>
        <Modal v-show="settingsModalVisible" @close="closeSettingsModal">
          <template v-slot:header>Settings</template>
          <template v-slot:body>
            <ul>
              <li>
                <label class="mr-2">Ratio:</label>
                <input
                  v-model="settings.ratio"
                  :size="settings.ratio.length"
                  type="text"
                  class="text-center border-b-2 border-black"
                />
              </li>
              <li>
                <label class="mr-2">Theme:</label>
                <select
                  v-model="settings.theme"
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
          </template>
          <template v-slot:footer>
            <button class="btn" @click="closeSettingsModal">All done!</button>
          </template>
        </Modal>
        <div class="px-4">
          Slide: {{ activeSlideIndex + 1 }} / {{ slides.length }}
        </div>
      </div>
    </div>
    <div id="workspace" class="flex-1 grid grid-cols-2 gap-4">
      <div id="editor-pane" class="p-4 col-span-1">
        <h1 class="mb-4">Editor</h1>
        <div ref="editor"></div>
      </div>
      <div id="preview-pane" class="p-4 col-span-1">
        <h1 class="mb-4">Preview</h1>
        <div
          id="preview-wrapper"
          ref="previewWrapper"
          class="flex items-center justify-center"
        >
          <div
            id="preview"
            ref="preview"
            :style="ratioStyle"
            @click="nextSlide()"
            v-html="output"
          ></div>
        </div>
      </div>
    </div>
  </main>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import * as _ from "lodash";
import { Slide } from "./types";

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
import Modal from "./components/Modal.vue";

import {
  DesktopComputerIcon,
  CogIcon,
  InformationCircleIcon,
  DocumentDownloadIcon,
  UploadIcon,
} from "@heroicons/vue/solid";

let marked_render = new marked.Renderer();
let old_paragraph = marked_render.paragraph;
marked_render.paragraph = function (text: string) {
  var isTeXInline = /\$(.*)\$/g.test(text);
  var isTeXLine = /^\$\$(\s*.*\s*)\$\$$/.test(text);

  if (!isTeXLine && isTeXInline) {
    text = text.replace(/(\$([^\$]*)\$)+/g, function (_$1: string, $2: string) {
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
    });
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

export default defineComponent({
  name: "App",
  components: {
    DesktopComputerIcon,
    CogIcon,
    InformationCircleIcon,
    DocumentDownloadIcon,
    UploadIcon,
    Modal,
  },
  data() {
    let vm = this;

    return {
      cm: null as EditorView | null,
      title: "Untitled",
      slides: [{ content: "", notes: "" }],
      activeSlideIndex: 0,

      exportModalVisible: false,
      importModalVisible: false,
      helpModalVisible: false,
      settingsModalVisible: false,

      exportTypes: ["deal", "pdf"],

      settings: {
        ratio: "",
        theme: "default",
      },

      keybindings: [
        {
          key: "Alt-[",
          description: "Navigate to previous slide",
          run: (v: EditorView) => {
            console.log("hi");
            this.prevSlide();
            return true;
          },
        },
        {
          key: "Alt-]",
          description: "Navigate to next slide",
          run: (v: EditorView) => {
            this.nextSlide();
            return true;
          },
        },
        {
          key: "Alt-n",
          description: "Create a new slide",
          run: (v: EditorView) => {
            this.newSlide();
            return true;
          },
        },
        {
          key: "Alt-m",
          description: "Duplicate current slide",
          run: (v: EditorView) => {
            this.duplicateSlide();
            return true;
          },
        },
      ],
    };
  },

  computed: {
    ratioStyle(): string {
      let x = this.settings.ratio.split(":");
      let n = parseInt(x[1]),
        d = parseInt(x[0]);

      if (!this.$refs.preview) return "";
      let w = "90vh";
      return `width: ${w}; height: calc(${w} * ${n} / ${d});`;
    },
    activeSlide(): Slide {
      return this.slides[this.activeSlideIndex];
    },
    output(): string {
      return DOMPurify.sanitize(marked(this.activeSlide.content));
    },
  },

  mounted() {
    let vm = this;

    this.settings.ratio = "4:3";
    this.cm = new EditorView({
      parent: <Element>this.$refs.editor,
      state: EditorState.create({
        doc: "",
        extensions: [
          basicSetup,
          EditorView.updateListener.of((v: ViewUpdate) => {
            if (v.docChanged) {
              vm.updateCurrentSlide(v.state.doc.toString());
            }
          }),
          keymap.of(vm.keybindings),
        ],
      }),
    });

    document.onkeydown = function (event: KeyboardEvent) {
      if (!event.target) return;
      if (!(event.target as HTMLElement).matches('body')) return; // ignore key press in code editor
      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          vm.prevSlide();
          break;

        case 'ArrowRight':
        case 'ArrowDown':
        case 'Spacebar':
        case 'Enter':
          vm.nextSlide();
          break;
      }
    };
  },

  methods: {
    prevSlide() {
      if (this.activeSlideIndex > 0) {
        this.loadSlide(this.activeSlideIndex - 1);
      }
    },

    nextSlide() {
      if (this.activeSlideIndex < this.slides.length - 1) {
        this.loadSlide(this.activeSlideIndex + 1);
      }
    },

    newSlide(slide = { content: "", notes: "" }) {
      this.slides.push(slide);
      this.loadSlide(this.slides.length - 1);
    },

    duplicateSlide() {
      let dup = _.cloneDeep(this.activeSlide);
      this.newSlide(dup);
    },

    loadSlide(slideNo: number) {
      this.activeSlideIndex = slideNo;
      this.cm?.dispatch({
        changes: {
          from: 0,
          to: this.cm.state.doc.length,
          insert: this.activeSlide.content,
        },
      });
    },

    updateCurrentSlide(content: string) {
      this.activeSlide.content = content;
    },

    toggleFullscreen() {
      (this.$refs.previewWrapper as HTMLElement).requestFullscreen();
    },

    showExportSlidesModal() {
      this.exportModalVisible = true;
    },

    closeExportSlidesModal() {
      this.exportModalVisible = false;
    },

    exportSlides(typ: string) {
      if (typ === "deal") {
        let exportData = {
          settings: this.settings,
          slides: this.slides,
        };
        let blob = new Blob([JSON.stringify(exportData)], {
          type: "text/plain;charset=utf-8",
        });
        FileSaver.saveAs(blob, this.title + ".deal");
      } else if (typ == "pdf") {
        //const prtHtml = this.$refs.preview.innerHTML;
        //return DOMPurify.sanitize(marked(this.activeSlide.content));
        const prtHtml = this.slides
          .map(
            (s) => `<div class="border-2 border-black" style="${
              this.ratioStyle
            }">
          ${DOMPurify.sanitize(marked(s.content))}</div>`
          )
          .join("<footer></footer>");

        let stylesHtml = "";
        for (const node of [
          ...Array.from(document.querySelectorAll('link[rel="stylesheet"], style')),
        ]) {
          stylesHtml += node.outerHTML;
        }

        const WinPrint = <Window> window.open(
          "",
          "",
          "left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0"
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
        WinPrint.print();
        WinPrint.close();
      } else {
        alert("Error: unimplemented!");
      }
    },

    showImportSlidesModal() {
      this.importModalVisible = true;
    },

    closeImportSlidesModal() {
      this.importModalVisible = false;
    },

    importSlides() {
      let vm = this;
      let f = (this.$refs.importedSlides as HTMLInputElement)?.files?.[0];
      if (!f) return;

      const reader = new FileReader();
      reader.addEventListener("load", (evt) => {
        if (!f || !evt.target || !evt.target.result) {
          alert("Failed to import slides.");
          return;
        }

        let importData = JSON.parse(evt.target.result as string);
        vm.title = f.name.replace(/\.deal$/, "");
        vm.settings = importData.settings;
        vm.slides = importData.slides;

        this.closeImportSlidesModal();
        this.loadSlide(0);
      });
      reader.readAsText(f);
    },

    showHelpModal() {
      this.helpModalVisible = true;
    },

    closeHelpModal() {
      this.helpModalVisible = false;
    },

    showSettingsModal() {
      this.settingsModalVisible = true;
    },

    closeSettingsModal() {
      this.settingsModalVisible = false;
    },
  },
});
</script>

<style lang="postcss">
html,
body,
#app {
  height: 100%;
}

#preview {
  border: 2px solid black;
  @apply bg-white p-4;
}

.btn {
  @apply font-semibold py-2 px-4 rounded hover:bg-gray-100;
}

.btn-icon {
  @apply flex flex-row;
}

@media print {
  footer {
    page-break-after: always;
  }
}
</style>
