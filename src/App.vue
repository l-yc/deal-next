<template>
  <main id="app" class="flex flex-col">
    <div id="toolbar" class="grid grid-cols-3 gap-4">
      <div class="col-span-1 flex flex-row items-center justify-start">
        <button @click="prevSlide" class="btn">Prev</button>
        <button @click="nextSlide" class="btn">Next</button>
        <button @click="newSlide" class="btn">New</button>
      </div>
      <div class="col-span-1 flex flex-row items-center justify-center">
        <div class="px-4"><input v-model="title" type="text" class="text-center border-b-2 border-black"/></div>
      </div>
      <div class="col-span-1 flex flex-row items-center justify-end">
        <div class="px-4 w-auto">Ratio: <input v-model="ratio" type="text" class="appearance-none w-6 border-b-2 border-black" /></div>
        <div class="px-4">Slide: {{ activeSlideIndex + 1 }} / {{ slides.length }}</div>
      </div>
    </div>
    <div id="workspace" class="flex-1 grid grid-cols-2 gap-4">
      <div id="editor-pane" class="p-4 col-span-1">
        <h1>Editor</h1>
        <hr />
        <div ref="editor"></div>
      </div>
      <div id="preview-pane" class="p-4 col-span-1">
        <h1>Preview</h1>
        <button @click="toggleFullscreen" class="btn btn-blue">Fullscreen</button>
        <hr />
        <div id="preview-wrapper" ref="previewWrapper" class="flex items-center justify-center">
          <div id="preview" ref="preview" :style="ratioStyle" v-html="output"></div>
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
import { ViewUpdate } from "@codemirror/view";

export default defineComponent({
  name: "App",
  components: {},
  data() {
    return {
      cm: null,
      ratio: "",
      title: "Untitled",
      slides: [""],
      activeSlideIndex: 0,
    };
  },
  computed: {
    ratioStyle() {
      let x = this.ratio.split(":");
      let n = parseInt(x[1]),
        d = parseInt(x[0]);

      if (!this.$refs.preview) return '';
      let w = '80vh';
      return `width: ${w}; height: calc(${w} * ${n} / ${d});`;
    },
    output() {
      return DOMPurify.sanitize(marked(this.slides[this.activeSlideIndex]));
    },
  },

  mounted() {
    let vm = this;

    this.ratio = '4:3';
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
        ],
      }),
    });
  },

  methods: {
    prevSlide() {
      if (this.activeSlideIndex > 0) {
        this.loadSlide(this.activeSlideIndex-1);
      }
    },

    nextSlide() {
      if (this.activeSlideIndex < this.slides.length-1) {
        this.loadSlide(this.activeSlideIndex+1);
      }
    },

    newSlide() {
      this.slides.push("");
      this.loadSlide(this.slides.length - 1);
    },

    loadSlide(slideNo: number) {
      this.activeSlideIndex = slideNo;
      this.cm.dispatch({
        changes: {
          from: 0, 
          to: this.cm.state.doc.length, 
          insert: this.slides[this.activeSlideIndex]
        },
      });
    },

    updateCurrentSlide(content: string) {
      this.slides[this.activeSlideIndex] = content;
    },

    toggleFullscreen() {
      this.$refs.previewWrapper.requestFullscreen();
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
