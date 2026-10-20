import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { MirScene } from "../game/MirScene";

export function GameCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    let cancelled = false;
    const start = () => {
      if (cancelled || !hostRef.current || gameRef.current) return;
      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        backgroundColor: "#15120f",
        transparent: false,
        antialias: true,
        roundPixels: false,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: window.innerWidth,
          height: window.innerHeight,
        },
        render: {
          powerPreference: "high-performance",
        },
        input: { activePointers: 2 },
        scene: [MirScene],
      });
      gameRef.current = game;
      if (import.meta.env.DEV || new URLSearchParams(window.location.search).has("debug")) {
        (window as Window & { __MIR_GAME__?: Phaser.Game }).__MIR_GAME__ = game;
      }
    };
    if (document.fonts?.ready) {
      void document.fonts.ready.then(start);
    } else {
      start();
    }
    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div className="game-canvas" ref={hostRef} aria-hidden="true" />;
}
