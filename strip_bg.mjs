import fs from 'fs';
import path from 'path';

const files = fs.readdirSync('components').filter(f => f.endsWith('App.tsx') || f === 'Earth3D.tsx');

for (const file of files) {
  let p = path.join('components', file);
  let code = fs.readFileSync(p, 'utf-8');

  // Any className containing "w-full h-full relative" might have bg-[#xxx]
  // We will replace it safely using a replacer function
  code = code.replace(/className="([^"]*w-full h-full relative[^"]*)"/g, (match, classNames) => {
      let clean = classNames;
      // remove bg-[...] unless it's a known board color, wait, board colors wouldn't be on the outermost container which has `w-full h-full relative`!
      clean = clean.replace(/bg-\[[^\]]+\]/g, '');
      clean = clean.replace(/bg-slate-[0-9]+/g, '');
      clean = clean.replace(/bg-gray-[0-9]+/g, '');
      clean = clean.replace(/bg-neutral-[0-9]+/g, '');
      clean = clean.replace(/bg-[#0-9a-fA-F]+/g, '');
      return `className="${clean.trim()} bg-transparent text-inherit"`;
  });
  
  fs.writeFileSync(p, code);
  console.log('Stripped', file);
}
