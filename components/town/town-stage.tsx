"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BUILDINGS } from "@/lib/town/data";
import type { TownScene } from "@/lib/town/scene";

type Props = {
  buildings: typeof BUILDINGS;
};

export function TownStage({ buildings }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<TownScene | null>(null);
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [arrived, setArrived] = useState<string | null>(null);
  const [view, setView] = useState<"town" | "list">("town");
  const [leaving, setLeaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (view !== "town") return;
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let scene: TownScene | null = null;

    const boot = async () => {
      try {
        const mod = await import("@/lib/town/scene");
        if (cancelled) return;
        scene = mod.createTownScene(host, {
          onHover: setHovered,
          onTarget: () => setArrived(null),
          onArrive: setArrived,
          onReady: () => setReady(true),
        });
        sceneRef.current = scene;
        if (process.env.NODE_ENV !== "production") {
          (window as unknown as { __town?: TownScene }).__town = scene;
        }
      } catch (error) {
        if (cancelled) return;
        console.error("[town] 场景初始化失败", error);
        setFailed(true);
        setView("list");
      }
    };

    void boot();

    return () => {
      cancelled = true;
      scene?.dispose();
      sceneRef.current = null;
      if (process.env.NODE_ENV !== "production") {
        delete (window as unknown as { __town?: TownScene }).__town;
      }
      setReady(false);
      setArrived(null);
      setHovered(null);
    };
  }, [view]);

  const enter = useCallback(
    (id: string) => {
      const target = buildings.find((b) => b.id === id);
      if (!target || leaving) return;
      setLeaving(true);
      window.setTimeout(() => router.push(target.href), 340);
    },
    [buildings, leaving, router],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" && arrived) {
        event.preventDefault();
        enter(arrived);
      }
      if (event.key === "Escape") {
        setArrived(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [arrived, enter]);

  const arrivedBuilding = buildings.find((b) => b.id === arrived) ?? null;
  const hoveredBuilding = buildings.find((b) => b.id === hovered) ?? null;

  return (
    <div className={`town${leaving ? " is-leaving" : ""}`}>
      <div ref={hostRef} className="town-canvas" aria-hidden={view === "list"} />

      {!ready && view === "town" ? (
        <div className="town-loading" role="status">
          <span className="town-loading-mark" />
          <p>正在铺开小镇…</p>
          <small>第一次加载需要下载 3D 引擎，通常两三秒</small>
        </div>
      ) : null}

      <header className="town-top">
        <Link href="/" className="town-brand">
          <span className="town-brand-dot" />
          <span className="town-brand-name">块集小镇</span>
          <span className="town-brand-sub">BLOCKSET TOWN</span>
        </Link>

        <div className="town-tools">
          <button type="button" className="town-chip" onClick={() => setView(view === "town" ? "list" : "town")}>
            {view === "town" ? "列表视图" : "回到小镇"}
          </button>
          {view === "town" ? (
            <>
              <button type="button" className="town-icon-btn" aria-label="放大" onClick={() => sceneRef.current?.zoomBy(1.15)}>
                +
              </button>
              <button type="button" className="town-icon-btn" aria-label="缩小" onClick={() => sceneRef.current?.zoomBy(0.87)}>
                −
              </button>
              <button type="button" className="town-chip" onClick={() => sceneRef.current?.resetView()}>
                复位
              </button>
            </>
          ) : null}
        </div>
      </header>

      {view === "town" ? (
        <>
          <div className="town-hint">
            <span>点击地面走动</span>
            <span className="town-hint-sep" />
            <span>点击建筑 → 走到门口 → 按 ↵ 进入</span>
          </div>

          {hoveredBuilding && !arrivedBuilding ? (
            <div className="town-tip">
              <span className="town-tip-name">{hoveredBuilding.name}</span>
              <span className="town-tip-label">{hoveredBuilding.label}</span>
            </div>
          ) : null}

          {arrivedBuilding ? (
            <div className="town-card" role="dialog" aria-label={`进入${arrivedBuilding.name}`}>
              <div className="town-card-head">
                <span className="town-card-pin" />
                <div>
                  <p className="town-card-name">{arrivedBuilding.name}</p>
                  <p className="town-card-label">{arrivedBuilding.label}</p>
                </div>
              </div>
              <p className="town-card-desc">{arrivedBuilding.desc}</p>
              <div className="town-card-actions">
                <button type="button" className="town-enter" onClick={() => enter(arrivedBuilding.id)}>
                  进入 <kbd>↵</kbd>
                </button>
                <button type="button" className="town-dismiss" onClick={() => setArrived(null)}>
                  再逛逛
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <section className="town-sheet" aria-label="小镇建筑列表">
          <div className="town-sheet-head">
            <h1>小镇地图</h1>
            <p>
              十三栋建筑，每栋对应站点的一个入口。
              {failed ? " 当前设备不支持 3D 渲染，先用列表浏览。" : ""}
            </p>
          </div>
          <ul className="town-grid">
            {buildings.map((building) => (
              <li key={building.id}>
                <Link href={building.href} className="town-grid-item">
                  <span className="town-grid-name">{building.name}</span>
                  <span className="town-grid-label">{building.label}</span>
                  <span className="town-grid-desc">{building.desc}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
