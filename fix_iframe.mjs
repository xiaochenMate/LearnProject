import fs from 'fs';

let code = fs.readFileSync('components/GoApp.tsx', 'utf-8');

// Fix handleResign
code = code.replace(
    /const handleResign = \(\) => \{\n\s+if \(confirm\('确认认输吗？诚实即是围棋之道。'\)\) \{\n\s+const winner = currentPlayer === 1 \? 'White' : 'Black';\n\s+alert\(`\$\{winner === 'White' \? '白方' : '黑方'\}不战而胜。`\);\n\s+setGameState\('SELECTION'\);\n\s+\}\n\s+\};/,
    `const handleResign = () => {
    const winner = currentPlayer === 1 ? 'White' : 'Black';
    setToastMessage(\`\${winner === 'White' ? '白方' : '黑方'}不战而胜。\`);
    setTimeout(() => {
        setGameState('SELECTION');
    }, 2000);
  };`
);

// Fix Leave Match inline click
code = code.replace(
    /onClick=\{\(\) => \{\n\s+if \(confirm\('确认退出当前对局？进度将丢失。'\)\) \{\n\s+setGameState\('SELECTION'\);\n\s+\}\n\s+\}\}/,
    `onClick={() => {
                                        setGameState('SELECTION');
                                    }}`
);

fs.writeFileSync('components/GoApp.tsx', code);
console.log("GoApp iframe API issues fixed");
