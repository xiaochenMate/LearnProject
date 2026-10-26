import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const target = resolve(fileURLToPath(new URL('..', import.meta.url)), 'public/images/pieces');
await mkdir(target, { recursive: true });
const wrap = (name, body, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="${name}"><defs>${defs}<filter id="shadow" x="-30%" y="-20%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity=".45"/></filter></defs>${body}</svg>`;
const glyphs = { king: ['帅', '将'], advisor: ['仕', '士'], elephant: ['相', '象'], horse: ['马', '馬'], rook: ['车', '車'], cannon: ['炮', '砲'], soldier: ['兵', '卒'] };
const marks = { king: 'M47 11h6m-3-3v6', advisor: 'M46 11l4-4 4 4-4 4z', elephant: 'M45 11h10m-5-4v8', horse: 'M45 14l3-6 7 3-5 4', rook: 'M45 14V8h3v3h4V8h3v6z', cannon: 'M44 11h12m-8-3v6m5-6v6', soldier: 'M46 10l4-3 4 3-4 5z' };
for (const [type, characters] of Object.entries(glyphs)) {
  for (const [index, side] of ['red', 'black'].entries()) {
    const accent = side === 'red' ? '#ff8f9b' : '#9ed8e7';
    const face = side === 'red' ? '#42212c' : '#1b2b33';
    const defs = `<radialGradient id="face" cx="35%" cy="23%" r="80%"><stop stop-color="${face}"/><stop offset="1" stop-color="#0e131a"/></radialGradient><linearGradient id="rim" x2=".8" y2="1"><stop stop-color="#a7b3bf"/><stop offset=".3" stop-color="#38444f"/><stop offset=".65" stop-color="#111922"/><stop offset="1" stop-color="#7c8998"/></linearGradient>`;
    const body = `<g filter="url(#shadow)"><circle cx="50" cy="52" r="44" fill="#080d12"/><circle cx="50" cy="49" r="43" fill="url(#rim)" stroke="#bac7d0" stroke-width=".6"/><circle cx="50" cy="49" r="38.5" fill="url(#face)" stroke="${accent}" stroke-width="1.3"/><circle cx="50" cy="49" r="33" fill="none" stroke="${accent}" stroke-opacity=".32" stroke-width=".65"/><path d="M18 41A33 33 0 0 1 44 16" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1.4"/><path d="${marks[type]}" fill="none" stroke="${accent}" stroke-width="1.5" stroke-linejoin="round"/><text x="50" y="66" text-anchor="middle" font-family="Songti SC,STSong,Noto Serif CJK SC,serif" font-size="42" font-weight="700" fill="${accent}" stroke="${accent}" stroke-width=".25">${characters[index]}</text><path d="M45 82h10" stroke="${accent}" stroke-width="1.5" stroke-linecap="round"/></g>`;
    await writeFile(resolve(target, `xiangqi-${side}-${type}.svg`), wrap(`${side === 'red' ? '红' : '黑'}${characters[index]}`, body, defs));
  }
}
const paths = {
  p: '<circle cx="50" cy="25" r="11"/><path d="M40 39h20l-3 9 6 18H37l6-18z"/><path d="M34 69h32l5 11H29z"/>',
  r: '<path d="M29 16h9v10h8V16h8v10h8V16h9v24H29zM35 42h30l-4 24H39zM33 69h34l5 11H28z"/><path d="M37 34h26" fill="none"/>',
  n: '<path d="M32 65c1-15 15-19 21-29l-12 6-10-5 3-12 12-9 2-8 10 7c16 4 19 24 10 49z"/><path d="M32 68h37l5 12H26z"/><path d="M39 29l8-4M58 23c10 14 9 27 2 36" fill="none"/><circle cx="49" cy="24" r="1.7" fill="currentColor" stroke="none"/>',
  b: '<path d="M50 10c-7 9-17 15-17 25 0 8 7 13 17 13s17-5 17-13c0-10-10-16-17-25zM43 49h14l5 16H38zM33 69h34l5 11H28z"/><path d="M51 16l8 14" fill="none" stroke="currentColor" stroke-width="3"/>',
  q: '<path d="M27 25l12 14 3-18 8 17 8-17 3 18 12-14-7 28H34zM38 55h24l3 11H35zM31 69h38l5 11H26z"/><circle cx="26" cy="21" r="4"/><circle cx="42" cy="17" r="4"/><circle cx="58" cy="17" r="4"/><circle cx="74" cy="21" r="4"/>',
  k: '<path d="M46 7h8v8h8v7h-8v9h-8v-9h-8v-7h8zM34 34c0-6 32-6 32 0l-7 20H41zM40 57h20l5 9H35zM31 69h38l5 11H26z"/><path d="M37 40h26" fill="none"/>',
};
const names = { p: '兵', n: '马', b: '象', r: '车', q: '后', k: '王' };
for (const side of ['w', 'b']) {
  const light = side === 'w';
  const defs = `<linearGradient id="body" x2=".9" y2="1"><stop stop-color="${light ? '#ffffff' : '#6c8793'}"/><stop offset=".4" stop-color="${light ? '#d4e1e7' : '#263d49'}"/><stop offset=".75" stop-color="${light ? '#90a8b5' : '#111a23'}"/><stop offset="1" stop-color="${light ? '#e9f5f8' : '#344f5b'}"/></linearGradient>`;
  for (const [type, path] of Object.entries(paths)) {
    const body = `<ellipse cx="50" cy="85" rx="28" ry="5" fill="#000" opacity=".25"/><g fill="url(#body)" stroke="${light ? '#4e6674' : '#9ec8d4'}" color="${light ? '#334d5d' : '#bddeea'}" stroke-width="1.5" stroke-linejoin="round" filter="url(#shadow)">${path}<path d="M33 76h34" stroke="${light ? '#fff' : '#8fc9c6'}" stroke-opacity=".65" stroke-width="1" fill="none"/></g>`;
    await writeFile(resolve(target, `chess-${side}-${type}.svg`), wrap(`${light ? '白' : '黑'}${names[type]}`, body, defs));
  }
}
await writeFile(resolve(target, 'CREDITS.md'), '# ExBeam Board Pieces\n\nOriginal code-native vector artwork created for ExBeam.\n14 individually engraved Xiangqi pieces and 12 sculpted international chess pieces.\nRegenerate with `node scripts/build-board-art.mjs`. All assets are bundled locally.\n');
console.log('Generated 26 original ExBeam piece assets.');
