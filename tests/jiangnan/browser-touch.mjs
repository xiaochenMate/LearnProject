async(page)=>{
  const context=await page.context().browser().newContext({hasTouch:true,viewport:{width:1024,height:768},deviceScaleFactor:1});
  const p=await context.newPage();
  const frames=async n=>p.evaluate(n=>new Promise(resolve=>{let f=0;const tick=()=>++f>=n?resolve():requestAnimationFrame(tick);requestAnimationFrame(tick);}),n);
  try{
    await p.goto('http://127.0.0.1:8888/games/jiangnan/index.html?test=1');await p.waitForFunction(()=>window.jiangnan?.state().ready);await p.locator('#quality').selectOption('low');await p.locator('#sound').uncheck();await p.locator('#start').click();
    await p.evaluate(()=>{jiangnan.test.place(-68,-36);jiangnan.test.clearEnemies();});await frames(40);
    const before=await p.evaluate(()=>jiangnan.state());
    const selectors=['#move-stick','#aim-stick','#fire'],boxes=await Promise.all(selectors.map(s=>p.locator(s).boundingBox()));
    const points=boxes.map((b,i)=>({id:i+1,x:b.x+b.width/2+(i===0?30:0),y:b.y+b.height/2+(i===0?17:i===1?-20:0)}));
    const cdp=await context.newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});await frames(90);
    const held=await p.evaluate(()=>jiangnan.state()),distance=Math.hypot(held.player.x-before.player.x,held.player.z-before.player.z);
    if(distance<1||held.shots<1||Math.abs(held.controls.aim.y)<.1)throw Error(`Three-finger motion failed: ${distance}`);
    await p.keyboard.press('p');await frames(10);const paused=await p.evaluate(()=>jiangnan.state());
    if(!paused.paused||paused.controls.fire||paused.controls.move.x||paused.controls.aim.y)throw Error('Pause did not release captured fingers');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await p.locator('#start').click();await frames(5);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});await frames(10);
    const reacquired=await p.evaluate(()=>jiangnan.state().controls);
    if(reacquired.move.x===0||reacquired.aim.y===0||!reacquired.fire)throw Error('Sticks or fire could not reacquire after pause');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await frames(10);const released=await p.evaluate(()=>jiangnan.state().controls);
    if(released.fire||released.move.x||released.aim.y)throw Error('Touch release remained latched');
    await p.screenshot({path:'output/playwright/jiangnan-touch-motion.png'});
    return {threeFingerDistance:distance,before:before.player,after:held.player,shots:held.shots,held:held.controls,paused:paused.controls,released,reacquired,screenshot:'output/playwright/jiangnan-touch-motion.png'};
  }finally{await context.close();}
}
