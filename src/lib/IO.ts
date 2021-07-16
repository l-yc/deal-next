import { generateScopedStyle, Theme } from "./Theme";
import { getRatioStyle, renderMarkdown } from "./Renderer";
import type { Settings, Slide } from "./DataTypes";

import FileSaver from "file-saver";

const exportTypes = [
  { type: "deal", description: "deal file" },
  { type: "pdf", description: "chrome only" },
];

function exportSlides_(typ: string, title: string, meta: Meta, settings: Settings, slides: Slide[], activeTheme: Theme) {
  if (typ === "deal") {
    let exportData = {
      settings: settings,
      slides: slides,
    };
    let blob = new Blob([JSON.stringify(exportData)], {
      type: "text/plain;charset=utf-8",
    });
    FileSaver.saveAs(blob, title + ".deal");
  } else if (typ == "pdf") {
    let ratioStyle = getRatioStyle(settings.ratio, 1);

    const prtHtml = slides
      .map(
        (s, i) =>
          `<div class="slide border-2 border-black" style="${ratioStyle}">
              ${renderMarkdown(s.content)}
              <div class="slide-footer">
                <div class="slide-footer-text">${title} / ${meta.author}</div>
                <div class="slide-number">${i+1}</div>
              </div>
            </div>`
      )
      .join("<footer></footer>");

    let stylesHtml = "";
    for (const node of [
      ...Array.from(
        document.querySelectorAll('link[rel="stylesheet"], style')
      ),
    ])
      if (node instanceof HTMLElement && !("theme" in node.dataset)) {
        // we will add the theme css ourselves
        stylesHtml += node.outerHTML;
      }
    stylesHtml += generateScopedStyle(activeTheme, ".slide");

    // add print css using pagedjs
    let x = settings.ratio.split(":");
    let n = parseInt(x[1]),
      d = parseInt(x[0]);
    let w = "30rem",
      h = (30 * n) / d + "rem";
    console.log(n / d);
    stylesHtml +=
      `<st` +
      `yle>
        @page {
          margin: 0mm 0mm;
          size: ${w} ${h};
        }
      </st` +
      `yle>`;
    stylesHtml +=
      `<scr` +
      `ipt src="https://unpkg.com/pagedjs/dist/paged.polyfill.js"></scr` +
      `ipt>`;

    const WinPrint = <Window>(
      window.open(
        "",
        "",
        "left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0"
      )
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
  } else {
    console.log(typ);
    alert("Error: unimplemented!");
  }
}

function importSlides_(importedSlides: HTMLInputElement): Promise<{ title: string, settings: Settings, slides: Slide[] }> {
  return new Promise((resolve, reject) => {
    let f = importedSlides.files?.[0];
    if (!f) {
      reject("No slides selected.");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", (evt) => {
      if (!f || !evt.target || !evt.target.result) {
        reject("Failed to import slides.");
        return;
      }

      let importData = JSON.parse(evt.target.result as string);
      resolve({
        title: f.name.replace(/\.deal$/, ""),
        settings: importData.settings,
        slides: importData.slides,
      })
    });
    reader.readAsText(f);

  });
}

export { exportTypes, exportSlides_, importSlides_ };