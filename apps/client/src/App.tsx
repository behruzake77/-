import { Component, useEffect, type ReactNode } from "react";
import { useGame } from "./state/store";
import { GameCanvas } from "./ui/GameCanvas";
import { Intro } from "./ui/Intro";
import { TopBar, QuestChip, InteractPrompt, InventoryStrip, ConfirmDialog } from "./ui/Hud";
import { Dialogue } from "./ui/Dialogue";
import { Journal } from "./ui/Journal";
import { Phone } from "./ui/Phone";
import { Toasts } from "./ui/Toasts";
import { setAudioEnabled, sfx, unlockAudio } from "./audio/ambience";
import { stopSpeaking } from "./audio/speech";
import { flushSave } from "./state/store";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="crash">
          <h1 className="serif">Мир замер</h1>
          <p>Что-то сломалось в сцене. Твой прогресс сохранён на этом устройстве.</p>
          <pre>{this.state.error.message}</pre>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => window.location.reload()}
          >
            вернуться в город
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  const started = useGame((store) => store.state.started);
  const introOpen = useGame((store) => store.introOpen);
  const panel = useGame((store) => store.panel);
  const dialogue = useGame((store) => store.dialogue);
  const sleeping = useGame((store) => store.sleeping);
  const soundOn = useGame((store) => store.soundOn);
  const name = useGame((store) => store.state.name);
  const boot = useGame((store) => store.boot);
  const start = useGame((store) => store.start);
  const setIntro = useGame((store) => store.setIntro);
  const setPanel = useGame((store) => store.setPanel);
  const sleepPrompt = useGame((store) => store.sleepPrompt);
  const setSleepPrompt = useGame((store) => store.setSleepPrompt);
  const sleep = useGame((store) => store.sleep);

  useEffect(() => {
    boot();
  }, [boot]);

  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      setAudioEnabled(useGame.getState().soundOn);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    setAudioEnabled(soundOn);
    if (!soundOn) stopSpeaking();
  }, [soundOn]);

  useEffect(() => {
    const tick = setInterval(() => {
      const store = useGame.getState();
      if (!store.state.started) return;
      if (store.dialogue || store.panel || store.sleeping) return;
      store.dispatch({ type: "TICK", minutes: 1 });
    }, 60_000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const onHide = () => {
      flushSave();
      if (useGame.getState().state.started) void useGame.getState().syncNow();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const store = useGame.getState();
      if (store.dialogue) store.closeDialogue();
      else if (store.panel) store.setPanel(null);
      else if (store.introOpen) store.setIntro(false);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onHide();
      else stopSpeaking();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className="app">
        <GameCanvas />
        <div className="vignette" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />

        {started ? (
          <>
            <TopBar />
            {!dialogue && !panel ? <QuestChip /> : null}
            {!dialogue && !panel ? <InventoryStrip /> : null}
            <InteractPrompt />
          </>
        ) : null}

        <Dialogue />
        {panel === "journal" ? <Journal /> : null}
        {panel === "phone" ? <Phone /> : null}
        <Toasts />

        {(!started || introOpen) && (
          <Intro
            help={started && introOpen}
            playerName={name}
            onStart={(value) => {
              unlockAudio();
              setAudioEnabled(true);
              sfx("good");
              start(value);
            }}
            onClose={() => {
              setIntro(false);
              setPanel(null);
            }}
          />
        )}

        {sleepPrompt && !dialogue && !panel ? (
          <ConfirmDialog
            title="Лечь спать?"
            text="День закончится. Плед пахнет чужой квартирой, но это уже твоя квартира."
            confirmLabel="Лечь спать"
            onCancel={() => setSleepPrompt(false)}
            onConfirm={() => {
              setSleepPrompt(false);
              sleep();
            }}
          />
        ) : null}

        {sleeping ? (
          <div className="sleep" role="status" aria-live="polite">
            <span className="mono-caps">ночь</span>
            <span className="sleep__line serif">Дождь по стеклу. Ты закрываешь глаза.</span>
          </div>
        ) : null}
      </div>
    </ErrorBoundary>
  );
}
