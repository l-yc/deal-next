import { generateScopedStyle } from "./Theme";
import renderMarkdown from "./Renderer";
import type { Settings, Slide } from "./DataTypes";

import FileSaver from "file-saver";

function exportSlides_(typ: string, title: string, ratioStyle: string, activeTheme: string, settings: Settings, slides: Slide[]) {
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
    const prtHtml = slides
      .map(
        (s, i) =>
          `<div class="slide border-2 border-black" style="${ratioStyle}">
              ${renderMarkdown(s.content)}
              <div class="slide-number" style="position: absolute; bottom: .2rem; right: .4rem;">${i + 1}</div>
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

export {exportSlides_};