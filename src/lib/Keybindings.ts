const modifiers = ["ctrlKey", "altKey", "shiftKey", "metaKey"];
const fields = ["key", ...modifiers];

interface KeyCombo {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

function modkey(m: string): string {
  return m[0].toUpperCase() + m.slice(1, m.length - 3);
}

function parseCombo(combo: string): KeyCombo {
  let tok = combo.split('-');
  let ret = { key: tok[tok.length-1] };
  modifiers.forEach(m => ret[m] = tok.indexOf(modkey(m)) !== -1);
  return ret as KeyCombo;
}

function matchKey(combo: string, event: KeyboardEvent): boolean {
  let obj: KeyCombo = parseCombo(combo);
  return fields.map(k => obj[k] === event[k]).reduce((a, b) => a&&b, true); 
}

export function registerDocumentKeybindings(keybindings): void {
  document.onkeydown = function (event: KeyboardEvent) {
    if (!event.target) return;
    if (!(event.target as HTMLElement).matches("body")) return; // ignore key press in code editor

    console.log(event);
    keybindings.forEach(kb => {
      if (kb.keys.map((c: string) => matchKey(c, event)).reduce((a, b) => a||b, false)) {
        console.log(kb.run);
        kb.run();
        return;
      }
    });
  };
}