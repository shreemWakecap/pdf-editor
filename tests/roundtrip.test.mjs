// Run: node tests/roundtrip.test.mjs
// Test-only browser driver + Poppler + FFmpeg; the app remains plain HTML/JS.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {root,chromium,executable,server,action,prop,editText,point,draw,openPdf,exportPdf,run,tool,normalize,renderPDF,png,regionCount,imageDiff,signatureFixture} from './helpers.mjs';
const out=path.join(root,'evidence/roundtrip');fs.mkdirSync(out,{recursive:true});
const report={passed:false,checks:[],errors:[],started:new Date().toISOString(),tolerances:{untouchedPageMAE:2,untouchedChangedFraction:.04,pixelAlignment:1}};
let browser,host,page;
const check=(label,fn)=>{fn();report.checks.push({label,pass:true});console.log('PASS',label);};
try{
 for(const name of ['pdftotext','pdftoppm','pdfinfo'])run(tool(name),['-v']);run('ffmpeg',['-version']);
 host=await server();browser=await chromium.launch({headless:true,executablePath:executable});const context=await browser.newContext({viewport:{width:1600,height:1000},acceptDownloads:true});page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text()+' '+m.location().url);});
 await page.goto(host.url);await openPdf(page,path.join(root,'samples/real-contract-ar.pdf'));
 const count=await page.locator('.page-shell').count();check('Original has 3 pages',()=>assert.equal(count,3));
 const originalLabels=await page.locator('.object').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')));
 check('Arabic normalized after bidi; ligature order intact',()=>{assert(originalLabels.includes('عقد عمل'));assert(originalLabels.some(s=>s.includes('يعمل الطرف الثاني')));assert(!originalLabels.some(s=>/[\ufb50-\ufdff\ufe70-\ufeff\u0000]/u.test(s)));});
 await editText(page,'عقد عمل','اتفاق وظيفي');await prop(page,'fontFamily','NotoArabic');await prop(page,'objWidth',190);await prop(page,'posX',202);await prop(page,'align','center');await prop(page,'fontSize',18);await page.locator('[data-toggle="bold"]').click();
 await action(page,'find');await page.locator('#findInput').fill('البند الرابع');await page.locator('#replaceInput').fill('المادة الرابعة');await action(page,'replace-all');await action(page,'find-close');
 await draw(page,'text',60,785);await page.locator('.inline-edit').fill('نسخة للمراجعة');await page.locator('.inline-edit').press('Escape');await prop(page,'fontFamily','NotoArabic');await prop(page,'direction','rtl');await prop(page,'align','right');await prop(page,'fontSize',14);
 await draw(page,'rect',340,777,190,40);await page.locator('#noFill').check();await prop(page,'strokeWidth',2);
 await draw(page,'highlight',310,160,210,16);
 const fixture=path.join(out,'synthetic-signature.png');signatureFixture(fixture);await page.locator('#imageInput').setInputFiles(fixture);await page.waitForFunction(()=>document.getElementById('toolHint').textContent.includes('place'));const sig=await point(page,350,783);await page.mouse.click(sig.x,sig.y);await prop(page,'objWidth',160);await prop(page,'objHeight',30);
 // Cover an actual source label, not an already-blank patch.
 const sourceLabel=page.locator('.object[aria-label="طرف أول"]').first();const bb=await sourceLabel.boundingBox(),sheetBB=await page.locator('.sheet').first().boundingBox();const scale=sheetBB.width/595.276;const whiteout={x:(bb.x-sheetBB.x)/scale-2,y:(bb.y-sheetBB.y)/scale-1,w:bb.width/scale+4,h:bb.height/scale+2};
 await draw(page,'whiteout',whiteout.x,whiteout.y,whiteout.w,whiteout.h);
 await page.screenshot({path:path.join(out,'editor-first-edits.png')});
 // Delete original page 3; reorder via an actual thumbnail drag; rotate untouched original page 2.
 await page.locator('.thumb').nth(2).click();await action(page,'page-delete');
 await page.locator('.thumb').nth(0).dragTo(page.locator('.thumb').nth(1));
 await page.locator('.thumb').nth(0).click();await action(page,'page-rotate');
 const firstLabels=await page.locator('.sheet').first().locator('.object').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')).join(' '));
 check('UI page delete and drag reorder',()=>assert(firstLabels.includes('البند الخامس')));
 const first=await exportPdf(page,'roundtrip-first.pdf',out);
 const originalRenders=renderPDF(path.join(root,'samples/real-contract-ar.pdf'),path.join(out,'original'));
 // Render a rotation-only reference PDF: rotating an already rasterized A4 bitmap
 // introduces a fractional-pixel translation because the page is 595.276 pt wide.
 // This independent copy never passes through the editor's rebuild/redaction path.
 const referenceBytes=await page.evaluate(async()=>{const source=await fetch('/samples/real-contract-ar.pdf').then(r=>r.arrayBuffer());const doc=await PDFLib.PDFDocument.load(source);doc.getPage(1).setRotation(PDFLib.degrees(90));return Array.from(await doc.save());});
 const referenceFile=path.join(out,'reference-rotation-only.pdf');fs.writeFileSync(referenceFile,Buffer.from(referenceBytes));
 const referenceRenders=renderPDF(referenceFile,path.join(out,'reference'));
 const originalUnchanged=png(referenceRenders[1]);
 const originalChanged=png(originalRenders[0]);
 function verify(file,prefix,newTitle,newNote,oldTitle,oldNote){
  const info=run(tool('pdfinfo'),['-f','1','-l','2',file]).toString();fs.writeFileSync(path.join(out,prefix+'-info.txt'),info);
  check(prefix+': two pages and rotations 90°, 0°',()=>{assert.match(info,/Pages:\s+2/);assert.match(info,/Page\s+1 rot:\s+90/);assert.match(info,/Page\s+2 rot:\s+0/);});
  const textPath=path.join(out,prefix+'-text.txt');run(tool('pdftotext'),['-layout',file,textPath]);const raw=fs.readFileSync(textPath,'utf8'),parts=raw.split('\f').map(normalize),text=normalize(raw);
  check(prefix+': correct page order',()=>{assert(parts[0].includes('البند الخامس'));assert(!parts[0].includes(newTitle));assert(parts[1].includes(newTitle));});
  check(prefix+': new Arabic text, find/replace, no stale replacements',()=>{assert(text.includes(newTitle));assert(text.includes(newNote));assert(text.includes('المادة الرابعة'));assert(!text.includes(oldTitle));assert(!text.includes('البند الرابع'));assert(!text.includes('طرف أول'));if(oldNote)assert(!text.includes(oldNote));});
  const files=renderPDF(file,path.join(out,prefix));assert.equal(files.length,2);const untouched=png(files[0]),changed=png(files[1]);const diff=imageDiff(originalUnchanged,untouched);report.checks.push({label:prefix+': untouched original page 2 pixel diff',...diff});
  check(prefix+': untouched vectors render within tolerance',()=>{assert(diff.mae<=2,JSON.stringify(diff));assert(diff.changedFraction<=.04,JSON.stringify(diff));});
  const pixelChecks=[['rectangle border',{x:339,y:776,w:193,h:43},(r,g,b)=>g>r*1.25&&g>b*1.08&&r<100,220],['signature image',{x:350,y:783,w:160,h:30},(r,g,b)=>b>g*1.3&&b>r*1.5&&r<100,60],['yellow highlight',{x:310,y:160,w:210,h:16},(r,g,b)=>r>200&&g>180&&b<240&&r>b+15,500],['new Arabic text box',{x:60,y:785,w:220,h:40},(r,g,b)=>r<160&&g<180&&b<180,35]];
  for(const [name,rect,predicate,min]of pixelChecks){const result=regionCount(changed,rect,predicate);check(prefix+': '+name+' in expected region',()=>assert(result.count>=min,JSON.stringify(result)));}
  const interior={x:whiteout.x+2,y:whiteout.y+2,w:whiteout.w-4,h:whiteout.h-4};const before=regionCount(originalChanged,interior,(r,g,b)=>r<180&&g<180&&b<180),after=regionCount(changed,interior,(r,g,b)=>r<180&&g<180&&b<180);check(prefix+': whiteout removed visible source label',()=>{assert(before.count>10);assert.equal(after.count,0);});
  return {info,text,files,diff};
 }
 verify(first,'first','اتفاق وظيفي','نسخة للمراجعة','عقد عمل');
 // REBUILD from actual saved bytes using the public file input, not the earlier in-memory model.
 await openPdf(page,first);const rebuiltLabels=await page.locator('.object').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')));
 check('Rebuilt saved PDF opens with correct Arabic and no ghost text',()=>{assert(rebuiltLabels.includes('اتفاق وظيفي'));assert(rebuiltLabels.includes('نسخة للمراجعة'));assert(!rebuiltLabels.includes('عقد عمل'));});
 await page.locator('.thumb').nth(1).click();await editText(page,'اتفاق وظيفي','اتفاق معتمد');await prop(page,'objWidth',190);await prop(page,'posX',202);await prop(page,'align','center');
 await editText(page,'نسخة للمراجعة','نسخة نهائية');await prop(page,'fontFamily','NotoArabic');
 const second=await exportPdf(page,'roundtrip-second.pdf',out);
 verify(second,'second','اتفاق معتمد','نسخة نهائية','اتفاق وظيفي','نسخة للمراجعة');
 await openPdf(page,second);await page.locator('.thumb').nth(1).click();await page.screenshot({path:path.join(out,'editor-rebuilt-final.png')});
 check('Final PDF opens without page or console errors',()=>assert.deepEqual(report.errors,[]));
 report.passed=true;if(fs.existsSync(path.join(out,'failure.png')))fs.unlinkSync(path.join(out,'failure.png'));report.finished=new Date().toISOString();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(`\nPASS — ROUND-TRIP REBUILD (${report.checks.length} assertions/measurements)\nEvidence: ${out}`);
}catch(e){report.failure=e.stack;fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error('\nFAIL — ROUND-TRIP REBUILD\n'+e.stack);process.exitCode=1;}
finally{if(browser)await browser.close();if(host)await host.close();}
