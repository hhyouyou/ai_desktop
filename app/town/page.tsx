import type { Metadata } from "next";
import { BUILDINGS } from "@/lib/town/data";
import { TownStage } from "@/components/town/town-stage";
import "./town.css";

export const metadata: Metadata = {
  title: "小镇",
  description:
    "块集的立体小镇：工坊、报社、电报局、钟楼、天文台……每栋建筑都是站点的一个入口，走过去就能进去。",
};

export default function TownPage() {
  return (
    <main className="town-page">
      <TownStage buildings={BUILDINGS} />

      <nav className="sr-only" aria-label="小镇建筑导航">
        <h1>块集小镇 · 建筑导航</h1>
        <p>每栋建筑对应站点的一个功能入口。</p>
        <ul>
          {BUILDINGS.map((building) => (
            <li key={building.id}>
              <a href={building.href}>
                {building.name}：{building.label}——{building.desc}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
