(() => {
  let status = 'loading', detail = '正在准备水乡与战车';
  const send = () => {
    if (parent !== window) parent.postMessage({type:'jiangnan:status',protocol:1,status,detail}, location.origin);
  };
  const report = (next, message) => {
    status = next;
    detail = String(message).slice(0, 300);
    send();
    if (next !== 'error') return;
    window.jiangnan?.dispose?.();
    document.body.classList.add('boot-error');
    document.body.classList.remove('playing');
    document.getElementById('overlay-title').textContent = '战场暂未就绪';
    document.getElementById('overlay-desc').textContent = detail;
    document.getElementById('load-detail').textContent = '本机已保存的进度不会丢失。';
    const button = document.getElementById('start');
    button.disabled = false;
    button.textContent = '重新载入';
    button.onclick = () => location.reload();
  };
  window.JiangnanBridge = {report};
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== parent || parent === window) return;
    const data = event.data;
    if (!data || data.type !== 'jiangnan:command' || data.protocol !== 1
      || !['hello','suspend','dispose'].includes(data.command)) return;
    if (data.command === 'hello') send();
    else window.jiangnan?.[data.command]?.();
  });
  window.addEventListener('error', event => {
    const resource = event.target?.tagName === 'SCRIPT';
    if (resource || event.message) report('error', '战场资源中断，请重新载入。');
  }, true);
  window.addEventListener('unhandledrejection', () => report('error', '战场启动中断，请重新载入。'));
  window.addEventListener('pagehide', () => window.jiangnan?.dispose());
  send();
})();
