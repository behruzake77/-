import { useMemo, useState } from "react";
import {
  NOTES_BY_ID,
  SKILLS,
  SKILL_LABELS,
  masteryBand,
  masteryMap,
  getVocab,
  learningSummary,
} from "@mir/shared";
import { useGame } from "../state/store";
import { speak, speechAvailable } from "../audio/speech";
import { IconClose, IconMoon, IconNote, IconSpeaker, IconSpark } from "./icons";
import { ConfirmDialog } from "./Hud";
import { Review } from "./Review";
import { formatTime } from "./format";

type Tab = "notes" | "words" | "settings";

const BAND_LABELS: Record<string, string> = {
  unknown: "—",
  new: "новое",
  familiar: "знакомо",
  solid: "уверенно",
  strong: "прочно",
};

export function Phone() {
  const state = useGame((store) => store.state);
  const settings = useGame((store) => store.settings);
  const soundOn = useGame((store) => store.soundOn);
  const sync = useGame((store) => store.sync);
  const setPanel = useGame((store) => store.setPanel);
  const setSettings = useGame((store) => store.setSettings);
  const toggleSound = useGame((store) => store.toggleSound);
  const setIntro = useGame((store) => store.setIntro);
  const reset = useGame((store) => store.reset);
  const [tab, setTab] = useState<Tab>("notes");
  const [openNote, setOpenNote] = useState<string | null>(state.notes[0] ?? null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const summary = useMemo(() => learningSummary(state), [state]);
  const mastery = useMemo(() => masteryMap(state), [state]);
  const words = useMemo(
    () =>
      Object.values(mastery)
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 24),
    [mastery],
  );
  const notes = state.notes.map((id) => NOTES_BY_ID[id]).filter(Boolean);
  const canSpeak = speechAvailable();
  const dueCount = summary.dueNow.length;

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Телефон">
      <button
        type="button"
        className="overlay__scrim"
        aria-label="Закрыть телефон"
        onClick={() => setPanel(null)}
      />
      <section className="phone">
        <div className="phone__bezel">
          <div className="phone__screen">
            <div className="phone__status mono-caps">
              <span>{formatTime(state.minutes)}</span>
              <span className="phone__notch" />
              <span>电量 12%</span>
            </div>

            <header className="phone__head">
              <div>
                <span className="mono-caps">мир · телефон</span>
                <h2 className="serif">
                  {tab === "notes" ? "Заметки" : tab === "words" ? "Слова" : "Настройки"}
                </h2>
              </div>
              <button
                type="button"
                className="phone__close"
                onClick={() => setPanel(null)}
                aria-label="Закрыть телефон"
              >
                <IconClose size={18} />
              </button>
            </header>

            <div className="phone__tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "notes"}
                className={tab === "notes" ? "is-on" : ""}
                onClick={() => setTab("notes")}
              >
                <IconNote size={16} /> заметки
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "words"}
                className={tab === "words" ? "is-on" : ""}
                onClick={() => setTab("words")}
              >
                слова
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "settings"}
                className={tab === "settings" ? "is-on" : ""}
                onClick={() => setTab("settings")}
              >
                ещё
              </button>
            </div>

            <div className="phone__content">
              {tab === "notes" && (
                <div className="notes">
                  {notes.length === 0 ? (
                    <p className="empty">Пусто. Записки появятся сами — когда найдёшь.</p>
                  ) : (
                    notes.map((note) => {
                      const isOpen = openNote === note.id;
                      return (
                        <article key={note.id} className={`note ${isOpen ? "is-open" : ""}`}>
                          <button
                            type="button"
                            className="note__head"
                            onClick={() => setOpenNote(isOpen ? null : note.id)}
                          >
                            <span className="note__title serif">{note.titleRu}</span>
                            <span className="note__zone mono-caps">
                              {note.zone === "apartment" ? "дома" : "в городе"}
                            </span>
                          </button>
                          {isOpen ? (
                            <div className="note__body">
                              <p className="note__ru">{note.textRu}</p>
                              <p className="note__en faint">{note.textEn}</p>
                              {canSpeak ? (
                                <button
                                  type="button"
                                  className="tool"
                                  onClick={() => speak(note.textRu, { rate: settings.audioRate })}
                                >
                                  <IconSpeaker size={15} /> прочитать
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </article>
                      );
                    })
                  )}
                </div>
              )}

              {tab === "words" && (
                <div className="words">
                  <div className="words__stats">
                    <div>
                      <span className="words__num serif">{summary.evidenceCount}</span>
                      <span className="mono-caps">следов в памяти</span>
                    </div>
                    <div>
                      <span className="words__num serif">{summary.knownWords}</span>
                      <span className="mono-caps">слов уверенно</span>
                    </div>
                    <div>
                      <span className="words__num serif">{dueCount}</span>
                      <span className="mono-caps">пора повторить</span>
                    </div>
                  </div>

                  <div className="skills">
                    <span className="mono-caps">что тренировалось</span>
                    {SKILLS.map((skill) => {
                      const stat = summary.skills[skill];
                      return (
                        <div className="skill" key={skill}>
                          <span className="skill__name">{SKILL_LABELS[skill].ru}</span>
                          <span className="skill__bar">
                            <i style={{ width: `${Math.round(stat.mean * 100)}%` }} />
                          </span>
                          <span className="skill__count mono-caps">{stat.count}</span>
                        </div>
                      );
                    })}
                    <p className="skills__note faint">
                      Полоска — средний результат именно этих ответов. Пустая полоска значит, что
                      умение ещё не проверялось.
                    </p>
                  </div>

                  <div className="review-cta">
                    <div>
                      <span className="mono-caps">память</span>
                      <p className="serif">
                        {words.length === 0
                          ? "Сначала поговори с кем-нибудь."
                          : dueCount > 0
                            ? `${dueCount} слов просят повторения.`
                            : "Пока всё свежее. Можно повторить лучшее."}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => setReviewOpen(true)}
                      disabled={words.length === 0}
                    >
                      <IconSpark size={16} /> повторить
                    </button>
                  </div>

                  <div className="words__list">
                    {words.length === 0 ? (
                      <p className="empty">
                        Здесь появятся слова, которые ты действительно слышал(а) и говорил(а).
                      </p>
                    ) : (
                      words.map((word) => {
                        const entry = getVocab(word.vocab);
                        if (!entry) return null;
                        const band = masteryBand(word);
                        return (
                          <div className="word" key={word.vocab}>
                            <div className="word__main">
                              <span className="word__ru serif">{entry.ru}</span>
                              <span className="word__en faint">{entry.en}</span>
                            </div>
                            <div className="word__side">
                              <span className={`word__band word__band--${band}`}>
                                {BAND_LABELS[band]}
                              </span>
                              <span className="word__meta mono-caps">
                                {word.attempts}× · {Object.keys(word.bySkill).length} нав.
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {tab === "settings" && (
                <div className="settings">
                  <div className="setting">
                    <div className="setting__label">
                      <span>Переводы</span>
                      <span className="faint">
                        {settings.translations === "auto"
                          ? "сначала видны, потом исчезают"
                          : settings.translations === "always"
                            ? "всегда рядом с русским"
                            : settings.translations === "onDemand"
                              ? "только по кнопке"
                              : "только если сам(а) попросишь"}
                      </span>
                    </div>
                    <div className="segmented">
                      {(["auto", "always", "onDemand", "off"] as const).map((mode) => (
                        <button
                          type="button"
                          key={mode}
                          className={settings.translations === mode ? "is-on" : ""}
                          onClick={() => setSettings({ translations: mode })}
                        >
                          {mode === "auto"
                            ? "само"
                            : mode === "always"
                              ? "всегда"
                              : mode === "onDemand"
                                ? "кнопка"
                                : "нет"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="setting setting--row">
                    <div className="setting__label">
                      <span>Подсказки в ответах</span>
                      <span className="faint">только когда попросишь</span>
                    </div>
                    <button
                      type="button"
                      className={`toggle ${settings.hints ? "is-on" : ""}`}
                      onClick={() => setSettings({ hints: !settings.hints })}
                      aria-pressed={settings.hints}
                    >
                      <i />
                    </button>
                  </div>

                  <div className="setting setting--row">
                    <div className="setting__label">
                      <span>Транслитерация</span>
                      <span className="faint">латинскими буквами рядом</span>
                    </div>
                    <button
                      type="button"
                      className={`toggle ${settings.showTransliteration ? "is-on" : ""}`}
                      onClick={() =>
                        setSettings({ showTransliteration: !settings.showTransliteration })
                      }
                      aria-pressed={settings.showTransliteration}
                    >
                      <i />
                    </button>
                  </div>

                  <div className="setting">
                    <div className="setting__label">
                      <span>Скорость речи</span>
                      <span className="faint">{Math.round(settings.audioRate * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.6}
                      max={1.15}
                      step={0.05}
                      value={settings.audioRate}
                      onChange={(event) => setSettings({ audioRate: Number(event.target.value) })}
                      aria-label="Скорость речи"
                    />
                  </div>

                  <div className="setting setting--row">
                    <div className="setting__label">
                      <span>Звук</span>
                      <span className="faint">дождь, шаги, голос</span>
                    </div>
                    <button
                      type="button"
                      className={`toggle ${soundOn ? "is-on" : ""}`}
                      onClick={toggleSound}
                      aria-pressed={soundOn}
                    >
                      <i />
                    </button>
                  </div>

                  <div className="setting setting--boxed">
                    <div className="setting__label">
                      <span className="mono-caps">сохранение</span>
                      <span>
                        {sync.status === "online"
                          ? `в облаке · версия ${sync.version}${sync.lastAt ? ` · ${formatTime(new Date(sync.lastAt).getHours() * 60 + new Date(sync.lastAt).getMinutes())}` : ""}`
                          : sync.status === "connecting"
                            ? "соединяюсь с сервером…"
                            : sync.status === "error"
                              ? "только на этом устройстве (сервер не ответил)"
                              : "на этом устройстве"}
                      </span>
                    </div>
                    <span className={`sync-dot sync-dot--${sync.status}`} />
                  </div>

                  <div className="setting setting--actions">
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => {
                        setPanel(null);
                        setIntro(true);
                      }}
                    >
                      как играть
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => setConfirmReset(true)}
                    >
                      <IconMoon size={15} /> начать заново
                    </button>
                  </div>

                  <p className="phone__credits">
                    MIR · Мир без перевода. Все пейзажи и лица нарисованы кодом, голос — встроенный
                    в браузер.
                    {!canSpeak ? " Сейчас русского голоса нет — текст остаётся." : ""}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      {reviewOpen ? <Review onClose={() => setReviewOpen(false)} /> : null}
      {confirmReset ? (
        <ConfirmDialog
          title="Начать заново?"
          text="Дневник, слова и знакомства исчезнут. Это правда."
          confirmLabel="Начать заново"
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            setConfirmReset(false);
            reset(state.name || "Алекс");
            setPanel(null);
          }}
        />
      ) : null}
    </div>
  );
}
