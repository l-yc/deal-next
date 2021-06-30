<template>
  <main id="app" class="flex flex-col">
    <div id="toolbar">
      <button @click="prevSlide" class="btn btn-blue">Prev</button>
      <button @click="nextSlide" class="btn btn-blue">Next</button>
      <button @click="newSlide" class="btn btn-blue">New</button>
      <p>{{ activeSlideIndex + 1 }} / {{ slides.length }}</p>
      <input v-model="ratio" type="text" />
    </div>
    <div id="workspace" class="flex-1 flex flex-row">
      <div id="editor-pane" class="flex-1">
        <h1>Editor</h1>
        <hr />
        <div ref="editor"></div>
      </div>
      <div id="preview-pane" class="flex-1">
        <h1>Preview</h1>
        <hr />
        <div :style="ratioStyle">
          <div id="preview" ref="preview" v-html="output"></div>
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
      ratio: "4:3",
      slides: [""],
      activeSlideIndex: 0,
    };
  },
  computed: {
    ratioStyle() {
      let x = this.ratio.split(":");
      let n = parseInt(x[1]),
        d = parseInt(x[0]);
      return `position: relative; width: 100%; padding-bottom: ${(
        (n / d) *
        100
      ).toString()}%`;
    },
    output() {
      return DOMPurify.sanitize(marked(this.slides[this.activeSlideIndex]));
    },
  },

  mounted() {
    let vm = this;

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
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.btn {
  @apply font-bold py-2 px-4 rounded;
}
.btn-blue {
  @apply bg-blue-500 text-white;
}
.btn-blue:hover {
  @apply bg-blue-700;
}
</style>
