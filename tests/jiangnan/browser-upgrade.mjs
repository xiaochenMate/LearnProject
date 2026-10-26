async (page) => {
  const origin='http://127.0.0.1:8888';
  const report={checks:[],screenshots:[],environment:'Playwright Chromium, local assets; not an iPad hardware benchmark'};
  const assert=(value,message)=>{if(!value)throw Error(message);};
  const check=name=>report.checks.push(name);
  const frames=async(p,count=15)=>p.evaluate(count=>new Promise(resolve=>{let n=0;const next=()=>++n>=count?resolve():requestAnimationFrame(next);requestAnimationFrame(next);}),count);
  const boot=async(p=page)=>{await p.goto(`${origin}/games/jiangnan/index.html?test=1`);await p.waitForFunction(()=>window.jiangnan?.state().ready);await p.locator('#quality').selectOption('low');};
  const snapshot=async(p,name)=>{const path=`output/playwright/jiangnan-${name}.png`;await p.screenshot({path,animations:'disabled'});report.screenshots.push(path);};
  const noOverlap=async p=>p.evaluate(()=>{
    const ids=['mission','map-panel','abilities','touch-controls','radio'];
    const selectors=['#mission','#map-panel','#abilities','footer','header','#move-stick','#aim-stick','#fire'];
    const boxes=selectors.map(selector=>{const el=document.querySelector(selector),r=el.getBoundingClientRect(),s=getComputedStyle(el);return {selector,x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height,visible:r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&el.checkVisibility()};}).filter(b=>b.visible);
    const errors=[];
    for(let i=0;i<boxes.length;i++){const a=boxes[i];if(a.x<-.5||a.y<-.5||a.right>innerWidth+.5||a.bottom>innerHeight+.5)errors.push(`outside ${a.selector}`);for(let j=i+1;j<boxes.length;j++){const b=boxes[j];if(Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1)errors.push(`${a.selector} overlaps ${b.selector}`);}}
    return errors;
  });
  await page.setViewportSize({width:1440,height:900});
  await boot();await page.evaluate(()=>{jiangnan.dispose();localStorage.removeItem('jiangnan.checkpoint.v1');localStorage.removeItem('jiangnan.campaign.v2');});await boot();await page.locator('#sound').uncheck();await page.locator('#start').click();await frames(page,40);
  assert(await page.evaluate(()=>jiangnan.state().route>0),'Action route missing');
  assert((await noOverlap(page)).length===0,'Desktop HUD overlap');
  const pixel=await page.locator('#battle').evaluate(canvas=>new Promise(resolve=>requestAnimationFrame(()=>{
    const gl=canvas.getContext('webgl2'),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,rgba=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,rgba);
    let lit=0;const shades=new Set();for(let i=0;i<rgba.length;i+=64){if(rgba[i]+rgba[i+1]+rgba[i+2]>90)lit++;shades.add(`${rgba[i]>>3}:${rgba[i+1]>>3}:${rgba[i+2]>>3}`);}resolve({w,h,lit,shades:shades.size});
  })));
  assert(pixel.lit>500&&pixel.shades>30,'World canvas is blank');report.canvas=pixel;
  const beforeMove=await page.evaluate(()=>jiangnan.state().player);await page.keyboard.down('w');await frames(page,50);await page.keyboard.up('w');
  const afterMove=await page.evaluate(()=>jiangnan.state().player);assert(Math.hypot(beforeMove.x-afterMove.x,beforeMove.z-afterMove.z)>.5,'Keyboard driving did not move tank');check('real-world pixels, navigation route, keyboard driving');
  await page.evaluate(()=>{jiangnan.test.place(-64,-30);jiangnan.test.shootAt(0);jiangnan.test.advance(.5);});
  assert(await page.evaluate(()=>jiangnan.state().hits>0&&jiangnan.state().enemies[0].hp<52),'Real projectile failed');
  await page.evaluate(()=>jiangnan.test.setHP(35));await page.keyboard.press('q');assert(await page.evaluate(()=>jiangnan.state().player.hp===77),'Repair failed');await page.keyboard.press('e');assert(await page.evaluate(()=>jiangnan.state().smokes===1),'Smoke failed');
  await frames(page,20);await snapshot(page,'desktop');check('projectile collision, damage, repair, smoke');
  await page.keyboard.press('p');const paused=await page.evaluate(()=>jiangnan.state());await frames(page,20);assert(await page.evaluate(time=>jiangnan.state().time===time,paused.time),'Pause advanced simulation');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('jiangnan.checkpoint.v1')));assert(saved.player.hp===77,'Checkpoint omitted health');
  await page.reload();await page.waitForFunction(()=>window.jiangnan?.state().ready);assert(await page.locator('#start').textContent()==='从检查点继续','Resume not offered');await page.locator('#start').click();
  const resumed=await page.evaluate(()=>jiangnan.state());assert(Math.abs(resumed.player.x-saved.player.x)<.1&&resumed.player.hp===saved.player.hp&&resumed.smokes===saved.smokes,'Checkpoint state not restored');check('pause freezes time; refresh restores position, health, inventory and enemies');
  await page.keyboard.press('m');assert(await page.locator('#atlas').isVisible(),'Map missing');const mapTime=await page.evaluate(()=>jiangnan.state().time);await frames(page,12);assert(await page.evaluate(time=>jiangnan.state().time===time,mapTime),'Map did not freeze combat');await page.keyboard.press('Escape');
  await page.evaluate(()=>jiangnan.test.setHP(1));await page.evaluate(()=>jiangnan.test.damagePlayer());assert(await page.evaluate(()=>jiangnan.state().ended&&!jiangnan.state().won),'Death not reported');await page.locator('#start').click();assert(await page.evaluate(()=>!jiangnan.state().ended&&jiangnan.state().player.hp===77),'Failure did not restore checkpoint');
  await page.keyboard.press('p');await page.locator('#restart').click();assert(await page.evaluate(()=>jiangnan.state().time<1&&jiangnan.state().player.hp===100&&jiangnan.state().shots===0),'Restart not clean');check('map pause, failure retry and clean chapter restart');
  const nav=await page.evaluate(()=>jiangnan.test.navigation());
  for(const chapter of [0,1,2]){await page.evaluate(i=>jiangnan.test.select(i),chapter);await page.evaluate(p=>{jiangnan.test.clearEnemies();jiangnan.test.place(p.x,p.z);jiangnan.test.advance(10);},nav[chapter].target);assert(await page.evaluate(()=>jiangnan.state().won),`Chapter ${chapter+1} incomplete`);}
  await page.evaluate(()=>{jiangnan.test.select(3);jiangnan.test.setConvoyHP(60);jiangnan.test.place(-68,28);});await page.keyboard.press('q');assert(await page.evaluate(()=>jiangnan.state().convoy.hp===102&&jiangnan.state().repairs===2),'Convoy repair failed');
  await page.evaluate(()=>{jiangnan.test.place(68,-36);jiangnan.test.advance(.2);});assert(await page.evaluate(()=>jiangnan.state().convoy.waiting),'Convoy failed to wait for escort');
  await page.evaluate(()=>{jiangnan.test.clearEnemies();jiangnan.test.convoyStep(30);});await page.keyboard.press('p');
  const convoySaved=await page.evaluate(()=>JSON.parse(localStorage.getItem('jiangnan.checkpoint.v1')));assert(convoySaved.convoy.hp===102,'Convoy checkpoint missing');
  await page.reload();await page.waitForFunction(()=>window.jiangnan?.state().ready);await page.locator('#start').click();assert(await page.evaluate(c=>Math.abs(jiangnan.state().convoy.x-c.x)<1&&jiangnan.state().convoy.hp===c.hp&&jiangnan.state().convoy.routeIndex===c.routeIndex,convoySaved.convoy),'Convoy resume failed');
  await page.evaluate(()=>jiangnan.test.convoyStep(160));assert(await page.evaluate(()=>jiangnan.state().won),'Escort path stalled');
  await page.evaluate(p=>{jiangnan.test.select(4);jiangnan.test.clearEnemies();jiangnan.test.place(p.x,p.z);jiangnan.test.advance(10);},nav[4].target);assert(await page.evaluate(()=>jiangnan.state().won),'Chapter five incomplete');
  await page.evaluate(()=>{jiangnan.test.select(5);jiangnan.test.place(-8,-78);jiangnan.test.advance(.1);jiangnan.test.clearEnemies();jiangnan.test.advance(20);jiangnan.test.clearEnemies();jiangnan.test.advance(25);});assert(await page.evaluate(()=>jiangnan.state().won),'Defence incomplete');
  assert(await page.locator('#result-stats').isVisible(),'Result statistics missing');assert(await page.evaluate(()=>localStorage.getItem('jiangnan.checkpoint.v1')===null),'Won checkpoint retained');await snapshot(page,'results');check('six chapters, convoy waiting and rescue, convoy checkpoint, real rules settlement');

  // A separate context exercises real three-pointer delivery without touching other sessions.
  await page.goto('about:blank');
  const touchContext=await page.context().browser().newContext({viewport:{width:1024,height:768},hasTouch:true,deviceScaleFactor:1});
  const touch=await touchContext.newPage();await boot(touch);await touch.locator('#start').click();await frames(touch,20);
  assert((await noOverlap(touch)).length===0,'Tablet HUD overlap');
  const boxes=await Promise.all(['#move-stick','#aim-stick','#fire'].map(s=>touch.locator(s).boundingBox()));
  const points=boxes.map((b,i)=>({id:i+1,x:b.x+b.width/2+(i===1?20:0),y:b.y+b.height/2-(i===0?25:0)}));
  const cdp=await touchContext.newCDPSession(touch);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});await frames(touch,30);
  const held=await touch.evaluate(()=>jiangnan.state());assert(held.shots>=1&&Math.hypot(held.controls.move.x,held.controls.move.y)>.1&&Math.hypot(held.controls.aim.x,held.controls.aim.y)>.1,'Simultaneous sticks and fire failed');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await frames(touch,8);assert(await touch.evaluate(()=>!jiangnan.state().controls.fire&&jiangnan.state().controls.move.y===0&&jiangnan.state().controls.aim.x===0),'Touch release latched');
  await snapshot(touch,'tablet');await touch.setViewportSize({width:390,height:844});await frames(touch,12);const portraitErrors=await noOverlap(touch);assert(!portraitErrors.length,portraitErrors.join(', '));await snapshot(touch,'portrait');
  await touch.setViewportSize({width:844,height:390});await frames(touch,12);const landscapeErrors=await noOverlap(touch);assert(!landscapeErrors.length,landscapeErrors.join(', '));await snapshot(touch,'landscape');
  await touch.setViewportSize({width:390,height:600});await frames(touch,12);const compactErrors=await noOverlap(touch);assert(!compactErrors.length,compactErrors.join(', '));await snapshot(touch,'compact');await touchContext.close();check('three-finger driving, aiming and fire; release; tablet/portrait/landscape/compact layout');

  const entry=`${origin}/games/jiangnan/index.html`,host=`${origin}/tests/jiangnan/embed.html`;
  await page.route(entry,route=>route.fulfill({status:404,body:'missing'}));await page.goto(host);await page.getByRole('button',{name:'重新进入'}).waitFor();assert(await page.locator('iframe').count()===0,'404 mounted iframe');await page.unroute(entry);check('iframe 404 preflight fails visibly');
  await page.route(entry,route=>route.fulfill({contentType:'text/html',body:'<meta name="jiangnan-build" content="campaign-3"><title>Not a ready game</title>'}));await page.getByRole('button',{name:'重新进入'}).click();await page.locator('iframe').waitFor();await frames(page,10);
  await page.evaluate(()=>{const frame=document.querySelector('iframe').contentWindow;for(const event of [{origin:location.origin,source:window,data:{type:'jiangnan:status',protocol:1,status:'ready',detail:'fake'}},{origin:'https://example.com',source:frame,data:{type:'jiangnan:status',protocol:1,status:'ready',detail:'fake'}},{origin:location.origin,source:frame,data:{type:'jiangnan:status',protocol:1,status:'ready',detail:9}}])window.dispatchEvent(new MessageEvent('message',event));});
  assert(await page.getByText('正在准备水乡与战车',{exact:true}).isVisible(),'onLoad or forged ready treated as success');await page.unroute(entry);check('onLoad alone and forged messages cannot claim ready');
  await page.route('**/assets/tank.glb',route=>route.fulfill({status:503,body:'unavailable'}));await page.goto(host);await page.getByRole('button',{name:'重新进入'}).waitFor();await page.unroute('**/assets/tank.glb');await page.getByRole('button',{name:'重新进入'}).click();
  let gameFrame;await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.jiangnan?.state().ready);gameFrame=page.frames().find(f=>f.url().includes('/games/jiangnan/'));await gameFrame.locator('#start').waitFor();check('model failure, parent error, retry and successful handshake');
  await gameFrame.evaluate(()=>document.querySelector('#battle').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await page.getByRole('button',{name:'重新进入'}).waitFor();await page.getByRole('button',{name:'重新进入'}).click();await page.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.jiangnan?.state().ready);gameFrame=page.frames().find(f=>f.url().includes('/games/jiangnan/'));check('WebGL context loss reports error and recovers through retry');
  await gameFrame.locator('#start').click();await gameFrame.evaluate(()=>{const dispose=jiangnan.dispose;jiangnan.dispose=()=>{localStorage.setItem('jiangnan.test.disposed','yes');dispose();};});await page.evaluate(()=>window.embed.remove());
  await page.waitForFunction(()=>localStorage.getItem('jiangnan.test.disposed')==='yes');assert(await page.locator('iframe').count()===0,'Unmount retained iframe');check('navigation unload calls disposal and removes frame');
  return report;
}
