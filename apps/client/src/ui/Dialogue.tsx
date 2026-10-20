import { useEffect, useMemo, useRef, useState } from "react";
import {
  DIALOGUES_BY_ID,
  NPC_BY_ID,
  applyTemplate,
  evaluateCondition,
  getDialogueNode,
  hasCyrillic,
  matchAnswer,
  supportFor,
  transliterateCyrillic,
  type DialogueNode,
  type DialogueOption,
  type GameState,
  type PortraitStage,
} from "@mir/shared";
import { useGame } from "../state/store";
import { portraitUrl } from "../art/portraits";
import { speak, speechAvailable } from "../audio/speech";
import { sfx } from "../audio/ambience";
import { relationLabel } from "./format";
import { IconArrow, IconClose, IconEye, IconHint, IconSpark, IconSpeaker, IconTalk } from "./icons";

function resolvePresentation(node: DialogueNode, state: GameState) {
  const variant = node.variant?.find((entry) => evaluateCondition(entry.when, state));
  return {
    ru: applyTemplate(variant?.ru ?? node.ru, state),
    en: variant?.en ?? node.en,
    stage: (variant?.stage ?? node.stage ?? "neutral") as PortraitStage,
  };
}

export function Dialogue() {
  const dialogue = useGame((store) => store.dialogue);
  const state = useGame((store) => store.state);
  const feedback = useGame((store) => store.feedback);
  const settings = useGame((store) => store.settings);
  const soundOn = useGame((store) => store.soundOn);
  const ai = useGame((store) => store.ai);
  const syncAi = useGame((store) => store.sync.ai);
  const choose = useGame((store) => store.choose);
  const submitTyped = useGame((store) => store.submitTyped);
  const advance = useGame((store) => store.advance);
  const closeDialogue = useGame((store) => store.closeDialogue);
  const markSupport = useGame((store) => store.markSupport);
  const askAi = useGame((store) => store.askAi);
  const acceptAi = useGame((store) => store.acceptAi);

  const node = dialogue ? getDialogueNode(dialogue.dialogueId, dialogue.nodeId) : undefined;
  const definition = dialogue ? DIALOGUES_BY_ID[dialogue.dialogueId] : undefined;
  const npc = dialogue ? NPC_BY_ID[dialogue.npcId] : undefined;
  const npcState = dialogue ? state.npcs[dialogue.npcId] : undefined;
  const presentation = useMemo(
    () =>
      node
        ? resolvePresentation(node, state)
        : { ru: "", en: undefined, stage: "neutral" as PortraitStage },
    [node, state],
  );

  const [revealLine, setRevealLine] = useState(false);
  const [revealedOptions, setRevealedOptions] = useState<Record<string, boolean>>({});
  const [showHint, setShowHint] = useState(false);
  const [answer, setAnswer] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const nodeKey = dialogue ? `${dialogue.dialogueId}:${dialogue.nodeId}` : "";
  const spokenRef = useRef("");

  const decision = supportFor(state, settings);
  const showTranslation = decision.showTranslation || revealLine;

  useEffect(() => {
    setRevealLine(false);
    setRevealedOptions({});
    setShowHint(false);
    setAnswer("");
    if (window.matchMedia?.("(pointer:fine)").matches) {
      inputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (!node || !dialogue || !soundOn) return;
    if (node.mode === "typed" && !node.ru) return;
    if (spokenRef.current === nodeKey) return;
    spokenRef.current = nodeKey;
    const text = node.mode === "typed" ? (node.typed?.promptRu ?? "") : presentation.ru;
    if (!text) return;
    const ok = speak(text, {
      rate: (npc?.voice?.rate ?? 0.92) * settings.audioRate,
      pitch: npc?.voice?.pitch ?? 1,
      onStart: () => markSupport("audio"),
    });
    if (ok) markSupport("audio");
  }, [nodeKey, node, dialogue, soundOn, npc, presentation.ru, settings.audioRate, markSupport]);

  if (!dialogue || !node || !definition) return null;

  const name = npc?.shortNameRu ?? (dialogue.npcId === "phone" ? "Телефон" : "Голос");
  const role = npc?.roleRu;
  const memory = npcState?.memories?.[npcState.memories.length - 1];
  const isTyped = node.mode === "typed";
  const isChoice = node.mode === "choice";
  const canSpeak = speechAvailable();

  const replay = (text: string) => {
    const ok = speak(text, {
      rate: (npc?.voice?.rate ?? 0.92) * settings.audioRate,
      pitch: npc?.voice?.pitch ?? 1,
      onStart: () => markSupport("audio"),
    });
    if (ok) markSupport("audio");
  };

  const toggleOptionTranslation = (option: DialogueOption) => {
    markSupport("translation");
    setRevealedOptions((draft) => ({ ...draft, [option.id]: !draft[option.id] }));
  };

  const onChoose = (option: DialogueOption) => {
    sfx("good");
    choose(option.id);
  };

  const typedPreview = isTyped && answer.trim() ? matchAnswer(answer, node.options ?? []) : null;

  return (
    <div className="dialogue" role="dialog" aria-modal="true" aria-label={`Разговор: ${name}`}>
      <button
        type="button"
        className="dialogue__scrim"
        aria-label="Закрыть разговор"
        onClick={closeDialogue}
      />
      <section className="dialogue__sheet">
        <button
          type="button"
          className="dialogue__close"
          onClick={closeDialogue}
          aria-label="Закончить разговор"
        >
          <IconClose size={18} />
          <span>выйти</span>
        </button>

        <header className="dialogue__head">
          <div className="dialogue__portrait">
            <img
              src={portraitUrl(dialogue.npcId, presentation.stage)}
              alt={`${name}, ${role ?? ""}`}
              draggable={false}
            />
            <span className="dialogue__tape" aria-hidden="true" />
          </div>
          <div className="dialogue__who">
            <h2 className="serif">{name}</h2>
            <div className="dialogue__meta">
              {role ? <span>{role}</span> : null}
              <span className="dot" />
              <span>{relationLabel(npcState)}</span>
            </div>
            {memory ? (
              <div className="dialogue__memory">
                <span className="mono-caps">помнит</span>
                <span>{memory.textRu}</span>
              </div>
            ) : null}
          </div>
          <div className="dialogue__title mono-caps">{definition.titleRu}</div>
        </header>

        <div className="dialogue__body">
          {isTyped ? (
            <div className="prompt">
              <p className="prompt__ru serif">{applyTemplate(node.typed?.promptRu ?? "", state)}</p>
              {node.typed?.promptEn ? <p className="prompt__en">{node.typed.promptEn}</p> : null}
              <div className="prompt__tools">
                {canSpeak ? (
                  <button
                    type="button"
                    className="tool"
                    onClick={() => replay(node.typed?.promptRu ?? "")}
                  >
                    <IconSpeaker size={16} /> ещё раз
                  </button>
                ) : null}
                {node.typed?.hintRu && settings.hints ? (
                  <button
                    type="button"
                    className="tool"
                    onClick={() => {
                      markSupport("hint");
                      setShowHint((value) => !value);
                    }}
                  >
                    <IconHint size={16} /> подсказка
                  </button>
                ) : null}
                {!hasCyrillic(answer) && answer.trim() ? (
                  <span className="prompt__translit">{transliterateCyrillic(answer)}</span>
                ) : null}
              </div>
              {showHint && node.typed?.hintRu ? (
                <div className="hint">
                  <p>{node.typed.hintRu}</p>
                  {node.typed.hintEn ? <p className="faint">{node.typed.hintEn}</p> : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className={`line ${node.audio ? "line--phone" : ""}`}>
              <p className="line__ru serif">{presentation.ru}</p>
              <div className="line__tools">
                {canSpeak ? (
                  <button
                    type="button"
                    className="tool"
                    onClick={() => replay(presentation.ru)}
                    aria-label="Прослушать"
                  >
                    <IconSpeaker size={16} /> послушать
                  </button>
                ) : null}
                {node.en ? (
                  <button
                    type="button"
                    className={`tool ${revealLine ? "is-on" : ""}`}
                    onClick={() => {
                      if (!revealLine) markSupport("translation");
                      setRevealLine((value) => !value);
                    }}
                  >
                    <IconEye size={16} /> {revealLine ? "скрыть перевод" : "перевод"}
                  </button>
                ) : null}
              </div>
              {showTranslation && presentation.en ? (
                <p className="line__en">{presentation.en}</p>
              ) : null}
            </div>
          )}

          {feedback && (feedback.corrections.length > 0 || !feedback.accepted) ? (
            <div
              className={`feedback feedback--${feedback.accepted ? "ok" : feedback.status}`}
              role="status"
            >
              <div className="feedback__head">
                <span className="mono-caps">
                  {feedback.accepted
                    ? "принято"
                    : feedback.status === "close"
                      ? "почти"
                      : "не понял"}
                </span>
                {feedback.matchedRu && feedback.accepted ? (
                  <span className="feedback__match">услышано: «{feedback.matchedRu}»</span>
                ) : null}
              </div>
              {feedback.messageRu ? (
                <p className="feedback__message">{feedback.messageRu}</p>
              ) : null}
              {feedback.corrections.map((note) => (
                <p key={note.ru} className="feedback__note">
                  <span>{note.ru}</span>
                  <span className="faint">{note.en}</span>
                </p>
              ))}
            </div>
          ) : null}

          {isTyped ? (
            <form
              className="answer"
              onSubmit={(event) => {
                event.preventDefault();
                if (!answer.trim()) return;
                sfx("tap");
                submitTyped(answer.trim());
              }}
            >
              <div className="answer__row">
                <input
                  ref={inputRef}
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value.slice(0, 300))}
                  placeholder="Скажи по-русски…"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  lang="ru"
                  enterKeyHint="send"
                  aria-label="Твой ответ по-русски"
                />
                <button
                  type="submit"
                  className="btn btn--primary answer__send"
                  disabled={!answer.trim()}
                >
                  <IconTalk size={17} /> сказать
                </button>
              </div>
              <div className="answer__foot">
                <span className="mono-caps faint">можно латиницей · ошибки не страшны</span>
                {typedPreview?.status === "close" ? (
                  <span className="answer__near">похоже, ты уже близко</span>
                ) : null}
              </div>
              {feedback && !feedback.accepted && syncAi ? (
                <div className="ai-help">
                  {!ai ? (
                    <button type="button" className="tool tool--ai" onClick={() => void askAi()}>
                      <IconSpark size={16} /> MIR: что я сказал?
                    </button>
                  ) : ai.pending ? (
                    <span className="ai-help__pending">MIR слушает…</span>
                  ) : ai.optionId ? (
                    <div className="ai-help__card">
                      <span className="mono-caps">
                        возможный смысл · {Math.round(ai.confidence * 100)}%
                      </span>
                      <p className="serif">«{ai.text}»</p>
                      {ai.note ? <p className="faint">{ai.note}</p> : null}
                      <div className="ai-help__row">
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => void askAi()}
                        >
                          другое
                        </button>
                        <button type="button" className="btn btn--primary" onClick={acceptAi}>
                          так и сказать
                        </button>
                      </div>
                      <span className="ai-help__note">
                        MIR только подбирает из готовых реплик. Он не меняет мир и не даёт наград.
                      </span>
                    </div>
                  ) : (
                    <span className="ai-help__pending">MIR не уверен. Скажи иначе.</span>
                  )}
                </div>
              ) : null}
            </form>
          ) : null}

          {isChoice ? (
            <div className="options">
              {node.options?.map((option, index) => {
                const roman = index + 1;
                return (
                  <div className="opt" key={option.id}>
                    <button type="button" className="opt__main" onClick={() => onChoose(option)}>
                      <span className="opt__num mono-caps">{roman}</span>
                      <span className="opt__text">
                        <span className="opt__ru">{applyTemplate(option.ru, state)}</span>
                        {revealedOptions[option.id] ? (
                          <span className="opt__en">{option.en}</span>
                        ) : null}
                      </span>
                      <IconArrow size={16} className="opt__arrow" />
                    </button>
                    <div className="opt__tools">
                      {canSpeak ? (
                        <button
                          type="button"
                          className="opt__tool"
                          onClick={() => replay(option.ru)}
                          aria-label="Прослушать вариант"
                        >
                          <IconSpeaker size={14} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="opt__tool opt__tool--en"
                        onClick={() => toggleOptionTranslation(option)}
                        aria-label="Показать перевод варианта"
                      >
                        en
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {!isChoice && !isTyped ? (
            <div className="dialogue__next">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  sfx("tap");
                  advance();
                }}
              >
                {node.next ? "Дальше" : "Закрыть"}
                <IconArrow size={17} />
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
