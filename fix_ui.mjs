import fs from 'fs';

let code = fs.readFileSync('components/GoApp.tsx', 'utf-8');
code = code.replace(/className="w-full h-full relative  flex flex-col items-center overflow-hidden font-sans bg-transparent text-inherit"/, 
                    'className="w-full h-full relative bg-[#0A0C10] text-white flex flex-col items-center overflow-hidden font-sans"');
fs.writeFileSync('components/GoApp.tsx', code);
console.log("GoApp UI fixed");
