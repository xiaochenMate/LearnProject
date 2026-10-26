import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  ImageOff,
  Minus,
  Plus,
  Clock3,
  Orbit,
  Pause,
  Play,
  Search,
  X,
} from "lucide-react";
import {
  EXPERIENCE_BY_ID,
  EXPERIENCE_GROUPS,
  EXPERIENCES,
  Experience,
  FEATURED_EXPERIENCES,
  searchExperiences,
} from "../lib/experienceCatalog";
import { ExplorerStore, getRecentExperiences } from "../lib/explorerStore";
import { COSMIC_OBJECTS } from "../lib/universeData";
import { CORE_PLANET_IDS } from "../lib/solarSystemData";
import type { UniverseSceneController } from "../lib/universeScene";

export default function ExplorerHome({
  store,
  onOpen,
  onToggleSave,
  reducedMotion,
}: {
  store: ExplorerStore;
  onOpen: (item: Experience) => void;
  onToggleSave: (id: string) => void;
  reducedMotion: boolean;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const recent = getRecentExperiences(store).slice(0, 3);
  const filtered = searchExperiences(query, group);
  const curated = !query.trim() && group === "all" && !showAll;
  const displayed = curated ? FEATURED_EXPERIENCES : filtered;
  const catalogRef = useRef<HTMLElement>(null);
  return (
    <>
      <section className="explorer-hero" aria-labelledby="hero-title">
        <HeroScene reducedMotion={reducedMotion} />
        <div className="hero-content">
          <span className="hero-eyebrow">
            <span className="live-dot" />
            EXBEAM ORIGINAL · 实时 3D
          </span>
          <h1 id="hero-title">宇宙探索</h1>
          <p>从一颗星球，走向整个宇宙。</p>
          <div className="hero-actions">
            <button
              className="ex-button ex-button-primary"
              onClick={() => onOpen(EXPERIENCE_BY_ID.get("e1")!)}
            >
              进入宇宙
              <ArrowUpRight size={18} />
            </button>
            <button
              className="hero-catalog-link"
              onClick={() =>
                catalogRef.current?.scrollIntoView({
                  behavior: reducedMotion ? "instant" : "smooth",
                  block: "start",
                })
              }
            >
              发现更多体验
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="hero-facts">
            <span>4 个宇宙尺度</span>
            <i />
            <span>{COSMIC_OBJECTS.length} 个探索目标</span>
            <i />
            <span>真实天文影像</span>
          </div>
        </div>
        <div className="hero-bottom">
          <span>01 / 宇宙与深空</span>
          <span>NASA 数据与影像 · 教学示意，非等比例</span>
        </div>
      </section>

      <div className="explorer-home-content">
        {recent.length > 0 && (
          <section className="home-continue" aria-label="最近探索">
            <span>继续探索</span>
            {recent.map((id) => {
              const item = EXPERIENCE_BY_ID.get(id)!;
              return (
                <button key={id} onClick={() => onOpen(item)}>
                  <span style={{ background: item.accent }} />
                  {item.title}
                  <ArrowUpRight size={14} />
                </button>
              );
            })}
          </section>
        )}
        <section
          ref={catalogRef}
          className="explorer-catalog"
          aria-labelledby="catalog-title"
        >
          <div className="catalog-heading">
            <div>
              <span className="explorer-eyebrow">WORLDS TO EXPLORE</span>
              <h2 id="catalog-title">
                {curated ? "下一次好奇，从这里开始" : "发现你的下一站"}
              </h2>
            </div>
            <label className="explorer-search">
              <Search size={17} />
              <input
                type="search"
                aria-label="搜索体验"
                placeholder="搜索宇宙、实验、创作…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button
                  title="清空搜索"
                  aria-label="清空搜索"
                  onClick={() => setQuery("")}
                >
                  <X size={15} />
                </button>
              )}
            </label>
          </div>
          <div className="catalog-filters" role="group" aria-label="体验分类">
            {EXPERIENCE_GROUPS.map((option) => (
              <button
                key={option.id}
                aria-pressed={group === option.id}
                onClick={() => setGroup(option.id)}
              >
                {option.id === "all" && curated ? "精选体验" : option.label}
                {group === option.id && (
                  <span>{curated ? 6 : filtered.length}</span>
                )}
              </button>
            ))}
          </div>
          <div className="experience-grid">
            {displayed.map((item) => (
              <ExperienceCard
                key={item.id}
                experience={item}
                saved={store.saved.includes(item.id)}
                onOpen={onOpen}
                onToggleSave={onToggleSave}
              />
            ))}
          </div>
          {!displayed.length && (
            <div className="explorer-empty">
              <Search size={28} />
              <h3>还没有找到这次的目的地</h3>
              <p>试试“宇宙”“波动”或切换分类。</p>
              <button
                className="ex-button ex-button-secondary"
                onClick={() => {
                  setQuery("");
                  setGroup("all");
                }}
              >
                重置筛选
              </button>
            </div>
          )}
          {curated && (
            <div className="catalog-more">
              <button
                className="ex-button ex-button-secondary"
                onClick={() => setShowAll(true)}
              >
                浏览全部 {EXPERIENCES.length} 个体验
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </section>
        <section className="explorer-editorial">
          <div>
            <span className="explorer-eyebrow">DEEPER INTO SPACE</span>
            <h2>还有更远的地方。</h2>
            <p>恒星诞生的云雾、旋转的星系、看不见的边界。</p>
            <button
              className="ex-button ex-button-secondary"
              onClick={() => onOpen(EXPERIENCE_BY_ID.get("e1")!)}
            >
              继续深空探索
              <ArrowUpRight size={16} />
            </button>
          </div>
          <img
            src="/images/universe/orion.jpg"
            alt="猎户座星云的真实天文影像"
            loading="lazy"
          />
          <small>NASA / ESA · 猎户座星云</small>
        </section>
      </div>
    </>
  );
}

function HeroScene({ reducedMotion }: { reducedMotion: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const controller = useRef<UniverseSceneController | null>(null);
  const [failed, setFailed] = useState(false);
  const [assetWarning, setAssetWarning] = useState(false);
  const [playing, setPlaying] = useState(
    () =>
      !reducedMotion && !matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [selected, setSelected] = useState("solar-system");
  const selectedRef = useRef(selected);
  const playingRef = useRef(playing);
  selectedRef.current = selected;
  playingRef.current = playing;
  useEffect(() => {
    let disposed = false;
    import("../lib/universeScene")
      .then(({ createUniverseScene }) => {
        if (disposed || !container.current) return;
        try {
          controller.current = createUniverseScene(
            container.current,
            "solar",
            {
              onSelect: setSelected,
              onReady: () => undefined,
              onError: () => setFailed(true),
              onAssetError: () => setAssetWarning(true),
            },
            { objectIds: CORE_PLANET_IDS },
          );
          controller.current.select("earth", false);
          if (selectedRef.current === "solar-system") controller.current.overview();
          else controller.current.select(selectedRef.current);
          controller.current.setLabels(true);
          controller.current.setPlaying(playingRef.current);
          controller.current.setAutoRotate(false);
        } catch {
          setFailed(true);
        }
      })
      .catch(() => setFailed(true));
    return () => {
      disposed = true;
      controller.current?.dispose();
      controller.current = null;
    };
  }, []);
  useEffect(() => {
    controller.current?.setPlaying(playing);
  }, [playing]);
  useEffect(() => {
    if (reducedMotion) setPlaying(false);
  }, [reducedMotion]);
  useEffect(() => {
    if (selected === "solar-system") controller.current?.overview();
    else controller.current?.select(selected);
  }, [selected]);
  return (
    <>
      <div
        className="hero-scene"
        ref={container}
        aria-label="太阳系实时三维预览"
      />
      {failed && (
        <img
          className="hero-fallback"
          src="/images/universe/whirlpool.jpg"
          alt="涡状星系"
        />
      )}
      {(failed || assetWarning) && (
        <span className="hero-render-status" role="status">
          {failed ? "三维场景暂不可用，已切换为天文影像。" : "部分天体影像暂未载入。"}
        </span>
      )}
      <div className="hero-scene-controls">
        <div role="group" aria-label="首页宇宙视角">
          {[
            { id: "solar-system", name: "太阳系" },
            { id: "earth", name: "地球" },
            { id: "saturn", name: "土星" },
            { id: "jupiter", name: "木星" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={failed}
              aria-pressed={selected === item.id}
              onClick={() => setSelected(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
        <button type="button" className="ex-icon" disabled={failed} aria-label="缩小首页场景" title="缩小" onClick={() => controller.current?.zoom(1.25)}>
          <Minus size={15} />
        </button>
        <button type="button" className="ex-icon" disabled={failed} aria-label="放大首页场景" title="放大" onClick={() => controller.current?.zoom(0.8)}>
          <Plus size={15} />
        </button>
        <button
          type="button"
          className="ex-icon"
          disabled={failed}
          aria-label={playing ? "暂停首页演示" : "继续首页演示"}
          title={playing ? "暂停演示" : "继续演示"}
          aria-pressed={!playing}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
      </div>
    </>
  );
}

export function ExperienceCard({
  experience,
  saved,
  onOpen,
  onToggleSave,
}: {
  experience: Experience;
  saved: boolean;
  onOpen: (item: Experience) => void;
  onToggleSave: (id: string) => void;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <article
      className="experience-card"
      style={
        { "--experience-accent": experience.accent } as React.CSSProperties
      }
    >
      <button
        className="experience-card-preview"
        data-cover-id={experience.id}
        onClick={() => onOpen(experience)}
        aria-label={`进入${experience.title}`}
      >
        {!failed ? (
          <img
            src={experience.cover}
            srcSet={`${experience.coverSmall} 480w, ${experience.cover} 960w`}
            sizes="(max-width: 760px) calc((100vw - 59px) / 2), (max-width: 1000px) calc((100vw - 102px) / 3), (max-width: 1336px) calc((100vw - 146px) / 3), 397px"
            width={960}
            height={540}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={() => setFailed(true)}
          />
        ) : (
          <span className="experience-cover-error">
            <ImageOff size={26} />
            <span>封面暂不可用</span>
          </span>
        )}
        <span className="experience-format">{experience.format}</span>
        <span className="experience-card-enter">
          <ArrowUpRight size={21} />
        </span>
      </button>
      <div className="experience-card-info">
        <button
          aria-label={`打开${experience.title}`}
          onClick={() => onOpen(experience)}
        >
          <h3>{experience.title}</h3>
        </button>
        <button
          className={`ex-icon ${saved ? "is-active" : ""}`}
          onClick={() => onToggleSave(experience.id)}
          aria-label={
            saved ? `取消收藏${experience.title}` : `收藏${experience.title}`
          }
          aria-pressed={saved}
          title={saved ? "取消收藏" : "收藏"}
        >
          <Bookmark size={17} fill={saved ? "currentColor" : "none"} />
        </button>
        <p>{experience.description}</p>
        <span>
          <Clock3 size={12} />约 {experience.minutes} 分钟
        </span>
      </div>
    </article>
  );
}
