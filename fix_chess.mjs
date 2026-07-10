import fs from 'fs';
let code = fs.readFileSync('components/ChineseChessApp.tsx', 'utf-8');

const replacement = `  const resetGame = useCallback((targetPlayerColor?: ChessColor) => {
    const color = targetPlayerColor || playerColor;
    setBoard(INITIAL_BOARD);
    setTurn(color === 'black' ? 'black' : 'red'); 
    setSelected(null);
    setLastMove(null);
    setHistoryStates([]);
    setGameOver(null);
    setHint(null);
    setIsAiThinking(false);
    setShowSettings(false);
  }, [playerColor]);

  const executeMove = useCallback((from: number, to: number, currentBoard = board, currentTurn = turn) => {
    const piece = currentBoard[from];
    if (!piece) return;
    if (currentBoard[to]) playSound('capture'); else playSound('move');
    
    const newBoard = [...currentBoard];
    newBoard[to] = newBoard[from];
    newBoard[from] = null;
    
    if (mode !== 'Sandbox' && isFacingKing(newBoard)) {
      alert("注意：不能形成将帅照面！");
      return;
    }
    
    setHistoryStates(prev => [...prev, { board: [...currentBoard], turn: currentTurn, lastMove }]);
    setBoard(newBoard);
    setLastMove([from, to]);
    
    const nextTurn = currentTurn === 'red' ? 'black' : 'red';
    setTurn(nextTurn);
    setSelected(null);
    setHint(null);
    
    const hasRedKing = newBoard.some(p => p?.type === 'king' && p.color === 'red');
    const hasBlackKing = newBoard.some(p => p?.type === 'king' && p.color === 'black');
    if (!hasRedKing) setGameOver('black');
    if (!hasBlackKing) setGameOver('red');
    
    if (!hasRedKing || !hasBlackKing) return;
    
    if (mode === 'PvE' && nextTurn !== playerColor) {
       triggerAiMove(newBoard, nextTurn);
    }
  }, [board, turn, mode, playSound, lastMove, playerColor]);

  const triggerAiMove = useCallback((currentBoard: ChessBoard, currentTurn: ChessColor) => {
    setIsAiThinking(true);
    setTimeout(() => {
        try {
          const depth = difficulty === '入门' ? 1 : difficulty === '专业' ? 3 : 4;
          const [from, to] = getBestMove(currentBoard, currentTurn, depth);
          if (from !== -1) {
             executeMove(from, to, currentBoard, currentTurn);
          }
        } catch (e) {
          console.error("AI 决策中断:", e);
        } finally {
          setIsAiThinking(false);
        }
    }, 600);
  }, [difficulty, executeMove]);

  useEffect(() => {
    if (mode === 'PvE' && turn !== playerColor && !gameOver && historyStates.length === 0 && !isAiThinking) {
        triggerAiMove(board, turn);
    }
  }, [mode, turn, playerColor, gameOver, historyStates.length, isAiThinking, board, triggerAiMove]);`;

const startIdx = code.indexOf(`  const resetGame = useCallback`);
const endIdx = code.indexOf(`  const handleCellClick = (idx: number) => {`);
if (startIdx !== -1 && endIdx !== -1) {
    code = code.substring(0, startIdx) + replacement + "\n\n" + code.substring(endIdx);
    fs.writeFileSync('components/ChineseChessApp.tsx', code);
    console.log("Fixed!");
} else {
    console.log("Could not find boundaries");
}
