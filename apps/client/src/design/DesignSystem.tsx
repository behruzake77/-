import { useState, useEffect } from "react";
import "./design-system.css";

/* ---------- tiny icon set (no deps) ---------- */
const I = {
  play: (p:any)=><svg viewBox="0 0 24 24" width={p.size??18} height={p.size??18} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 5l10 7-10 7z"/></svg>,
  pause: (p:any)=><svg viewBox="0 0 24 24" width={p.size??16} height={p.size??16} fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="7" y="5" width="4" height="14" rx="1"/><rect x="13" y="5" width="4" height="14" rx="1"/></svg>,
  chev: (p:any)=><svg viewBox="0 0 24 24" width={p.size??14} height={p.size??14} fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M9 6l6 6-6 6"/></svg>,
  mic: (p:any)=><svg viewBox="0 0 24 24" width={p.size??16} height={p.size??16} fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10a7 7 0 01-14 0"/><path d="M12 17v4"/><path d="M8 21h8"/></svg>,
  vol: (p:any)=><svg viewBox="0 0 24 24" width={p.size??16} height={p.size??16} fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M11 5L6 9H2v6h4l5 4z"/><path d="M14 9a4 4 0 010 6"/></svg>,
  map: (p:any)=><svg viewBox="0 0 24 24" width={p.size??16} height={p.size??16} fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 6l6-3 6 3 6-3v14l-6 3-6-3-6 3z"/><path d="M9 3v14M15 6v14"/></svg>,
  bag: (p:any)=><svg viewBox="0 0 24 24" width={p.size??16} height={p.size??16} fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6 7h12l-1 11a2 2 0 01-2 2H9a2 2 0 01-2-2z"/><path d="M9 7a3 3 0 016 0"/></svg>,
  book: (p:any)=><svg viewBox="0 0 24 24" width={p.size??16} height={p.size??16} fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 5a3 3 0 013-3h5v18H7a3 3 0 00-3 3z"/><path d="M20 5a3 3 0 00-3-3h-5v18h5a3 3 0 013-3z"/></svg>,
  phone: (p:any)=><svg viewBox="0 0 24 24" width={p.size??16} height={p.size??16} fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M12 18h.01"/></svg>,
  pin: (p:any)=><svg viewBox="0 0 24 24" width={p.size??14} height={p.size??14} fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 21s7-5 7-11a7 7 0 10-14 0c0 6 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>,
  sound: (p:any)=><svg viewBox="0 0 24 24" width={p.size??14} height={p.size??14} fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3l5 5h3v8h-3l-5 5z"/></svg>,
  hint: (p:any)=><svg viewBox="0 0 24 24" width={p.size??14} height={p.size??14} fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="8"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>,
};

/* ---------- tokens panel ---------- */
function Tokens() {
  return (
    <div className="mir-tokens">
      <div className="mir-tokens__grid">
        <div className="mir-token">
          <span className="mir-token__swatch" style={{background:"#15120f", borderColor:"rgba(241,228,203,0.16)"}}/>
          <div><b>--mir-ink</b><i>#15120f · panel 88% · blur 18px</i></div>
        </div>
        <div className="mir-token">
          <span className="mir-token__swatch" style={{background:"#d9a441"}}/>
          <div><b>--mir-amber</b><i>#D9A441 · primary, quest, focus</i></div>
        </div>
        <div className="mir-token">
          <span className="mir-token__swatch" style={{background:"#f1e4cb"}}/>
          <div><b>--mir-ivory</b><i>#F1E4CB · headings · 92%</i></div>
        </div>
        <div className="mir-token" style={{fontFamily:"var(--mir-serif)", fontSize:22}}>Cormorant Garamond 500/600 · headings, ru</div>
        <div className="mir-token" style={{fontFamily:"var(--mir-sans)", fontSize:13, letterSpacing:"0.18em"}}>INTER 400/500/600 · UI · CAPS</div>
        <div className="mir-token" style={{display:"flex", gap:8}}><span style={{padding:"6px 12px", background:"var(--mir-amber)", color:"#1a160f", borderRadius:999, fontWeight:600, fontSize:12}}>PRIMARY</span><span style={{padding:"6px 12px", border:"1px solid rgba(241,228,203,0.16)", borderRadius:999, fontSize:12}}>GHOST</span><span style={{padding:"6px 12px", background:"rgba(18,15,12,0.88)", border:"1px solid rgba(241,228,203,0.1)", borderRadius:999, fontSize:12}}>PANEL</span></div>
      </div>
      <div className="mir-tokens__meta">
        <span>4pt grid · 14/20 radii · elevation 0/12/24 shadow · hairline 1px · 720/860/980 breakpoints</span>
        <span>Auto Layout · hover 120ms · pressed 80ms · focus ring amber 2px</span>
      </div>
    </div>
  );
}

/* ---------- shared chrome helpers ---------- */
function Panel({children, style, className=""}:{children:any, style?:any, className?:string}) {
  return <div className={`mir-panel ${className}`} style={style}>{children}</div>;
}

/* ---------- SCREENS ---------- */
function Screen01({onAction}:{onAction:(k:string)=>void}) {
  return (
    <div className="mir-frame" style={{backgroundImage:"url(/design-menu-bg.jpg)"}}>
      <div className="mir-frame__scrim" />
      <div className="mir-frame__grain" />
      <div style={{position:"absolute", inset:0, display:"grid", placeItems:"center", padding:32}}>
        <div style={{width:"min(560px, 92%)"}}>
          <div style={{display:"flex", alignItems:"baseline", gap:14, marginBottom:18}}>
            <span style={{fontFamily:"var(--mir-serif)", letterSpacing:"0.36em", color:"var(--mir-amber)", fontSize:38}}>MIR</span>
            <span style={{fontFamily:"var(--mir-serif)", fontStyle:"italic", color:"var(--mir-ivory-dim)", fontSize:20}}>Мир без перевода</span>
          </div>
          <div style={{height:1, background:"linear-gradient(90deg, rgba(241,228,203,0.24), transparent 70%)", marginBottom:22, position:"relative"}}>
            <i style={{position:"absolute", left:0, top:-3, width:7, height:7, background:"var(--mir-amber)", transform:"rotate(45deg)", display:"block"}}/>
          </div>
          <h1 style={{fontFamily:"var(--mir-serif)", fontSize:42, lineHeight:1, margin:"0 0 8px", fontWeight:500}}>Северогорск ждёт</h1>
          <p style={{color:"var(--mir-ivory-dim)", lineHeight:1.6, margin:"0 0 22px", maxWidth:44+"ch"}}>Ты приезжаешь в новый район. Город говорит только по-русски. Слушай, смотри, пробуй — и он ответит.</p>
          <div style={{display:"grid", gap:10}}>
            <button className="mir-btn mir-btn--primary" onClick={()=>onAction("continue")}>Продолжить <I.chev/></button>
            <button className="mir-btn mir-btn--ghost" onClick={()=>onAction("new")}>Новая игра</button>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
              <button className="mir-btn mir-btn--panel" onClick={()=>onAction("settings")}>Настройки</button>
              <button className="mir-btn mir-btn--panel" onClick={()=>onAction("lang")}>Язык · A11y</button>
            </div>
          </div>
          <div style={{display:"flex", gap:14, color:"rgba(241,228,203,0.45)", fontSize:11, letterSpacing:"0.16em", textTransform:"uppercase", marginTop:18}}>
            <span>RU · EN подсказки</span><span>·</span><span>Геймпад · Клавиатура · Сенсор</span>
          </div>
        </div>
      </div>
      <div className="mir-frame__caption">SCREEN 01 — Main Menu · 1440 · cinematic 3D city · amber / ivory · blur panel</div>
    </div>
  );
}

