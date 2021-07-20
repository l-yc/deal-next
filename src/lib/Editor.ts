import { basicSetup, EditorState, EditorView } from "@codemirror/basic-setup";
import { EditorSelection } from "@codemirror/state";
import { ViewUpdate, keymap } from "@codemirror/view";
import { defaultTabBinding } from "@codemirror/commands";
import type { Keybind } from "./Keybindings";
import _ from "lodash";

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

const bold = {
  key: "Ctrl-Alt-b",
  description: "bold",
  run: (view: EditorView): boolean => {
    view.dispatch(view.state.changeByRange(range => ({
      changes: [{ from: range.from, insert: "**" }, { from: range.to, insert: "**" }],
      range: EditorSelection.range(range.from + 2, range.to + 2)
    })))
    return true;
  },
}

const italics = {
  key: "Ctrl-Alt-i",
  description: "italics",
  run: (view: EditorView): boolean => {
    console.log(view.state.selection.ranges.map);

    view.dispatch(view.state.changeByRange(range => ({
      changes: [{ from: range.from, insert: "*" }, { from: range.to, insert: "*" }],
      range: EditorSelection.range(range.from + 1, range.to + 1)
    })))
    return true;
  },
}

const strikethrough = {
  key: "Ctrl-Alt-x",
  description: "strikethrough",
  run: (view: EditorView): boolean => {
    console.log(view.state.selection.ranges.map);

    view.dispatch(view.state.changeByRange(range => ({
      changes: [{ from: range.from, insert: "~" }, { from: range.to, insert: "~" }],
      range: EditorSelection.range(range.from + 1, range.to + 1)
    })))
    return true;
  },
}



function createEditor(
  editor: Element,
  updateCurrentSlide: any,
  keybindings: Keybind[]
): EditorView {
  let debouncedUpdate = _.debounce(updateCurrentSlide, 100);

  return new EditorView({
    parent: editor,
    state: EditorState.create({
      doc: "",
      extensions: [
        basicSetup,
        EditorView.updateListener.of((v: ViewUpdate) => {
          if (v.docChanged) {
            debouncedUpdate(v.state.doc.toString())
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
        keymap.of([
          defaultTabBinding,
          bold,
          italics,
          strikethrough,
          ...transformKeybindingsForEditor(keybindings)
        ]),
      ],
    }),
  });
}

export { createEditor };