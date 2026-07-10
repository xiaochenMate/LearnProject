import fs from 'fs';

// GobangApp
try {
    let go = fs.readFileSync('components/GobangApp.tsx', 'utf-8');
    if (!go.includes('<ChevronLeft')) {
        go = go.replace(
            /<div className="w-full h-full relative[^>]+>/,
            match => match + `\n      <button onClick={onClose} className="absolute top-6 left-6 z-50 flex items-center justify-center p-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white/50 hover:text-white rounded-2xl transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6"/></svg></button>`
        );
        fs.writeFileSync('components/GobangApp.tsx', go);
    }
} catch (e) {}

// ChineseChessApp
try {
    let cc = fs.readFileSync('components/ChineseChessApp.tsx', 'utf-8');
    if (!cc.includes('<ChevronLeft')) {
        cc = cc.replace(
            /<div className="w-full h-full relative[^>]+>/,
            match => match + `\n      <button onClick={onClose} className="absolute top-6 left-6 z-50 flex items-center justify-center p-3 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-800 hover:text-slate-900 rounded-2xl transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>`
        );
        fs.writeFileSync('components/ChineseChessApp.tsx', cc);
    }
} catch (e) {}

// CharacterApp
try {
    let ch = fs.readFileSync('components/CharacterApp.tsx', 'utf-8');
    if (!ch.includes('onClick={onClose}')) {
        ch = ch.replace(
            /<div className="w-full h-full relative[^>]+>/,
            match => match + `\n      <button onClick={onClose} className="absolute top-6 left-6 z-50 flex items-center justify-center p-3 bg-black/5 hover:bg-black/10 text-slate-500 hover:text-slate-900 rounded-2xl transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>`
        );
        fs.writeFileSync('components/CharacterApp.tsx', ch);
    }
} catch (e) {}

console.log("Other apps fixed");
