import fs from 'fs';

let code = fs.readFileSync('components/GoApp.tsx', 'utf-8');
code = code.replace(/bg-\[#0A0C10\]/g, 'bg-zinc-950');
fs.writeFileSync('components/GoApp.tsx', code);
console.log("GoApp bg fixed to zinc-950");
