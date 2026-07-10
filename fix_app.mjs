import fs from 'fs';

let code = fs.readFileSync('App.tsx', 'utf-8');

const target = `  if (runningAppId) return renderApp();`;
const replacement = `  if (runningAppId) {
    const item = allModules.find(m => m.id === runningAppId);
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#FAFAFA] dark:bg-[#000000] text-gray-900 dark:text-gray-100 animate-in fade-in duration-300">
        <header className="h-14 md:h-16 px-4 md:px-6 flex items-center justify-between border-b border-black/5 dark:border-white/10 shrink-0 bg-white/80 dark:bg-[#111]/80 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3">
            <h1 className="text-base md:text-lg font-semibold tracking-tight">{item?.name}</h1>
          </div>
          <button onClick={() => setRunningAppId(null)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>
        <main className="flex-1 relative overflow-hidden flex flex-col">
          {renderApp()}
        </main>
      </div>
    );
  }`;

if (code.includes(target)) {
   code = code.replace(target, replacement);
   fs.writeFileSync('App.tsx', code);
   console.log("App.tsx fixed");
} else {
   console.log("target not found");
}
