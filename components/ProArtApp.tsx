
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Pencil, Eraser, PaintBucket, 
  Undo2, Redo2, Plus, Trash2, Save, 
  Layers, Eye, EyeOff, Palette, Hand, 
  Sliders, ChevronRight, ChevronLeft,
  Maximize2, Info, PanelRight
} from 'lucide-react';

type Tool = 'pencil' | 'eraser' | 'bucket' | 'hand';

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  canvas: HTMLCanvasElement;
}

const ProArtApp: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  // --- 状态管理 ---
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string>('');
  const [tool, setTool] = useState<Tool>('pencil');
  const [brushSize, setBrushSize] = useState(5);
  const [opacity, setOpacity] = useState(1);
  const [color, setColor] = useState('#10b981');
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [mouseCanvasPos, setMouseCanvasPos] = useState({ x: 0, y: 0 });
  const [showRightPanel, setShowRightPanel] = useState(true); 
  
  const viewportRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<string[][]>([]); 
  const historyIndexRef = useRef(-1);

  // --- 初始化 ---
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const initialLayer: Layer = {
      id: Math.random().toString(36).substr(2, 9),
      name: '图层 1',
      visible: true,
      canvas: canvas,
    };
    setLayers([initialLayer]);
    setActiveLayerId(initialLayer.id);
    saveHistory([initialLayer]);
  }, []);

  const saveHistory = (currentLayers: Layer[]) => {
    const snapshots = currentLayers.map(l => l.canvas.toDataURL());
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(snapshots);
    if (newHistory.length > 30) newHistory.shift();
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
  };

  const undo = () => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    applyHistoryState(historyRef.current[historyIndexRef.current]);
  };

  const redo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    applyHistoryState(historyRef.current[historyIndexRef.current]);
  };

  const applyHistoryState = (snapshots: string[]) => {
    layers.forEach((layer, i) => {
      const img = new Image();
      img.onload = () => {
        const ctx = layer.canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
          ctx.drawImage(img, 0, 0);
        }
      };
      img.src = snapshots[i];
    });
  };

  const addLayer = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const newLayer: Layer = {
      id: Math.random().toString(36).substr(2, 9),
      name: `图层 ${layers.length + 1}`,
      visible: true,
      canvas,
    };
    const nextLayers = [newLayer, ...layers];
    setLayers(nextLayers);
    setActiveLayerId(newLayer.id);
    saveHistory(nextLayers);
  };

  const removeLayer = (id: string) => {
    if (layers.length <= 1) return;
    const nextLayers = layers.filter(l => l.id !== id);
    setLayers(nextLayers);
    if (activeLayerId === id) setActiveLayerId(nextLayers[0].id);
    saveHistory(nextLayers);
  };

  const toggleLayerVisibility = (id: string) => {
    setLayers(layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left - (rect.width / 2) - panOffset.x + (1200 * zoom / 2)) / zoom;
    const y = (clientY - rect.top - (rect.height / 2) - panOffset.y + (800 * zoom / 2)) / zoom;
    
    return { x, y };
  };

  // --- 填充工具核心算法 ---
  const floodFill = (startX: number, startY: number, fillColor: string) => {
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer) return;
    const canvas = activeLayer.canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const x = Math.round(startX);
    const y = Math.round(startY);
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    const getPixelPos = (px: number, py: number) => (py * canvas.width + px) * 4;

    const startPos = getPixelPos(x, y);
    const startR = pixels[startPos];
    const startG = pixels[startPos + 1];
    const startB = pixels[startPos + 2];
    const startA = pixels[startPos + 3];

    // 解析填充色 (Hex to RGB)
    const r = parseInt(fillColor.slice(1, 3), 16);
    const g = parseInt(fillColor.slice(3, 5), 16);
    const b = parseInt(fillColor.slice(5, 7), 16);

    // 如果颜色相同则直接返回，防止死循环
    if (startR === r && startG === g && startB === b && startA === 255) return;

    const stack: [number, number][] = [[x, y]];
    while (stack.length > 0) {
      const [curX, curY] = stack.pop()!;
      const pos = getPixelPos(curX, curY);

      if (
        pixels[pos] === startR &&
        pixels[pos + 1] === startG &&
        pixels[pos + 2] === startB &&
        pixels[pos + 3] === startA
      ) {
        pixels[pos] = r;
        pixels[pos + 1] = g;
        pixels[pos + 2] = b;
        pixels[pos + 3] = 255;

        if (curX > 0) stack.push([curX - 1, curY]);
        if (curX < canvas.width - 1) stack.push([curX + 1, curY]);
        if (curY > 0) stack.push([curX, curY - 1]);
        if (curY < canvas.height - 1) stack.push([curX, curY + 1]);
      }
    }

    ctx.putImageData(imageData, 0, 0);
    saveHistory(layers);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getCanvasPos(e);
    if (tool === 'hand' || e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setLastPos({ x: e.clientX, y: e.clientY });
      return;
    }

    if (tool === 'bucket') {
      floodFill(x, y, color);
      return;
    }

    setIsDrawing(true);
    setLastPos({ x, y });
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer) return;
    const ctx = activeLayer.canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.lineWidth = brushSize; ctx.globalAlpha = opacity;
    ctx.strokeStyle = color; ctx.fillStyle = color;
    
    if (tool === 'pencil') { 
      ctx.beginPath(); ctx.moveTo(x, y); 
    } else if (tool === 'eraser') { 
      ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.moveTo(x, y); 
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getCanvasPos(e);
    setMouseCanvasPos({ x, y });
    if (isPanning) {
      const dx = e.clientX - lastPos.x;
      const dy = e.clientY - lastPos.y;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastPos({ x: e.clientX, y: e.clientY });
      return;
    }
    if (!isDrawing) return;
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer) return;
    const ctx = activeLayer.canvas.getContext('2d');
    if (!ctx) return;
    if (tool === 'pencil' || tool === 'eraser') { 
      ctx.lineTo(x, y); ctx.stroke(); 
    }
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      const activeLayer = layers.find(l => l.id === activeLayerId);
      if (activeLayer) {
        const ctx = activeLayer.canvas.getContext('2d');
        if (ctx) ctx.globalCompositeOperation = 'source-over';
      }
      setIsDrawing(false);
      saveHistory(layers);
    }
    setIsPanning(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#020617] flex flex-col font-sans text-slate-300 overflow-hidden select-none">
      
      {/* 顶部菜单栏 */}
      <header className="h-14 bg-slate-900 border-b border-white/5 flex items-center justify-between px-6 shrink-0 shadow-xl z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Palette className="text-black w-6 h-6" />
            </div>
            <span className="text-lg font-black tech-font tracking-tighter uppercase italic text-white hidden sm:block">ProArt_Web</span>
          </div>
          
          <div className="h-6 w-px bg-white/10 mx-2" />
          
          <div className="flex items-center gap-1.5">
            <MenuButton icon={<Undo2 size={18} />} onClick={undo} title="撤销" />
            <MenuButton icon={<Redo2 size={18} />} onClick={redo} title="重做" />
          </div>
          
          <div className="h-6 w-px bg-white/10 mx-2 hidden md:block" />
          
          <div className="flex items-center gap-1.5">
             <MenuButton icon={<Save size={18} />} onClick={() => {}} title="保存" />
             <MenuButton icon={<Trash2 size={18} />} onClick={() => {}} title="彻底清空" className="text-rose-400" />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 bg-slate-950/80 px-4 py-1.5 rounded-lg border border-white/5 font-mono text-[10px] tracking-widest text-slate-500">
             ZOOM: <span className="text-white">{(zoom * 100).toFixed(0)}%</span>
           </div>
           <button 
             onClick={() => setShowRightPanel(!showRightPanel)}
             className={`p-2 rounded-lg transition-colors ${showRightPanel ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'}`}
             title="显示/隐藏属性面板"
           >
             <PanelRight size={20} />
           </button>
           <button onClick={onClose} className="p-2 bg-slate-800 hover:bg-rose-500 text-slate-400 hover:text-white rounded-lg transition-all">
             <X size={20} />
           </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* 左侧工具栏 */}
        <aside className="w-16 bg-slate-900/90 backdrop-blur-xl border-r border-white/5 flex flex-col items-center py-6 gap-5 shadow-2xl relative z-20">
          <ToolButton icon={<Pencil size={22} />} active={tool === 'pencil'} onClick={() => setTool('pencil')} title="画笔" />
          <ToolButton icon={<Eraser size={22} />} active={tool === 'eraser'} onClick={() => setTool('eraser')} title="橡皮" />
          <ToolButton icon={<PaintBucket size={22} />} active={tool === 'bucket'} onClick={() => setTool('bucket')} title="油漆桶 (填充)" />
          <ToolButton icon={<Hand size={22} />} active={tool === 'hand'} onClick={() => setTool('hand')} title="抓手" />
          
          <div className="w-10 h-px bg-white/5 my-2" />
          
          <div className="mt-auto flex flex-col items-center gap-4 pb-4">
             <div className="w-10 h-10 rounded-xl border-2 border-white/20 p-0.5 shadow-lg overflow-hidden group cursor-pointer relative">
                <input 
                  type="color" 
                  value={color} 
                  onChange={(e) => setColor(e.target.value)} 
                  className="absolute inset-0 w-full h-full cursor-pointer opacity-0 z-10" 
                />
                <div className="w-full h-full rounded-lg" style={{ backgroundColor: color }} />
             </div>
          </div>
        </aside>

        {/* 画布区域 */}
        <main 
          ref={viewportRef}
          className={`flex-1 bg-[#080c14] relative overflow-hidden outline-none ${tool === 'bucket' ? 'cursor-cell' : 'cursor-crosshair'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={(e) => {
            if (e.ctrlKey) {
              const delta = e.deltaY > 0 ? 0.9 : 1.1;
              setZoom(prev => Math.min(10, Math.max(0.1, prev * delta)));
              e.preventDefault();
            } else {
              setPanOffset(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
            }
          }}
        >
          {/* 画布容器 */}
          <div 
            className="absolute"
            style={{ 
              width: 1200, height: 800,
              left: '50%', top: '50%',
              transform: `translate(-50%, -50%) translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              boxShadow: '0 40px 100px -20px rgba(0,0,0,0.8)'
            }}
          >
            {/* 棋盘格背景 */}
            <div className="absolute inset-0 bg-[#e5e5e5]" style={{ 
              backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
              backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
            }} />
            
            {/* 图层渲染 */}
            {[...layers].reverse().map((layer) => (
              <LayerCanvas key={layer.id} layer={layer} />
            ))}
          </div>

          {/* 实时状态指示器 */}
          <div className="absolute bottom-8 left-8 p-4 bg-slate-900/70 backdrop-blur-md rounded-xl border border-white/5 pointer-events-none flex flex-col gap-1 shadow-2xl">
             <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest italic opacity-60 mb-1">
               <Info size={10} /> Telemetry_Output
             </div>
             <div className="text-[11px] font-mono text-white/80 whitespace-pre leading-relaxed">
                DIM: <span className="text-emerald-400">1200x800</span><br/>
                POS: <span className="text-emerald-400">{mouseCanvasPos.x.toFixed(0)}, {mouseCanvasPos.y.toFixed(0)}</span>
             </div>
          </div>
        </main>

        {/* 右侧属性面板 */}
        <aside 
          className={`bg-slate-900 border-l border-white/5 flex flex-col overflow-hidden z-20 shadow-2xl transition-all duration-500 ease-in-out ${showRightPanel ? 'w-72 opacity-100' : 'w-0 opacity-0'}`}
        >
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <Sliders size={16} className="text-emerald-500" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">工具属性</h3>
             </div>
             <button onClick={() => setShowRightPanel(false)} className="text-slate-600 hover:text-white transition-colors">
                <ChevronRight size={18} />
             </button>
          </div>
          
          <div className="p-6 space-y-8">
            <div className="space-y-3">
               <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                  <span className="uppercase tracking-widest">画笔大小</span>
                  <span className="text-emerald-400 font-mono">{brushSize}px</span>
               </div>
               <input 
                type="range" min="1" max="100" value={brushSize} 
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="custom-range" 
               />
            </div>

            <div className="space-y-3">
               <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                  <span className="uppercase tracking-widest">不透明度</span>
                  <span className="text-emerald-400 font-mono">{(opacity * 100).toFixed(0)}%</span>
               </div>
               <input 
                type="range" min="0.01" max="1" step="0.01" value={opacity} 
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="custom-range" 
               />
            </div>
          </div>

          {/* 图层管理 */}
          <div className="flex-1 flex flex-col min-h-0">
             <div className="p-6 border-y border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <Layers size={16} className="text-emerald-500" />
                   <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">图层管理</h3>
                </div>
                <button onClick={addLayer} className="p-1.5 bg-slate-800 hover:bg-emerald-500 text-slate-400 hover:text-black rounded-lg transition-all">
                  <Plus size={16} />
                </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                {layers.map((layer) => (
                  <div 
                    key={layer.id} 
                    onClick={() => setActiveLayerId(layer.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all border ${activeLayerId === layer.id ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-slate-950/40 border-transparent hover:border-white/10'}`}
                  >
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}
                      className={`transition-colors ${layer.visible ? 'text-emerald-500' : 'text-slate-700'}`}
                    >
                      {layer.visible ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                    <span className={`text-xs flex-1 truncate font-bold tracking-widest ${activeLayerId === layer.id ? 'text-white' : 'text-slate-500'}`}>
                      {layer.name}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}
                      className="p-1.5 text-slate-600 hover:text-rose-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
             </div>
          </div>
          
          {/* 快速调色盘 */}
          <div className="p-6 bg-slate-950/50 border-t border-white/5 grid grid-cols-6 gap-2">
            {['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#10b981', '#3b82f6', '#8b5cf6', '#f43f5e', '#fbbf24'].map(c => (
              <button 
                key={c} onClick={() => setColor(c)}
                className={`aspect-square rounded-md border border-white/5 transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-950 scale-110' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </aside>

        {/* 隐藏面板时的唤醒按钮 */}
        {!showRightPanel && (
          <button 
            onClick={() => setShowRightPanel(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-emerald-500 text-black py-4 px-1 rounded-l-xl z-20 shadow-2xl animate-pulse"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      <style>{`
        .custom-range {
          -webkit-appearance: none;
          width: 100%;
          height: 2px;
          background: #1e293b;
          border-radius: 5px;
          outline: none;
        }
        .custom-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          background: #10b981;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(16,185,129,0.5);
          transition: transform 0.2s;
        }
        .custom-range::-webkit-slider-thumb:hover { transform: scale(1.2); }
        .tech-font { font-family: 'Orbitron', sans-serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .cursor-cell { cursor: cell; }
      `}</style>
    </div>
  );
};

// 子组件
const MenuButton = ({ icon, onClick, title, className = '' }: any) => (
  <button 
    onClick={onClick} title={title} 
    className={`p-2.5 bg-slate-800/50 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all active:scale-95 ${className}`}
  >
    {icon}
  </button>
);

const ToolButton = ({ icon, active, onClick, title }: any) => (
  <button 
    onClick={onClick} title={title}
    className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all relative ${active ? 'bg-emerald-500 text-black shadow-[0_0_25px_rgba(16,185,129,0.4)]' : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800'}`}
  >
    {icon}
    {active && <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-white rounded-full" />}
  </button>
);

const LayerCanvas: React.FC<{ layer: Layer }> = ({ layer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const update = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(layer.canvas, 0, 0);
      requestAnimationFrame(update);
    };
    const id = requestAnimationFrame(update);
    return () => cancelAnimationFrame(id);
  }, [layer]);
  return (
    <canvas 
      ref={canvasRef} width={1200} height={800}
      className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300 ${layer.visible ? 'opacity-100' : 'opacity-0'}`}
    />
  );
};

export default ProArtApp;
