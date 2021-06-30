<template>
  <main id="app" class="flex flex-col">
    <div id="toolbar">
      <button class="button">Prev</button>
      <button class="button">Next</button>
    </div>
    <div id="workspace" class="flex-1 flex flex-row">
      <div id="editor-pane" class="flex-1">
        <h1>Editor</h1>
        <hr>
        <!--<input v-model="input" type="text" />-->
        <div ref="editor"></div>
      </div>
      <div id="preview-pane" class="flex-1">
        <h1>Preview</h1>
        <hr>
        <div id="preview" ref="preview" v-html="output"></div>
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
      input: "",
    };
  },
  computed: {
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
});
</script>

<style lang="postcss">
#preview {
  border: 2px solid black;
}
</style>
