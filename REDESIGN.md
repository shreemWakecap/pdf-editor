# REDESIGN (from Mohammad, 2026-10-19 14:07) — top priority, overrides earlier UI choices

Mohammad wants a full design revamp, MANY more controls, and much better UX. "Don't be lazy."
Still plain HTML + JavaScript (CDN libs OK: pdf.js, pdf-lib, fontkit, icons/fonts). No framework, no npm, no build step.

## Real test file
samples/real-contract-ar.pdf: a 3-page Arabic employment contract (RTL, ReportLab-generated, A4). Its text extracts
as Arabic presentation forms, so normalize (NFKC) for editing and make sure saved Arabic is shaped and RTL correctly.
This is THE file for testing and the demo.

## Design
- Modern, polished, app-like editor: top toolbar, left page-thumbnail sidebar, center canvas, right properties panel.
- Light/dark theme, clean typography, icons on every button with tooltips, smooth states, empty state with drag-drop.
- UI available in Arabic and English (toggle), RTL-aware layout.

## Controls (implement as many as solidly work)
- File: open/drag-drop, Save as PDF (filename control), Download, Print, Reset to original, recent edits indicator.
- View: zoom in/out/fit width/fit page, page navigation and jump-to-page, thumbnails, single/continuous scroll.
- Edit text: click to edit in place, multi-select, font family (incl. Arabic fonts like Noto Naskh/Noto Sans Arabic/Cairo),
  size, bold/italic/underline, color, highlight, alignment, direction RTL/LTR, letter/line spacing.
- Add: new text box, shapes (rect/ellipse/line/arrow), freehand draw/pen, highlighter, image/signature upload,
  draw-a-signature pad, sticky note/comment, date stamp, whiteout/eraser rectangle.
- Objects: select, move (drag), resize, rotate, delete, duplicate, layer order, opacity, lock.
- Pages: add blank page, delete, duplicate, rotate, reorder by dragging thumbnails.
- Find & replace across the document (Arabic-aware).
- Undo/redo with full history, keyboard shortcuts (Ctrl+Z/Y, Del, Ctrl+D, arrows to nudge, Ctrl+S, Ctrl+F), shortcuts help dialog.
- Autosave draft to localStorage and restore prompt.
- Save output must faithfully include ALL of the above in the new PDF (original vectors kept where untouched).

## Verify
Test on samples/real-contract-ar.pdf: edit Arabic text, add text box, signature, shape, highlight, delete/reorder a page,
save, then check the output (pdftotext + render pages to PNG and look at them). Fix anything broken. Update REPORT.md.

## Demo video (now unblocked)
After it all works, record demo.mp4 (60-120s) on the real contract showing the new design and the main controls,
ending with opening the saved PDF to show the edits. Save as demo.mp4 in this folder. Commit everything.

## ADD-ON: round-trip rebuild test (Mohammad, 14:23) — required
Add an automated test (plain Node script, e.g. tests/roundtrip.test.mjs, runnable with one command; a headless browser
driver is fine for the test only, the app stays plain HTML+JS) that, on samples/real-contract-ar.pdf:
1. loads the PDF in the editor, applies edits/changes (edit Arabic text, find&replace, add text box, shape, highlight,
   signature image, whiteout, rotate a page, delete/reorder a page),
2. saves the new PDF, then REBUILDS: re-opens the saved PDF in the editor, edits again, saves again,
3. asserts each time: page count/order/rotation correct, pdftotext contains the new text and not the replaced text,
   Arabic is correct after NFKC normalization, untouched pages still match the original (pixel diff on rendered PNG within tolerance),
   added objects present at the right place (pixel check), file opens without errors.
Save outputs + rendered PNGs under evidence/roundtrip/, print a clear PASS/FAIL summary, put the command and results in REPORT.md.
Must pass before recording demo.mp4.