function Screen02({onAction}:{onAction:()=>void}) {
  const [pick,setPick]=useState(1);
  return (
    <div className="mir-frame mir-frame--light">
      <div className="mir-frame__topbar"><span>Создание персонажа</span><span className="mono">02 — Character Introduction</span></div>
      <div style={{display:"grid", gridTemplateColumns:"1.05fr 0.95fr", height:"calc(100% - 38px)"}}>
        <div style={{position:"relative", background:"#0f0e0c", overflow:"hidden", display:"grid", placeItems:"center", padding:24}}>
          <div style={{position:"absolute", inset:0, background:"radial-gradient(90% 60% at 50% 30%, rgba(217,164,65,0.12), transparent 60%), #15120f"}}/>
          <div style={{position:"relative", display:"flex", gap:14, alignItems:"end"}}>
            {[0,1,2].map(i=>(
              <button key={i} onClick={()=>setPick(i)} className={`mir-avatarPick ${pick===i?"is-active":""}`}>
                <img src={i===1?"/portrait-anna.jpg":"/portrait-lidia.jpg"} alt="" style={{objectPosition:i===0?"50% 22%":undefined}}/>
                <span>{["Артём","Алекс","Марина"][i]}</span>
              </button>
            ))}
          </div>
          <div style={{position:"absolute", bottom:14, left:14, right:14, display:"flex", justifyContent:"space-between", color:"rgba(241,228,203,0.5)", fontSize:11, letterSpacing:"0.14em", textTransform:"uppercase"}}>
            <span>Октябрь · двор · 16:40</span><span>Северогорск · ул. Мира 14</span>
          </div>
        </div>
        <div style={{padding:"28px 24px", background:"rgba(21,18,15,0.96)", display:"flex", flexDirection:"column"}}>
          <span className="mono" style={{color:"var(--mir-amber)", letterSpacing:"0.18em"}}>Глава 1 · Прибытие</span>
          <h2 className="serif" style={{fontSize:32, margin:"8px 0 10px", lineHeight:1.05}}>Ты уже здесь</h2>
          <p style={{color:"var(--mir-ivory-dim)", lineHeight:1.6, margin:0}}>Ключ в кармане, телефон разряжен. Во дворе — скамейки, берёза, лужи. Соседка Лидия Петровна что-то знает. Анна ждёт звонка.</p>
          <p style={{fontFamily:"var(--mir-serif)", fontStyle:"italic", color:"var(--mir-ivory-faint)", margin:"8px 0 16px"}}>You’ve just arrived. The courtyard is wet, the key is heavy. Listen first.</p>
          <div style={{background:"rgba(217,164,65,0.10)", border:"1px solid rgba(217,164,65,0.18)", borderRadius:12, padding:12, display:"flex", gap:10, alignItems:"center"}}>
            <span style={{width:28, height:28, borderRadius:999, background:"var(--mir-amber)", color:"#1a160f", display:"grid", placeItems:"center"}}><I.pin size={14}/></span>
            <div><b style={{fontSize:13}}>Старт: двор на ул. Мира</b><div style={{fontSize:12, color:"var(--mir-ivory-faint)"}}>Квартира 27 · второй этаж · чайник, чемодан, записка</div></div>
          </div>
          <button className="mir-btn mir-btn--primary" style={{marginTop:"auto"}} onClick={onAction}>Войти во двор <I.chev/></button>
        </div>
      </div>
      <div className="mir-frame__caption">SCREEN 02 — Character · 3-up · narrative bridge · same tokens</div>
    </div>
  );
}

