import fs from 'fs';

let code = fs.readFileSync('components/GoApp.tsx', 'utf-8');

let startIndex = code.indexOf(`const triggerAiMove = useCallback((currentBoard: BoardState, currentHistory: string[], currentAiColor: StoneColor) => {`);
if (startIndex !== -1) {
    let endIndex = code.indexOf(`}, [aiColor]);`, startIndex);
    let triggerAiMoveBody = code.substring(startIndex, endIndex + 14);
    
    let newTriggerAiMoveBody = triggerAiMoveBody
        .replace(/aiColor/g, `currentAiColor`)
        .replace(/\[currentAiColor\]\);$/, `[]);`); 
        
    code = code.replace(triggerAiMoveBody, newTriggerAiMoveBody);
    fs.writeFileSync('components/GoApp.tsx', code);
    console.log("Trigger body fixed.");
} else {
    console.log("Not found.");
}
