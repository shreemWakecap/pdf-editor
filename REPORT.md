# Paper Studio — redesign report

The editor is served at **http://127.0.0.1:8765/** for Mohammad to try. The application is plain HTML, CSS and JavaScript with CDN libraries: no npm project, framework, build step, or leftover scaffolding.

**Recording is on hold per Mohammad’s latest instruction. No `demo.mp4` was recorded.** This overrides the older video instructions in `BRIEF.md` and `REDESIGN.md`.

## Run

The static server has been left running. An optional refresh of the existing user browser tab was blocked by automatic approval review because it could discard in-browser edits; that tab was left untouched. Open the URL to load the current server code. If the server is stopped later:

```sh
cd /Users/admin/wkp/proto-codex/pdf-html-editor
python3 -m http.server 8765 --bind 127.0.0.1
```

Open the URL, choose **Open**, and select `samples/real-contract-ar.pdf`. Internet access is needed for the CDN libraries, worker, WASM and fonts. PDF processing happens in the browser; the static server does not upload or process documents.

## Delivered

- Redesigned toolbar, page sidebar with live edited thumbnails, centered pages, contextual property controls, edit status, shortcuts help, light/dark themes, and English/Arabic interface with RTL layout.
- Open or drop PDFs; export with a chosen filename; Print opens the edited PDF in the browser’s PDF viewer; reset to original with undo.
- Zoom, fit page/width, page navigation/jump, thumbnails, and single/continuous views.
- Inline editing, double-click editing in Select mode, multiple selection, three Noto font families, size, bold/italic/underline, color/background, alignment/direction, letter/line spacing, and optional automatic fitting to the original text box.
- Text, rectangle, ellipse, line, arrow, freehand pen, highlighter, PNG/JPEG image, drawn signature, note, date and whiteout tools.
- Drag, resize, numeric rotation/position/size, opacity, duplication, deletion, locking and layer order. Locked objects resist deletion and movement.
- Add blank pages, duplicate/delete/rotate pages, reorder by thumbnail drag or buttons.
- Arabic-aware find/replace; full session history and undo/redo; keyboard shortcuts; localStorage autosave with a restore/discard prompt.
- PDF export preserves untouched vector content and embeds replacement fonts. Changed source text is removed from the PDF text layer before replacements are drawn. Shapes, images, notes and drawing strokes are exported into the PDF.

Arabic extraction explicitly disables PDF.js’s early normalization, then applies NFKC after bidi ordering. This fixes the contract’s presentation-form ligatures without reversing their characters. MuPDF removes replaced source text, preventing stale originals from returning during rebuild.

## Required round-trip rebuild test

```sh
node tests/roundtrip.test.mjs
```

**PASS — 25 assertions/measurements**, using the real three-page Arabic contract. Results: [evidence/roundtrip/results.json](evidence/roundtrip/results.json).

The test uses the public editor controls to change the Arabic title, find/replace a clause heading, add Arabic text, rectangle, highlighter, synthetic signature image and whiteout, delete page 3, reorder pages, and rotate the retained untouched page. It downloads the actual PDF, reopens those bytes through the file input, edits the title and added note again, saves again, and reopens the final file.

| Assertion | First save | Second save |
| --- | --- | --- |
| Two pages, ordered original page 2 then original page 1 | PASS | PASS |
| Rotations 90° and 0° | PASS | PASS |
| New normalized Arabic title/note and find/replace result | PASS | PASS |
| Replaced title/note, old clause heading and whiteout text absent from extraction | PASS | PASS |
| Untouched page pixel comparison | MAE 0; changed pixels 0% | MAE 0; changed pixels 0% |
| Rectangle, signature, highlighter and text in expected pixel regions | PASS | PASS |
| Whiteout’s actual source label removed visually | PASS | PASS |
| Saved files reopen without browser console/page errors | PASS | PASS |

The pixel threshold is mean absolute RGB difference ≤2/255 and ≤4% changed pixels, with at most one pixel of alignment adjustment. Both comparisons achieved an exact match with no adjustment. The reference is the original PDF with only its page rotation set, rendered independently of the editor’s export/removal path. Rotating an already rasterized A4 PNG would introduce fractional-pixel antialiasing differences, so the test rotates the PDF before rendering.

