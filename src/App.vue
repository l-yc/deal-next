<template>
  <main id="app" class="flex flex-col">
    <div id="toolbar" class="grid grid-cols-3 gap-4">
      <div class="col-span-1 flex flex-row items-center justify-start">
        <button @click="exportSlides" class="btn">Export</button>
        <button @click="showImportSlidesModal" class="btn">Import</button>
        <Modal v-show="importModalVisible" @close="closeImportSlidesModal">
          <template v-slot:header>Select a file</template>
          <template v-slot:body>
            <input ref="importedSlides" type="file" accept=".deal" />
          </template>
          <template v-slot:footer>
            <button class="btn" @click="importSlides">Import</button>
          </template>
        </Modal>

        <button @click="showHelpModal" class="btn flex flex-row">
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

        <button @click="prevSlide" class="btn">Prev</button>
        <button @click="nextSlide" class="btn">Next</button>
        <button @click="newSlide" class="btn">New</button>
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
        <button @click="toggleFullscreen" class="btn flex flex-row">
          <DesktopComputerIcon class="h-6 w-6"></DesktopComputerIcon>Present
        </button>
        <button @click="showSettingsModal" class="btn flex flex-row">
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
                <select v-model="settings.theme" class="block appearance-none w-full bg-white border border-gray-400 hover:border-gray-500 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:shadow-outline">
                  <option>default</option>
                </select>
              </li>
            </ul>
          </template>
          <template v-slot:footer>
            <button class="btn" @click="closeSettingsModal">All done!</button>
          </template>
        </Modal>
        <!--<div class="px-4 w-auto">
          Ratio:
          <input
            v-model="ratio"
            :size="ratio.length"
            type="text"
            class="text-center border-b-2 border-black"
          />
        </div>-->
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
import marked from "marked";
import DOMPurify from "dompurify";

import { basicSetup, EditorState, EditorView } from "@codemirror/basic-setup";
import { ViewUpdate, keymap } from "@codemirror/view";

import FileSaver from "file-saver";
import Modal from "./components/Modal.vue";

import {
  DesktopComputerIcon,
  CogIcon,
  InformationCircleIcon,
} from "@heroicons/vue/solid";

import * as _ from "lodash";

export default defineComponent({
  name: "App",
  components: {
    DesktopComputerIcon,
    CogIcon,
    InformationCircleIcon,
    Modal,
  },
  data() {
    return {
      cm: null,
      title: "Untitled",
      slides: [{ content: "", notes: "" }],
      activeSlideIndex: 0,

      importModalVisible: false,
      helpModalVisible: false,
      settingsModalVisible: false,

      settings: {
        ratio: "",
        theme: "default",
      },

      keybindings: [
        {
          key: "Alt-PageUp",
          description: "Navigate to previous slide",
          run: (v: EditorView) => {
            vm.prevSlide();
            return true;
          },
        },
        {
          key: "Alt-PageDown",
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
    ratioStyle() {
      let x = this.settings.ratio.split(":");
      let n = parseInt(x[1]),
        d = parseInt(x[0]);

      if (!this.$refs.preview) return "";
      let w = "90vh";
      return `width: ${w}; height: calc(${w} * ${n} / ${d});`;
    },
    activeSlide() {
      return this.slides[this.activeSlideIndex];
    },
    output() {
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
      this.cm.dispatch({
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
      this.$refs.previewWrapper.requestFullscreen();
    },

    exportSlides() {
      var blob = new Blob([JSON.stringify(this.slides)], {
        type: "text/plain;charset=utf-8",
      });
      FileSaver.saveAs(blob, this.title + ".deal");
    },

    showImportSlidesModal() {
      this.importModalVisible = true;
    },

    closeImportSlidesModal() {
      this.importModalVisible = false;
    },

    importSlides() {
      let vm = this;
      let f = this.$refs.importedSlides.files[0];

      const reader = new FileReader();
      reader.addEventListener("load", (evt) => {
        vm.slides = JSON.parse(evt.target.result);
      });
      reader.readAsText(f);

      this.closeImportSlidesModal();
      this.loadSlide(0);
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
  @apply bg-white;
}

.btn {
  @apply font-semibold py-2 px-4 rounded hover:bg-gray-100;
}

.btn-blue {
  @apply bg-blue-500 text-white hover:bg-blue-700;
}
</style>
