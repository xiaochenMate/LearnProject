import React, { useState } from "react";
import {
  ArrowRight,
  Bird,
  Bug,
  CheckCircle2,
  CircleDot,
  Download,
  FileSpreadsheet,
  Fish,
  Leaf,
  Link2,
  NotebookPen,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { Workbench, IconButton } from "./ModuleWorkbench";
import { useModuleState } from "../lib/moduleSession";
import type { ExperienceEvidence } from "../lib/explorerStore";
import {
  ECO_PRESETS,
  SPECIES,
  SPECIES_BY_ID,
  checkTopology,
  ecologyChartSvg,
  energyLevels,
  initialEcoState,
  legacyEcoState,
  nextSpecies,
  validEcoRecords,
  validEcoState,
  validateLabChain,
  type EcoRecord,
  type EcoState,
  type LabSpecies,
} from "../lib/labsEcology";
import { csv, downloadLabFile } from "../lib/labsCommon";
import "./labs.css";

const TASKS = [
  {
    id: "chain",
    name: "建立捕食链",
    text: "至少三个营养级，生产者在起点，箭头指向摄食者。",
  },
  {
    id: "budget",
    name: "顶级能量预算",
    text: "保持合法捕食链，让末级可用能量达到你设置的实验目标。",
  },
  {
    id: "disruption",
    name: "移除一个营养级",
    text: "移除中间营养级，观察这条单一路径中失去能量供应的成员。",
  },
];
function SpeciesIcon({
  kind,
  size = 25,
}: {
  kind: LabSpecies["kind"];
  size?: number;
}) {
  const Icon =
    kind === "plant"
      ? Leaf
      : kind === "bug"
        ? Bug
        : kind === "bird"
          ? Bird
          : kind === "fish"
            ? Fish
            : CircleDot;
  return <Icon size={size} />;
}

export default function FoodChainApp({
  onDiscover,
}: {
  onClose: () => void;
  onDiscover?: (evidence: ExperienceEvidence) => void;
}) {
  const [state, setState, available] = useModuleState<EcoState>(
    "exbeam.ecology.lab.v1",
    () => {
      try {
        return initialEcoState(window.localStorage);
      } catch {
        return legacyEcoState(null);
      }
    },
    validEcoState,
  );
  const [records, setRecords, recordsAvailable] = useModuleState<EcoRecord[]>(
    "exbeam.ecology.records.v1",
    [],
    validEcoRecords,
  );
  const [feedback, setFeedback] = useState(""),
    [note, setNote] = useState("");
  const [task, setTask] = useState("chain"),
    [tab, setTab] = useState<"members" | "records">("members");
  const { chain, habitat, initial, efficiency, target, removed } = state;
  const topology = checkTopology(chain, habitat),
    validation = validateLabChain(chain, habitat);
  const rows = topology ? [] : energyLevels(chain, initial, efficiency);
  const removedIndex = removed ? chain.indexOf(removed) : -1;
  const lastEnergy = rows.length ? rows[rows.length - 1].energy : 0;
  const options = nextSpecies(chain, habitat);
  const update = (patch: Partial<EcoState>) => {
    setState((s) => ({ ...s, ...patch }));
    setFeedback("");
  };
  const record = () => {
    if (records.length >= 100) {
      setFeedback("记录已达 100 条，请先导出再移除旧项。");
      return;
    }
    setRecords((previous) => [
      {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        state: { ...state, chain: [...chain] },
        task,
        note,
      },
      ...previous,
    ]);
  };
  const verify = () => {
    if (!validation.valid) {
      setFeedback(validation.message);
      return;
    }
    if (task !== "disruption" && removed) {
      setFeedback("请先恢复被移除的营养级，再验证完整能量链。");
      return;
    }
    if (task === "budget" && lastEnergy < target) {
      setFeedback(
        `末级仅有 ${lastEnergy.toPrecision(3)} kJ，尚未达到 ${target} kJ 的自定目标。`,
      );
      return;
    }
    if (
      task === "disruption" &&
      (removedIndex <= 0 || removedIndex >= chain.length - 1)
    ) {
      setFeedback("选择一个中间营养级进行移除实验。");
      return;
    }
    const message =
      task === "disruption"
        ? `${SPECIES_BY_ID.get(removed!)!.name}被移除；此单一路径中，其后 ${chain.length - removedIndex - 1} 级失去输入。真实食物网可能还有其他食物来源。`
        : `${validation.message} 末级能量 ${lastEnergy.toPrecision(4)} kJ；本实验采用 ${(efficiency * 100).toFixed(0)}% 的统一传递效率。`;
    setFeedback(message);
    record();
    onDiscover?.({
      key: `eco-${task}-${chain.join("-")}`,
      kind: "experiment",
      title: `生态实验 · ${TASKS.find((t) => t.id === task)!.name}`,
      detail: `${chain.map((id) => SPECIES_BY_ID.get(id)!.name).join(" → ")}\n生产者 ${initial} kJ；${message}`,
    });
  };
  const effectiveEnergy = (index: number, value: number) =>
    removedIndex >= 0 && index >= removedIndex ? 0 : value;
  const exportData = () => {
    if (!rows.length) return;
    downloadLabFile(
      "ecology-energy.csv",
      csv([
        [
          "model",
          "habitat",
          "level",
          "species",
          "baseline_kJ",
          "scenario_kJ",
          "transferred_kJ",
          "untransferred_kJ",
          "efficiency",
          "removed_species",
          "target_kJ",
        ],
        ...rows.map((r, i) => [
          "single path teaching model; not field measurements",
          habitat,
          r.level,
          SPECIES_BY_ID.get(r.id)!.name,
          r.energy,
          effectiveEnergy(i, r.energy),
          effectiveEnergy(i, r.transferred),
          effectiveEnergy(i, r.untransferred),
          efficiency,
          removed || "",
          target,
        ]),
      ]),
    );
    setFeedback("能量预算 CSV 已生成。");
  };
  const exportChart = () => {
    if (!rows.length) return;
    const svg = ecologyChartSvg(state);
    downloadLabFile("ecology-energy.svg", svg, "image/svg+xml");
    setFeedback("能量图表 SVG 已生成。");
  };
  return (
    <Workbench
      title="生态连接实验室"
      eyebrow="ENERGY & LIVING SYSTEMS"
      className="labs-workbench labs-ecology"
      toolbar={
        <>
          <IconButton
            label="清空食物链"
            disabled={!chain.length}
            onClick={() => update({ chain: [], removed: null })}
          >
            <RotateCcw size={17} />
          </IconButton>
          <IconButton
            label="导出能量 CSV"
            disabled={!rows.length}
            onClick={exportData}
          >
            <FileSpreadsheet size={17} />
          </IconButton>
          <IconButton
            label="导出能量图表 SVG"
            disabled={!rows.length}
            onClick={exportChart}
          >
            <Download size={17} />
          </IconButton>
        </>
      }
      status={
        <>
          <span>
            {available && recordsAvailable
              ? "构建与实验记录已保存在本机"
              : "本机保存不可用，请导出数据"}
          </span>
          <span>简化示例食性 · 不代表完整食物网</span>
          <span>{chain.length} / 6 营养级</span>
        </>
      }
    >
      <div className="labs-layout">
        <main className="labs-stage">
          <div className="labs-stage-heading">
            <div>
              <h3>{habitat === "meadow" ? "草地" : "池塘"} · 能量传递</h3>
              <span>
                食物 <ArrowRight size={13} /> 摄食者
              </span>
            </div>
            <label className="wb-field">
              配置预设
              <select
                aria-label="生态预设"
                value=""
                onChange={(e) => {
                  const p = ECO_PRESETS.find(
                    (preset) => preset.id === e.target.value,
                  );
                  if (p)
                    update({
                      habitat: p.habitat,
                      chain: [...p.chain],
                      removed: null,
                    });
                }}
              >
                <option value="" disabled>
                  载入一条示例链
                </option>
                {ECO_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="labs-eco-chain" aria-label="当前食物链">
            {!chain.length ? (
              <div className="wb-empty">
                <Leaf size={40} />
                <strong>生产者是起点</strong>
              </div>
            ) : (
              chain.map((id, index) => {
                const species = SPECIES_BY_ID.get(id)!;
                return (
                  <React.Fragment key={id}>
                    {index > 0 && (
                      <ArrowRight className="labs-eco-arrow" size={20} />
                    )}
                    <div
                      className={`labs-species ${removedIndex >= 0 && index >= removedIndex ? "is-disrupted" : ""}`}
                    >
                      <IconButton
                        label={`移除${species.name}`}
                        className="labs-node-remove"
                        onClick={() =>
                          update({
                            chain: chain.filter((_, i) => i !== index),
                            removed: null,
                          })
                        }
                      >
                        <X size={12} />
                      </IconButton>
                      <SpeciesIcon kind={species.kind} size={35} />
                      <strong>{species.name}</strong>
                      <small>{species.role}</small>
                      <span>第 {index + 1} 营养级</span>
                    </div>
                  </React.Fragment>
                );
              })
            )}
          </div>
          {topology && chain.length > 0 && (
            <p className="wb-notice is-error labs-feedback">{topology}</p>
          )}
          <div className="labs-stats">
            <div className="wb-stat">
              <span>生产者能量</span>
              <strong>
                {initial.toLocaleString()} <small>kJ</small>
              </strong>
            </div>
            <div className="wb-stat">
              <span>末级基线</span>
              <strong>
                {rows.length ? lastEnergy.toPrecision(3) : "—"}{" "}
                <small>kJ</small>
              </strong>
            </div>
            <div className="wb-stat">
              <span>末级 / 生产者</span>
              <strong>
                {rows.length
                  ? `${((lastEnergy / initial) * 100).toPrecision(3)}%`
                  : "—"}
              </strong>
            </div>
          </div>
          <section className="labs-energy">
            <h3>
              能量预算 <small>线性比例 · kJ</small>
            </h3>
            {rows.map((r, i) => (
              <div className="labs-energy-row" key={r.id}>
                <span>{SPECIES_BY_ID.get(r.id)!.name}</span>
                <div className="labs-energy-track">
                  <div
                    style={{ width: `${(r.energy / initial) * 100}%` }}
                    className={
                      removedIndex >= 0 && i >= removedIndex
                        ? "is-disrupted"
                        : ""
                    }
                  />
                </div>
                <output>{effectiveEnergy(i, r.energy).toPrecision(3)}</output>
              </div>
            ))}
            {!rows.length && (
              <p className="wb-muted">能量图等待合法的生产者起始链。</p>
            )}
            <p className="labs-model-note">
              效率是可调实验假设，不是所有物种固定
              10%。未传入下一级的能量包括呼吸、未摄食与未同化部分；此处不模拟数量或种群时间变化。
            </p>
            <a
              href="https://openstax.org/books/biology-2e/pages/46-2-energy-flow-through-ecosystems"
              target="_blank"
              rel="noreferrer"
            >
              能量传递概念来源 · OpenStax
            </a>
          </section>
          {feedback && (
            <p className="wb-notice labs-feedback" role="status">
              {feedback}
            </p>
          )}
        </main>
        <aside className="labs-inspector">
          <div className="wb-tabs">
            <button
              aria-pressed={tab === "members"}
              onClick={() => setTab("members")}
            >
              生境与任务
            </button>
            <button
              aria-pressed={tab === "records"}
              onClick={() => setTab("records")}
            >
              记录 {records.length}
            </button>
          </div>
          {tab === "members" ? (
            <div className="labs-inspector-body">
              <div className="wb-tabs">
                <button
                  aria-pressed={habitat === "meadow"}
                  onClick={() =>
                    update({ habitat: "meadow", chain: [], removed: null })
                  }
                >
                  草地
                </button>
                <button
                  aria-pressed={habitat === "pond"}
                  onClick={() =>
                    update({ habitat: "pond", chain: [], removed: null })
                  }
                >
                  池塘
                </button>
              </div>
              <h3>
                <Leaf size={15} />
                生态成员
              </h3>
              <div className="labs-species-library">
                {SPECIES.filter((s) => s.habitat === habitat).map((s) => (
                  <button
                    className="wb-button"
                    key={s.id}
                    title={s.role}
                    disabled={
                      chain.includes(s.id) ||
                      chain.length >= 6 ||
                      !options.some((o) => o.id === s.id)
                    }
                    onClick={() =>
                      update({ chain: [...chain, s.id], removed: null })
                    }
                  >
                    <SpeciesIcon kind={s.kind} size={20} />
                    <span>{s.name}</span>
                    {chain.includes(s.id) ? (
                      <CheckCircle2 size={13} />
                    ) : (
                      <Plus size={13} />
                    )}
                  </button>
                ))}
              </div>
              <section className="labs-section">
                <h3>
                  <Link2 size={15} />
                  能量条件
                </h3>
                <label className="labs-slider">
                  <span>
                    生产者能量<output>{initial.toLocaleString()} kJ</output>
                  </span>
                  <input
                    aria-label="生产者能量"
                    type="range"
                    min={100}
                    max={100000}
                    step={100}
                    value={initial}
                    onChange={(e) => update({ initial: +e.target.value })}
                  />
                </label>
                <label className="labs-slider">
                  <span>
                    逐级传递效率
                    <output>{(efficiency * 100).toFixed(0)}%</output>
                  </span>
                  <input
                    aria-label="传递效率"
                    type="range"
                    min={5}
                    max={20}
                    step={1}
                    value={Math.round(efficiency * 100)}
                    onChange={(e) =>
                      update({ efficiency: +e.target.value / 100 })
                    }
                  />
                </label>
                <label className="wb-field">
                  末级自定目标 / kJ
                  <input
                    type="number"
                    min={0.1}
                    max={1000}
                    step={0.1}
                    value={target}
                    onChange={(e) => {
                      const n = +e.target.value;
                      if (n >= 0.1 && n <= 1000) update({ target: n });
                    }}
                  />
                </label>
                <label className="wb-field">
                  移除实验
                  <select
                    aria-label="移除营养级"
                    value={removed || ""}
                    onChange={(e) =>
                      update({ removed: e.target.value || null })
                    }
                  >
                    <option value="">完整能量链</option>
                    {chain.map((id) => (
                      <option key={id} value={id}>
                        移除 {SPECIES_BY_ID.get(id)!.name}
                      </option>
                    ))}
                  </select>
                </label>
              </section>
              <section className="labs-section">
                <h3>
                  <CheckCircle2 size={15} />
                  实验任务
                </h3>
                <label className="wb-field">
                  <select
                    aria-label="生态实验任务"
                    value={task}
                    onChange={(e) => {
                      setTask(e.target.value);
                      setFeedback("");
                    }}
                  >
                    {TASKS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <p>{TASKS.find((t) => t.id === task)!.text}</p>
                <button className="wb-button is-primary" onClick={verify}>
                  <CheckCircle2 size={16} />
                  验证并记录
                </button>
              </section>
              <label className="wb-field">
                观察笔记
                <textarea
                  value={note}
                  maxLength={200}
                  rows={2}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <button
                className="wb-button"
                disabled={!chain.length || records.length >= 100}
                onClick={() => {
                  record();
                  setFeedback("当前构建与条件已记录。");
                }}
              >
                <NotebookPen size={15} />
                记录当前状态
              </button>
              <p className="labs-model-note">
                分解者分解遗体和排出物，使物质回到环境。能量逐渐散失，不形成闭环。
              </p>
            </div>
          ) : (
            <div className="labs-inspector-body">
              <button
                className="wb-button"
                disabled={!records.length}
                onClick={() =>
                  downloadLabFile(
                    "ecology-records.csv",
                    csv([
                      [
                        "at",
                        "habitat",
                        "chain",
                        "initial_kJ",
                        "efficiency",
                        "target_kJ",
                        "removed",
                        "task",
                        "note",
                      ],
                      ...records.map((r) => [
                        r.at,
                        r.state.habitat,
                        r.state.chain.join(" -> "),
                        r.state.initial,
                        r.state.efficiency,
                        r.state.target,
                        r.state.removed,
                        r.task,
                        r.note,
                      ]),
                    ]),
                  )
                }
              >
                <Download size={15} />
                导出全部记录
              </button>
              {!records.length && <div className="wb-empty">暂无生态记录</div>}
              <ul className="wb-list">
                {records.map((r) => (
                  <li key={r.id} className="labs-record">
                    <strong>
                      {r.state.chain
                        .map((id) => SPECIES_BY_ID.get(id)!.name)
                        .join(" → ")}
                    </strong>
                    <small>{new Date(r.at).toLocaleString("zh-CN")}</small>
                    <p>
                      {r.note ||
                        `${r.state.initial} kJ · ${r.state.efficiency * 100}%`}
                    </p>
                    <div className="wb-actions">
                      <button
                        className="wb-button"
                        onClick={() => {
                          setState(r.state);
                          setNote(r.note);
                          setTask(
                            TASKS.some((t) => t.id === r.task)
                              ? r.task
                              : "chain",
                          );
                          setFeedback("已恢复实验条件。");
                          setTab("members");
                        }}
                      >
                        恢复实验
                      </button>
                      <IconButton
                        label="移除此条生态记录"
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
