import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Download,
  ExternalLink,
  History,
  RefreshCw,
  Save,
  Trash2,
  WifiOff,
} from "lucide-react";
import { Workbench, IconButton } from "./ModuleWorkbench";
import { useModuleState } from "../lib/moduleSession";
import {
  CURRENCIES,
  RATE_ENDPOINT,
  RATE_SOURCE,
  calculateConversion,
  formatCurrency,
  pairDates,
  pairRate,
  parseRateResponse,
  validConversionRecords,
  validCurrencySettings,
  validRateSnapshot,
  type ConversionRecord,
  type CurrencySettings,
  type RateSnapshot,
} from "../lib/labsCurrency";
import { csv, downloadLabFile } from "../lib/labsCommon";
import "./labs.css";

export default function CurrencyConverterApp() {
  const [settings, setSettings, settingsAvailable] =
    useModuleState<CurrencySettings>(
      "exbeam.currency.settings.v1",
      { from: "CNY", to: "USD", amount: "100", percent: "0", fixed: "0" },
      validCurrencySettings,
    );
  const [rates, setRates, cacheAvailable] = useModuleState<RateSnapshot | null>(
    "exbeam.rates.v2",
    null,
    (v) => v === null || validRateSnapshot(v),
  );
  const [records, setRecords, recordsAvailable] = useModuleState<
    ConversionRecord[]
  >("exbeam.currency.records.v1", [], validConversionRecords);
  const [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [origin, setOrigin] = useState<"cache" | "network">("cache"),
    [tab, setTab] = useState<"compare" | "records">("compare");
  const [online, setOnline] = useState(() => navigator.onLine);
  const request = useRef<AbortController | null>(null);
  const { from, to, amount, percent, fixed } = settings;
  const update = (patch: Partial<CurrencySettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
    setMessage("");
  };
  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 10000);
    setLoading(true);
    setError("");
    try {
      const response = await fetch(RATE_ENDPOINT, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("汇率服务暂时不可用");
      const snapshot = parseRateResponse(await response.json());
      if (request.current !== controller) return;
      setRates(snapshot);
      setOrigin("network");
      setMessage("已获取参考汇率；数据日期以各币种标注为准。");
    } catch {
      if (request.current === controller) {
        setOrigin("cache");
        setError("未能更新。保留最近一次有效数据；无缓存的币种暂不可换算。");
      }
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) {
        setLoading(false);
        request.current = null;
      }
    }
  }, [setRates]);
  useEffect(() => {
    const connection = () => setOnline(navigator.onLine);
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    if (navigator.onLine) void refresh();
    else setError("当前离线，使用本机缓存。");
    return () => {
      request.current?.abort();
      request.current = null;
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
    };
  }, [refresh]);
  const rate = pairRate(rates, from, to),
    result = calculateConversion(amount, rate, percent, fixed);
  const dates = pairDates(rates, from, to),
    same = from === to;
  const save = () => {
    if (!result || rate === null) return;
    if (records.length >= 100) {
      setMessage("记录已达 100 条，请先导出再移除旧项。");
      return;
    }
    setRecords((previous) => [
      {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        settings: { ...settings },
        rate,
        dates,
        fetchedAt: rates?.fetchedAt || null,
        source: RATE_SOURCE,
        net: result.net,
        fee: result.fee,
      },
      ...previous,
    ]);
    setMessage("换算结果与当时的参考汇率已记录。");
  };
  const exportTable = () => {
    downloadLabFile(
      "currency-reference.csv",
      csv([
        [
          "source_currency",
          "target_currency",
          "amount",
          "rate",
          "gross",
          "fee_source_currency",
          "net",
          "rate_dates",
          "retrieved_at",
          "source",
          "price_type",
        ],
        ...CURRENCIES.map(([code]) => {
          const r = pairRate(rates, from, code),
            value = calculateConversion(amount, r, percent, fixed);
          return [
            from,
            code,
            amount,
            r,
            value?.gross,
            value?.fee,
            value?.net,
            pairDates(rates, from, code).join(" / "),
            rates?.fetchedAt || "unknown (legacy cache)",
            RATE_SOURCE,
            "reference; not a live executable quote",
          ];
        }),
      ]),
    );
    setMessage("参考汇率与费用换算 CSV 已生成。");
  };
  const select = (
    label: string,
    value: string,
    change: (value: string) => void,
  ) => (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => change(e.target.value)}
    >
      {CURRENCIES.map(([code, name]) => (
        <option key={code} value={code}>
          {code} · {name}
        </option>
      ))}
    </select>
  );
  return (
    <Workbench
      title="汇率换算台"
      eyebrow="CURRENCY REFERENCE"
      className="labs-workbench labs-currency"
      toolbar={
        <>
          <IconButton
            label="更新参考汇率"
            disabled={loading || !online}
            onClick={() => void refresh()}
          >
            <RefreshCw size={17} className={loading ? "labs-spin" : ""} />
          </IconButton>
          <IconButton
            label="导出换算 CSV"
            disabled={!rates || !result}
            onClick={exportTable}
          >
            <Download size={17} />
          </IconButton>
          <button
            className="wb-button is-primary"
            disabled={!result || records.length >= 100}
            onClick={save}
          >
            <Save size={15} />
            记录换算
          </button>
        </>
      }
      status={
        <>
          <span>
            {!online && <WifiOff size={13} />}
            {loading
              ? "正在请求参考汇率"
              : rates
                ? origin === "network" && online
                  ? "已获取网络参考数据"
                  : "使用本机缓存数据"
                : "尚无可用汇率缓存"}
          </span>
          <span>
            {settingsAvailable && cacheAvailable && recordsAvailable
              ? "本机保存可用"
              : "本机保存不可用，请导出记录"}
          </span>
          <span>非实时成交价</span>
        </>
      }
    >
      <div className="labs-currency-layout">
        <main className="labs-currency-main">
          <section className="labs-conversion">
            <div className="labs-money-input">
              <label className="wb-field">
                换算金额
                {select("源币种", from, (value) => update({ from: value }))}
                <input
                  aria-label="换算金额"
                  type="number"
                  min={0}
                  max={1e12}
                  step="any"
                  value={amount}
                  onChange={(e) => update({ amount: e.target.value })}
                />
              </label>
              <div className="labs-amount-presets">
                {[100, 1000, 10000].map((n) => (
                  <button
                    className="wb-button"
                    key={n}
                    onClick={() => update({ amount: String(n) })}
                  >
                    {n.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
            <IconButton
              label="交换币种"
              className="labs-swap"
              onClick={() => update({ from: to, to: from })}
            >
              <ArrowLeftRight size={19} />
            </IconButton>
            <div className="labs-money-output">
              <label className="wb-field">
                目标币种
                {select("目标币种", to, (value) => update({ to: value }))}
              </label>
              <span className="labs-money-label">扣除模拟费用后</span>
              <output aria-live="polite" aria-label="换算结果">
                {result ? formatCurrency(result.net, to) : "—"}
              </output>
              <span className="labs-money-label">
                {rate === null
                  ? "所选币种尚无可用数据"
                  : `1 ${from} = ${rate.toLocaleString("zh-CN", { maximumSignificantDigits: 7 })} ${to}`}
              </span>
            </div>
          </section>
          <div className="labs-inline-fields labs-fees">
            <label className="wb-field">
              模拟比例费用 / %
              <input
                aria-label="比例费用"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={percent}
                onChange={(e) => update({ percent: e.target.value })}
              />
            </label>
            <label className="wb-field">
              模拟固定费用 / {from}
              <input
                aria-label="固定费用"
                type="number"
                min={0}
                max={1e12}
                step="any"
                value={fixed}
                onChange={(e) => update({ fixed: e.target.value })}
              />
            </label>
            <div className="wb-stat">
              <span>费用合计 / {from}</span>
              <strong>{result ? formatCurrency(result.fee, from) : "—"}</strong>
            </div>
          </div>
          {!result && rate !== null && (
            <p className="wb-notice is-error" role="status">
              请输入 0 至 1 万亿的有效金额与费用；比例为
              0–100%，总费用不能超过金额。
            </p>
          )}
          <div className="labs-rate-meta">
            <p>
              <strong>数据日期：</strong>
              {same
                ? "同币种换算无需外部汇率"
                : dates.length
                  ? dates.join(" / ")
                  : "尚无数据"}
              {dates.length > 1
                ? " · 两币种参考日期不同，交叉汇率仅供估算"
                : ""}
            </p>
            <p>
              获取时间：
              {rates?.fetchedAt
                ? new Date(rates.fetchedAt).toLocaleString("zh-CN")
                : rates
                  ? "旧缓存未记录获取时间"
                  : "—"}
            </p>
            <a href={RATE_SOURCE} target="_blank" rel="noreferrer">
              Frankfurter · 参考数据来源
              <ExternalLink size={13} />
            </a>
            <p>
              费用为手动模拟，在源币种金额中先扣除再换算；不含实际银行价差，不作为交易报价。
            </p>
          </div>
          {error && (
            <p className="wb-notice is-error" role="status">
              {error}
            </p>
          )}
          {message && (
            <p className="wb-notice" role="status">
              {message}
            </p>
          )}
          <div className="wb-tabs">
            <button
              aria-pressed={tab === "compare"}
              onClick={() => setTab("compare")}
            >
              多币种对照
            </button>
            <button
              aria-pressed={tab === "records"}
              onClick={() => setTab("records")}
            >
              <History size={14} />
              换算记录 {records.length}
            </button>
          </div>
          {tab === "compare" ? (
            <div className="labs-table-wrap">
              <table className="labs-table">
                <caption>
                  {amount || "—"} {from} · 参考换算
                </caption>
                <thead>
                  <tr>
                    <th>币种</th>
                    <th>参考汇率</th>
                    <th>模拟净额</th>
                    <th>数据日期</th>
                  </tr>
                </thead>
                <tbody>
                  {CURRENCIES.map(([code, name]) => {
                    const r = pairRate(rates, from, code),
                      value = calculateConversion(amount, r, percent, fixed);
                    return (
                      <tr key={code}>
                        <th>
                          <button
                            title={`换算为${name}`}
                            onClick={() => update({ to: code })}
                          >
                            {code}
                            <small>{name}</small>
                          </button>
                        </th>
                        <td>
                          {r === null
                            ? "暂无"
                            : r.toLocaleString("zh-CN", {
                                maximumSignificantDigits: 7,
                              })}
                        </td>
                        <td>{value ? formatCurrency(value.net, code) : "—"}</td>
                        <td>
                          {from === code
                            ? "同币种"
                            : pairDates(rates, from, code).join(" / ") || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <section className="labs-history">
              <button
                className="wb-button"
                disabled={!records.length}
                onClick={() =>
                  downloadLabFile(
                    "currency-records.csv",
                    csv([
                      [
                        "recorded_at",
                        "from",
                        "to",
                        "amount",
                        "rate",
                        "fee_percent",
                        "fixed_fee",
                        "fee_source_currency",
                        "net_target_currency",
                        "rate_dates",
                        "retrieved_at",
                        "source",
                      ],
                      ...records.map((r) => [
                        r.at,
                        r.settings.from,
                        r.settings.to,
                        r.settings.amount,
                        r.rate,
                        r.settings.percent,
                        r.settings.fixed,
                        r.fee,
                        r.net,
                        r.dates.join(" / "),
                        r.fetchedAt || "unknown",
                        r.source,
                      ]),
                    ]),
                  )
                }
              >
                <Download size={15} />
                导出全部记录
              </button>
              {!records.length && <div className="wb-empty">暂无换算记录</div>}
              <ul className="wb-list">
                {records.map((r) => (
                  <li className="labs-record" key={r.id}>
                    <strong>
                      {r.settings.amount} {r.settings.from} →{" "}
                      {formatCurrency(r.net, r.settings.to)}
                    </strong>
                    <small>
                      {new Date(r.at).toLocaleString("zh-CN")} · 参考日期{" "}
                      {r.dates.join(" / ") || "同币种"} · 当时汇率 {r.rate}
                    </small>
                    <div className="wb-actions">
                      <button
                        className="wb-button"
                        onClick={() => {
                          setSettings(r.settings);
                          setMessage(
                            "已恢复金额、币种和费用；当前结果使用当前缓存，不覆盖历史记录的汇率。",
                          );
                        }}
                      >
                        恢复换算条件
                      </button>
                      <IconButton
                        label="移除此条换算记录"
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
            </section>
          )}
        </main>
      </div>
    </Workbench>
  );
}
