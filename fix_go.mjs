import fs from 'fs';

let code = fs.readFileSync('components/GoApp.tsx', 'utf-8');

// 1. triggerAiMove parameter
code = code.replace(
  /const triggerAiMove = useCallback\(\(currentBoard: BoardState, currentHistory: string\[\]\) => \{/g,
  `const triggerAiMove = useCallback((currentBoard: BoardState, currentHistory: string[], currentAiColor: StoneColor) => {`
);

code = code.replace(/aiColor/g, function(match, offset, fullString) {
  // We only want to replace aiColor inside the triggerAiMove body... this might be hard with regex.
  return match; // skip for now
});

// Actually, let's just do an AST or simple regex replace in a substring.
let startIndex = code.indexOf(`const triggerAiMove = useCallback((currentBoard: BoardState, currentHistory: string[]) => {`);
if (startIndex !== -1) {
    let endIndex = code.indexOf(`}, [aiColor]);`, startIndex);
    let triggerAiMoveBody = code.substring(startIndex, endIndex + 14);
    
    let newTriggerAiMoveBody = triggerAiMoveBody
        .replace(/\(currentBoard: BoardState, currentHistory: string\[\]\)/g, `(currentBoard: BoardState, currentHistory: string[], currentAiColor: StoneColor)`)
        .replace(/aiColor/g, `currentAiColor`)
        .replace(/\[currentAiColor\]\);$/, `[]);`); // no dependencies needed
        
    code = code.replace(triggerAiMoveBody, newTriggerAiMoveBody);
}

// 2. Update callers of triggerAiMove
code = code.replace(/triggerAiMove\(nextBoard, \[\.\.\.history, JSON\.stringify\(board\)\]\);/g, `triggerAiMove(nextBoard, [...history, JSON.stringify(board)], aiColor);`);
code = code.replace(/triggerAiMove\(board, history\);/g, `triggerAiMove(board, history, aiColor);`);

// 3. Fix startNewGame
let startNewGameRegex = /const startNewGame = \(size: BoardSize\) => \{[\s\S]*?setGameState\('PLAYING'\);\n\s*\};/;
let startNewGameMatch = code.match(startNewGameRegex);

if (startNewGameMatch) {
    let newStartNewGame = `const startNewGame = (size: BoardSize) => {
    setBoardSize(size);
    engineRef.current = new GoEngine(size);
    const newBoard = GoEngine.createBoard(size);
    setBoard(newBoard);
    
    let newAiColor: StoneColor = 2;
    if (isPvE) {
        newAiColor = playerPreferredColor === 1 ? 2 : 1;
        setAiColor(newAiColor);
    }
    
    setHistory([]);
    setPassCount(0);
    setTimer(0);
    setCurrentPlayer(1);
    setCaptures({ b: 0, w: 0 });
    setLastMove(null);
    setTerritoryMap([]);
    setIsAiThinking(false);
    setToastMessage(null);
    setGameState('PLAYING');

    if (isPvE && newAiColor === 1) {
        triggerAiMove(newBoard, [], newAiColor);
    }
  };`;
    code = code.replace(startNewGameMatch[0], newStartNewGame);
}

fs.writeFileSync('components/GoApp.tsx', code);
console.log("GoApp.tsx updated");
