<template>
  <main id="app" class="flex flex-col">
    <div id="toolbar">
      <button class="button">Prev</button>
      <button class="button">Next</button>
      <input v-model="ratio" type="text" />
    </div>
    <div id="workspace" class="flex-1 flex flex-row">
      <div id="editor-pane" class="flex-1">
        <h1>Editor</h1>
        <hr>
        <div ref="editor"></div>
      </div>
      <div id="preview-pane" class="flex-1">
        <h1>Preview</h1>
        <hr>
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
      ratio: "4:3",
      input: "",
    };
  },
  computed: {
    ratioStyle() {
      let x = this.ratio.split(':')
      let n = parseInt(x[1]), d = parseInt(x[0])
      return `position: relative; width: 100%; padding-bottom: ${(n/d*100).toString()}%`
    },
    output() {
      return DOMPurify.sanitize(marked(this.input));
    },
  },

  mounted() {
    let vm = this;

    const view = new EditorView({
      parent: <Element> this.$refs.editor,
      state: EditorState.create({
        doc: "",
        extensions: [
          basicSetup,
          EditorView.updateListener.of((v: ViewUpdate) => {
            if (v.docChanged) {
              this.input = v.state.doc.toString();
            }
          }),
        ],
      }),
    });
  },

  methods: {
  }
});
</script>

<style lang="postcss">
html, body, #app {
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
</style>
