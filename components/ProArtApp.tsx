import React, { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Brush,
  Check,
  Circle,
  Download,
  Eraser,
  Eye,
  EyeOff,
  FileDown,
  Highlighter,
  Layers,
  Loader2,
  Minus,
  Paintbrush,
  Pipette,
  Plus,
  Redo2,
  Save,
  Square,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";
import { Workbench, IconButton } from "./ModuleWorkbench";
import {
  readArtwork,
  readArtworkProject,
  writeArtworkProject,
} from "../lib/artworkStorage";
import {
  ART_WIDTH as WIDTH,
  ART_HEIGHT as HEIGHT,
  canvasBlob,
  canvasPoint,
  imageFromBlob,
  parseArtProject,
  serializeArtProject,
  shapeBounds,
  type ArtLayerMeta,
  type ArtPoint,
  type ArtProject,
  type ArtTool,
} from "../lib/labsArt";
import { downloadLabFile } from "../lib/labsCommon";
import type { ExperienceEvidence } from "../lib/explorerStore";
import "./labs.css";

interface Layer extends ArtLayerMeta {
  canvas: HTMLCanvasElement;
}
interface Document {
  background: string | null;
  active: string;
  layers: Layer[];
}
const COLORS = [
  "#20252c",
  "#ffffff",
  "#a0e7cc",
  "#78c6e8",
  "#f3a698",
  "#f1d275",
  "#dc8fae",
  "#8ca1e5",
];
const TOOLS = [
  { id: "pen", name: "圆头画笔", Icon: Brush },
  { id: "marker", name: "荧光笔", Icon: Highlighter },
  { id: "eraser", name: "透明橡皮", Icon: Eraser },
  { id: "line", name: "直线", Icon: Minus },
  { id: "rectangle", name: "矩形", Icon: Square },
  { id: "ellipse", name: "椭圆", Icon: Circle },
  { id: "picker", name: "吸取画布颜色", Icon: Pipette },
] as const;
const newCanvas = () => {
  const c = document.createElement("canvas");
  c.width = WIDTH;
  c.height = HEIGHT;
  return c;
};
const newLayer = (name: string): Layer => ({
  id: crypto.randomUUID(),
  name,
  visible: true,
  opacity: 1,
  canvas: newCanvas(),
});

export default function ProArtApp({
  onDiscover,
}: {
  onClose: () => void;
  onDiscover?: (evidence: ExperienceEvidence) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    input = useRef<HTMLInputElement>(null);
  const doc = useRef<Document | null>(null),
    history = useRef<ArtProject[]>([]),
    index = useRef(-1);
  const locked = useRef(false),
    dirty = useRef(false),
    mounted = useRef(true);
  const stroke = useRef<{
    id: number;
    start: ArtPoint;
    last: ArtPoint;
    before: ImageData;
    pressure: number;
  } | null>(null);
  const touches = useRef(
      new Map<number, { x: number; y: number; time: number; moved: boolean }>(),
    ),
    gesture = useRef(false),
    gestureAt = useRef(0),
    gestureMoved = useRef(false);
  const preview = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<ArtTool>("pen"),
    [color, setColor] = useState("#20252c"),
    [size, setSize] = useState(7),
    [opacity, setOpacity] = useState(100),
    [fill, setFill] = useState(false);
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("正在读取画作");
  const [layers, setLayers] = useState<ArtLayerMeta[]>([]),
    [active, setActive] = useState(""),
    [background, setBackground] = useState<string | null>("#ffffff");
  const [position, setPosition] = useState({ current: -1, total: 0 }),
    [format, setFormat] = useState("png");
  const sync = () => {
    const d = doc.current!;
    setLayers(d.layers.map(({ canvas: _canvas, ...meta }) => meta));
    setActive(d.active);
    setBackground(d.background);
  };
  const paint = (target = canvas.current, withPreview = true, jpg = false) => {
    const d = doc.current,
      ctx = target?.getContext("2d");
    if (!d || !ctx) return;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    if (d.background || jpg) {
      ctx.fillStyle = d.background || "#ffffff";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
    for (const layer of d.layers)
      if (layer.visible) {
        ctx.globalAlpha = layer.opacity;
        ctx.drawImage(layer.canvas, 0, 0);
        if (withPreview && layer.id === d.active && preview.current)
          ctx.drawImage(preview.current, 0, 0);
      }
    ctx.globalAlpha = 1;
  };
  const capture = async (): Promise<ArtProject> => {
    const d = doc.current!;
    return {
      version: 1,
      width: WIDTH,
      height: HEIGHT,
      background: d.background,
      active: d.active,
      layers: await Promise.all(
        d.layers.map(async ({ canvas: c, ...meta }) => ({
          ...meta,
          image: await canvasBlob(c),
        })),
      ),
    };
  };
  const applyProject = async (project: ArtProject) => {
    const restored = await Promise.all(
      project.layers.map(async ({ image, ...meta }) => {
        const imageElement = await imageFromBlob(image);
        if (
          imageElement.naturalWidth !== WIDTH ||
          imageElement.naturalHeight !== HEIGHT
        )
          throw new Error("工程画布尺寸不匹配");
        const c = newCanvas();
        c.getContext("2d")!.drawImage(imageElement, 0, 0);
        return { ...meta, canvas: c };
      }),
    );
    doc.current = {
      background: project.background,
      active: project.active,
      layers: restored,
    };
    preview.current = null;
    sync();
    paint();
  };
  useEffect(() => {
    let disposed = false;
    mounted.current = true;
    const initialize = async () => {
      let project: ArtProject | null = null,
        legacy: Blob | null = null,
        warning = "";
      try {
        project = await readArtworkProject();
      } catch {
        warning = "分层存储读取失败；原数据未覆盖。";
      }
      if (!project)
        try {
          legacy = await readArtwork();
        } catch {
          warning = "本机保存不可用，请导出作品。";
        }
      if (disposed) return;
      if (project) {
        await applyProject(project);
        if (disposed) return;
        setStatus("已恢复分层画作");
      } else {
        const layer = newLayer(legacy ? "原有画作" : "图层 1");
        if (legacy) {
          const image = await imageFromBlob(legacy);
          if (disposed) return;
          layer.canvas.getContext("2d")!.drawImage(image, 0, 0, WIDTH, HEIGHT);
        }
        doc.current = {
          background: "#ffffff",
          active: layer.id,
          layers: [layer],
        };
        sync();
        paint();
        setStatus(warning || (legacy ? "已恢复原有 PNG 画作" : "新画布"));
      }
      const initial = await capture();
      if (disposed) return;
      history.current = [initial];
      index.current = 0;
      setPosition({ current: 0, total: 1 });
      setReady(true);
    };
    void initialize().catch(() => {
      if (!disposed)
        setStatus("画作读取失败，原数据未覆盖；请保留浏览器数据。");
    });
    return () => {
      disposed = true;
      mounted.current = false;
    };
  }, []);
  const commit = async (addHistory = true) => {
    if (locked.current || !doc.current || stroke.current) return;
    locked.current = true;
    setBusy(true);
    setStatus("正在保存分层画作");
    try {
      const project = await capture(),
        flat = newCanvas();
      paint(flat, false);
      const flattened = await canvasBlob(flat);
      if (addHistory) {
        history.current = [
          ...history.current.slice(0, index.current + 1),
          project,
        ].slice(-16);
        index.current = history.current.length - 1;
        setPosition({ current: index.current, total: history.current.length });
      }
      dirty.current = false;
      await writeArtworkProject(project, flattened);
      if (mounted.current) setStatus("分层画作已保存在本机");
    } catch {
      if (mounted.current)
        setStatus("本机保存失败，画布仍在；请导出 PNG 或分层工程。");
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const restore = async (next: number) => {
    if (locked.current || stroke.current || !history.current[next]) return;
    locked.current = true;
    setBusy(true);
    try {
      await applyProject(history.current[next]);
      index.current = next;
      setPosition({ current: next, total: history.current.length });
      dirty.current = true;
    } catch {
      setStatus("撤销恢复失败，当前画布保留。");
    } finally {
      locked.current = false;
      setBusy(false);
    }
    if (dirty.current) await commit(false);
  };
  const mutate = (change: (d: Document) => void) => {
    if (!ready || locked.current || stroke.current || !doc.current) return;
    change(doc.current);
    dirty.current = true;
    sync();
    paint();
    void commit();
  };
  const selected = () =>
    doc.current!.layers.find((l) => l.id === doc.current!.active)!;
  const segment = (a: ArtPoint, b: ArtPoint, pressure: number, dot = false) => {
    const ctx = selected().canvas.getContext("2d")!;
    ctx.save();
    ctx.globalCompositeOperation =
      tool === "eraser" ? "destination-out" : "source-over";
    ctx.globalAlpha =
      tool === "eraser" ? 1 : (opacity / 100) * (tool === "marker" ? 0.22 : 1);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = size * (tool === "marker" ? 2.5 : 1) * pressure;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    if (dot) {
      ctx.arc(b.x, b.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  };
  const drawShape = (
    ctx: CanvasRenderingContext2D,
    a: ArtPoint,
    b: ArtPoint,
    constrained: boolean,
  ) => {
    const bounds = shapeBounds(a, b, constrained);
    ctx.save();
    ctx.globalAlpha = opacity / 100;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (tool === "line") {
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    } else if (tool === "rectangle")
      ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
    else
      ctx.ellipse(
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2,
        Math.max(0.01, bounds.width / 2),
        Math.max(0.01, bounds.height / 2),
        0,
        0,
        Math.PI * 2,
      );
    if (fill && tool !== "line") ctx.fill();
    else ctx.stroke();
    ctx.restore();
  };
  const point = (e: React.PointerEvent<HTMLCanvasElement>) =>
    canvasPoint(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
  const pressure = (e: React.PointerEvent<HTMLCanvasElement>) =>
    e.pointerType === "pen" ? Math.max(0.12, e.pressure) : 1;
  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (
      !ready ||
      locked.current ||
      (e.pointerType === "mouse" && e.button !== 0)
    )
      return;
    e.preventDefault();
    if (e.pointerType === "touch") {
      touches.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        time: performance.now(),
        moved: false,
      });
      if (touches.current.size === 2) {
        const values = [...touches.current.values()];
        if (Math.abs(values[0].time - values[1].time) < 220) {
          if (stroke.current) {
            selected()
              .canvas.getContext("2d")!
              .putImageData(stroke.current.before, 0, 0);
            stroke.current = null;
          }
          preview.current = null;
          gesture.current = true;
          gestureAt.current = performance.now();
          gestureMoved.current = false;
          paint();
          e.currentTarget.setPointerCapture(e.pointerId);
        }
        return;
      }
      if (touches.current.size > 2 || gesture.current) return;
    }
    if (stroke.current) return;
    const layer = selected();
    if (!layer.visible || layer.opacity === 0) {
      setStatus("当前图层不可见，请先显示图层。");
      return;
    }
    const p = point(e);
    if (tool === "picker") {
      const pixel = canvas
        .current!.getContext("2d")!
        .getImageData(
          Math.min(WIDTH - 1, Math.floor(p.x)),
          Math.min(HEIGHT - 1, Math.floor(p.y)),
          1,
          1,
        ).data;
      if (!pixel[3]) {
        setStatus("此处为透明像素。");
        return;
      }
      setColor(
        "#" +
          [...pixel]
            .slice(0, 3)
            .map((n) => n.toString(16).padStart(2, "0"))
            .join(""),
      );
      setTool("pen");
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    stroke.current = {
      id: e.pointerId,
      start: p,
      last: p,
      pressure: pressure(e),
      before: layer.canvas.getContext("2d")!.getImageData(0, 0, WIDTH, HEIGHT),
    };
    if (["pen", "marker", "eraser"].includes(tool)) {
      segment(p, p, pressure(e), true);
      paint();
    }
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const touch = touches.current.get(e.pointerId);
    if (touch && Math.hypot(e.clientX - touch.x, e.clientY - touch.y) > 20) {
      touch.moved = true;
      gestureMoved.current = true;
    }
    if (gesture.current || !stroke.current || stroke.current.id !== e.pointerId)
      return;
    const p = point(e),
      s = stroke.current;
    if (["pen", "marker", "eraser"].includes(tool))
      segment(s.last, p, pressure(e));
    else {
      if (!preview.current) preview.current = newCanvas();
      const ctx = preview.current.getContext("2d")!;
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      drawShape(ctx, s.start, p, e.shiftKey);
    }
    s.last = p;
    paint();
  };
  const finish = (
    e: React.PointerEvent<HTMLCanvasElement>,
    cancelled = false,
  ) => {
    touches.current.delete(e.pointerId);
    if (gesture.current) {
      if (cancelled) gestureMoved.current = true;
      if (!touches.current.size) {
        gesture.current = false;
        if (
          !cancelled &&
          !gestureMoved.current &&
          performance.now() - gestureAt.current < 500
        )
          void restore(index.current - 1);
      }
      return;
    }
    const s = stroke.current;
    if (!s || s.id !== e.pointerId) return;
    if (cancelled)
      selected().canvas.getContext("2d")!.putImageData(s.before, 0, 0);
    else if (!["pen", "marker", "eraser"].includes(tool))
      drawShape(
        selected().canvas.getContext("2d")!,
        s.start,
        point(e),
        e.shiftKey,
      );
    stroke.current = null;
    preview.current = null;
    paint();
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    if (!cancelled) {
      dirty.current = true;
      void commit();
    }
  };
  const exportImage = async () => {
    if (!ready || locked.current || stroke.current) return;
    try {
      const output = newCanvas();
      paint(output, false, format === "jpeg");
      const blob = await canvasBlob(
        output,
        format === "jpeg" ? "image/jpeg" : "image/png",
      );
      downloadLabFile(
        `exbeam-art-${Date.now()}.${format === "jpeg" ? "jpg" : "png"}`,
        blob,
      );
      setStatus(`${format.toUpperCase()} 作品已生成`);
      onDiscover?.({
        key: `artwork-${Date.now()}`,
        kind: "artwork",
        title: "完成了一幅画作",
        detail: `已生成 ${WIDTH} × ${HEIGHT} 像素 ${format.toUpperCase()}，包含 ${doc.current!.layers.filter((l) => l.visible).length} 个可见图层。`,
      });
    } catch {
      setStatus("导出失败，请重试。");
    }
  };
  const exportProject = async () => {
    if (!ready || locked.current || stroke.current) return;
    locked.current = true;
    setBusy(true);
    try {
      downloadLabFile(
        "exbeam-art-project.json",
        await serializeArtProject(await capture()),
        "application/json",
      );
      setStatus("分层工程已生成，可再次导入恢复。");
    } catch {
      setStatus("工程导出失败。");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const importFile = async (file: File) => {
    if (!ready || locked.current || stroke.current) return;
    if (file.size > 35_000_000) {
      setStatus("文件超过 35 MB，未导入。");
      return;
    }
    locked.current = true;
    setBusy(true);
    try {
      if (file.name.toLowerCase().endsWith(".json"))
        await applyProject(await parseArtProject(await file.text()));
      else {
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
          throw new Error("请选择 PNG、JPG、WebP 或工程 JSON");
        if (doc.current!.layers.length >= 4)
          throw new Error("已有四个图层，请先移除一个图层");
        const image = await imageFromBlob(file);
        if (image.naturalWidth * image.naturalHeight > 40_000_000)
          throw new Error("图像尺寸过大");
        const l = newLayer("导入图像"),
          scale = Math.min(
            WIDTH / image.naturalWidth,
            HEIGHT / image.naturalHeight,
          );
        const w = image.naturalWidth * scale,
          h = image.naturalHeight * scale;
        l.canvas
          .getContext("2d")!
          .drawImage(image, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h);
        doc.current!.layers.push(l);
        doc.current!.active = l.id;
        sync();
        paint();
      }
      dirty.current = true;
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "导入失败，当前画布保留。",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
    if (dirty.current) await commit();
  };
  const disabled = !ready || busy,
    selectedMeta = layers.find((l) => l.id === active);
  return (
    <Workbench
      title="自由画室"
      eyebrow="STUDIO / 1000 × 700"
      className="labs-workbench labs-art"
      toolbar={
        <>
          <IconButton
            label="撤销"
            disabled={disabled || position.current <= 0}
            onClick={() => void restore(index.current - 1)}
          >
            <Undo2 size={17} />
          </IconButton>
          <IconButton
            label="重做"
            disabled={disabled || position.current >= position.total - 1}
            onClick={() => void restore(index.current + 1)}
          >
            <Redo2 size={17} />
          </IconButton>
          <IconButton
            label="保存分层画作"
            disabled={disabled}
            onClick={() => void commit(false)}
          >
            <Save size={17} />
          </IconButton>
          <IconButton
            label="导入图像或分层工程"
            disabled={disabled}
            onClick={() => input.current?.click()}
          >
            <Upload size={17} />
          </IconButton>
          <IconButton
            label="导出分层工程"
            disabled={disabled}
            onClick={() => void exportProject()}
          >
            <FileDown size={17} />
          </IconButton>
          <label className="wb-field labs-export-format">
            <select
              aria-label="作品导出格式"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="png">PNG</option>
              <option value="jpeg">JPG</option>
            </select>
          </label>
          <IconButton
            label="导出作品"
            disabled={disabled}
            onClick={() => void exportImage()}
          >
            <Download size={17} />
          </IconButton>
        </>
      }
      status={
        <>
          <span>
            {busy && <Loader2 className="labs-spin" size={13} />}
            {status}
          </span>
          <span>1000 × 700 px · {layers.length} 图层</span>
          <span>撤销 {Math.max(0, position.current)} / 15</span>
        </>
      }
    >
      <input
        ref={input}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp,.json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importFile(file);
          e.target.value = "";
        }}
      />
      <div className="labs-art-layout">
        <main className="labs-art-main">
          <div className="labs-art-tools" role="group" aria-label="绘画工具">
            {TOOLS.map((t) => (
              <IconButton
                key={t.id}
                label={t.name}
                aria-pressed={tool === t.id}
                disabled={disabled}
                onClick={() => setTool(t.id)}
              >
                <t.Icon size={18} />
              </IconButton>
            ))}
            <span className="labs-tool-divider" />
            <label className="labs-checkbox">
              <input
                type="checkbox"
                checked={fill}
                onChange={(e) => setFill(e.target.checked)}
              />
              实心图形
            </label>
          </div>
          <div className="labs-art-board-area">
            <div className="labs-art-board">
              <canvas
                ref={canvas}
                width={WIDTH}
                height={HEIGHT}
                aria-label="自由画室画布"
                onPointerDown={start}
                onPointerMove={move}
                onPointerUp={(e) => finish(e)}
                onPointerCancel={(e) => finish(e, true)}
                onLostPointerCapture={(e) => {
                  if (stroke.current?.id === e.pointerId) finish(e, true);
                }}
              />
              {!ready && (
                <div className="labs-art-loading">
                  <Loader2 size={22} className="labs-spin" />
                  <span>{status}</span>
                </div>
              )}
            </div>
          </div>
        </main>
        <aside className="labs-inspector">
          <div className="labs-inspector-body">
            <h3>
              <Paintbrush size={15} />
              笔刷与颜色
            </h3>
            <div
              className="labs-art-swatches"
              role="group"
              aria-label="画笔颜色"
            >
              {COLORS.map((c) => (
                <button
                  key={c}
                  style={{ background: c }}
                  aria-label={`颜色 ${c}`}
                  title={c}
                  aria-pressed={color === c}
                  onClick={() => setColor(c)}
                >
                  {color === c && (
                    <Check
                      size={15}
                      color={c === "#20252c" ? "#fff" : "#15202a"}
                    />
                  )}
                </button>
              ))}
              <input
                aria-label="自定义颜色"
                title="自定义颜色"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
            <label className="labs-slider">
              <span>
                笔触大小<output>{size} px</output>
              </span>
              <input
                aria-label="笔触大小"
                type="range"
                min={1}
                max={80}
                value={size}
                onChange={(e) => setSize(+e.target.value)}
              />
            </label>
            <label className="labs-slider">
              <span>
                笔刷不透明度<output>{opacity}%</output>
              </span>
              <input
                aria-label="笔刷不透明度"
                type="range"
                min={5}
                max={100}
                value={opacity}
                onChange={(e) => setOpacity(+e.target.value)}
              />
            </label>
            <section className="labs-section">
              <div className="labs-section-top">
                <h3>
                  <Layers size={15} />
                  图层
                </h3>
                <IconButton
                  label="新增图层"
                  disabled={disabled || layers.length >= 4}
                  onClick={() =>
                    mutate((d) => {
                      const l = newLayer(`图层 ${d.layers.length + 1}`);
                      d.layers.push(l);
                      d.active = l.id;
                    })
                  }
                >
                  <Plus size={15} />
                </IconButton>
              </div>
              <ul className="wb-list labs-layers">
                {[...layers].reverse().map((l) => (
                  <li
                    key={l.id}
                    className={active === l.id ? "is-selected" : ""}
                  >
                    <IconButton
                      label={`${l.visible ? "隐藏" : "显示"}${l.name}`}
                      disabled={disabled}
                      onClick={() =>
                        mutate((d) => {
                          d.layers.find((x) => x.id === l.id)!.visible =
                            !l.visible;
                        })
                      }
                    >
                      {l.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                    </IconButton>
                    <button
                      className="labs-layer-name"
                      aria-pressed={active === l.id}
                      disabled={disabled}
                      onClick={() => {
                        doc.current!.active = l.id;
                        sync();
                      }}
                    >
                      {l.name}
                      <small>{Math.round(l.opacity * 100)}%</small>
                    </button>
                    <IconButton
                      label={`删除${l.name}`}
                      disabled={disabled || layers.length === 1}
                      onClick={() =>
                        mutate((d) => {
                          d.layers = d.layers.filter((x) => x.id !== l.id);
                          if (d.active === l.id)
                            d.active = d.layers[d.layers.length - 1].id;
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </li>
                ))}
              </ul>
              <label className="labs-slider">
                <span>
                  图层不透明度
                  <output>
                    {Math.round((selectedMeta?.opacity ?? 1) * 100)}%
                  </output>
                </span>
                <input
                  aria-label="图层不透明度"
                  type="range"
                  min={0}
                  max={100}
                  disabled={disabled}
                  value={Math.round((selectedMeta?.opacity ?? 1) * 100)}
                  onChange={(e) => {
                    selected().opacity = +e.target.value / 100;
                    dirty.current = true;
                    sync();
                    paint();
                  }}
                  onPointerUp={() => {
                    if (dirty.current) void commit();
                  }}
                  onKeyUp={() => {
                    if (dirty.current) void commit();
                  }}
                  onBlur={() => {
                    if (dirty.current) void commit();
                  }}
                />
              </label>
              <div className="wb-actions">
                <IconButton
                  label="图层上移"
                  disabled={
                    disabled || layers[layers.length - 1]?.id === active
                  }
                  onClick={() =>
                    mutate((d) => {
                      const i = d.layers.findIndex((l) => l.id === d.active);
                      [d.layers[i], d.layers[i + 1]] = [
                        d.layers[i + 1],
                        d.layers[i],
                      ];
                    })
                  }
                >
                  <ArrowUp size={14} />
                </IconButton>
                <IconButton
                  label="图层下移"
                  disabled={disabled || layers[0]?.id === active}
                  onClick={() =>
                    mutate((d) => {
                      const i = d.layers.findIndex((l) => l.id === d.active);
                      [d.layers[i], d.layers[i - 1]] = [
                        d.layers[i - 1],
                        d.layers[i],
                      ];
                    })
                  }
                >
                  <ArrowDown size={14} />
                </IconButton>
                <button
                  className="wb-button"
                  disabled={disabled}
                  onClick={() =>
                    mutate(() =>
                      selected()
                        .canvas.getContext("2d")!
                        .clearRect(0, 0, WIDTH, HEIGHT),
                    )
                  }
                >
                  <Eraser size={14} />
                  清空当前图层
                </button>
              </div>
            </section>
            <section className="labs-section">
              <h3>画纸</h3>
              <div className="labs-paper">
                <input
                  aria-label="画纸颜色"
                  type="color"
                  value={background || "#ffffff"}
                  disabled={disabled}
                  onChange={(e) =>
                    mutate((d) => {
                      d.background = e.target.value;
                    })
                  }
                />
                <label className="labs-checkbox">
                  <input
                    type="checkbox"
                    checked={background === null}
                    disabled={disabled}
                    onChange={(e) =>
                      mutate((d) => {
                        d.background = e.target.checked ? null : "#ffffff";
                      })
                    }
                  />
                  透明背景
                </label>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </Workbench>
  );
}
