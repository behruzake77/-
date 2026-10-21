import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/cormorant-garamond/latin-600.css";
import "@fontsource/cormorant-garamond/cyrillic-500.css";
import "@fontsource/cormorant-garamond/cyrillic-600.css";
import "@fontsource/cormorant-garamond/latin-500-italic.css";
import "@fontsource/cormorant-garamond/cyrillic-500-italic.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/cyrillic-400.css";
import "@fontsource/inter/cyrillic-500.css";
import "@fontsource/inter/cyrillic-600.css";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { DesignSystem } from "./design/DesignSystem";
import "./styles/theme.css";
import "./styles/game.css";
import "./styles/ui.css";
import "./design/tokens.css";
import "./design/design-system.css";

function Root() {
  const [mode, setMode] = useState<string>(() =>
    window.location.hash === "#design" || new URLSearchParams(window.location.search).has("design") ? "design" : "game"
  );
  useEffect(() => {
    const onHash = () => {
      const isDesign = window.location.hash === "#design" || new URLSearchParams(window.location.search).has("design");
      setMode(isDesign ? "design" : "game");
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  if (mode === "design") return <DesignSystem />;
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => undefined);
  });
}
