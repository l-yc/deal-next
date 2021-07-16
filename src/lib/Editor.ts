import { basicSetup, EditorState, EditorView } from "@codemirror/basic-setup";
import { ViewUpdate, keymap } from "@codemirror/view";
import type { Keybind } from "./Keybindings";

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


function createEditor(
  editor: Element, 
  updateCurrentSlide: any,
  keybindings: Keybind[]
): EditorView {
  return new EditorView({
    parent: editor,
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
        keymap.of(transformKeybindingsForEditor(keybindings)),
      ],
    }),
  });
}

export { createEditor };