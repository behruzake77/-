import { NPC_BY_ID, QUESTS_BY_ID, ZONES, itemName } from "./hudData";
import { useGame } from "../state/store";
import { formatMoney, formatPartOfDay, formatTime } from "./format";
import {
  IconBag,
  IconBook,
  IconCoin,
  IconMute,
  IconPhone,
  IconPin,
  IconSound,
  IconTalk,
  IconWalk,
  IconClose,
} from "./icons";
import { sfx } from "../audio/ambience";

export function TopBar() {
  const state = useGame((store) => store.state);
  const soundOn = useGame((store) => store.soundOn);
  const toggleSound = useGame((store) => store.toggleSound);
  const setPanel = useGame((store) => store.setPanel);
  const setIntro = useGame((store) => store.setIntro);
  const zone = ZONES[state.player.zone];

  return (
    <header className="hud-top">
      <div className="hud-place">
        <div className="hud-place__name serif">{zone?.nameRu ?? "Северогорск"}</div>
        <div className="hud-place__sub mono-caps">
          <span>{formatPartOfDay(state.minutes)}</span>
          <span className="dot" />
          <span>день {state.day}</span>
          <span className="dot" />
          <span>{formatTime(state.minutes)}</span>
        </div>
      </div>

      <div className="hud-actions">
        <div className="hud-money" title="Деньги">
          <IconCoin size={16} />
          <span>{formatMoney(state.player.money)} ₽</span>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={() => {
            sfx("tap");
            void toggleSound();
          }}
          aria-label={soundOn ? "Выключить звук" : "Включить звук"}
          title={soundOn ? "Звук включён" : "Звук выключен"}
        >
          {soundOn ? <IconSound size={19} /> : <IconMute size={19} />}
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => {
            sfx("open");
            setPanel("journal");
          }}
          aria-label="Дневник"
          title="Дневник"
        >
          <IconBook size={19} />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => {
            sfx("open");
            setPanel("phone");
          }}
          aria-label="Телефон"
          title="Телефон"
        >
          <IconPhone size={19} />
        </button>
        <button
          type="button"
          className="icon-btn hud-help"
          onClick={() => setIntro(true)}
          aria-label="Как играть"
          title="Как играть"
        >
          <span className="serif">?</span>
        </button>
      </div>
    </header>
  );
}

export function QuestChip() {
  const state = useGame((store) => store.state);
  const active = Object.values(state.quests)
    .filter((quest) => quest.status === "active")
    .sort((a, b) => a.startedAt - b.startedAt);
  const definition = active[0] ? QUESTS_BY_ID[active[0].id] : undefined;
  const questInfo = definition
    ? { quest: definition, stepIndex: Math.min(active[0].step, definition.steps.length - 1) }
    : null;
  const setPanel = useGame((store) => store.setPanel);
  const open = () => {
    sfx("open");
    setPanel("journal");
  };
  if (!questInfo) {
    return (
      <button type="button" className="quest-chip quest-chip--quiet" onClick={open}>
        <span className="mono-caps">дневник</span>
        <span className="quest-chip__title serif">Пока тихо. Осмотрись.</span>
      </button>
    );
  }
  const { quest, stepIndex } = questInfo;
  const step = quest.steps[stepIndex];
  const giver = NPC_BY_ID[quest.giver];
  return (
    <button
      type="button"
      className="quest-chip"
      onClick={open}
      aria-label={`Задание: ${quest.titleRu}`}
    >
      <div className="quest-chip__top">
        <span className="mono-caps">
          задание · {stepIndex + 1}/{quest.steps.length}
        </span>
        <span className="quest-chip__dots" aria-hidden="true">
          {quest.steps.map((entry, index) => (
            <i
              key={entry.id}
              className={index < stepIndex ? "done" : index === stepIndex ? "now" : ""}
            />
          ))}
        </span>
      </div>
      <span className="quest-chip__title serif">{quest.titleRu}</span>
      <span className="quest-chip__step">
        {step?.ru ?? quest.summaryRu}
        {giver ? <span className="quest-chip__giver"> · {giver.shortNameRu}</span> : null}
      </span>
    </button>
  );
}

export function InteractPrompt() {
  const near = useGame((store) => store.near);
  const interact = useGame((store) => store.interact);
  const dialogue = useGame((store) => store.dialogue);
  const panel = useGame((store) => store.panel);
  const state = useGame((store) => store.state);

  if (!near || dialogue || panel) return null;
  const isNpc = near.kind === "npc";
  const isExit = near.kind === "exit";
  const verb = isNpc ? "Говорить" : isExit ? "Войти" : "Осмотреть";
  const icon = isNpc ? (
    <IconTalk size={18} />
  ) : isExit ? (
    <IconWalk size={18} />
  ) : (
    <IconPin size={18} />
  );
  const zone = ZONES[state.player.zone];
  const exiting = isExit && near.labelEn.toLowerCase().includes("entrance");

  return (
    <div className="interact">
      <button type="button" className="interact__btn" onClick={() => interact(near.id)}>
        <span className="interact__icon">{icon}</span>
        <span className="interact__text">
          <span className="interact__verb mono-caps">{verb}</span>
          <span className="interact__label">{near.labelRu}</span>
        </span>
        <kbd className="interact__key">E</kbd>
      </button>
      {zone ? (
        <span className="interact__hint mono-caps">
          {exiting ? "выйти на улицу" : "нажми, чтобы подойти"}
        </span>
      ) : null}
    </div>
  );
}

export function InventoryStrip() {
  const inventory = useGame((store) => store.state.inventory);
  const items = Object.entries(inventory).filter(([, qty]) => qty > 0);
  if (!items.length) return null;
  return (
    <section className="inventory" aria-label="Сумка">
      <IconBag size={16} />
      {items.slice(0, 5).map(([id, qty]) => (
        <span key={id} className="inventory__item">
          {itemName(id)}
          {qty > 1 ? <em> ×{qty}</em> : null}
        </span>
      ))}
    </section>
  );
}

export function ConfirmDialog({
  title,
  text,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  text: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <div className="confirm">
        <button type="button" className="confirm__close" onClick={onCancel} aria-label="Закрыть">
          <IconClose size={18} />
        </button>
        <h2 className="serif">{title}</h2>
        <p>{text}</p>
        <div className="confirm__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Остаться
          </button>
          <button type="button" className="btn btn--danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