function Screen03({onDialogue}:{onDialogue:()=>void}) {
  return (
    <div className="mir-frame" style={{background:"#070705"}}>
      {/* 3D viewport */}
      <div style={{position:"absolute", inset:0, backgroundImage:"url(/photo-asphalt-top.jpg)", backgroundSize:"cover", backgroundPosition:"center"}}>
        <div style={{position:"absolute", inset:0, background:"radial-gradient(120% 90% at 50% 40%, transparent 58%, rgba(8,7,5,0.42) 100%), linear-gradient(180deg, rgba(8,7,5,0.52) 0%, transparent 14%, transparent 78%, rgba(8,7,5,0.42) 100%)"}}/>
        {/* fake 3D character + depth */}
        <div style={{position:"absolute", left:"46%", top:"62%", width:36, height:88, transform:"translate(-50%, -50%)"}}>
          <div style={{position:"absolute", inset:0, background:"linear-gradient(180deg, #4a5a44 0%, #2f352c 100%)", borderRadius:8, boxShadow:"0 12px 28px rgba(0,0,0,0.45)"}}/>
          <div style={{position:"absolute", left:9, top:-8, width:18, height:18, borderRadius:999, background:"#d7ad8f"}}/>
          <div style={{position:"absolute", left:-2, right:-2, bottom:-6, height:10, background:"rgba(0,0,0,0.22)", filter:"blur(6px)", borderRadius:999}}/>
        </div>
        {/* overhead labels */}
        <div style={{position:"absolute", left:"62%", top:"38%", background:"rgba(18,15,12,0.92)", border:"1px solid rgba(241,228,203,0.12)", borderRadius:999, padding:"6px 10px", fontSize:12, display:"flex", gap:8, alignItems:"center"}}>
          <span style={{width:7, height:7, background:"var(--mir-amber)", transform:"rotate(45deg)", display:"block"}}/> Лидия Петровна <span style={{opacity:0.5}}>· 12м</span>
        </div>
        <div style={{position:"absolute", left:"24%", top:"54%", background:"rgba(18,15,12,0.82)", border:"1px solid rgba(241,228,203,0.1)", borderRadius:999, padding:"6px 10px", fontSize:12}}>Саша · 8м</div>
        {/* quest ring on ground */}
        <div style={{position:"absolute", left:"62%", top:"42%", width:44, height:22, border:"1px solid rgba(217,164,65,0.55)", borderRadius:999, transform:"translate(-50%,-50%) rotateX(58deg)", boxShadow:"0 0 24px rgba(217,164,65,0.22)"}}/>
      </div>
      {/* HUD */}
      <div style={{position:"absolute", top:0, left:0, right:0, display:"flex", justifyContent:"space-between", padding:"14px 14px 0", alignItems:"start"}}>
        <div>
          <div style={{fontFamily:"var(--mir-serif)", fontSize:18, lineHeight:1}}>Двор на улице Мира</div>
          <div className="mono" style={{opacity:0.6, fontSize:10}}>ДЕНЬ 1 · 16:40 · +9°C · дождь</div>
        </div>
        <div style={{display:"flex", gap:8, alignItems:"center"}}>
          <span style={{background:"rgba(18,15,12,0.88)", border:"1px solid rgba(241,228,203,0.12)", borderRadius:999, padding:"7px 10px", fontSize:13, display:"flex", gap:6, alignItems:"center"}}><I.bag size={14}/> 1 800 ₽</span>
          <span className="mir-iconBtn"><I.vol size={14}/></span>
          <span className="mir-iconBtn"><I.book size={14}/></span>
          <span className="mir-iconBtn"><I.phone size={14}/></span>
        </div>
      </div>
      <div style={{position:"absolute", left:14, bottom:14, display:"flex", flexDirection:"column", gap:10}}>
        <Panel style={{padding:"12px 14px", minWidth:240}}>
          <div className="mono" style={{color:"var(--mir-amber)", fontSize:10}}>ЗАДАНИЕ · 1/4</div>
          <div className="serif" style={{fontSize:16, margin:"2px 0"}}>Первые шаги</div>
          <div style={{fontSize:12, color:"var(--mir-ivory-faint)"}}>Найди подъезд и квартиру 27 · Анна</div>
          <div style={{display:"flex", gap:4, marginTop:8}}><i style={{width:18, height:3, background:"var(--mir-amber)", borderRadius:999}}/><i style={{width:18, height:3, background:"rgba(241,228,203,0.18)", borderRadius:999}}/><i style={{width:18, height:3, background:"rgba(241,228,203,0.18)", borderRadius:999}}/><i style={{width:18, height:3, background:"rgba(241,228,203,0.18)", borderRadius:999}}/></div>
        </Panel>
        <div style={{display:"flex", gap:8}}>
          <span className="mir-chip"><I.map size={12}/> КАРТА</span>
          <span className="mir-chip"><I.bag size={12}/> 2</span>
        </div>
      </div>
      <div style={{position:"absolute", right:14, bottom:14, display:"flex", flexDirection:"column", gap:8, alignItems:"end"}}>
        <div style={{background:"rgba(18,15,12,0.92)", border:"1px solid rgba(241,228,203,0.12)", borderRadius:16, padding:8, display:"flex", gap:8, alignItems:"center"}}>
          <span style={{width:28, height:28, borderRadius:999, background:"var(--mir-amber)", color:"#1a160f", display:"grid", placeItems:"center"}}><I.pin size={12}/></span>
          <div style={{paddingRight:6}}><div className="mono" style={{fontSize:9, opacity:0.6}}>ВОЙТИ</div><div style={{fontSize:13, fontWeight:600}}>Арка на улицу Мира</div></div><kbd style={{background:"rgba(241,228,203,0.1)", border:"1px solid rgba(241,228,203,0.12)", borderRadius:6, padding:"4px 6px", fontSize:11}}>E</kbd>
        </div>
        <div className="mono" style={{background:"rgba(18,15,12,0.72)", borderRadius:999, padding:"6px 10px", fontSize:10}}>НАЖМИ, ЧТОБЫ ПОДОЙТИ · WASD / ТАП</div>
      </div>
      {/* minimap */}
      <div style={{position:"absolute", right:14, top:58, width:118, height:118, borderRadius:14, overflow:"hidden", border:"1px solid rgba(241,228,203,0.12)", background:"rgba(18,15,12,0.72)", backdropFilter:"blur(12px)"}}>
        <div style={{position:"absolute", inset:6, borderRadius:10, background:"radial-gradient(100% 100% at 50% 50%, #3a3630, #1a1816)", opacity:0.9}}/>
        <div style={{position:"absolute", left:"50%", top:"50%", width:6, height:6, background:"var(--mir-amber)", borderRadius:999, transform:"translate(-50%,-50%)", boxShadow:"0 0 12px rgba(217,164,65,0.8)"}}/>
        <div style={{position:"absolute", left:8, bottom:8, fontSize:9, letterSpacing:"0.12em", opacity:0.6}}>СЕВЕР</div>
        <div style={{position:"absolute", right:8, top:8, background:"var(--mir-amber)", color:"#1a160f", fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:999}}>MAP</div>
      </div>
      <button onClick={onDialogue} style={{position:"absolute", left:"50%", top:"48%", transform:"translate(-50%,-50%)", background:"rgba(217,164,65,0.0)", border:"2px dashed rgba(217,164,65,0.55)", borderRadius:12, padding:"10px 14px", color:"var(--mir-amber)", fontWeight:600, letterSpacing:"0.08em"}}>→ открыть диалог</button>
      <div className="mir-frame__caption">SCREEN 03 — Main 3D Gameplay HUD · third-person · courtyard · photo floor · desktop + minimap</div>
    </div>
  );
}

