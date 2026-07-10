import fs from 'fs';

let code = fs.readFileSync('components/GoApp.tsx', 'utf-8');

// In SELECTION state, add a back button
code = code.replace(
    /<h2 className="text-3xl font-light text-white mb-3 serif-font italic">挑选棋局<\/h2>/,
    `<button onClick={onClose} className="absolute top-6 left-6 z-50 flex items-center justify-center p-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white/50 hover:text-white rounded-2xl transition-all group">
        <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
      </button>
      <h2 className="text-3xl font-light text-white mb-3 serif-font italic">挑选棋局</h2>`
);

// In PLAYING state, add a back to selection button
code = code.replace(
    /<GameAction \n                                    icon={<RotateCcw size={18}\/>} /,
    `<GameAction 
                                    icon={<X size={18}/>} 
                                    title="退出" 
                                    desc="Leave Match" 
                                    onClick={() => {
                                        if (confirm('确认退出当前对局？进度将丢失。')) {
                                            setGameState('SELECTION');
                                        }
                                    }}
                                    color="white"
                                />
                                <GameAction 
                                    icon={<RotateCcw size={18}/>} `
);

fs.writeFileSync('components/GoApp.tsx', code);
console.log("GoApp back buttons fixed");