Outputs and inspection evidence:

- [First saved PDF](evidence/roundtrip/roundtrip-first.pdf)
- [Second saved PDF](evidence/roundtrip/roundtrip-second.pdf)
- [First edited page render](evidence/roundtrip/first-2.png)
- [Second edited page render](evidence/roundtrip/second-2.png)
- [Editor after the final rebuild](evidence/roundtrip/editor-rebuilt-final.png)
- Extracted text, PDF metadata, original/reference/output PNGs and the synthetic signature fixture are all in `evidence/roundtrip/`.

The signature used in automation is a synthetic test mark, not anyone’s real signature.

## Additional verification

```sh
node tests/controls.test.mjs
```

**PASS — 13 grouped checks; zero browser errors.** [Results](evidence/controls/results.json) and rendered output are saved in `evidence/controls/`. This complementary test exercises blank-page creation, page duplication, single/continuous views, zoom/fit, ellipse/line/arrow/pen, note/date, multiline text styling, move/resize/rotate/opacity, lock, layers, object duplication/deletion, multiselect and keyboard nudging, undo/redo, theme/RTL, dialogs, draft restoration, export pixel checks, reset/undo and printable PDF opening.

An additional real-contract check in `evidence/redesign/check-editor.cjs` exercises the drawn-signature pad, Arabic typography, page operations and restored-draft export. Its screenshots are in `shots/redesign-*.png`; its output is `evidence/redesign/real-contract-ar-edited.pdf`.

The automated browser driver is **test-only**, explicitly allowed by the round-trip add-on. Tests use the already installed Playwright-core/Chromium, Node, Poppler (`pdftotext`, `pdftoppm`, `pdfinfo`) and FFmpeg/FFprobe. They start and stop their own temporary local HTTP server, leaving port 8765 alone. No npm installation is needed for this workspace. On another machine, make those test tools available and, if necessary, set `PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE`, and `POPPLER_BIN`. Current Poppler tools are under `/tmp/pdf-editor-tools/bin`; that temporary installation may need replacing after cleanup/reboot.

## Practical limits

- This is a text/annotation editor, not OCR. Scanned pages remain visible but do not gain editable text. Oblique/rotated source text runs that cannot be mapped safely are left in the original page.
- Replacement text uses the selected Noto family; the original PDF’s exact typeface/style is not reconstructed. Existing page content is preserved where untouched. Complex PDFs, unusual crop boxes, mixed-script layout, forms and encrypted files have not received exhaustive compatibility testing.
- Reopening an exported PDF rebuilds editable text from PDF extraction. Its existing shapes/images become PDF page content; their original object handles, locks and edit history are not reconstructed. The local draft retains the full editable object model and history.
- Whiteout is not a secure-redaction promise: axis-aligned whiteout removes intersecting source text, but images/vector art remain under its visual cover; rotated whiteout is visual coverage. It does not sanitize all PDF metadata or attachments.
- Signatures are visual marks, not cryptographic signatures. Notes are visible page annotations, not threaded PDF comments.
- Autosave depends on browser storage quota. Large documents/history may exceed it; the app displays a failure message so the PDF can be exported. Files are limited to 40 MB and uploaded images to 8 MB.
- Validation was performed in Chromium on the supplied contract and local samples; no claim is made of exhaustive cross-browser support.

## Source and dependencies

Application: `index.html` and `editor.js`. Tests: `tests/`. No build artifacts or node_modules directory are part of the app.

CDN dependencies: PDF.js 3.11.174, pdf-lib 1.17.1, @pdf-lib/fontkit 1.1.1, MuPDF.js 1.27.0, Noto Sans, Noto Sans Arabic and Noto Naskh Arabic. Icons are inline SVG. MuPDF.js is distributed under the GNU AGPL; see its [upstream licensing information](https://mupdf.readthedocs.io/en/latest/license.html). Other dependency licenses remain with their upstream projects.

Preflight evidence: `evidence/redesign/preflight.json` and `preflight-report.json`. **READY — verification and local serving.** Recording remains intentionally on hold.
