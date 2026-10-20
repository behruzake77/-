import { useRef, useState } from "react";
import {
  dueWords,
  getVocab,
  matchAnswer,
  masteryMap,
  normalizeRussian,
  type Skill,
  type VocabEntry,
} from "@mir/shared";
import { useGame } from "../state/store";
import { speak, speechAvailable } from "../audio/speech";
import { sfx } from "../audio/ambience";
import { IconArrow, IconClose, IconEye, IconHint, IconSpeaker } from "./icons";

interface Card {
  word: VocabEntry;
  skill: Extract<Skill, "recall" | "production" | "retention">;
  due: boolean;
}

interface ReviewProps {
  onClose: () => void;
}

export function Review({ onClose }: ReviewProps) {
  const state = useGame((store) => store.state);
  const settings = useGame((store) => store.settings);
  const soundOn = useGame((store) => store.soundOn);
  const dispatch = useGame((store) => store.dispatch);

  // A review session gets a frozen queue. Mastery changes as answers are
  // recorded; recomputing the deck mid-question would swap the card under the
  // learner (and show the wrong word with the previous answer's verdict).
  const [deck] = useState<Card[]>(() => {
    const now = Date.now();
    const map = masteryMap(state, now);
    const due = dueWords(state, now, 8);
    const others = Object.values(map)
      .filter((entry) => !due.includes(entry.vocab))
      .sort((a, b) => a.strength - b.strength)
      .map((entry) => entry.vocab);
    const selected = [...due, ...others].slice(0, 6);
    return selected
      .map((vocab) => {
        const word = getVocab(vocab);
        const mastery = map[vocab];
        if (!word || !mastery) return null;
        return {
          word,
          due: mastery.dueAt > 0 && mastery.dueAt <= now,
          skill: (mastery.dueAt > 0 && mastery.dueAt <= now
            ? "retention"
            : "recall") as Card["skill"],
        };
      })
      .filter((entry): entry is Card => Boolean(entry));
  });

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<{ correct: boolean; revealed: boolean } | null>(null);
  const [hint, setHint] = useState(false);
  const [audioUsed, setAudioUsed] = useState(false);
  const [translationUsed, setTranslationUsed] = useState(false);
  const [stats, setStats] = useState({ asked: 0, right: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  const card = deck[index];
  const finished = index >= deck.length;

  if (!card) {
    return (
      <div className="review" role="dialog" aria-modal="true" aria-label="Повторение слов">
        <button
          type="button"
          className="review__scrim"
          aria-label="Закрыть повторение"
          onClick={onClose}
        />
        <section className="review__card review__card--end">
          <button type="button" className="review__close" onClick={onClose} aria-label="Закрыть">
            <IconClose size={18} />
          </button>
          <span className="mono-caps">память</span>
          <h2 className="serif">{finished ? "Повторение закончено" : "Пока нечего повторять"}</h2>
          {finished ? (
            <p className="review__lede">
              Спрошено {stats.asked}. Вспомнил(а) {stats.right}. Это записано как настоящие ответы —
              не как очки.
            </p>
          ) : (
            <p className="review__lede">
              Сначала поговори с кем-нибудь в городе. Слова приходят из разговоров.
            </p>
          )}
          <button type="button" className="btn btn--primary" onClick={onClose}>
            вернуться <IconArrow size={16} />
          </button>
        </section>
      </div>
    );
  }

  const prompt = card.word.en;
  const reveal = (markTranslation: boolean) => {
    if (markTranslation) {
      setTranslationUsed(true);
      dispatchReview(false, true);
    }
    setResult({ correct: false, revealed: true });
  };

  const dispatchReview = (correct: boolean, translation: boolean) => {
    dispatch({
      type: "REVIEW",
      vocab: card.word.id,
      skill: card.skill,
      correct,
      support: {
        translation,
        hint,
        audio: audioUsed,
        typed: true,
        aiAssist: false,
      },
    });
    setStats((draft) => ({ asked: draft.asked + 1, right: draft.right + (correct ? 1 : 0) }));
  };

  const submit = () => {
    if (!answer.trim() || result) return;
    const match = matchAnswer(answer, [
      { id: card.word.id, ru: card.word.ru, canonical: [card.word.ru] },
    ]);
    const correct = match.status === "accepted" && !translationUsed;
    dispatchReview(correct, translationUsed);
    setResult({ correct, revealed: false });
    sfx(correct ? "good" : "soft");
  };

  const next = () => {
    setIndex((value) => value + 1);
    setAnswer("");
    setResult(null);
    setHint(false);
    setAudioUsed(false);
    setTranslationUsed(false);
    inputRef.current?.focus();
  };

  const play = () => {
    setAudioUsed(true);
    speak(card.word.ru, { rate: settings.audioRate });
  };

  const canSpeak = speechAvailable();

  return (
    <div className="review" role="dialog" aria-modal="true" aria-label="Повторение слов">
      <button
        type="button"
        className="review__scrim"
        aria-label="Закрыть повторение"
        onClick={onClose}
      />
      <section className="review__card">
        <button
          type="button"
          className="review__close"
          onClick={onClose}
          aria-label="Закрыть повторение"
        >
          <IconClose size={18} />
        </button>
        <div className="review__top">
          <span className="mono-caps">
            карточка {index + 1} / {deck.length}
          </span>
          <span className="review__dots" aria-hidden="true">
            {deck.map((entry, i) => (
              <i key={entry.word.id} className={i < index ? "done" : i === index ? "now" : ""} />
            ))}
          </span>
        </div>

        <p className="review__prompt serif">
          Как по-русски <em>«{prompt}»</em>?
        </p>
        <p className="review__sub faint">
          {card.skill === "retention"
            ? "Это слово уже было — оно возвращается через время."
            : "Вспомни слово из города. Печатать можно кириллицей или латиницей."}
        </p>

        <div className="review__tools">
          {canSpeak && soundOn ? (
            <button type="button" className="tool" onClick={play}>
              <IconSpeaker size={16} /> послушать
            </button>
          ) : null}
          <button
            type="button"
            className="tool"
            onClick={() => setHint(true)}
            disabled={hint || Boolean(result)}
          >
            <IconHint size={16} /> подсказка
          </button>
          <button
            type="button"
            className="tool"
            onClick={() => reveal(true)}
            disabled={Boolean(result)}
          >
            <IconEye size={16} /> показать ответ
          </button>
        </div>

        {hint && !result ? (
          <p className="review__hint">
            {card.word.ru.slice(0, 1)}
            {" · "}
            {card.word.ru.length} букв · {card.word.translit}
          </p>
        ) : null}

        <div className="review__answer">
          <input
            ref={inputRef}
            value={answer}
            onChange={(event) => setAnswer(event.target.value.slice(0, 120))}
            placeholder="по-русски…"
            lang="ru"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="send"
            disabled={Boolean(result)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            aria-label="Ответ"
          />
          {!result ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={submit}
              disabled={!answer.trim()}
            >
              проверить
            </button>
          ) : (
            <button type="button" className="btn btn--primary" onClick={next}>
              {index + 1 === deck.length ? "итог" : "дальше"} <IconArrow size={16} />
            </button>
          )}
        </div>

        {result ? (
          <div
            className={`review__result review__result--${result.correct ? "ok" : "miss"}`}
            role="status"
          >
            <span className="mono-caps">
              {result.correct ? "верно" : result.revealed ? "посмотрел(а)" : "пока нет"}
            </span>
            <p className="serif">
              {card.word.ru}
              <span className="faint"> · {card.word.translit}</span>
            </p>
            <p className="faint">
              {card.word.en}
              {card.skill === "retention" ? " · это было повторение через время" : ""}
            </p>
          </div>
        ) : null}

        {translationUsed && !result ? (
          <p className="review__note">
            Ты попросил(а) ответ — он записан как подсказка, а не как память.
          </p>
        ) : null}
      </section>
    </div>
  );
}

void normalizeRussian;