function Screen04() {
  const [typed,setTyped]=useState("");
  const [hint,setHint]=useState(false);
  const [showTrans,setShowTrans]=useState(false);
  const preview = typed.trim() ? (typed.toLowerCase().includes("привет") || typed.toLowerCase().includes("privet") ? "Привет!" : "…") : null;
  return (
    <div className="mir-frame" style={{background:"#0f0e0c", display:"grid", gridTemplateRows:"auto 1fr"}}>
      <div style={{height:38, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 12px", borderBottom:"1px solid rgba(241,228,203,0.08)", background:"rgba(21,18,15,0.96)"}}>
        <span className="mono" style={{opacity:0.6}}>Диалог · Анна · кафе</span><span className="mono" style={{opacity:0.6}}>SCREEN 04 — NPC Dialogue</span>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"320px 1fr", minHeight:0}}>
        <div style={{background:"linear-gradient(180deg, #1a1816, #13110e)", borderRight:"1px solid rgba(241,228,203,0.08)", padding:14, display:"flex", flexDirection:"column", gap:12}}>
          <div style={{aspectRatio:"4/5", borderRadius:12, overflow:"hidden", border:"1px solid rgba(241,228,203,0.12)", background:"#0b0a09"}}>
            <img src="/portrait-anna.jpg" alt="Анна" style={{width:"100%", height:"100%", objectFit:"cover"}}/>
          </div>
          <div>
            <div className="serif" style={{fontSize:22}}>Анна</div>
            <div style={{fontSize:12, color:"var(--mir-ivory-faint)"}}>соседка · иллюстратор · 26</div>
            <div style={{display:"flex", gap:6, marginTop:8, alignItems:"center"}}>
              <span style={{background:"rgba(217,164,65,0.14)", border:"1px solid rgba(217,164,65,0.22)", color:"var(--mir-amber)", borderRadius:999, padding:"3px 8px", fontSize:11}}>тепло</span>
              <span style={{opacity:0.6, fontSize:11}}>· запомнит тон</span>
            </div>
          </div>
          <div style={{background:"rgba(241,228,203,0.06)", border:"1px solid rgba(241,228,203,0.08)", borderRadius:10, padding:10, fontSize:12, lineHeight:1.5}}>
            <span className="mono" style={{opacity:0.5, fontSize:9}}>ПОМНИТ</span><br/>Ты поздоровался первым — ей это важно.
          </div>
        </div>
        <div style={{padding:16, background:"radial-gradient(80% 60% at 70% 20%, rgba(217,164,65,0.08), transparent 60%), #15120f", display:"flex", flexDirection:"column", gap:12}}>
          <div style={{background:"rgba(18,15,12,0.92)", border:"1px solid rgba(241,228,203,0.08)", borderRadius:16, padding:14}}>
            <div className="serif" style={{fontSize:20, lineHeight:1.35}}>Привет! Ты уже освоился?</div>
            <div style={{display:"flex", gap:8, marginTop:10}}>
              <button className="mir-tool"><I.sound size={14}/> послушать</button>
              <button className={`mir-tool ${showTrans?"is-on":""}`} onClick={()=>setShowTrans(v=>!v)}>{showTrans?"скрыть":"перевод"}</button>
            </div>
            {showTrans && <div style={{marginTop:10, color:"var(--mir-ivory-dim)", fontSize:13, borderLeft:"2px solid rgba(217,164,65,0.5)", paddingLeft:10}}>Hi! Have you settled in yet?</div>}
          </div>

          <div className="mir-options">
            {[
              ["Привет! Да, понемногу.", "Hi! Yes, a little."],
              ["Привет! Не совсем, ищу метро.", "Hi! Not yet, I'm looking for the metro."],
              ["Здравствуйте! Можно позвонить?", "Hello! May I make a call?"],
            ].map(([ru,en],i)=>(
              <button key={i} className="mir-opt">
                <span className="mir-opt__num">{i+1}</span>
                <span className="mir-opt__text"><span className="ru">{ru}</span><span className="en">{en}</span></span>
                <I.chev/>
              </button>
            ))}
          </div>

          <div style={{background:"rgba(18,15,12,0.92)", border:"1px solid rgba(241,228,203,0.08)", borderRadius:16, padding:12}}>
            <div style={{display:"flex", gap:8, alignItems:"center", marginBottom:8}}>
              <span className="mono" style={{opacity:0.6, fontSize:10}}>ИЛИ НАПИШИ СВОЁ</span>
              <span style={{flex:1, height:1, background:"rgba(241,228,203,0.08)"}}/>
              <button className="mir-tool" onClick={()=>setHint(v=>!v)}><I.hint/> подсказка</button>
            </div>
            <div style={{display:"flex", gap:8}}>
              <input value={typed} onChange={e=>setTyped(e.target.value)} placeholder="Скажи по-русски… можно латиницей" style={{flex:1, background:"rgba(241,228,203,0.06)", border:"1px solid rgba(241,228,203,0.12)", borderRadius:999, padding:"10px 14px", color:"var(--mir-ivory)", outline:"none"}}/>
              <button className="mir-btn mir-btn--primary" style={{padding:"10px 16px", borderRadius:999}}>сказать</button>
            </div>
            {hint && <div style={{marginTop:10, background:"rgba(217,164,65,0.08)", border:"1px solid rgba(217,164,65,0.14)", borderRadius:10, padding:10, fontSize:12, lineHeight:1.5}}>Подсказка: «Привет! Ты уже освоился?» — ответь коротко: “Привет! Да, спасибо.” · Ты/вы — разница в вежливости, но миссию не провалит.</div>}
            {typed && <div style={{marginTop:8, display:"flex", gap:8, fontSize:12}}><span className={`mir-pill ${preview==="Привет!"?"is-good":""}`}>{preview==="Привет!"?"принято":"похоже, близко"}</span><span style={{color:"var(--mir-ivory-faint)"}}>услышано: «{preview}» · мягкая коррекция, не провал</span></div>}
          </div>

          <div style={{display:"flex", gap:8, justifyContent:"end"}}>
            <span className="mir-tool"><I.vol/> лидия слышала</span>
            <span style={{opacity:0.5, fontSize:11, alignSelf:"center"}}>Натиск — Enter · ESC закрыть · пробел послушать</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Screen05() {
  return (
    <div className="mir-frame" style={{background:"#0f0e0c"}}>
      <div style={{position:"absolute", inset:0, backgroundImage:"url(/design-shop.jpg)", backgroundSize:"cover", filter:"brightness(0.55) saturate(0.9)"}}/>
      <div style={{position:"absolute", inset:0, background:"linear-gradient(180deg, rgba(15,14,12,0.18), rgba(15,14,12,0.72))"}}/>
      <div style={{position:"absolute", left:14, right:14, top:14, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <Panel style={{padding:"8px 12px", display:"flex", gap:10, alignItems:"center"}}>
          <I.pin/> <span className="serif">Магазин «У дома»</span> <span style={{opacity:0.5}}>·</span> <span className="mono" style={{opacity:0.6, fontSize:10}}>LANGUAGE IN CONTEXT</span>
        </Panel>
        <span className="mir-pill">хлеб · молоко · чай</span>
      </div>
      <div style={{position:"absolute", left:"50%", top:"50%", transform:"translate(-50%,-46%)", width:"min(820px, 94%)", display:"grid", gridTemplateColumns:"1.1fr 0.9fr", gap:14}}>
        <div style={{display:"grid", gap:10}}>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
            {[
              {ru:"хлеб", en:"bread", price:"45 ₽", picked:true},
              {ru:"молоко", en:"milk", price:"89 ₽", picked:false},
              {ru:"чай", en:"tea", price:"210 ₽", picked:false},
              {ru:"пакет", en:"bag", price:"12 ₽", picked:false},
            ].map(o=>(
              <div key={o.ru} className={`mir-learnCard ${o.picked?"is-picked":""}`}>
                <div className="mir-learnCard__img" style={{background:"#1f1d1a"}}>
                  <span className="mir-learnCard__price">{o.price}</span>
                  <span style={{fontFamily:"var(--mir-serif)", fontSize:18}}>{o.ru}</span>
                </div>
                <div className="mir-learnCard__meta">
                  <span><b>{o.ru}</b> <i>· {o.en}</i></span>
                  <button className="mir-iconBtn" style={{width:24, height:24}}><I.vol size={12}/></button>
                </div>
              </div>
            ))}
          </div>
          <Panel style={{padding:12, display:"flex", gap:10, alignItems:"center"}}>
            <span style={{background:"var(--mir-amber)", color:"#1a160f", borderRadius:999, padding:"6px 9px", fontSize:11, fontWeight:700}}>Слушай</span>
            <span style={{fontSize:13}}>«Дайте, пожалуйста, хлеб и молоко.» — мягко, с «пожалуйста».</span>
            <button className="mir-tool" style={{marginLeft:"auto"}}><I.sound/> послушать</button>
          </Panel>
        </div>
        <Panel style={{padding:14}}>
          <div className="mono" style={{opacity:0.6, fontSize:10}}>УЗНАНО · 3 · ПОВТОРИТЬ ЧЕРЕЗ 2 ДНЯ</div>
          <div className="serif" style={{fontSize:18, margin:"6px 0 10px"}}>хлеб <span style={{opacity:0.5, fontSize:14}}>/хл’еп/</span></div>
          <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:10}}>
            <span className="mir-tag is-known">узнавание</span><span className="mir-tag is-known">чтение</span><span className="mir-tag">произношение</span><span className="mir-tag">письмо</span>
          </div>
          <div style={{background:"rgba(241,228,203,0.06)", borderRadius:10, padding:10, fontSize:12, lineHeight:1.5}}>
            «Хлеб на полке у окна, молоко — в холодильнике. Можно спросить Нину.»
            <div style={{opacity:0.6, marginTop:6}}>Hint/перевод — поддержка 0.55×, в mastery не считается как “знаю без подсказки”.</div>
          </div>
          <div style={{display:"flex", gap:8, marginTop:12}}>
            <button className="mir-btn mir-btn--primary" style={{flex:1}}>Взять хлеб</button>
            <button className="mir-btn mir-btn--ghost" style={{flex:1}}>Спросить Нину</button>
          </div>
          <div style={{marginTop:10, height:4, background:"rgba(241,228,203,0.12)", borderRadius:999, overflow:"hidden"}}><i style={{display:"block", width:"42%", height:"100%", background:"var(--mir-amber)"}}/></div>
          <div className="mono" style={{opacity:0.5, fontSize:10, marginTop:6}}>42% · доказательство, не очки</div>
        </Panel>
      </div>
      <div className="mir-frame__caption">SCREEN 05 — Language in Context · объекты → слово → подсказка 0.55× → evidence, не quiz</div>
    </div>
  );
}

function Screen06() {
  return (
    <div className="mir-frame mir-frame--light">
      <div className="mir-frame__topbar"><span>Дневник</span><span className="mono">SCREEN 06 — Quest Journal · 7 квестов</span></div>
      <div style={{display:"grid", gridTemplateColumns:"280px 1fr 300px", height:"calc(100% - 38px)"}}>
        <div style={{borderRight:"1px solid rgba(0,0,0,0.06)", background:"#fbf8f1", padding:10, display:"flex", flexDirection:"column", gap:8}}>
          {[
            ["Первые шаги", "активно · 1/4", true],
            ["Метро «Площадь Мира»", "активно · откроется", false],
            ["Хлеб и молоко", "активно", false],
            ["Тёплый угол", "откроется", false],
            ["Где Муся?", "необязательно", false],
          ].map(([t,s,a],i)=>(
            <div key={`${t}-${i}`} style={{padding:"10px 12px", borderRadius:12, background:a?"#1a1816":"white", color:a?"var(--mir-ivory)":"#1a1816", border:"1px solid "+(a?"transparent":"rgba(0,0,0,0.06)")}}>
              <div style={{fontWeight:600, fontSize:13}}>{t}</div><div style={{fontSize:11, opacity:0.6}}>{s}</div>
            </div>
          ))}
        </div>
        <div style={{padding:16, background:"white", borderRight:"1px solid rgba(0,0,0,0.06)"}}>
          <div className="mono" style={{color:"var(--mir-brick)", fontSize:10}}>КВЕСТ · АННА · 1/4</div>
          <h3 className="serif" style={{fontSize:24, margin:"6px 0 8px"}}>Первые шаги</h3>
          <p style={{color:"#3a342e", lineHeight:1.6, margin:0}}>Ты только что приехал. Найди квартиру, прочитай записку и позвони Анне. Город не торопит.</p>
          <div style={{marginTop:12, display:"grid", gap:8}}>
            {[
              ["Найди подъезд и квартиру 27", "готово · visited:apartment", true],
              ["Прочитай записку Анны", "сейчас · flag:apt.note_read", false],
              ["Попроси телефон у соседки", "далее · flag:lidia.phone_asked", false],
              ["Позвони Анне", "далее", false],
            ].map(([t,s,d],i)=>(
              <div key={`${t}-${i}`} style={{display:"flex", gap:10, padding:"10px 12px", borderRadius:12, background:d?"rgba(217,164,65,0.10)":"rgba(0,0,0,0.03)", border:"1px solid "+(d?"rgba(217,164,65,0.22)":"rgba(0,0,0,0.06)")}}>
                <span style={{width:18, height:18, borderRadius:999, background:d?"var(--mir-amber)":"white", border:"1px solid rgba(0,0,0,0.1)", display:"grid", placeItems:"center", fontSize:11}}>{d?"✓":""}</span>
                <div><div style={{fontWeight:600, fontSize:13}}>{t}</div><div style={{fontSize:11, opacity:0.6}}>{s}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div style={{background:"#fbf8f1", padding:14, display:"flex", flexDirection:"column", gap:12}}>
          <Panel style={{padding:12, background:"white"}}>
            <div className="mono" style={{opacity:0.6, fontSize:10}}>ЛЮДИ</div>
            <div style={{display:"flex", gap:8, marginTop:8}}>
              <img src="/portrait-lidia.jpg" alt="" style={{width:44, height:54, objectFit:"cover", borderRadius:8, border:"1px solid rgba(0,0,0,0.08)"}}/>
              <div><div style={{fontWeight:600}}>Лидия Петровна</div><div style={{fontSize:12, opacity:0.6}}>сидит на скамейке · помнит вежливость</div></div>
            </div>
          </Panel>
          <Panel style={{padding:12, background:"white"}}>
            <div className="mono" style={{opacity:0.6, fontSize:10}}>ПОСЛЕДСТВИЯ</div>
            <div style={{fontSize:13, lineHeight:1.5, marginTop:6}}>Если попросишь вежливо, Лидия даст телефон. Если грубо — даст, но запомнит. Квест не проваливается.</div>
          </Panel>
          <Panel style={{padding:12, background:"var(--mir-ink)", color:"var(--mir-ivory)"}}>
            <div className="mono" style={{color:"var(--mir-amber)", fontSize:10}}>НАГРАДА</div>
            <div style={{fontSize:13, marginTop:4}}>Отношения: Анна +4 · Событие: chapter.instructions</div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Screen07() {
  const [tab,setTab]=useState("inventory");
  return (
    <div className="mir-frame" style={{background:"#0b0a09", display:"grid", placeItems:"center", padding:14}}>
      <div style={{width:"min(420px, 100%)", height:"min(760px, 100%)", background:"linear-gradient(180deg, #1f1b16, #0f0e0c)", border:"1px solid rgba(241,228,203,0.12)", borderRadius:22, overflow:"hidden", boxShadow:"var(--mir-shadow-lg)", display:"flex", flexDirection:"column"}}>
        <div style={{height:22, display:"flex", alignItems:"center", justifyContent:"center", gap:6, borderBottom:"1px solid rgba(241,228,203,0.08)"}}>
          <span style={{width:42, height:4, background:"rgba(241,228,203,0.18)", borderRadius:999}}/>
        </div>
        <div style={{display:"flex", gap:6, padding:10, borderBottom:"1px solid rgba(241,228,203,0.08)"}}>
          {[
            ["inventory","Сумка"],
            ["messages","Чат"],
            ["map","Карта"],
            ["vocab","Слова"],
          ].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{flex:1, padding:"8px 0", borderRadius:999, background:tab===id?"var(--mir-amber)":"rgba(241,228,203,0.08)", color:tab===id?"#1a160f":"var(--mir-ivory)", border:"1px solid "+(tab===id?"transparent":"rgba(241,228,203,0.08)"), fontWeight:600, fontSize:12}}>{label}</button>
          ))}
        </div>
        <div style={{flex:1, overflow:"auto", padding:12, display:"grid", gap:10}}>
          {tab==="inventory" && (
            <>
              <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8}}>
                {[
                  ["ключ","есть"],["телефон","разряжен"],["хлеб","1"],["молоко","1"],["записка","Анна"],["мяч","—"],["рисунок","","faint"],["——","","faint"],
                ].map(([n,s,f])=>(
                  <div key={n} style={{aspectRatio:"1", background:f==="faint"?"transparent":"rgba(241,228,203,0.06)", border:"1px solid "+(f==="faint"?"rgba(241,228,203,0.06)":"rgba(241,228,203,0.1)"), borderRadius:12, display:"grid", placeItems:"center", opacity:f==="faint"?0.35:1}}>
                    <div style={{textAlign:"center"}}><div style={{fontWeight:600, fontSize:12}}>{n}</div><div style={{fontSize:11, opacity:0.6}}>{s}</div></div>
                  </div>
                ))}
              </div>
              <Panel style={{padding:12}}>
                <div style={{fontWeight:600}}>Записка Анны</div><div style={{fontSize:12, opacity:0.7, marginTop:4}}>«Привет! Ключ под ковриком. Позвони, как будешь.» · на столе у чайника</div>
              </Panel>
            </>
          )}
          {tab==="messages" && (
            <div style={{display:"grid", gap:8}}>
              <Panel style={{padding:12, background:"var(--mir-panel)"}}><div style={{fontWeight:600}}>Анна · сегодня 16:42</div><div style={{fontSize:13, opacity:0.8, marginTop:4}}>Ты где? Я в «Тёплом угле» до 19:00 😊</div></Panel>
              <Panel style={{padding:12}}><div style={{fontWeight:600}}>Лидия Петровна</div><div style={{fontSize:13, opacity:0.7}}>Не забудь вернуть телефон, милый.</div></Panel>
            </div>
          )}
          {tab==="map" && (
            <div style={{background:"rgba(241,228,203,0.06)", borderRadius:12, height:260, display:"grid", placeItems:"center", border:"1px solid rgba(241,228,203,0.08)"}}>
              <span style={{background:"rgba(18,15,12,0.92)", border:"1px solid rgba(241,228,203,0.12)", borderRadius:999, padding:"6px 10px", fontSize:12}}>Двор · Улица · Магазин · Метро · Кафе</span>
            </div>
          )}
          {tab==="vocab" && (
            <div style={{display:"grid", gap:8}}>
              {["хлеб — bread · 42%","молоко — milk · 18%","здравствуйте — hello (formal) · 64%"].map(v=>(
                <div key={v} style={{display:"flex", justifyContent:"space-between", background:"rgba(241,228,203,0.06)", border:"1px solid rgba(241,228,203,0.08)", borderRadius:10, padding:"10px 12px", fontSize:13}}><span>{v}</span><span style={{opacity:0.5}}>повторить</span></div>
              ))}
            </div>
          )}
        </div>
        <div style={{padding:10, borderTop:"1px solid rgba(241,228,203,0.08)", display:"flex", gap:8}}>
          <button className="mir-btn mir-btn--ghost" style={{flex:1}}>Журнал</button>
          <button className="mir-btn mir-btn--primary" style={{flex:1}}>Карта</button>
        </div>
      </div>
      <div className="mir-frame__caption" style={{color:"white"}}>SCREEN 07 — Inventory / Smartphone · таб: сумка · чат · карта · слова · map + vocab deck</div>
    </div>
  );
}

function Screen08() {
  const [which,setWhich]=useState("metro");
  const bg = which==="metro"?"/design-metro.jpg":which==="shop"?"/design-shop.jpg":"/design-cafe.jpg";
  const title = which==="metro"?"Метро «Площадь Мира»":which==="shop"?"Магазин «У дома»":"Кафе «Тёплый угол»";
  return (
    <div className="mir-frame" style={{backgroundImage:`url(${bg})`, backgroundSize:"cover"}}>
      <div className="mir-frame__scrim" style={{background:"linear-gradient(180deg, rgba(15,14,12,0.22), rgba(15,14,12,0.72))"}}/>
      <div style={{position:"absolute", top:14, left:14, display:"flex", gap:8}}>
        {[
          ["metro","Метро"],
          ["shop","Магазин"],
          ["cafe","Кафе"],
        ].map(([id,label])=>(
          <button key={id} onClick={()=>setWhich(id)} className={`mir-chip ${which===id?"is-active":""}`}>{label}</button>
        ))}
      </div>
      <div style={{position:"absolute", left:"50%", top:"50%", transform:"translate(-50%,-50%)", width:"min(560px,92%)"}}>
        <Panel style={{padding:16}}>
          <div className="mono" style={{color:"var(--mir-amber)", fontSize:10}}>{which==="metro"?"ЛОКАЦИЯ · УЛИЦА МИРА":"ЛОКАЦИЯ · ИНТЕРЬЕР"}</div>
          <h3 className="serif" style={{fontSize:28, margin:"6px 0 8px"}}>{title}</h3>
          <p style={{margin:0, color:"var(--mir-ivory-dim)", lineHeight:1.6}}>{which==="metro"?"Спустись, найди карту и спроси Андрея, как доехать до кафе. Большая «М» — не пропустишь.":which==="shop"?"На двери «Продукты». Батон — у окна, молоко — в холодильнике. Нина за прилавком.":"Тёплый свет, запах эспрессо. Костя — за баром, Анна — у окна. Попробуешь сделать кофе завтра в 10:00."}</p>
          <div style={{display:"flex", gap:8, marginTop:12}}><span className="mir-tag">E — войти</span><span className="mir-tag">навигация единая</span><span className="mir-tag">тот же HUD</span></div>
        </Panel>
      </div>
      <div className="mir-frame__caption">SCREEN 08 — Location Transition · метро / магазин / кафе · один стиль перехода</div>
    </div>
  );
}

function Screen09() {
  const [vol,setVol]=useState(72);
  return (
    <div className="mir-frame" style={{background:"rgba(15,14,12,0.92)", backdropFilter:"blur(12px)", display:"grid", placeItems:"center", padding:18}}>
      <div style={{width:"min(560px,100%)", background:"rgba(23,19,15,0.96)", border:"1px solid rgba(241,228,203,0.12)", borderRadius:16, overflow:"hidden"}}>
        <div style={{padding:"14px 16px", borderBottom:"1px solid rgba(241,228,203,0.08)", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <span className="serif" style={{fontSize:18}}>Пауза</span><span className="mono" style={{opacity:0.6, fontSize:10}}>SCREEN 09 — Pause & Settings · ESC</span>
        </div>
        <div style={{padding:14, display:"grid", gap:12}}>
          <button className="mir-btn mir-btn--primary">Продолжить</button>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
            <button className="mir-btn mir-btn--ghost">Сохранить</button>
            <button className="mir-btn mir-btn--ghost">Выйти в меню</button>
          </div>
          <div style={{height:1, background:"rgba(241,228,203,0.08)"}}/>
          <div style={{display:"grid", gap:10}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <span style={{fontWeight:600}}>Звук и озвучка</span><span className="mono" style={{opacity:0.6}}>{vol}%</span>
            </div>
            <input type="range" min={0} max={100} value={vol} onChange={e=>setVol(Number(e.target.value))} style={{accentColor:"var(--mir-amber)"}}/>
            <label style={{display:"flex", justifyContent:"space-between", fontSize:13}}><span>Озвучивать фразы (ru-RU)</span><input type="checkbox" defaultChecked/></label>
            <label style={{display:"flex", justifyContent:"space-between", fontSize:13}}><span>Скорость речи</span><span className="mono">0.92×</span></label>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
            <button className="mir-btn mir-btn--panel">Графика: высоко</button>
            <button className="mir-btn mir-btn--panel">Управление: WASD</button>
          </div>
          <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
            <span className="mir-tag">Доступность</span><span className="mir-tag">Уменьшение тряски</span><span className="mir-tag">Размер шрифта +</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Screen10({onDialogue}:{onDialogue:()=>void}) {
  return (
    <div className="mir-frame" style={{background:"#070705", display:"grid", placeItems:"center", padding:12}}>
      <div style={{width:360, height:740, background:"black", borderRadius:28, overflow:"hidden", position:"relative", border:"3px solid #1a1816", boxShadow:"var(--mir-shadow-lg)"}}>
        <div style={{position:"absolute", inset:0, backgroundImage:"url(/photo-asphalt-top.jpg)", backgroundSize:"cover"}}>
          <div style={{position:"absolute", inset:0, background:"linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.62))"}}/>
          <div style={{position:"absolute", left:"50%", top:"44%", width:24, height:58, background:"#4a5a44", borderRadius:8, transform:"translate(-50%,-50%)"}}/>
        </div>
        {/* top HUD compact */}
        <div style={{position:"absolute", top:0, left:0, right:0, display:"flex", justifyContent:"space-between", padding:"10px 10px 0", color:"var(--mir-ivory)"}}>
          <span className="mono" style={{background:"rgba(18,15,12,0.88)", borderRadius:999, padding:"6px 8px", fontSize:10}}>Двор · 16:40</span>
          <span style={{background:"rgba(18,15,12,0.88)", borderRadius:999, padding:"6px 8px", fontSize:12}}>1 800 ₽</span>
        </div>
        {/* quest chip bottom */}
        <div style={{position:"absolute", left:10, right:10, bottom:88, background:"rgba(18,15,12,0.92)", border:"1px solid rgba(241,228,203,0.12)", borderRadius:14, padding:10}}>
          <div className="mono" style={{color:"var(--mir-amber)", fontSize:9}}>ЗАДАНИЕ · 1/4</div>
          <div className="serif" style={{fontSize:15}}>Первые шаги</div>
          <div style={{fontSize:11, opacity:0.7}}>Найди подъезд и квартиру 27</div>
        </div>
        {/* joystick + E */}
        <div style={{position:"absolute", left:14, bottom:14, width:88, height:88, borderRadius:999, background:"rgba(241,228,203,0.08)", border:"1px solid rgba(241,228,203,0.12)", display:"grid", placeItems:"center"}}>
          <div style={{width:44, height:44, borderRadius:999, background:"rgba(241,228,203,0.18)", border:"1px solid rgba(241,228,203,0.18)"}}/>
        </div>
        <button onClick={onDialogue} style={{position:"absolute", right:14, bottom:14, width:72, height:72, borderRadius:999, background:"var(--mir-amber)", color:"#1a160f", border:"none", fontWeight:700, boxShadow:"0 8px 24px rgba(0,0,0,0.45)"}}>E</button>
        <div style={{position:"absolute", right:14, top:56, width:92, height:92, borderRadius:12, background:"rgba(18,15,12,0.72)", border:"1px solid rgba(241,228,203,0.12)", backdropFilter:"blur(8px)"}}/>
      </div>
      <div className="mir-frame__caption" style={{color:"white"}}>SCREEN 10 — Mobile · джойстик · E 72px · тап по персонажу · HUD не закрывает мир</div>
    </div>
  );
}

/* ---------- main prototype ---------- */
export function DesignSystem() {
  const [active,setActive]=useState("03");
  const [menu,setMenu]=useState("screens");
  const [prototypeStep,setPrototypeStep]=useState(0);
  const steps = [
    {id:"01", label:"Main Menu", go:"01"},
    {id:"02", label:"Character", go:"02"},
    {id:"03", label:"3D Gameplay", go:"03"},
    {id:"04", label:"Dialogue — Привет! Ты уже освоился?", go:"04"},
    {id:"08", label:"Quest → Метро", go:"08"},
  ];
  useEffect(()=>{
    const h = window.location.hash.replace("#","");
    if (["01","02","03","04","05","06","07","08","09","10","tokens","components"].includes(h)) setActive(h);
  },[]);
  const go = (id:string)=>{ setActive(id); window.location.hash=id; };

  return (
    <div className="mir-figma">
      {/* Figma top bar */}
      <div className="mir-figma__top">
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <span style={{width:28, height:28, borderRadius:6, background:"#1abcf2", display:"grid", placeItems:"center", fontWeight:800, color:"white"}}>F</span>
          <span style={{fontWeight:600}}>MIR — Мир без перевода.fig</span>
          <span style={{opacity:0.5}}>·</span><span style={{opacity:0.6}}>Design · Prototype · 3D RPG</span>
        </div>
        <div style={{display:"flex", gap:8}}>
          <span className="mir-figPill is-active">Design</span>
          <span className="mir-figPill">Prototype</span>
          <button className="mir-figPlay" onClick={()=>setPrototypeStep(0)}><I.play size={12}/> Present</button>
        </div>
      </div>

      <div className="mir-figma__body">
        {/* left layers */}
        <div className="mir-figma__left">
          <div className="mir-figma__section">PAGES</div>
          <button className={menu==="tokens"?"is-active":""} onClick={()=>setMenu("tokens")}>● Design System</button>
          <button className={menu==="screens"?"is-active":""} onClick={()=>setMenu("screens")}>● Screens (10)</button>
          <button className={menu==="prototype"?"is-active":""} onClick={()=>setMenu("prototype")}>● Prototype Flow</button>

          <div className="mir-figma__section" style={{marginTop:14}}>LAYERS · {menu}</div>
          {menu==="screens" && ["01 Main Menu","02 Character","03 3D Gameplay","04 Dialogue","05 Learn","06 Journal","07 Phone","08 Locations","09 Pause","10 Mobile"].map((l,i)=>(
            <button key={l} className={active===String(i+1).padStart(2,"0")?"is-active":""} onClick={()=>go(String(i+1).padStart(2,"0"))}><span>◇</span> {l}</button>
          ))}
          {menu==="tokens" && ["Tokens · Colors/Type","Components","States","Breakpoints"].map(l=>(
            <button key={l} onClick={()=>go("tokens")}><span>◇</span> {l}</button>
          ))}
          {menu==="prototype" && steps.map(s=>(
            <button key={s.id} onClick={()=>setPrototypeStep(steps.findIndex(x=>x.id===s.id))}><span>→</span> {s.label}</button>
          ))}

          <div style={{marginTop:"auto", padding:10, background:"rgba(217,164,65,0.08)", border:"1px solid rgba(217,164,65,0.14)", borderRadius:10, fontSize:12, lineHeight:1.5}}>
            <b>3D RPG</b> — не дашборд. Мир — двор, улицы, метро, магазин, кафе. Учишь русский, живя.
          </div>
        </div>

        {/* canvas */}
        <div className="mir-figma__canvas">
          {menu==="tokens" || active==="tokens" ? (
            <div className="mir-figma__grid">
              <div className="mir-figFrameLabel">DESIGN SYSTEM · TOKENS & COMPONENTS</div>
              <div className="mir-figFrame"><Tokens/></div>
              <div className="mir-figFrameLabel">COMPONENTS · STATES · 720 / 860 / 980</div>
              <div className="mir-figFrame" style={{padding:14, display:"grid", gap:12}}>
                <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                  <button className="mir-btn mir-btn--primary">Primary · hover/active</button>
                  <button className="mir-btn mir-btn--ghost">Ghost</button>
                  <button className="mir-btn mir-btn--panel">Panel</button>
                  <span className="mir-iconBtn"><I.vol/></span>
                  <span className="mir-chip">E — войти</span>
                  <span className="mir-pill is-good">принято</span>
                  <span className="mir-tool is-on">перевод on</span>
                </div>
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
                  <Panel><b>Dialogue Panel</b><div style={{opacity:0.6, fontSize:12, marginTop:4}}>blur 18px · border 1px · shadow lg · serif 20</div></Panel>
                  <Panel><b>Quest Marker</b><div style={{opacity:0.6, fontSize:12, marginTop:4}}>amber star + ring · glow add</div></Panel>
                </div>
                <div style={{background:"rgba(241,228,203,0.06)", borderRadius:12, padding:12, fontSize:12, lineHeight:1.6}}>
                  Hover 120ms · pressed 80ms · disabled 40% · focus 2px amber · везде Auto Layout, имена слоёв — русские + en.
                </div>
              </div>
            </div>
          ) : menu==="prototype" ? (
            <div className="mir-figma__grid">
              <div className="mir-figFrameLabel">PROTOTYPE · Main Menu → Character → 3D Gameplay → Dialogue → Quest → Metro</div>
              <div className="mir-figFrame" style={{padding:14, display:"grid", gap:12}}>
                <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                  {steps.map((s,idx)=>(
                    <button key={s.id} onClick={()=>setPrototypeStep(idx)} className={`mir-chip ${prototypeStep===idx?"is-active":""}`} style={{background:prototypeStep===idx?"var(--mir-amber)":"", color:prototypeStep===idx?"#1a160f":""}}>{idx+1}. {s.label}</button>
                  ))}
                </div>
                <div style={{height:520, borderRadius:14, overflow:"hidden", border:"1px solid rgba(241,228,203,0.12)", background:"#0f0e0c", position:"relative"}}>
                  {prototypeStep===0 && <Screen01 onAction={()=>setPrototypeStep(1)}/>}
                  {prototypeStep===1 && <Screen02 onAction={()=>setPrototypeStep(2)}/>}
                  {prototypeStep===2 && <Screen03 onDialogue={()=>setPrototypeStep(3)}/>}
                  {prototypeStep===3 && <Screen04/>}
                  {prototypeStep===4 && <Screen08/>}
                </div>
                <div style={{display:"flex", justifyContent:"space-between"}}>
                  <button className="mir-btn mir-btn--ghost" onClick={()=>setPrototypeStep(s=>Math.max(0,s-1))}>← Назад</button>
                  <button className="mir-btn mir-btn--primary" onClick={()=>setPrototypeStep(s=>Math.min(4,s+1))}>Дальше <I.chev/></button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mir-figma__grid">
              <div className="mir-figFrameLabel">FRAMES · 10 / 1440 · UNIT 8 · Hover to see prototype hotspots</div>
              <div className="mir-figFrame"><Screen01 onAction={(k)=> k==="continue"?go("03"):k==="new"?go("02"):go("09")}/></div>
              <div className="mir-figFrame"><Screen02 onAction={()=>go("03")}/></div>
              <div className="mir-figFrame"><Screen03 onDialogue={()=>go("04")}/></div>
              <div className="mir-figFrame"><Screen04/></div>
              <div className="mir-figFrame"><Screen05/></div>
              <div className="mir-figFrame"><Screen06/></div>
              <div className="mir-figFrame"><Screen07/></div>
              <div className="mir-figFrame"><Screen08/></div>
              <div className="mir-figFrame"><Screen09/></div>
              <div className="mir-figFrame"><Screen10 onDialogue={()=>go("04")}/></div>
            </div>
          )}

          {/* right props */}
          <div className="mir-figma__right">
            <div className="mir-figma__section">PROPERTIES</div>
            <div style={{background:"white", color:"#1a1816", borderRadius:10, padding:12, fontSize:12, lineHeight:1.5}}>
              <b>First story</b><br/>Anna: “Привет! Ты уже освоился?”<br/>— choose / type / hint<br/>— Anna reacts to meaning<br/>— quest → метро · ring · journal
            </div>
            <div style={{background:"rgba(241,228,203,0.06)", borderRadius:10, padding:10, fontSize:11, lineHeight:1.5}}>
              <b style={{color:"var(--mir-amber)"}}>Mix workflow</b><br/>Фото-фон (AI) + вектор интерактив. 3D вид — фото как референс, не движок в Figma. Тени, дождь, листва — процедурно.
            </div>
            <div style={{fontSize:11, opacity:0.6, lineHeight:1.6}}>
              Export: SVG portraits, photo JPG 0.8, WOFF2 Cormorant/Inter.<br/>Breakpoints: 720 mobile, 860 tablet, 980 desktop.<br/>A11y: ru-RU voice, reduced motion, 16px min.
            </div>
            <button className="mir-btn mir-btn--primary" onClick={()=>window.open("/","_self")}>↗ Открыть игру</button>
            <button className="mir-btn mir-btn--ghost" onClick={()=>window.scrollTo({top:0, behavior:"smooth"})}>↑ Наверх</button>
          </div>
        </div>
      </div>
    </div>
  );
}
