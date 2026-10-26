import React, { useEffect, useRef, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Grid2X2,
  NotebookPen,
  Pause,
  Play,
  RotateCcw,
  StepForward,
  Trash2,
} from "lucide-react";
import { Workbench, IconButton } from "./ModuleWorkbench";
import { useModuleState } from "../lib/moduleSession";
import type { ExperienceEvidence } from "../lib/explorerStore";
import {
  normalizeWaves,
  phaseDifference,
  resultantAmplitude,
  sampleWave,
  verifyWaveExperiment,
  type WaveConfig,
  type WaveExperiment,
} from "../lib/wavePhysics";
import {
  WAVE_PRESETS,
  WAVE_TASKS,
  sampleWaveTrace,
  validWaveRecords,
  validWaves,
  type WaveRecord,
  type WaveView,
} from "../lib/labsWave";
import {
  csv,
  downloadLabFile,
  lineChartSvg,
  readLegacyLab,
} from "../lib/labsCommon";
import "./labs.css";

export default function WaveApp({
  onDiscover,
  reducedMotion = false,
}: {
  onClose: () => void;
  onDiscover?: (evidence: ExperienceEvidence) => void;
  reducedMotion?: boolean;
}) {
  const [waves, setWaves, available] = useModuleState<[WaveConfig, WaveConfig]>(
    "exbeam.wave.v2",
    () => readLegacyLab("exbeam.wave.v2", normalizeWaves),
    validWaves,
  );
  const [records, setRecords, recordsAvailable] = useModuleState<WaveRecord[]>(
    "exbeam.wave.records.v1",
    [],
    validWaveRecords,
  );
  const [playing, setPlaying] = useState(
    () =>
      !reducedMotion &&
      !(
        typeof matchMedia === "function" &&
        matchMedia("(prefers-reduced-motion: reduce)").matches
      ),
  );
  const [grid, setGrid] = useState(true),
    [view, setView] = useState<WaveView>("space");
  const [experiment, setExperiment] = useState<WaveExperiment>("destructive");
  const [feedback, setFeedback] = useState(""),
    [verified, setVerified] = useState(false);
  const [speed, setSpeed] = useState(1),
    [probe, setProbe] = useState(Math.PI);
  const [clock, setClock] = useState(0),
    [redraw, setRedraw] = useState(0),
    [note, setNote] = useState("");
  const [tab, setTab] = useState<"sources" | "records">("sources");
  const canvas = useRef<HTMLCanvasElement>(null),
    time = useRef(0);
  const current = WAVE_TASKS.find((t) => t.id === experiment)!;
  const amplitude = resultantAmplitude(...waves),
    beat = Math.abs(waves[0].frequency - waves[1].frequency);
  const a = sampleWave(waves[0], probe, clock),
    b = sampleWave(waves[1], probe, clock);
  useEffect(() => {
    if (reducedMotion) setPlaying(false);
  }, [reducedMotion]);
  useEffect(() => {
    const element = canvas.current,
      ctx = element?.getContext("2d");
    if (!element || !ctx) return;
    let frame = 0,
      previous = performance.now(),
      lastClock = 0;
    const draw = (now: number) => {
      if (playing && document.visibilityState === "visible")
        time.current = Math.min(
          3600,
          time.current + Math.min(0.05, (now - previous) / 1000) * speed,
        );
      previous = now;
      if (now - lastClock > 80 || !playing) {
        setClock(time.current);
        lastClock = now;
      }
      const { width, height } = element.getBoundingClientRect();
      if (width && height) {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        if (
          element.width !== Math.round(width * dpr) ||
          element.height !== Math.round(height * dpr)
        ) {
          element.width = Math.round(width * dpr);
          element.height = Math.round(height * dpr);
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#0c1014";
        ctx.fillRect(0, 0, width, height);
        const left = 45,
          right = width - 18,
          top = 22,
          bottom = height - 36;
        const center = (top + bottom) / 2,
          scale = (bottom - top) / 9;
        if (grid) {
          ctx.strokeStyle = "#ffffff10";
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let i = 0; i <= 12; i++) {
            const x = left + ((right - left) * i) / 12;
            ctx.moveTo(x, top);
            ctx.lineTo(x, bottom);
          }
          for (let i = -4; i <= 4; i++) {
            const y = center - i * scale;
            ctx.moveTo(left, y);
            ctx.lineTo(right, y);
          }
          ctx.stroke();
        }
        ctx.strokeStyle = "#ffffff45";
        ctx.beginPath();
        ctx.moveTo(left, center);
        ctx.lineTo(right, center);
        ctx.stroke();
        ctx.font = "11px sans-serif";
        ctx.fillStyle = "#8d9ba8";
        ctx.fillText("y", 16, 24);
        [-4, -2, 0, 2, 4].forEach((v) =>
          ctx.fillText(String(v), 12, center - v * scale + 4),
        );
        const trace = sampleWaveTrace(
          waves,
          view,
          time.current,
          probe,
          Math.max(200, Math.round(right - left)),
        );
        for (let i = 0; i <= 4; i++) {
          const p = trace[Math.round(((trace.length - 1) * i) / 4)];
          ctx.fillText(
            p.axis.toFixed(1),
            left + ((right - left) * i) / 4 - 10,
            height - 15,
          );
        }
        ctx.fillText(
          view === "space" ? "x / rad" : "t / s",
          right - 42,
          height - 2,
        );
        (["a", "b", "sum"] as const).forEach((key, index) => {
          ctx.strokeStyle = ["#81b9f9", "#f3a698", "#a0e7cc"][index];
          ctx.lineWidth = index === 2 ? 2.7 : 1.4;
          ctx.setLineDash(index === 2 ? [] : [5, 5]);
          ctx.beginPath();
          trace.forEach((p, i) => {
            const x = left + (i / (trace.length - 1)) * (right - left),
              y = center - p[key] * scale;
            if (!i) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        });
        ctx.setLineDash([]);
        if (view === "space") {
          const x = left + (probe / (Math.PI * 6)) * (right - left);
          ctx.strokeStyle = "#e8eef388";
          ctx.beginPath();
          ctx.moveTo(x, top);
          ctx.lineTo(x, bottom);
          ctx.stroke();
          ctx.fillStyle = "#a0e7cc";
          ctx.beginPath();
          ctx.arc(
            x,
            center -
              (sampleWave(waves[0], probe, time.current) +
                sampleWave(waves[1], probe, time.current)) *
                scale,
            4,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
      if (playing) frame = requestAnimationFrame(draw);
    };
    const observer = new ResizeObserver(() => {
      if (!playing) draw(performance.now());
    });
    observer.observe(element);
    draw(performance.now());
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [waves, playing, grid, view, probe, speed, redraw]);
  const seek = (value: number) => {
    time.current = Math.max(0, Math.min(3600, value));
    setClock(time.current);
    setPlaying(false);
    setRedraw((r) => r + 1);
  };
  const change = (index: number, field: keyof WaveConfig, value: number) => {
    setWaves(
      (previous) =>
        previous.map((w, i) =>
          i === index ? { ...w, [field]: value } : w,
        ) as [WaveConfig, WaveConfig],
    );
    setVerified(false);
    setFeedback("");
  };
  const record = (isVerified: boolean) => {
    if (records.length >= 100) {
      setFeedback("记录已达 100 条，请先导出记录再移除旧项。");
      return;
    }
    setRecords((previous) => [
      {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        waves: normalizeWaves(waves),
        time: time.current,
        task: experiment,
        verified: isVerified,
        note: note.trim(),
        view,
        probe,
        speed,
      },
      ...previous,
    ]);
  };
  const verify = () => {
    const passed = verifyWaveExperiment(experiment, ...waves);
    setVerified(passed);
    if (!passed) {
      setFeedback(
        experiment === "beats"
          ? "需要两个非零波源；频率差须大于 0 且不超过 0.5 Hz。"
          : `需要非零、等振幅、同频波源；相位差应为 ${experiment === "constructive" ? "0" : "180"}°。`,
      );
      return;
    }
    setFeedback(current.explanation);
    record(true);
    onDiscover?.({
      key: `wave-${experiment}`,
      kind: "experiment",
      title: `${current.title} · 验证成功`,
      detail: `${current.explanation}\n${waves.map((w, i) => `源${i + 1}：A=${w.amplitude}，f=${w.frequency} Hz，φ=${w.phase}°`).join("；")}`,
    });
  };
  const exportTrace = (format: "csv" | "svg") => {
    const rows = sampleWaveTrace(waves, view, time.current, probe);
    const metadata = `t=${time.current.toFixed(3)}s; probe=${probe.toFixed(3)}rad; ${waves.map((w, i) => `source${i + 1}: A=${w.amplitude}, f=${w.frequency}Hz, phase=${w.phase}deg`).join("; ")}`;
    if (format === "csv")
      downloadLabFile(
        "wave-samples.csv",
        csv([
          [
            "model",
            "view",
            view === "space" ? "x_rad" : "time_s",
            "source_1",
            "source_2",
            "sum",
            "snapshot_time_s",
            "probe_rad",
            "A1",
            "f1_Hz",
            "phase1_deg",
            "A2",
            "f2_Hz",
            "phase2_deg",
          ],
          ...rows.map((p) => [
            "linear superposition",
            view,
            p.axis,
            p.a,
            p.b,
            p.sum,
            time.current,
            probe,
            waves[0].amplitude,
            waves[0].frequency,
            waves[0].phase,
            waves[1].amplitude,
            waves[1].frequency,
            waves[1].phase,
          ]),
        ]),
      );
    else
      downloadLabFile(
        "wave-chart.svg",
        lineChartSvg(
          "波动实验 / Linear superposition",
          (["a", "b", "sum"] as const).map((key, i) => ({
            name: ["源 1", "源 2", "合成波"][i],
            color: ["#81b9f9", "#f3a698", "#a0e7cc"][i],
            points: rows.map((p) => [p.axis, p[key]]),
          })),
          view === "space" ? "x / rad" : "t / s",
          "位移 / 任意单位",
          metadata,
        ),
        "image/svg+xml",
      );
    setFeedback(
      format === "csv" ? "当前采样数据已生成。" : "当前图表 SVG 已生成。",
    );
  };
  return (
    <Workbench
      title="波动实验室"
      eyebrow="WAVE INTERFERENCE"
      className="labs-workbench labs-wave"
      toolbar={
        <>
          <IconButton
            label={playing ? "暂停实验" : "播放实验"}
            onClick={() => setPlaying(!playing)}
          >
            {playing ? <Pause size={17} /> : <Play size={17} />}
          </IconButton>
          <IconButton
            label="前进 0.05 秒"
            onClick={() => seek(time.current + 0.05)}
          >
            <StepForward size={17} />
          </IconButton>
          <IconButton
            label="重置参数和时间"
            onClick={() => {
              setWaves(normalizeWaves(null));
              seek(0);
              setVerified(false);
              setFeedback("");
            }}
          >
            <RotateCcw size={17} />
          </IconButton>
          <IconButton label="导出采样 CSV" onClick={() => exportTrace("csv")}>
            <FileSpreadsheet size={17} />
          </IconButton>
          <IconButton label="导出图表 SVG" onClick={() => exportTrace("svg")}>
            <Download size={17} />
          </IconButton>
        </>
      }
      status={
        <>
          <span>
            {available && recordsAvailable
              ? "参数与记录已保存在本机"
              : "本机保存不可用，请导出数据"}
          </span>
          <span>理想线性叠加 · 位移为任意单位</span>
          <span>t = {clock.toFixed(2)} s</span>
        </>
      }
    >
      <div className="labs-layout">
        <main className="labs-stage">
          <div className="wb-tabs" aria-label="波形视图">
            <button
              aria-pressed={view === "space"}
              onClick={() => setView("space")}
            >
              空间快照
            </button>
            <button
              aria-pressed={view === "time"}
              onClick={() => setView("time")}
            >
              定点时间曲线 · 12 s
            </button>
          </div>
          <div className="labs-legend">
            <span style={{ color: "#81b9f9" }}>源 1</span>
            <span style={{ color: "#f3a698" }}>源 2</span>
            <span style={{ color: "#a0e7cc" }}>合成波</span>
            <label>
              <input
                type="checkbox"
                checked={grid}
                onChange={(e) => setGrid(e.target.checked)}
              />
              <Grid2X2 size={13} />
              网格
            </label>
          </div>
          <canvas
            ref={canvas}
            aria-label="两列波和合成波的干涉图"
            className="labs-wave-canvas"
          />
          <div className="labs-stats">
            <div className="wb-stat">
              <span>相位差</span>
              <strong>
                {phaseDifference(waves[0].phase, waves[1].phase).toFixed(0)}°
              </strong>
            </div>
            <div className="wb-stat">
              <span>{amplitude === null ? "频率差 / 拍频" : "合成振幅"}</span>
              <strong>
                {amplitude === null
                  ? `${beat.toFixed(2)} Hz`
                  : amplitude.toFixed(3)}
              </strong>
            </div>
            <div className="wb-stat">
              <span>探针合成位移</span>
              <strong>{(a + b).toFixed(3)}</strong>
            </div>
          </div>
          <div className="labs-inline-fields">
            <label className="wb-field">
              探针 x / rad
              <input
                aria-label="探针位置"
                type="range"
                min={0}
                max={Math.PI * 6}
                step={0.01}
                value={probe}
                onChange={(e) => setProbe(+e.target.value)}
              />
            </label>
            <label className="wb-field">
              时间 / s
              <input
                aria-label="实验时间"
                type="number"
                min={0}
                max={3600}
                step={0.05}
                value={Number(clock.toFixed(2))}
                onChange={(e) => seek(+e.target.value)}
              />
            </label>
            <label className="wb-field">
              播放速率
              <select value={speed} onChange={(e) => setSpeed(+e.target.value)}>
                {[0.25, 0.5, 1, 2].map((v) => (
                  <option key={v} value={v}>
                    {v}×
                  </option>
                ))}
              </select>
            </label>
          </div>
          {feedback && (
            <p className="wb-notice labs-feedback" role="status">
              {feedback}
            </p>
          )}
        </main>
        <aside className="labs-inspector">
          <div className="wb-tabs">
            <button
              aria-pressed={tab === "sources"}
              onClick={() => setTab("sources")}
            >
              波源与任务
            </button>
            <button
              aria-pressed={tab === "records"}
              onClick={() => setTab("records")}
            >
              记录 {records.length}
            </button>
          </div>
          {tab === "sources" ? (
            <div className="labs-inspector-body">
              <label className="wb-field">
                实验预设
                <select
                  aria-label="波动预设"
                  defaultValue=""
                  onChange={(e) => {
                    const preset = WAVE_PRESETS.find(
                      (p) => p.id === e.target.value,
                    );
                    if (preset) {
                      setWaves(normalizeWaves(preset.waves));
                      setVerified(false);
                      setFeedback("");
                      seek(0);
                    }
                  }}
                >
                  <option value="" disabled>
                    选择一组波源
                  </option>
                  {WAVE_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </label>
              {waves.map((wave, index) => (
                <fieldset className="labs-fieldset" key={index}>
                  <legend
                    style={{ color: index === 0 ? "#81b9f9" : "#f3a698" }}
                  >
                    波源 {index + 1}
                  </legend>
                  {(
                    [
                      {
                        field: "amplitude",
                        label: "振幅",
                        min: 0,
                        max: 2,
                        step: 0.1,
                        unit: "",
                      },
                      {
                        field: "frequency",
                        label: "频率",
                        min: 0.2,
                        max: 3,
                        step: 0.1,
                        unit: " Hz",
                      },
                      {
                        field: "phase",
                        label: "相位",
                        min: 0,
                        max: 360,
                        step: 1,
                        unit: "°",
                      },
                    ] as const
                  ).map((c) => (
                    <label className="labs-slider" key={c.field}>
                      <span>
                        {c.label}
                        <output>
                          {wave[c.field].toFixed(c.field === "phase" ? 0 : 1)}
                          {c.unit}
                        </output>
                      </span>
                      <input
                        aria-label={`波源 ${index + 1} ${c.label}`}
                        type="range"
                        min={c.min}
                        max={c.max}
                        step={c.step}
                        value={wave[c.field]}
                        onChange={(e) =>
                          change(index, c.field, +e.target.value)
                        }
                      />
                    </label>
                  ))}
                </fieldset>
              ))}
              <section className="labs-section">
                <h3>
                  <Activity size={15} />
                  实验任务
                </h3>
                <label className="wb-field">
                  <select
                    aria-label="选择波动实验"
                    value={experiment}
                    onChange={(e) => {
                      setExperiment(e.target.value as WaveExperiment);
                      setVerified(false);
                      setFeedback("");
                    }}
                  >
                    {WAVE_TASKS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </label>
                <p>{current.question}</p>
                <button className="wb-button is-primary" onClick={verify}>
                  {verified ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <Activity size={16} />
                  )}
                  {verified ? "再次验证并记录" : "验证并记录"}
                </button>
              </section>
              <label className="wb-field">
                观察笔记
                <textarea
                  value={note}
                  maxLength={200}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                />
              </label>
              <button
                className="wb-button"
                disabled={records.length >= 100}
                onClick={() => {
                  record(false);
                  setFeedback("已记录当前参数，可在记录中恢复。");
                }}
              >
                <NotebookPen size={15} />
                记录当前状态
              </button>
            </div>
          ) : (
            <div className="labs-inspector-body">
              <button
                className="wb-button"
                disabled={!records.length}
                onClick={() =>
                  downloadLabFile(
                    "wave-records.csv",
                    csv([
                      [
                        "at",
                        "task",
                        "verified",
                        "time_s",
                        "A1",
                        "f1",
                        "phase1",
                        "A2",
                        "f2",
                        "phase2",
                        "note",
                        "view",
                        "probe_rad",
                        "speed",
                      ],
                      ...records.map((r) => [
                        r.at,
                        r.task,
                        r.verified,
                        r.time,
                        r.waves[0].amplitude,
                        r.waves[0].frequency,
                        r.waves[0].phase,
                        r.waves[1].amplitude,
                        r.waves[1].frequency,
                        r.waves[1].phase,
                        r.note,
                        r.view || "space",
                        r.probe ?? Math.PI,
                        r.speed ?? 1,
                      ]),
                    ]),
                  )
                }
              >
                <Download size={15} />
                导出全部记录
              </button>
              {!records.length && <div className="wb-empty">暂无实验记录</div>}
              <ul className="wb-list">
                {records.map((r) => (
                  <li key={r.id} className="labs-record">
                    <strong>
                      {WAVE_TASKS.find((t) => t.id === r.task)?.title} ·{" "}
                      {r.verified ? "已验证" : "观察"}
                    </strong>
                    <small>
                      {new Date(r.at).toLocaleString("zh-CN")} ·{" "}
                      {r.time.toFixed(2)} s
                    </small>
                    <p>
                      {r.note ||
                        r.waves
                          .map(
                            (w) =>
                              `${w.amplitude} / ${w.frequency} Hz / ${w.phase}°`,
                          )
                          .join("；")}
                    </p>
                    <div className="wb-actions">
                      <button
                        className="wb-button"
                        onClick={() => {
                          setWaves(normalizeWaves(r.waves));
                          setExperiment(r.task);
                          setView(r.view || "space");
                          setProbe(r.probe ?? Math.PI);
                          setSpeed(r.speed ?? 1);
                          setNote(r.note);
                          setVerified(false);
                          seek(r.time);
                          setFeedback("已恢复记录参数。");
                          setTab("sources");
                        }}
                      >
                        恢复参数
                      </button>
                      <IconButton
                        label="移除此条波动记录"
                        onClick={() =>
                          setRecords(records.filter((item) => item.id !== r.id))
                        }
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </Workbench>
  );
}
