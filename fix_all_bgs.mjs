import fs from 'fs';
import path from 'path';

const files = fs.readdirSync('components').filter(f => f.endsWith('App.tsx') || f === 'Earth3D.tsx');

for (const file of files) {
  if (file === 'GoApp.tsx') continue;
  let p = path.join('components', file);
  let code = fs.readFileSync(p, 'utf-8');

  // count occurrences of text-white
  const whiteCount = (code.match(/text-white/g) || []).length;
  
  if (whiteCount > 3) {
      // It probably needs a dark background
      code = code.replace(/className="([^"]*w-full h-full relative[^"]*)"/, (match, cls) => {
          if (!cls.includes('bg-')) {
             return `className="${cls} bg-slate-950 text-white"`;
          }
          return match;
      });
      // also remove bg-transparent text-inherit
      code = code.replace(/bg-transparent text-inherit/g, '');
  } else {
      code = code.replace(/bg-transparent text-inherit/g, 'bg-white text-slate-900');
  }

  fs.writeFileSync(p, code);
}
console.log('Fixed backgrounds');
