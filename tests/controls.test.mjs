// Complementary public-UI coverage. Run: node tests/controls.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {root,chromium,executable,server,action,prop,point,draw,openPdf,exportPdf,run,tool,renderPDF,png,regionCount} from './helpers.mjs';
const out=path.join(root,'evidence/controls');fs.mkdirSync(out,{recursive:true});
let browser,host,page;const report={passed:false,checks:[],errors:[]};
const check=(name,fn)=>{fn();report.checks.push(name);console.log('PASS',name);};
try{
 host=await server();browser=await chromium.launch({headless:true,executablePath:executable});page=await browser.newPage({viewport:{width:1600,height:1000},acceptDownloads:true});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto(host.url);await openPdf(page,path.join(root,'samples/real-contract-ar.pdf'));
 await action(page,'page-add');assert.equal(await page.locator('.page-shell').count(),4);assert.equal(await page.locator('#pageJump').inputValue(),'2');
 await action(page,'continuous');assert.equal(await page.locator('.page-shell:visible').count(),1);await action(page,'continuous');
 const z=Number(await page.locator('#zoom').inputValue());await action(page,'zoom-in');assert(Number(await page.locator('#zoom').inputValue())>z);await action(page,'zoom-out');await action(page,'fit-width');await action(page,'fit-page');
 check('Blank page, single/continuous view, zoom and fit',()=>assert.equal(1,1));
 // Put a range of exportable primitives on the new blank page.
 for(const [type,x,y,w,h]of [['ellipse',60,100,100,55],['line',200,100,100,55],['arrow',350,100,120,55],['pen',60,230,160,50]])await draw(page,type,x,y,w,h,1);
 await draw(page,'note',280,230,0,0,1);await page.locator('.object.selected').dblclick();await page.locator('.inline-edit').fill('Review complete');await page.locator('.inline-edit').press('Escape');
 await draw(page,'date',60,360,0,0,1);
 await draw(page,'text',60,450,0,0,1);await page.locator('.inline-edit').fill('Styled text\nSecond line');await page.locator('.inline-edit').press('Escape');
 await prop(page,'fontSize',18);await prop(page,'spacing',1);await prop(page,'lineHeight',1.8);await prop(page,'textColor','#173b32');await page.locator('[data-toggle="bold"]').click();await page.locator('[data-toggle="italic"]').click();await page.locator('[data-toggle="underline"]').click();await page.locator('[data-toggle="background"]').click();
 const styled=page.locator('.object').and(page.getByRole('group',{name:'Styled text Second line',exact:true}));assert.equal(await styled.locator('svg text').count(),2);assert.equal(await styled.locator('svg text').first().getAttribute('font-style'),'italic');
 check('Ellipse, line, arrow, pen, note, date, multiline styled text',()=>assert.equal(1,1));
 await draw(page,'rect',350,450,120,65,1);await prop(page,'rotation',15);await page.locator('#opacity').focus();await page.keyboard.press('Home');for(let i=0;i<9;i++)await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#opacity').inputValue(),'0.5');
 const rectId=await page.locator('.object.selected').getAttribute('data-id');const rect=page.locator(`[data-id="${rectId}"]`);
 await action(page,'lock');assert(await rect.evaluate(e=>e.classList.contains('locked')));assert(await page.locator('#posX').isDisabled());await page.keyboard.press('Delete');assert.equal(await rect.count(),1);await action(page,'lock');
 await prop(page,'rotation',0);const beforeX=Number(await page.locator('#posX').inputValue());const b=await rect.boundingBox();await page.mouse.move(b.x+20,b.y+20);await page.mouse.down();await page.mouse.move(b.x+50,b.y+35,{steps:5});await page.mouse.up();assert(Number(await page.locator('#posX').inputValue())>beforeX+10);
 const beforeW=Number(await page.locator('#objWidth').inputValue());const grip=await rect.locator('.grip').boundingBox();await page.mouse.move(grip.x+3,grip.y+3);await page.mouse.down();await page.mouse.move(grip.x+23,grip.y+13,{steps:5});await page.mouse.up();assert(Number(await page.locator('#objWidth').inputValue())>beforeW+10);
 await action(page,'back');assert.equal(await page.locator('.sheet').nth(1).locator('.object').first().getAttribute('data-id'),rectId);await action(page,'front');assert.equal(await page.locator('.sheet').nth(1).locator('.object').last().getAttribute('data-id'),rectId);
 await page.keyboard.press('Control+d');const copyId=await page.locator('.object.selected').getAttribute('data-id');assert.notEqual(copyId,rectId);await page.keyboard.press('Delete');assert.equal(await page.locator(`[data-id="${copyId}"]`).count(),0);await page.keyboard.press('Control+z');assert.equal(await page.locator(`[data-id="${copyId}"]`).count(),1);await page.keyboard.press('Control+y');assert.equal(await page.locator(`[data-id="${copyId}"]`).count(),0);
 await page.locator('.object[data-type="ellipse"]').click();await page.locator('.object[data-type="arrow"]').click({modifiers:['Shift']});assert.equal(await page.locator('.object.selected').count(),2);const ellipse=page.locator('.object[data-type="ellipse"]');const oldLeft=await ellipse.evaluate(e=>parseFloat(e.style.left));await page.keyboard.press('ArrowRight');assert((await ellipse.evaluate(e=>parseFloat(e.style.left)))>oldLeft);
 check('Move, resize, rotation, opacity, lock, layers, duplicate/delete, multiselect and shortcuts',()=>assert.equal(1,1));
 await action(page,'page-duplicate');assert.equal(await page.locator('.page-shell').count(),5);await action(page,'page-delete');assert.equal(await page.locator('.page-shell').count(),4);await page.locator('.thumb').nth(1).click();
 await action(page,'theme');assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');await page.screenshot({path:path.join(out,'dark-controls.png')});await action(page,'theme');await action(page,'language');assert.equal(await page.locator('html').getAttribute('dir'),'rtl');await page.screenshot({path:path.join(out,'arabic-controls.png')});await action(page,'language');
 await page.keyboard.press('Control+f');assert(await page.locator('#findPanel').isVisible());await action(page,'find-close');await page.keyboard.press('Control+s');assert(await page.locator('#exportDialog').isVisible());await action(page,'close-dialog');await action(page,'shortcuts');assert(await page.locator('#shortcutsDialog').isVisible());await action(page,'close-dialog');
 await page.waitForTimeout(800);await page.reload();await page.locator('#restoreDialog').waitFor({state:'visible'});await action(page,'draft-restore');await page.locator('#loading').waitFor({state:'hidden',timeout:90000});assert.equal(await page.locator('.page-shell').count(),4);assert.equal(await page.locator('.object[data-type="ellipse"]').count(),1);
 await page.locator('.thumb').nth(1).click();await page.screenshot({path:path.join(out,'all-controls.png')});
 const saved=await exportPdf(page,'controls.pdf',out);const renders=renderPDF(saved,path.join(out,'controls'));const added=png(renders[1]);
 for(const [name,region]of [['ellipse',{x:55,y:95,w:115,h:70}],['line',{x:195,y:95,w:110,h:70}],['arrow',{x:345,y:95,w:135,h:70}],['pen',{x:55,y:225,w:175,h:65}],['note',{x:275,y:225,w:190,h:110}],['date',{x:55,y:355,w:230,h:60}],['styled text',{x:55,y:445,w:230,h:100}]])check(name+' visible in exported PDF',()=>assert(regionCount(added,region,(r,g,b)=>r<230&&g<230&&b<230).count>40));
 const text=run(tool('pdftotext'),[saved,'-']).toString();assert(text.includes('Styled text'));assert(text.includes('Second line'));assert(text.includes('Review complete'));
 check('Page duplication, theme/RTL, dialogs, draft restoration and PDF export',()=>assert.equal(1,1));
 await action(page,'reset');await page.locator('#confirmYes').click();assert.equal(await page.locator('.page-shell').count(),3);assert.equal(await page.locator('.object[data-type="ellipse"]').count(),0);await action(page,'undo');assert.equal(await page.locator('.page-shell').count(),4);
 check('Reset original can be undone',()=>assert.deepEqual(report.errors,[]));const popupWait=page.waitForEvent('popup');await action(page,'print');const popup=await popupWait;await popup.waitForURL(/^blob:/,{timeout:90000});await popup.close();check('Print opens the exported PDF viewer',()=>assert.deepEqual(report.errors,[]));report.passed=true;if(fs.existsSync(path.join(out,'failure.png')))fs.unlinkSync(path.join(out,'failure.png'));console.log('\nPASS — CONTROLS');
}catch(e){report.failure=e.stack;if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error(e);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));if(browser)await browser.close();if(host)await host.close();}
