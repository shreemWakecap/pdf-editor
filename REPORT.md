# PDF editor prototype

Completed against the **UPDATE** in `BRIEF.md`: one standalone `index.html`, plain JavaScript and CSS, CDN libraries, no npm, framework, build step, or Playwright. No scaffolding had been created before the update. Nothing was deployed.

## Run locally

```sh
cd /Users/admin/wkp/proto-codex/pdf-html-editor
python3 -m http.server 8765 --bind 127.0.0.1
```

URL: **http://127.0.0.1:8765/**

The local server was left running. Do not start a second server on the same port while it is running. Internet access is needed for the CDN scripts, PDF.js worker and fonts. The server only serves static files; PDF bytes are processed in the browser.

## What works

- Upload a PDF through the native file picker; render multiple pages with editable text spans.
- Edit text directly, including Arabic; Enter finishes a line, Escape restores that line, and Reset edits restores all lines.
- Save a new PDF using the original document, covering only changed text regions and drawing replacements with embedded Noto fonts through fontkit. Untouched PDF content is not rasterized.
- Generate an English two-page sample or Arabic one-page sample from the sidebar, with an original-sample download link.
- Reject unsupported replacement characters instead of silently drawing missing glyphs; reduce longer replacements to the original line width.

## Manual verification — 2026-10-19

Verified in local Chrome using accessibility controls and native file dialogs, with no Playwright or automated browser suite.

| Check | Result |
| --- | --- |
| Initial page and CDN libraries | Passed; app and sample generation loaded successfully. |
| English multi-page sample | Passed; both pages rendered and exposed editable text. |
| English edit and save | Passed; changed “The launch is scheduled for Monday.” to “The launch is scheduled for Tuesday.” and downloaded the result. |
| File-picker upload / round trip | Passed; uploaded the downloaded English PDF; both pages loaded and the replacement was present. |
| Arabic edit and save | Passed; changed “مرحبا بالعالم” to “مرحبا بالجميع”; saved and uploaded the downloaded copy. Joined Arabic glyphs and right-to-left placement were visually checked. |
| Saved PDF content | PDF.js exposed the new English and Arabic text after reopening. macOS PDF preview also exposed the replacements, along with the retained covered originals. |
| Page-two editing and reset | Passed on the final code; changed “team” to “client”, then Reset edits restored the original line and zero edited lines. |
| JavaScript syntax | Passed using a local syntax-only parse; Node is not an app dependency. |

The updated brief replaced the earlier full testing request with a quick manual check. `pdftotext`/`pdftoppm` were unavailable and were not installed. Saved pages were checked through PDF.js rendering and screenshots instead. No claim is made of exhaustive PDF compatibility or cross-browser testing.

Samples and actual browser downloads are preserved in `samples/`:

- `english-sample.pdf` and `english-sample-edited.pdf`
- `arabic-sample.pdf` and `arabic-sample-edited.pdf`

## Demo video — ON HOLD

No `demo.mp4` has been recorded. The latest HOLD in `BRIEF.md` explicitly postpones recording until Mohammad supplies the real PDF path. Once that path arrives, the requested recording is 30–60 seconds: open page, upload that PDF, edit, save, and open the result. The add-on permits one-off headless capture; the app remains plain HTML with CDN dependencies. FFmpeg and an existing Playwright installation were located, but capture was not started or verified before the hold.

## Screenshots

Primary editor screenshot: **`/Users/admin/wkp/proto-codex/pdf-html-editor/shots/editor-english.png`**

- `shots/editor-english.png` — edited English document.
- `shots/editor-arabic.png` — edited Arabic document.
- `shots/saved-english.png` — downloaded English PDF reopened through the file picker.
- `shots/saved-arabic.png` — downloaded Arabic PDF reopened through the file picker.

## Known limitations

1. **Visual replacement, not secure redaction.** The original text remains underneath white rectangles and can still be extracted or found. Reopening an edited PDF exposes both old and new text runs, which may overlap in the editor.
2. **Not every PDF is editable.** Scans and outlined text need OCR, which is not included. Password-protected PDFs are unsupported. Rotated/skewed text and rotated pages are view-only. The prototype limits uploads to 40 MB and renders every page, so long documents can consume substantial memory.
3. **Approximate typography.** Replacements use Noto Sans or Noto Sans Arabic in a dark color, rather than the exact original font/style/color. White masks may cover neighboring graphics or look wrong on colored backgrounds. Longer replacements shrink; there is no paragraph reflow or multiline insertion.
4. **Arabic extraction can differ from rendering.** Pure Arabic was visually verified. PDF ligatures can produce imperfect extracted character order (observed in the sample heading); mixed Arabic/Latin runs and complex diacritics are not comprehensively handled or verified.
5. **Session-only edits and CDN dependencies.** Opening another file/sample or refreshing discards unsaved edits. CDN access is required; third-party scripts execute in the page. The app has no upload endpoint, persistence, or offline dependency bundle. Modern Chrome was checked; other browsers were not.

## Evidence and implementation references

Preflight: `evidence/preflight.json` and `evidence/preflight-report.json` — READY for local implementation and browser verification. Task scope: `evidence/task.md`.

The implementation follows the [PDF.js text-content API](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html) and [pdf-lib custom-font embedding API](https://pdf-lib.js.org/). Library versions are pinned in `index.html`: PDF.js 3.11.174, pdf-lib 1.17.1, and fontkit 1.1.1. Noto fonts are loaded from the notofonts CDN repository.

A local Git repository is initialized and the prototype, report, samples and screenshots are committed. There is no remote or deployment.
