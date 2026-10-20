import { useState } from "react";
import { CityCover } from "../art/CityCover";
import { IconArrow, IconClose, IconSpeaker, IconWalk } from "./icons";

interface IntroProps {
  help?: boolean;
  onStart?: (name: string) => void;
  onClose?: () => void;
  playerName?: string;
}

export function Intro({ help = false, onStart, onClose, playerName = "" }: IntroProps) {
  const [name, setName] = useState(playerName);

  return (
    <div
      className={`intro ${help ? "intro--help" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="MIR — Мир без перевода"
    >
      <div className="intro__art">
        <CityCover className="intro__cover" />
        <div className="intro__artcaption">
          <span className="mono-caps">Северогорск · октябрь</span>
          <span className="intro__artline" />
          <span className="mono-caps faint">двор, 16:40</span>
        </div>
      </div>

      <div className="intro__body">
        {help && (
          <button type="button" className="intro__close" onClick={onClose} aria-label="Закрыть">
            <IconClose size={20} />
          </button>
        )}

        <div className="intro__mark">
          <span className="intro__logo serif">MIR</span>
          <span className="intro__sub serif">Мир без перевода</span>
        </div>

        <div className="rule" />

        {help ? (
          <>
            <h1 className="intro__title serif">Как здесь жить</h1>
            <p className="intro__lede">
              Ты приехал в Северогорск. Город говорит по-русски. Не учи слова отдельно — делай дела
              и слушай, как отвечают люди.
            </p>
            <ul className="intro__steps">
              <li>
                <IconWalk size={20} />
                <div>
                  <strong>Иди</strong>
                  <span>
                    Нажимай на двор, на дверь, на человека. Или WASD / стрелки на клавиатуре.
                  </span>
                </div>
              </li>
              <li>
                <IconSpeaker size={20} />
                <div>
                  <strong>Слушай</strong>
                  <span>
                    Значок динамика читает русскую фразу вслух. Перевод — только если попросишь.
                  </span>
                </div>
              </li>
              <li>
                <IconArrow size={20} />
                <div>
                  <strong>Говори</strong>
                  <span>
                    Выбирай ответ или печатай свой. Ошибка в языке не проваливает задание.
                  </span>
                </div>
              </li>
            </ul>
            <p className="intro__note">
              Музыки нет, только дождь. Всё нарисовано кодом, все голоса — твой браузер.
            </p>
            <button type="button" className="btn btn--primary intro__start" onClick={onClose}>
              Вернуться во двор
            </button>
          </>
        ) : (
          <>
            <h1 className="intro__title serif">Ты уже здесь</h1>
            <p className="intro__lede">
              Ключ в кармане, телефон разряжен. В соседнем дворе живёт Анна — ей можно позвонить.
              Всё остальное придётся спросить по-русски.
            </p>
            <p className="intro__lede intro__lede--en">
              You just moved in. Your phone is dead. Ask your way around in Russian — the city
              answers.
            </p>

            <label className="intro__label" htmlFor="mir-name">
              <span className="mono-caps">Как тебя зовут?</span>
              <input
                id="mir-name"
                value={name}
                onChange={(event) => setName(event.target.value.slice(0, 24))}
                placeholder="Алекс"
                autoComplete="off"
                spellCheck={false}
                maxLength={24}
                lang="ru"
              />
            </label>

            <button
              type="button"
              className="btn btn--primary intro__start"
              onClick={() => onStart?.(name.trim())}
            >
              Войти во двор
              <IconArrow size={18} />
            </button>

            <p className="intro__note">
              Можно не знать ни слова. Герои говорят медленно, а перевод всегда рядом — просто не
              сразу.
            </p>
            <div className="intro__controls intro__controls--keys mono-caps">
              <span>WASD / стрелки — идти</span>
              <span>E — говорить</span>
              <span>ESC — закрыть</span>
            </div>
            <div className="intro__controls intro__controls--touch mono-caps">
              <span>коснись места — идти</span>
              <span>коснись человека — говорить</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
