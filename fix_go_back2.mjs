import fs from 'fs';

let code = fs.readFileSync('components/GoApp.tsx', 'utf-8');

// Add "退出" GameAction before "认输"
code = code.replace(
    /<GameAction \s*icon={<RotateCcw size=\{18\}\/>} \s*title="认输"/,
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
                                    icon={<RotateCcw size={18}/>} 
                                    title="认输"`
);

fs.writeFileSync('components/GoApp.tsx', code);
console.log("GoApp exit button added");
