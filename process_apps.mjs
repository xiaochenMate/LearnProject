import fs from 'fs';
import path from 'path';

const files = fs.readdirSync('components').filter(f => f.endsWith('App.tsx') || f === 'Earth3D.tsx');

for (const file of files) {
  let p = path.join('components', file);
  let code = fs.readFileSync(p, 'utf-8');
  
  // 1. Remove the header
  // Note: this uses a naive regex. It assumes <header> ... </header> doesn't contain nested <header>.
  code = code.replace(/<header[\s\S]*?<\/header>/g, '');
  
  // 2. Change `fixed inset-0` to `w-full h-full relative`
  code = code.replace(/fixed inset-0(?: z-\[?\d+\]?)?/g, 'w-full h-full relative');
  code = code.replace(/fixed inset-0(?: z-\d+)?/g, 'w-full h-full relative');
  
  // 3. Remove custom bg colors from the outermost div
  // This is tricky, let's just strip known bad ones
  const badBgs = [
    'bg-[#0a0a0a]', 'bg-slate-900', 'bg-slate-950', 'bg-[#020617]', 'bg-[#1a1c18]', 
    'bg-[#d6ccbc]', 'bg-[radial-gradient(#4b4b4b_1px,transparent_1px)]', 'bg-[#051a1a]', 
    'bg-[#0A0C10]', 'bg-[#2c3e50]', 'bg-[#f8fafc]', 'bg-[#c0392b]', 'bg-[#FDFBF7]',
    'bg-[#0F172A]', 'bg-[#1A1A1A]', 'bg-[#B22222]', 'bg-morandi-oatmeal'
  ];
  for (const bg of badBgs) {
      // replace bg-xxx that are on the outermost div? Or everywhere?
      // Just replacing everywhere might break some things.
      // Let's replace ONLY in className="..."
  }

  // Actually, replacing `bg-xxx` can break things like the chess board.
  // We can just rely on AppContainer and remove the `bg-xxx` from the first `<div className="...` manually via regex.
  
  // Find the first `<div className="` after `return (`
  const returnMatch = code.match(/return\s*\(\s*<div\s+className="([^"]+)"/);
  if (returnMatch) {
      let classNames = returnMatch[1];
      // remove all bg-* from the root div
      classNames = classNames.replace(/bg-\[[^\]]+\]/g, '');
      classNames = classNames.replace(/bg-[a-zA-Z0-9-]+/g, '');
      classNames = classNames.replace(/text-[a-zA-Z0-9-]+/g, '');
      // add unified background transparent
      classNames = classNames + " bg-transparent text-inherit";
      code = code.replace(returnMatch[0], `return (\n    <div className="${classNames}"`);
  }
  
  fs.writeFileSync(p, code);
  console.log('Processed', file);
}
