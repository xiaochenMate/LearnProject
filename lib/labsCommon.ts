export function csv(rows: unknown[][]) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            const raw = String(value ?? "");
            const safe =
              typeof value === "string" && /^[=+\-@\t\r]/.test(raw)
                ? `'${raw}`
                : raw;
            return `"${safe.replace(/"/g, '""')}"`;
          })
          .join(","),
      )
      .join("\r\n")
  );
}

export function downloadLabFile(
  name: string,
  value: string | Blob,
  type = "text/csv;charset=utf-8",
) {
  const url = URL.createObjectURL(
    value instanceof Blob ? value : new Blob([value], { type }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function readLegacyLab<T>(
  key: string,
  normalize: (value: unknown) => T,
): T {
  try {
    return normalize(JSON.parse(window.localStorage.getItem(key) || "null"));
  } catch {
    return normalize(null);
  }
}

export function finiteBetween(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

export function escapeXml(value: unknown) {
  return String(value).replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
}

export function lineChartSvg(
  title: string,
  series: { name: string; color: string; points: [number, number][] }[],
  xLabel: string,
  yLabel: string,
  note = "",
) {
  const points = series.flatMap((s) => s.points);
  if (!points.length || points.some((p) => p.some((n) => !Number.isFinite(n))))
    throw new Error("图表没有可用数据");
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(0, ...ys),
    maxY = Math.max(0, ...ys);
  const spanY = maxY - minY || 1,
    spanX = maxX - minX || 1;
  const x = (n: number) => 90 + ((n - minX) / spanX) * 1030;
  const y = (n: number) => 510 - ((n - minY) / spanY) * 370;
  const ticks = Array.from({ length: 6 }, (_, i) => {
    const xv = minX + (spanX * i) / 5,
      yv = minY + (spanY * i) / 5;
    return `<path d="M${x(xv)},140V510 M90,${y(yv)}H1120" stroke="#ffffff16"/><text x="${x(xv)}" y="534" text-anchor="middle">${xv.toFixed(2)}</text><text x="78" y="${y(yv) + 4}" text-anchor="end">${yv.toFixed(2)}</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="620" viewBox="0 0 1200 620"><rect width="1200" height="620" fill="#0c1014"/><g fill="#e8eef3" font-family="sans-serif" font-size="13"><text x="90" y="45" font-size="24">${escapeXml(title)}</text><text x="90" y="75" fill="#8d9ba8">${escapeXml(note)}</text>${series.map((s, i) => `<text x="${90 + i * 230}" y="110" fill="${s.color}">${escapeXml(s.name)}</text>`).join("")}${ticks}${series.map((s) => `<polyline fill="none" stroke="${s.color}" stroke-width="2.5" points="${s.points.map((p) => `${x(p[0]).toFixed(2)},${y(p[1]).toFixed(2)}`).join(" ")}"/>`).join("")}<text x="605" y="580" text-anchor="middle">${escapeXml(xLabel)}</text><text x="90" y="605">${escapeXml(yLabel)}</text></g></svg>`;
}
