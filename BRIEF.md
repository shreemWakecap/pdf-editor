# Brief: PDF to editable HTML editor (prototype, from Mohammad via POC agent)

Build a simple website in this folder: the user uploads any PDF, it's converted to editable HTML in the
browser (edit text right on the page, multi-page), and a Save button downloads a new PDF with the edits.

Suggested approach: pdf.js renders pages with positioned contenteditable text spans; on save use pdf-lib on
the original PDF to white-out edited text and redraw the new text in place (embed Noto Sans + Noto Sans Arabic
via fontkit so Arabic works, RTL shaping), keeping untouched content as original vectors.

Test end to end with Playwright: upload, edit a word, save, check the saved PDF with pdftotext and a rendered
page image. Use an English multi-page sample and an Arabic sample (generate them yourself). Run it locally
and leave the dev server running. Do NOT deploy anywhere. git init and commit.

When done write REPORT.md with: local run command and URL, test results, known limitations, and the path of
a screenshot of the editor (save under shots/).

## UPDATE (overrides above): keep it simple
Plain HTML and JavaScript only: a single index.html (plus maybe one .js file), libraries from CDN (pdf.js, pdf-lib, fontkit),
no framework, no build step, no npm. Skip the Playwright test suite; just a quick manual check that upload, edit and save work
(e.g. serve with `python3 -m http.server`). Still no deploy. Remove any npm/framework scaffolding already created.

## ADD-ON: demo video
When it works, record a short (30-60 s) screen recording of the full flow: open the page, upload a sample PDF,
edit some text, click Save, then open the new PDF to show the edit. Save as demo.mp4 in this folder
(a headless browser recording, e.g. Playwright recordVideo via npx, converted with ffmpeg, is fine for this
one-off; it's not part of the app). Put the path in REPORT.md. If recording isn't possible, say so in REPORT.md.

## HOLD on demo video
Do NOT record demo.mp4 yet. Mohammad will provide a real PDF to demo with; wait for its path. Keep building the editor.
