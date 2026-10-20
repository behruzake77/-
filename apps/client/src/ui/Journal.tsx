import { useState } from "react";
import { NOTES_BY_ID, QUESTS_BY_ID, ZONES } from "@mir/shared";
import { useGame } from "../state/store";
import { IconArrow, IconCheck, IconClose, IconLock, IconPin } from "./icons";
import { formatTime } from "./format";

type Tab = "quests" | "letters" | "map";

const ZONE_POSITIONS: Record<string, { x: number; y: number; w: number; h: number }> = {
  apartment: { x: 40, y: 28, w: 128, h: 64 },
  courtyard: { x: 40, y: 112, w: 128, h: 78 },
  street: { x: 188, y: 112, w: 224, h: 78 },
  shop: { x: 220, y: 34, w: 92, h: 56 },
  dombyta: { x: 330, y: 34, w: 82, h: 56 },
  metro: { x: 430, y: 106, w: 86, h: 84 },
  cafe: { x: 250, y: 210, w: 120, h: 62 },
};

const NAMES: Record<string, string> = {
  apartment: "Квартира",
  courtyard: "Двор",
  street: "Улица Мира",
  shop: "Продукты",
  dombyta: "Дом быта",
  metro: "Метро",
  cafe: "Кафе",
};

export function Journal() {
  const state = useGame((store) => store.state);
  const setPanel = useGame((store) => store.setPanel);
  const [tab, setTab] = useState<Tab>("quests");
  const [showEn, setShowEn] = useState(false);

  const questStates = Object.values(state.quests);
  const active = questStates.filter((quest) => quest.status === "active");
  const done = questStates.filter((quest) => quest.status === "completed");
  const letters = [...state.journal].reverse();

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Дневник">
      <button
        type="button"
        className="overlay__scrim"
        aria-label="Закрыть дневник"
        onClick={() => setPanel(null)}
      />
      <section className="book">
        <button
          type="button"
          className="overlay__close"
          onClick={() => setPanel(null)}
          aria-label="Закрыть дневник"
        >
          <IconClose size={19} />
        </button>
        <header className="book__head">
          <div>
            <span className="mono-caps">дневник · {state.name}</span>
            <h2 className="serif">Северогорск, день {state.day}</h2>
          </div>
          <div className="book__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "quests"}
              className={tab === "quests" ? "is-on" : ""}
              onClick={() => setTab("quests")}
            >
              дела
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "letters"}
              className={tab === "letters" ? "is-on" : ""}
              onClick={() => setTab("letters")}
            >
              письма
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "map"}
              className={tab === "map" ? "is-on" : ""}
              onClick={() => setTab("map")}
            >
              карта
            </button>
          </div>
        </header>

        <div className="book__body">
          {tab === "quests" && (
            <div className="book__page">
              <div className="book__margin" aria-hidden="true" />
              {active.length === 0 && done.length === 0 ? (
                <p className="empty">Пока ничего не записано. Выйди во двор.</p>
              ) : null}

              {active.map((questState) => {
                const quest = QUESTS_BY_ID[questState.id];
                if (!quest) return null;
                return (
                  <article className="quest" key={quest.id}>
                    <div className="quest__head">
                      <h3 className="serif">{quest.titleRu}</h3>
                      <span className="quest__count mono-caps">
                        {Math.min(questState.step + 1, quest.steps.length)} / {quest.steps.length}
                      </span>
                    </div>
                    {showEn ? <p className="quest__summary faint">{quest.summaryEn}</p> : null}
                    <p className="quest__summary">{quest.summaryRu}</p>
                    <ol className="quest__steps">
                      {quest.steps.map((step, index) => {
                        const isDone = index < questState.step;
                        const isNow = index === questState.step;
                        return (
                          <li key={step.id} className={isDone ? "is-done" : isNow ? "is-now" : ""}>
                            <span className="quest__bullet" aria-hidden="true">
                              {isDone ? <IconCheck size={13} /> : index + 1}
                            </span>
                            <div>
                              <span className="quest__step">{step.ru}</span>
                              {showEn ? (
                                <span className="quest__step-en faint">{step.en}</span>
                              ) : null}
                              {isNow ? <span className="quest__hint">{step.hintRu}</span> : null}
                              {isNow && step.navTarget ? (
                                <span className="quest__nav">
                                  <IconPin size={12} /> {ZONES[step.navTarget]?.nameRu}
                                </span>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </article>
                );
              })}

              {done.length ? (
                <div className="quest-done">
                  <span className="mono-caps">сделано</span>
                  <ul>
                    {done.map((questState) => {
                      const quest = QUESTS_BY_ID[questState.id];
                      if (!quest) return null;
                      return (
                        <li key={quest.id}>
                          <IconCheck size={13} />
                          <span>{quest.titleRu}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              <div className="book__toggle">
                <button
                  type="button"
                  className={`chip ${showEn ? "is-on" : ""}`}
                  onClick={() => setShowEn((value) => !value)}
                >
                  english hints
                </button>
              </div>
            </div>
          )}

          {tab === "letters" && (
            <div className="book__page">
              <div className="book__margin" aria-hidden="true" />
              {letters.length === 0 ? (
                <p className="empty">Первое письмо появится, когда ты что-нибудь сделаешь.</p>
              ) : (
                letters.map((entry) => (
                  <article className="letter" key={entry.id}>
                    <div className="letter__meta mono-caps">
                      день {entry.day} ·{" "}
                      {formatTime(
                        new Date(entry.at).getHours() * 60 + new Date(entry.at).getMinutes(),
                      )}
                    </div>
                    <h3 className="serif">{entry.titleRu}</h3>
                    <p className="letter__text">{entry.textRu}</p>
                    <p className="letter__text letter__text--en faint">{entry.textEn}</p>
                  </article>
                ))
              )}
            </div>
          )}

          {tab === "map" && (
            <div className="book__page book__page--map">
              <div className="book__margin" aria-hidden="true" />
              <p className="map__caption">
                Район у площади Мира. Карта не телепорт — просто память о том, где ты был.
              </p>
              <svg viewBox="0 0 540 300" className="map" role="img" aria-label="Карта района">
                <g stroke="rgba(42,35,29,0.35)" strokeWidth="2" fill="none">
                  <path d="M104 92 L104 112" />
                  <path d="M168 151 L188 151" />
                  <path d="M412 151 L430 148" />
                  <path d="M266 112 L266 90" />
                  <path d="M371 112 L371 90" />
                  <path d="M300 190 L300 210" />
                </g>
                <g>
                  {Object.entries(ZONE_POSITIONS).map(([id, box]) => {
                    const visited = state.stats.zonesVisited.includes(id as never);
                    const current = state.player.zone === id;
                    return (
                      <g key={id}>
                        <rect
                          x={box.x}
                          y={box.y}
                          width={box.w}
                          height={box.h}
                          rx="5"
                          fill={
                            current
                              ? "rgba(217,164,65,0.28)"
                              : visited
                                ? "rgba(241,228,203,0.10)"
                                : "none"
                          }
                          stroke={
                            current
                              ? "#a5762f"
                              : visited
                                ? "rgba(42,35,29,0.55)"
                                : "rgba(42,35,29,0.25)"
                          }
                          strokeWidth={current ? 2.4 : 1.4}
                          strokeDasharray={visited ? undefined : "4 4"}
                        />
                        <text
                          x={box.x + box.w / 2}
                          y={box.y + box.h / 2 + 4}
                          textAnchor="middle"
                          fontFamily="'Cormorant Garamond', Georgia, serif"
                          fontSize="15"
                          fill={visited ? "#2a231d" : "#8b7d69"}
                        >
                          {visited ? NAMES[id] : "· · ·"}
                        </text>
                        {current ? (
                          <g>
                            <circle cx={box.x + 10} cy={box.y + 10} r="4" fill="#a8553c">
                              <animate
                                attributeName="opacity"
                                values="0.35;1;0.35"
                                dur="2.4s"
                                repeatCount="indefinite"
                              />
                            </circle>
                          </g>
                        ) : null}
                      </g>
                    );
                  })}
                </g>
                <text
                  x="40"
                  y="288"
                  fontFamily="Inter, sans-serif"
                  fontSize="9"
                  letterSpacing="2"
                  fill="#8b7d69"
                >
                  СЕВЕРОГОРСК · УЛ. МИРА
                </text>
              </svg>
              <div className="map__legend">
                <span>
                  <i className="legend-dot legend-dot--now" /> ты здесь
                </span>
                <span>
                  <i className="legend-dot" /> был(а)
                </span>
                <span>
                  <IconLock size={12} /> ещё не был(а)
                </span>
              </div>
              <div className="map__notes">
                <span className="mono-caps">в кармане</span>
                <ul>
                  {state.notes.map((id) => (
                    <li key={id}>{NOTES_BY_ID[id]?.titleRu ?? id}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <footer className="book__foot">
          <span className="mono-caps faint">закладок нет — просто живи</span>
          <button
            type="button"
            className="btn btn--ghost book__close"
            onClick={() => setPanel(null)}
          >
            <IconArrow size={16} /> вернуться
          </button>
        </footer>
      </section>
    </div>
  );
}
