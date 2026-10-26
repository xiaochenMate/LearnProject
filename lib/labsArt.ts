import { finiteBetween } from "./labsCommon";
export const ART_WIDTH = 1000,
  ART_HEIGHT = 700;
export interface ArtLayerMeta {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
}
export interface ArtLayerSnapshot extends ArtLayerMeta {
  image: Blob;
}
export interface ArtProject {
  version: 1;
  width: number;
  height: number;
  background: string | null;
  active: string;
  layers: ArtLayerSnapshot[];
}
export type ArtTool =
  "pen" | "marker" | "eraser" | "line" | "rectangle" | "ellipse" | "picker";
export interface ArtPoint {
  x: number;
  y: number;
}
export function canvasPoint(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): ArtPoint {
  return {
    x: Math.max(
      0,
      Math.min(ART_WIDTH, ((clientX - rect.left) / rect.width) * ART_WIDTH),
    ),
    y: Math.max(
      0,
      Math.min(ART_HEIGHT, ((clientY - rect.top) / rect.height) * ART_HEIGHT),
    ),
  };
}
export function shapeBounds(a: ArtPoint, b: ArtPoint, constrained = false) {
  let dx = b.x - a.x,
    dy = b.y - a.y;
  if (constrained) {
    const side = Math.max(Math.abs(dx), Math.abs(dy));
    dx = (dx < 0 ? -1 : 1) * side;
    dy = (dy < 0 ? -1 : 1) * side;
  }
  return {
    x: Math.min(a.x, a.x + dx),
    y: Math.min(a.y, a.y + dy),
    width: Math.abs(dx),
    height: Math.abs(dy),
    endX: a.x + dx,
    endY: a.y + dy,
  };
}
export function validArtMeta(value: unknown): boolean {
  const p = value as ArtProject;
  return (
    !!p &&
    p.version === 1 &&
    p.width === ART_WIDTH &&
    p.height === ART_HEIGHT &&
    (p.background === null ||
      (typeof p.background === "string" &&
        /^#[\da-f]{6}$/i.test(p.background))) &&
    Array.isArray(p.layers) &&
    p.layers.length > 0 &&
    p.layers.length <= 4 &&
    new Set(p.layers.map((l) => l?.id)).size === p.layers.length &&
    p.layers.some((l) => l?.id === p.active) &&
    p.layers.every(
      (l) =>
        l &&
        typeof l.id === "string" &&
        l.id.length <= 100 &&
        typeof l.name === "string" &&
        l.name.length <= 60 &&
        typeof l.visible === "boolean" &&
        finiteBetween(l.opacity, 0, 1),
    )
  );
}
export function validArtProject(value: unknown): value is ArtProject {
  const p = value as ArtProject;
  return (
    validArtMeta(value) &&
    p.layers.every(
      (l) =>
        l.image instanceof Blob &&
        l.image.type === "image/png" &&
        l.image.size <= 8_000_000,
    )
  );
}
export function canvasBlob(canvas: HTMLCanvasElement, type = "image/png") {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("图像编码失败"))),
      type,
      0.94,
    ),
  );
}
export function imageFromBlob(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image(),
      url = URL.createObjectURL(blob);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图像读取失败"));
    };
    image.src = url;
  });
}
export async function serializeArtProject(project: ArtProject) {
  const layers = await Promise.all(
    project.layers.map(async (l) => ({
      ...l,
      image: await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(l.image);
      }),
    })),
  );
  return JSON.stringify({ product: "ExBeam Art", ...project, layers });
}
export async function parseArtProject(text: string): Promise<ArtProject> {
  if (text.length > 35_000_000) throw new Error("工程文件超过 35 MB");
  const value = JSON.parse(text);
  if (
    value.product !== "ExBeam Art" ||
    !validArtMeta(value) ||
    value.layers.some(
      (l: { image: unknown }) =>
        typeof l.image !== "string" ||
        !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(l.image),
    )
  )
    throw new Error("不是有效的 ExBeam 分层画作");
  const layers = await Promise.all(
    value.layers.map(async (l: ArtLayerMeta & { image: string }) => {
      const bytes = atob(l.image.split(",")[1]);
      const data = Uint8Array.from(bytes, (c) => c.charCodeAt(0));
      return { ...l, image: new Blob([data], { type: "image/png" }) };
    }),
  );
  const project = { ...value, layers };
  if (!validArtProject(project)) throw new Error("工程图层无效");
  return project;
}
