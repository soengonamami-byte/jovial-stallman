import { useState, useEffect, useMemo } from "react";

/* ─── CONSTANTS ──────────────────────────────────────────────────────────────── */
const ASPECTS = [
  { key: "attaque", label: "Attaque" },
  { key: "defense", label: "Défense" },
  { key: "dribbles", label: "Dribbles" },
  { key: "passes", label: "Passes" },
  { key: "vision", label: "Vision" },
  { key: "carry", label: "Carry" },
];
const POSITIONS = ["Gardien", "Défenseur", "Milieu", "Ailier", "Attaquant"];
const STORAGE_KEY = "five_rating_v1";

/* ─── THEME ──────────────────────────────────────────────────────────────────── */
const T = {
  bg: "#0a0a0a",
  surface: "#111111",
  card: "#161616",
  border: "#222222",
  yellow: "#F5C518",
  yellowD: "#C9A200",
  white: "#FFFFFF",
  gray1: "#AAAAAA",
  gray2: "#555555",
  gray3: "#2A2A2A",
  red: "#E53935",
};

/* ─── STORAGE ────────────────────────────────────────────────────────────────── */
function load() {
  try {
    return (
      JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
        players: [],
        matches: [],
      }
    );
  } catch {
    return { players: [], matches: [] };
  }
}
function save(d) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
}

/* ─── UTILS ──────────────────────────────────────────────────────────────────── */
const avg = (arr) =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const fmt = (n, d = 1) =>
  isNaN(n) || n == null ? "—" : parseFloat(n).toFixed(d);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

function ratingColor(r) {
  if (r >= 8.5) return "#4CAF50";
  if (r >= 7) return "#8BC34A";
  if (r >= 5.5) return T.yellow;
  if (r >= 4) return "#FF9800";
  return T.red;
}

function getPlayerStats(pid, matches) {
  const pm = matches.filter((m) => m.ratings?.[pid]);
  const goals = pm.reduce((s, m) => s + (m.scorers?.[pid] || 0), 0);
  const assists = pm.reduce((s, m) => s + (m.assisters?.[pid] || 0), 0);
  const ratings = pm.map((m) => m.ratings[pid]);
  const avgGen = avg(ratings.map((r) => r.general || 0));
  const aspects = {};
  ASPECTS.forEach((a) => {
    aspects[a.key] = parseFloat(
      avg(ratings.map((r) => r[a.key] || 0)).toFixed(2)
    );
  });
  return {
    matchCount: pm.length,
    goals,
    assists,
    avgGoals: pm.length ? (goals / pm.length).toFixed(2) : "0.00",
    avgAssists: pm.length ? (assists / pm.length).toFixed(2) : "0.00",
    avgGeneral: parseFloat(avgGen.toFixed(2)),
    aspects,
  };
}

function getMVP(match, players) {
  let best = null,
    bestScore = -1;
  players.forEach((p) => {
    if (match.ratings?.[p.id]) {
      const s = match.ratings[p.id].general || 0;
      if (s > bestScore) {
        bestScore = s;
        best = p;
      }
    }
  });
  return best;
}

function getTeamAvg(match, players) {
  const vals = players
    .filter((p) => match.ratings?.[p.id])
    .map((p) => match.ratings[p.id].general || 0);
  return avg(vals);
}

/* ─── GLOBAL CSS ─────────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: ${T.bg}; color: ${T.white}; font-family: 'Inter', sans-serif; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: ${T.bg}; }
  ::-webkit-scrollbar-thumb { background: ${T.gray3}; border-radius: 99px; }
  input, select, textarea { color-scheme: dark; font-family: 'Inter', sans-serif; }
  button { font-family: 'Inter', sans-serif; }
  input[type=range] { -webkit-appearance: none; appearance: none; height: 3px; border-radius: 99px; outline: none; cursor: pointer; }
  input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: ${T.yellow}; cursor: pointer; border: 2px solid ${T.bg}; }
`;

/* ─── SHARED COMPONENTS ──────────────────────────────────────────────────────── */

function Avatar({ player, size = 44 }) {
  const colors = [
    "#E53935",
    "#8E24AA",
    "#1E88E5",
    "#00897B",
    "#F4511E",
    "#6D4C41",
    "#546E7A",
    "#3949AB",
  ];
  const color = colors[(player?.name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 800,
        color: "#fff",
        flexShrink: 0,
        letterSpacing: -1,
      }}
    >
      {(player?.name || "?").slice(0, 2).toUpperCase()}
    </div>
  );
}

function RatingBadge({ value, size = 42 }) {
  const c = ratingColor(value || 0);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.25,
        background: `${c}18`,
        border: `1.5px solid ${c}50`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: size * 0.32,
        color: c,
        flexShrink: 0,
        letterSpacing: -0.5,
      }}
    >
      {value ? fmt(value) : "—"}
    </div>
  );
}

function AspectBar({ label, value }) {
  const c = ratingColor(value || 0);
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 14, color: T.gray1, fontWeight: 500 }}>
          {label}
        </span>
        <span style={{ fontWeight: 700, fontSize: 14, color: c }}>
          {fmt(value)}
        </span>
      </div>
      <div
        style={{
          height: 3,
          background: T.gray3,
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${(value || 0) * 10}%`,
            background: c,
            borderRadius: 99,
            transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  );
}

function RatingSlider({ value, onChange }) {
  const c = ratingColor(value);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <input
        type="range"
        min={0}
        max={10}
        step={0.1}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          flex: 1,
          accentColor: c,
          background: `linear-gradient(to right, ${c} ${value * 10}%, ${
            T.gray3
          } ${value * 10}%)`,
        }}
      />
      <span
        style={{
          width: 36,
          textAlign: "right",
          fontWeight: 800,
          fontSize: 17,
          color: c,
          letterSpacing: -1,
        }}
      >
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function Pill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? T.yellow : T.gray3,
        color: active ? "#000" : T.gray1,
        border: "none",
        borderRadius: 99,
        padding: "7px 16px",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <div style={S.label}>{label}</div>}
      <input
        {...props}
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 10,
          padding: "13px 14px",
          fontSize: 15,
          color: T.white,
          width: "100%",
          outline: "none",
          fontWeight: 500,
          ...props.style,
        }}
      />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <div style={S.label}>{label}</div>}
      <select
        {...props}
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 10,
          padding: "13px 14px",
          fontSize: 15,
          color: T.white,
          width: "100%",
          outline: "none",
          fontWeight: 500,
          appearance: "none",
          WebkitAppearance: "none",
        }}
      >
        {children}
      </select>
    </div>
  );
}

function Btn({ onClick, children, variant = "primary", style = {} }) {
  const variants = {
    primary: { background: T.yellow, color: "#000", border: "none" },
    ghost: {
      background: "transparent",
      color: T.gray1,
      border: `1px solid ${T.border}`,
    },
    danger: {
      background: `${T.red}18`,
      color: T.red,
      border: `1px solid ${T.red}40`,
    },
  };
  return (
    <button
      onClick={onClick}
      style={{
        ...variants[variant],
        borderRadius: 10,
        padding: "13px 20px",
        fontSize: 15,
        fontWeight: 700,
        cursor: "pointer",
        width: "100%",
        transition: "opacity 0.15s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div style={{ height: 1, background: T.border, margin: "4px 0" }} />;
}

function Empty({ text }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.15 }}>—</div>
      <div style={{ fontSize: 15, color: T.gray2, fontWeight: 500 }}>
        {text}
      </div>
    </div>
  );
}

function BottomNav({ tab, setTab }) {
  const tabs = [
    { key: "matches", label: "Matchs" },
    { key: "new", label: "Créer" },
    { key: "players", label: "Joueurs" },
    { key: "ranking", label: "Classement" },
  ];
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        maxWidth: 480,
        margin: "0 auto",
        background: T.surface,
        borderTop: `1px solid ${T.border}`,
        display: "flex",
        zIndex: 100,
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => setTab(t.key)}
          style={{
            flex: 1,
            background: "none",
            border: "none",
            padding: "13px 0 11px",
            color: tab === t.key ? T.yellow : T.gray2,
            cursor: "pointer",
            transition: "color 0.15s",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            {t.label}
          </span>
          {tab === t.key && (
            <div
              style={{
                width: 20,
                height: 2,
                background: T.yellow,
                borderRadius: 99,
              }}
            />
          )}
        </button>
      ))}
    </div>
  );
}

function BackBtn({ onClick, label = "Retour" }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        color: T.yellow,
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        padding: "16px 16px 8px",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      ← {label}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MATCH FORM  (Create + Edit)
═══════════════════════════════════════════════════════════════════════════════ */
function MatchForm({ db, setDb, editMatch, onDone }) {
  const isEdit = !!editMatch;

  const [step, setStep] = useState("info"); // info | stats | ratings
  const [form, setForm] = useState(() =>
    isEdit
      ? {
          date: editMatch.date,
          scoreUs: String(editMatch.scoreUs),
          scoreThem: String(editMatch.scoreThem),
          lieu: editMatch.lieu || "",
          videoUrl: editMatch.videoUrl || "",
          scorers: editMatch.scorers || {},
          assisters: editMatch.assisters || {},
          participants: editMatch.participants || db.players.map((p) => p.id),
        }
      : {
          date: new Date().toISOString().slice(0, 10),
          scoreUs: "",
          scoreThem: "",
          lieu: "",
          videoUrl: "",
          scorers: {},
          assisters: {},
          participants: db.players.map((p) => p.id),
        }
  );

  const initRatings = () => {
    const r = {};
    db.players.forEach((p) => {
      r[p.id] =
        isEdit && editMatch.ratings?.[p.id]
          ? { ...editMatch.ratings[p.id] }
          : {
              attaque: 5,
              defense: 5,
              dribbles: 5,
              passes: 5,
              vision: 5,
              carry: 5,
            };
    });
    return r;
  };
  const [ratings, setRatings] = useState(initRatings);
  const [ratingIdx, setRatingIdx] = useState(0);

  const participants = db.players.filter((p) =>
    form.participants.includes(p.id)
  );

  function toggleParticipant(id) {
    setForm((f) => ({
      ...f,
      participants: f.participants.includes(id)
        ? f.participants.filter((x) => x !== id)
        : [...f.participants, id],
    }));
  }

  function commitMatch(finalRatings) {
    const r = {};
    participants.forEach((p) => {
      const pr = finalRatings?.[p.id] || ratings[p.id] || {};
      const vals = ASPECTS.map((a) => pr[a.key] || 5);
      r[p.id] = { ...pr, general: parseFloat(avg(vals).toFixed(2)) };
    });
    const match = {
      id: isEdit ? editMatch.id : uid(),
      date: form.date,
      scoreUs: parseInt(form.scoreUs) || 0,
      scoreThem: parseInt(form.scoreThem) || 0,
      lieu: form.lieu,
      videoUrl: form.videoUrl,
      scorers: form.scorers,
      assisters: form.assisters,
      participants: form.participants,
      ratings: Object.keys(r).length
        ? r
        : isEdit
        ? editMatch.ratings || {}
        : {},
    };
    if (isEdit) {
      setDb((d) => ({
        ...d,
        matches: d.matches.map((m) => (m.id === editMatch.id ? match : m)),
      }));
    } else {
      setDb((d) => ({ ...d, matches: [...d.matches, match] }));
    }
    onDone();
  }

  // ── STEP: INFO ──────────────────────────────────────────────────────────────
  if (step === "info")
    return (
      <div style={{ padding: "0 16px 100px" }}>
        <div style={S.pageTitle}>
          {isEdit ? "Modifier le match" : "Nouveau match"}
        </div>

        <div style={S.card}>
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <div style={S.label}>Score</div>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <input
              type="number"
              min={0}
              placeholder="Nous"
              value={form.scoreUs}
              onChange={(e) => setForm({ ...form, scoreUs: e.target.value })}
              style={{
                flex: 1,
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 10,
                padding: "13px 14px",
                fontSize: 28,
                fontWeight: 800,
                color: T.white,
                textAlign: "center",
                outline: "none",
              }}
            />
            <span style={{ color: T.gray2, fontWeight: 700, fontSize: 18 }}>
              –
            </span>
            <input
              type="number"
              min={0}
              placeholder="Eux"
              value={form.scoreThem}
              onChange={(e) => setForm({ ...form, scoreThem: e.target.value })}
              style={{
                flex: 1,
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 10,
                padding: "13px 14px",
                fontSize: 28,
                fontWeight: 800,
                color: T.gray1,
                textAlign: "center",
                outline: "none",
              }}
            />
          </div>
          <Input
            label="Lieu"
            placeholder="Ex: Complexe du Stade, Paris"
            value={form.lieu}
            onChange={(e) => setForm({ ...form, lieu: e.target.value })}
          />
          <Input
            label="Lien vidéo (optionnel)"
            placeholder="https://youtube.com/..."
            value={form.videoUrl}
            onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
          />
        </div>

        {db.players.length > 0 && (
          <div style={S.card}>
            <div style={S.label}>Participants</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginTop: 8,
              }}
            >
              {db.players.map((p) => {
                const sel = form.participants.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleParticipant(p.id)}
                    style={{
                      background: sel ? `${T.yellow}18` : T.gray3,
                      border: `1.5px solid ${sel ? T.yellow : "transparent"}`,
                      borderRadius: 10,
                      padding: "10px 12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      textAlign: "left",
                    }}
                  >
                    <Avatar player={p} size={32} />
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: sel ? T.yellow : T.white,
                        }}
                      >
                        {p.name}
                      </div>
                      <div style={{ fontSize: 11, color: T.gray2 }}>
                        {p.position}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginTop: 8,
          }}
        >
          <Btn onClick={() => setStep("stats")}>
            {participants.length > 0
              ? "Continuer — Buts et passes"
              : "Enregistrer le match"}
          </Btn>
          <Btn variant="ghost" onClick={() => commitMatch()}>
            Enregistrer sans détails
          </Btn>
        </div>
      </div>
    );

  // ── STEP: STATS ─────────────────────────────────────────────────────────────
  if (step === "stats")
    return (
      <div style={{ padding: "0 16px 100px" }}>
        <BackBtn onClick={() => setStep("info")} label="Info match" />
        <div style={S.pageTitle}>Buts et passes</div>

        <div style={S.card}>
          <div style={S.sectionLabel}>BUTEURS</div>
          {participants.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: `1px solid ${T.border}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar player={p} size={34} />
                <span style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={() => {
                    const c = form.scorers[p.id] || 0;
                    if (c > 0)
                      setForm({
                        ...form,
                        scorers: { ...form.scorers, [p.id]: c - 1 },
                      });
                  }}
                  style={S.counterBtn}
                >
                  −
                </button>
                <span
                  style={{
                    width: 28,
                    textAlign: "center",
                    fontWeight: 800,
                    fontSize: 17,
                    color: T.white,
                  }}
                >
                  {form.scorers[p.id] || 0}
                </span>
                <button
                  onClick={() =>
                    setForm({
                      ...form,
                      scorers: {
                        ...form.scorers,
                        [p.id]: (form.scorers[p.id] || 0) + 1,
                      },
                    })
                  }
                  style={S.counterBtn}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={S.card}>
          <div style={S.sectionLabel}>PASSEURS DECISIFS</div>
          {participants.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: `1px solid ${T.border}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar player={p} size={34} />
                <span style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={() => {
                    const c = form.assisters[p.id] || 0;
                    if (c > 0)
                      setForm({
                        ...form,
                        assisters: { ...form.assisters, [p.id]: c - 1 },
                      });
                  }}
                  style={S.counterBtn}
                >
                  −
                </button>
                <span
                  style={{
                    width: 28,
                    textAlign: "center",
                    fontWeight: 800,
                    fontSize: 17,
                    color: T.white,
                  }}
                >
                  {form.assisters[p.id] || 0}
                </span>
                <button
                  onClick={() =>
                    setForm({
                      ...form,
                      assisters: {
                        ...form.assisters,
                        [p.id]: (form.assisters[p.id] || 0) + 1,
                      },
                    })
                  }
                  style={S.counterBtn}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginTop: 8,
          }}
        >
          <Btn
            onClick={() => {
              setRatingIdx(0);
              setStep("ratings");
            }}
          >
            Continuer — Notes joueurs
          </Btn>
          <Btn variant="ghost" onClick={() => commitMatch()}>
            Enregistrer sans les notes
          </Btn>
        </div>
      </div>
    );

  // ── STEP: RATINGS ───────────────────────────────────────────────────────────
  const curPlayer = participants[ratingIdx];
  if (!curPlayer) return null;
  const r = ratings[curPlayer.id] || {
    attaque: 5,
    defense: 5,
    dribbles: 5,
    passes: 5,
    vision: 5,
    carry: 5,
  };
  const gen = avg(ASPECTS.map((a) => r[a.key] || 5));

  return (
    <div style={{ padding: "0 16px 100px" }}>
      <BackBtn onClick={() => setStep("stats")} label="Buts et passes" />
      <div style={S.pageTitle}>Notes joueurs</div>

      {/* Player selector */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 12,
          marginBottom: 4,
        }}
      >
        {participants.map((p, i) => {
          const pr = ratings[p.id] || {};
          const g = avg(ASPECTS.map((a) => pr[a.key] || 5));
          const active = i === ratingIdx;
          return (
            <button
              key={p.id}
              onClick={() => setRatingIdx(i)}
              style={{
                background: active ? T.yellow : T.gray3,
                color: active ? "#000" : T.gray1,
                border: "none",
                borderRadius: 10,
                padding: "10px 14px",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
              }}
            >
              <span>{p.name}</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: active ? "#000" : ratingColor(g),
                }}
              >
                {g.toFixed(1)}
              </span>
            </button>
          );
        })}
      </div>

      <div style={S.card}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            paddingBottom: 16,
            marginBottom: 16,
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <Avatar player={curPlayer} size={50} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              {curPlayer.name}
            </div>
            <div style={{ fontSize: 13, color: T.gray2, marginTop: 2 }}>
              {curPlayer.position}
            </div>
          </div>
          <RatingBadge value={gen} size={50} />
        </div>
        {ASPECTS.map((a) => (
          <div key={a.key} style={{ marginBottom: 18 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 600, color: T.gray1 }}>
                {a.label}
              </span>
            </div>
            <RatingSlider
              value={r[a.key] ?? 5}
              onChange={(v) =>
                setRatings((prev) => ({
                  ...prev,
                  [curPlayer.id]: { ...(prev[curPlayer.id] || {}), [a.key]: v },
                }))
              }
            />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        {ratingIdx > 0 && (
          <button
            onClick={() => setRatingIdx(ratingIdx - 1)}
            style={{
              flex: 1,
              background: T.gray3,
              color: T.gray1,
              border: "none",
              borderRadius: 10,
              padding: "13px 0",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            ← {participants[ratingIdx - 1]?.name}
          </button>
        )}
        {ratingIdx < participants.length - 1 ? (
          <button
            onClick={() => setRatingIdx(ratingIdx + 1)}
            style={{
              flex: 2,
              background: T.yellow,
              color: "#000",
              border: "none",
              borderRadius: 10,
              padding: "13px 0",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            {participants[ratingIdx + 1]?.name} →
          </button>
        ) : (
          <button
            onClick={() => commitMatch()}
            style={{
              flex: 2,
              background: T.yellow,
              color: "#000",
              border: "none",
              borderRadius: 10,
              padding: "13px 0",
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Enregistrer le match
          </button>
        )}
      </div>
      <div style={{ marginTop: 8 }}>
        <Btn variant="ghost" onClick={() => commitMatch()}>
          Enregistrer sans finir les notes
        </Btn>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TAB: MATCHES
═══════════════════════════════════════════════════════════════════════════════ */
function MatchesTab({ db, setDb, setEditMatch, setTab }) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    const now = new Date();
    return [...db.matches]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((m) => {
        const d = new Date(m.date);
        if (filter === "week") {
          const w = new Date(now);
          w.setDate(now.getDate() - 7);
          return d >= w;
        }
        if (filter === "month")
          return (
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
          );
        if (filter === "year") return d.getFullYear() === now.getFullYear();
        return true;
      });
  }, [db.matches, filter]);

  function deleteMatch(id) {
    if (!confirm("Supprimer ce match ?")) return;
    setDb((d) => ({ ...d, matches: d.matches.filter((m) => m.id !== id) }));
    setSelected(null);
  }

  if (selected) {
    const m = selected;
    const mvp = getMVP(m, db.players);
    const ta = getTeamAvg(m, db.players);
    const result =
      m.scoreUs > m.scoreThem
        ? "win"
        : m.scoreUs < m.scoreThem
        ? "loss"
        : "draw";
    const rc = { win: "#4CAF50", loss: T.red, draw: T.gray1 };
    const rl = { win: "Victoire", loss: "Défaite", draw: "Nul" };
    const scorers = db.players.filter((p) => (m.scorers?.[p.id] || 0) > 0);
    const assisters = db.players.filter((p) => (m.assisters?.[p.id] || 0) > 0);
    const ratedPlayers = db.players.filter((p) => m.ratings?.[p.id]);

    return (
      <div>
        <BackBtn onClick={() => setSelected(null)} label="Matchs" />
        <div style={{ padding: "0 16px 100px" }}>
          {/* Score */}
          <div style={{ ...S.card, textAlign: "center", marginBottom: 12 }}>
            <div
              style={{
                fontSize: 12,
                color: T.gray2,
                letterSpacing: 1,
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              {m.date}
              {m.lieu ? " · " + m.lieu : ""}
            </div>
            <div
              style={{
                fontSize: 56,
                fontWeight: 900,
                letterSpacing: -2,
                lineHeight: 1,
              }}
            >
              <span style={{ color: rc[result] }}>{m.scoreUs}</span>
              <span style={{ color: T.gray3, margin: "0 10px" }}>–</span>
              <span style={{ color: T.gray1 }}>{m.scoreThem}</span>
            </div>
            <div style={{ marginTop: 12 }}>
              <span
                style={{
                  background: `${rc[result]}20`,
                  color: rc[result],
                  padding: "5px 16px",
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
              >
                {rl[result]}
              </span>
            </div>
            {m.videoUrl && (
              <a
                href={m.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  marginTop: 12,
                  color: T.yellow,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Voir la vidéo du match
              </a>
            )}
          </div>

          {/* MVP + team avg */}
          {(mvp || ta > 0) && (
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              {mvp && (
                <div
                  style={{
                    ...S.card,
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 0,
                  }}
                >
                  <Avatar player={mvp} size={38} />
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: T.yellow,
                        letterSpacing: 1,
                        marginBottom: 2,
                      }}
                    >
                      MVP
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {mvp.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: ratingColor(m.ratings[mvp.id]?.general || 0),
                        fontWeight: 700,
                      }}
                    >
                      {fmt(m.ratings[mvp.id]?.general)}
                    </div>
                  </div>
                </div>
              )}
              {ta > 0 && (
                <div
                  style={{
                    ...S.card,
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 0,
                  }}
                >
                  <RatingBadge value={ta} size={38} />
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: T.gray2,
                        letterSpacing: 1,
                        marginBottom: 2,
                      }}
                    >
                      EQUIPE
                    </div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 20,
                        color: ratingColor(ta),
                      }}
                    >
                      {fmt(ta)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scorers */}
          {scorers.length > 0 && (
            <div style={{ ...S.card, marginBottom: 10 }}>
              <div style={S.sectionLabel}>BUTEURS</div>
              {scorers.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: `1px solid ${T.border}`,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <Avatar player={p} size={30} />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                      {p.name}
                    </span>
                  </div>
                  <span
                    style={{ fontWeight: 800, fontSize: 15, color: T.yellow }}
                  >
                    {m.scorers[p.id]} but{m.scorers[p.id] > 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}

          {assisters.length > 0 && (
            <div style={{ ...S.card, marginBottom: 10 }}>
              <div style={S.sectionLabel}>PASSEURS DECISIFS</div>
              {assisters.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: `1px solid ${T.border}`,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <Avatar player={p} size={30} />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                      {p.name}
                    </span>
                  </div>
                  <span
                    style={{ fontWeight: 800, fontSize: 15, color: T.gray1 }}
                  >
                    {m.assisters[p.id]} PD
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Ratings */}
          {ratedPlayers.length > 0 && (
            <div style={{ ...S.card, marginBottom: 10 }}>
              <div style={S.sectionLabel}>NOTES JOUEURS</div>
              {ratedPlayers.map((p) => {
                const r = m.ratings[p.id];
                return (
                  <div
                    key={p.id}
                    style={{
                      paddingBottom: 16,
                      marginBottom: 16,
                      borderBottom: `1px solid ${T.border}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <Avatar player={p} size={38} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: 12, color: T.gray2 }}>
                            {p.position}
                          </div>
                        </div>
                      </div>
                      <RatingBadge value={r.general} size={44} />
                    </div>
                    {ASPECTS.map((a) => (
                      <AspectBar key={a.key} label={a.label} value={r[a.key]} />
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <Btn
              variant="ghost"
              onClick={() => {
                setEditMatch(m);
                setTab("new");
              }}
            >
              Modifier
            </Btn>
            <Btn variant="danger" onClick={() => deleteMatch(m.id)}>
              Supprimer
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 16px 100px" }}>
      <div style={S.pageTitle}>Matchs</div>
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          overflowX: "auto",
          paddingBottom: 4,
        }}
      >
        {[
          ["all", "Tous"],
          ["week", "Semaine"],
          ["month", "Mois"],
          ["year", "Année"],
        ].map(([k, l]) => (
          <Pill
            key={k}
            label={l}
            active={filter === k}
            onClick={() => setFilter(k)}
          />
        ))}
      </div>
      {filtered.length === 0 && <Empty text="Aucun match trouvé" />}
      {filtered.map((m) => {
        const mvp = getMVP(m, db.players);
        const ta = getTeamAvg(m, db.players);
        const result =
          m.scoreUs > m.scoreThem
            ? "win"
            : m.scoreUs < m.scoreThem
            ? "loss"
            : "draw";
        const rc = { win: "#4CAF50", loss: T.red, draw: T.gray1 };
        return (
          <button
            key={m.id}
            onClick={() => setSelected(m)}
            style={{
              ...S.card,
              width: "100%",
              textAlign: "left",
              cursor: "pointer",
              marginBottom: 10,
              display: "block",
              borderLeft: `3px solid ${rc[result]}`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: T.gray2,
                    marginBottom: 4,
                    fontWeight: 500,
                  }}
                >
                  {m.date}
                  {m.lieu ? " · " + m.lieu : ""}
                </div>
                <div
                  style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1 }}
                >
                  <span style={{ color: rc[result] }}>{m.scoreUs}</span>
                  <span style={{ color: T.gray3, margin: "0 8px" }}>–</span>
                  <span style={{ color: T.gray1 }}>{m.scoreThem}</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                {mvp && (
                  <div
                    style={{
                      fontSize: 11,
                      color: T.yellow,
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    MVP — {mvp.name}
                  </div>
                )}
                {ta > 0 ? (
                  <>
                    <div
                      style={{ fontSize: 11, color: T.gray2, fontWeight: 500 }}
                    >
                      Moy. équipe
                    </div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 18,
                        color: ratingColor(ta),
                      }}
                    >
                      {fmt(ta)}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: T.gray2 }}>Non noté</div>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TAB: PLAYERS
═══════════════════════════════════════════════════════════════════════════════ */
function PlayersTab({ db, setDb }) {
  const [editing, setEditing] = useState(null); // null | "new" | player object
  const [form, setForm] = useState({ name: "", position: "Milieu" });

  function openNew() {
    setForm({ name: "", position: "Milieu" });
    setEditing("new");
  }
  function openEdit(p) {
    setForm({ name: p.name, position: p.position });
    setEditing(p);
  }

  function save() {
    if (!form.name.trim()) return;
    if (editing === "new") {
      setDb((d) => ({
        ...d,
        players: [
          ...d.players,
          { id: uid(), name: form.name.trim(), position: form.position },
        ],
      }));
    } else {
      setDb((d) => ({
        ...d,
        players: d.players.map((p) =>
          p.id === editing.id
            ? { ...p, name: form.name.trim(), position: form.position }
            : p
        ),
      }));
    }
    setEditing(null);
  }

  function del(id) {
    if (
      !confirm(
        "Supprimer ce joueur ? Ses stats dans les matchs seront conservées."
      )
    )
      return;
    setDb((d) => ({ ...d, players: d.players.filter((p) => p.id !== id) }));
  }

  if (editing)
    return (
      <div style={{ padding: "0 16px 100px" }}>
        <BackBtn onClick={() => setEditing(null)} label="Joueurs" />
        <div style={S.pageTitle}>
          {editing === "new" ? "Nouveau joueur" : "Modifier"}
        </div>
        <div style={S.card}>
          <Input
            label="Nom"
            placeholder="Nom du joueur"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div style={S.label}>Poste</div>
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}
          >
            {POSITIONS.map((pos) => (
              <Pill
                key={pos}
                label={pos}
                active={form.position === pos}
                onClick={() => setForm({ ...form, position: pos })}
              />
            ))}
          </div>
        </div>
        <Btn onClick={save}>Enregistrer</Btn>
      </div>
    );

  return (
    <div style={{ padding: "0 16px 100px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div style={S.pageTitle}>Joueurs</div>
        <button
          onClick={openNew}
          style={{
            background: T.yellow,
            color: "#000",
            border: "none",
            borderRadius: 10,
            padding: "8px 18px",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          + Ajouter
        </button>
      </div>
      {db.players.length === 0 && (
        <Empty text="Aucun joueur. Crée ton équipe." />
      )}
      {db.players.map((p) => {
        const stats = getPlayerStats(p.id, db.matches);
        return (
          <div
            key={p.id}
            style={{
              ...S.card,
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Avatar player={p} size={48} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</div>
              <div style={{ fontSize: 13, color: T.gray2, marginTop: 2 }}>
                {p.position} · {stats.matchCount} matchs · {stats.goals} buts ·{" "}
                {stats.assists} PD
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                alignItems: "flex-end",
              }}
            >
              {stats.matchCount > 0 && (
                <RatingBadge value={stats.avgGeneral} size={40} />
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => openEdit(p)}
                  style={{
                    background: T.gray3,
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 10px",
                    color: T.gray1,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Modifier
                </button>
                <button
                  onClick={() => del(p.id)}
                  style={{
                    background: `${T.red}18`,
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 10px",
                    color: T.red,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TAB: RANKING
═══════════════════════════════════════════════════════════════════════════════ */
function RankingTab({ db }) {
  const [filterAspect, setFilterAspect] = useState("general");
  const [minMatches, setMinMatches] = useState(1);
  const [selected, setSelected] = useState(null);
  const [compareId, setCompareId] = useState(null);

  const allStats = useMemo(() => {
    return db.players
      .map((p) => ({ player: p, stats: getPlayerStats(p.id, db.matches) }))
      .filter((x) => x.stats.matchCount >= minMatches)
      .sort((a, b) => {
        const va =
          filterAspect === "general"
            ? a.stats.avgGeneral
            : a.stats.aspects[filterAspect] || 0;
        const vb =
          filterAspect === "general"
            ? b.stats.avgGeneral
            : b.stats.aspects[filterAspect] || 0;
        return vb - va;
      });
  }, [db, filterAspect, minMatches]);

  if (selected) {
    const p = selected;
    const stats = getPlayerStats(p.id, db.matches);
    const comparePlayer = compareId
      ? db.players.find((x) => x.id === compareId)
      : null;
    const compareStats = comparePlayer
      ? getPlayerStats(compareId, db.matches)
      : null;
    const lastMatches = [...db.matches]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((m) => m.ratings?.[p.id])
      .slice(0, 3);

    return (
      <div style={{ padding: "0 16px 100px" }}>
        <BackBtn
          onClick={() => {
            setSelected(null);
            setCompareId(null);
          }}
          label="Classement"
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 20,
          }}
        >
          <Avatar player={p} size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: -0.5 }}>
              {p.name}
            </div>
            <div style={{ fontSize: 13, color: T.gray2, marginTop: 3 }}>
              {p.position} · {stats.matchCount} matchs
            </div>
          </div>
          {stats.matchCount > 0 && (
            <RatingBadge value={stats.avgGeneral} size={58} />
          )}
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 8,
            marginBottom: 14,
          }}
        >
          {[
            { label: "Buts", value: stats.goals },
            { label: "PD", value: stats.assists },
            { label: "B/M", value: stats.avgGoals },
            { label: "PD/M", value: stats.avgAssists },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: "12px 8px",
                textAlign: "center",
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 20, color: T.white }}>
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: T.gray2,
                  marginTop: 3,
                  fontWeight: 600,
                  letterSpacing: 0.5,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Aspects */}
        {stats.matchCount > 0 && (
          <div style={{ ...S.card, marginBottom: 12 }}>
            <div style={S.sectionLabel}>NOTES ALL TIME PAR ASPECT</div>
            {ASPECTS.map((a) => (
              <AspectBar
                key={a.key}
                label={a.label}
                value={stats.aspects[a.key]}
              />
            ))}
          </div>
        )}

        {/* Last 3 */}
        {lastMatches.length > 0 && (
          <div style={{ ...S.card, marginBottom: 12 }}>
            <div style={S.sectionLabel}>3 DERNIERS FIVES</div>
            {lastMatches.map((m) => {
              const r = m.ratings[p.id];
              const rc =
                m.scoreUs > m.scoreThem
                  ? "#4CAF50"
                  : m.scoreUs < m.scoreThem
                  ? T.red
                  : T.gray1;
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: `1px solid ${T.border}`,
                  }}
                >
                  <div>
                    <div
                      style={{ fontSize: 12, color: T.gray2, fontWeight: 500 }}
                    >
                      {m.date}
                      {m.lieu ? " · " + m.lieu : ""}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: rc }}>
                      {m.scoreUs} – {m.scoreThem}
                    </div>
                  </div>
                  <RatingBadge value={r.general} size={40} />
                </div>
              );
            })}
          </div>
        )}

        {/* Comparison */}
        <div style={S.card}>
          <div style={S.sectionLabel}>COMPARAISON</div>
          <Select
            value={compareId || ""}
            onChange={(e) => setCompareId(e.target.value || null)}
          >
            <option value="">Choisir un joueur...</option>
            {db.players
              .filter((x) => x.id !== p.id)
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
          </Select>
          {comparePlayer && compareStats && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <Avatar player={p} size={40} />
                  <div
                    style={{
                      fontSize: 12,
                      color: T.gray1,
                      marginTop: 4,
                      fontWeight: 600,
                    }}
                  >
                    {p.name}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: T.gray2, fontWeight: 700 }}>
                  VS
                </div>
                <div style={{ textAlign: "center" }}>
                  <Avatar player={comparePlayer} size={40} />
                  <div
                    style={{
                      fontSize: 12,
                      color: T.gray1,
                      marginTop: 4,
                      fontWeight: 600,
                    }}
                  >
                    {comparePlayer.name}
                  </div>
                </div>
              </div>
              {[{ key: "general", label: "Note générale" }, ...ASPECTS].map(
                (a) => {
                  const va =
                    a.key === "general"
                      ? stats.avgGeneral
                      : stats.aspects[a.key] || 0;
                  const vb =
                    a.key === "general"
                      ? compareStats.avgGeneral
                      : compareStats.aspects[a.key] || 0;
                  const tot = va + vb || 1;
                  const winner = va > vb ? "left" : va < vb ? "right" : "tie";
                  return (
                    <div key={a.key} style={{ marginBottom: 14 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: T.gray2,
                          marginBottom: 6,
                          fontWeight: 600,
                        }}
                      >
                        {a.label}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            width: 34,
                            textAlign: "right",
                            fontWeight: 800,
                            fontSize: 15,
                            color:
                              winner === "left" ? ratingColor(va) : T.gray2,
                          }}
                        >
                          {fmt(va)}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: 5,
                            background: T.gray3,
                            borderRadius: 99,
                            overflow: "hidden",
                            display: "flex",
                          }}
                        >
                          <div
                            style={{
                              width: `${(va / tot) * 100}%`,
                              background: ratingColor(va),
                              borderRadius: "99px 0 0 99px",
                            }}
                          />
                          <div
                            style={{
                              width: `${(vb / tot) * 100}%`,
                              background: ratingColor(vb),
                              borderRadius: "0 99px 99px 0",
                            }}
                          />
                        </div>
                        <span
                          style={{
                            width: 34,
                            fontWeight: 800,
                            fontSize: 15,
                            color:
                              winner === "right" ? ratingColor(vb) : T.gray2,
                          }}
                        >
                          {fmt(vb)}
                        </span>
                      </div>
                    </div>
                  );
                }
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 16px 100px" }}>
      <div style={S.pageTitle}>Classement</div>

      <div style={{ ...S.card, marginBottom: 12 }}>
        <div style={S.label}>Filtrer par</div>
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginTop: 8,
            marginBottom: 16,
          }}
        >
          <Pill
            label="Global"
            active={filterAspect === "general"}
            onClick={() => setFilterAspect("general")}
          />
          {ASPECTS.map((a) => (
            <Pill
              key={a.key}
              label={a.label}
              active={filterAspect === a.key}
              onClick={() => setFilterAspect(a.key)}
            />
          ))}
        </div>
        <div style={S.label}>
          Matchs minimum :{" "}
          <span style={{ color: T.yellow, fontWeight: 800 }}>{minMatches}</span>
        </div>
        <input
          type="range"
          min={1}
          max={20}
          value={minMatches}
          onChange={(e) => setMinMatches(parseInt(e.target.value))}
          style={{
            width: "100%",
            accentColor: T.yellow,
            marginTop: 8,
            background: `linear-gradient(to right, ${T.yellow} ${
              ((minMatches - 1) / 19) * 100
            }%, ${T.gray3} ${((minMatches - 1) / 19) * 100}%)`,
          }}
        />
      </div>

      {allStats.length === 0 && (
        <Empty
          text={`Aucun joueur avec ${minMatches}+ match${
            minMatches > 1 ? "s" : ""
          }.`}
        />
      )}
      {allStats.map(({ player, stats }, i) => {
        const val =
          filterAspect === "general"
            ? stats.avgGeneral
            : stats.aspects[filterAspect] || 0;
        const ranks = ["1er", "2e", "3e"];
        return (
          <button
            key={player.id}
            onClick={() => setSelected(player)}
            style={{
              ...S.card,
              width: "100%",
              textAlign: "left",
              cursor: "pointer",
              marginBottom: 8,
              display: "block",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: i < 3 ? T.yellow : T.gray2,
                  width: 24,
                  textAlign: "center",
                }}
              >
                {ranks[i] || `#${i + 1}`}
              </span>
              <Avatar player={player} size={44} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {player.name}
                </div>
                <div style={{ fontSize: 12, color: T.gray2, marginTop: 2 }}>
                  {stats.matchCount} matchs · {stats.goals} buts ·{" "}
                  {stats.assists} PD
                </div>
              </div>
              <RatingBadge value={val} size={44} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [db, setDb] = useState(load);
  const [tab, setTab] = useState("matches");
  const [editMatch, setEditMatch] = useState(null);

  function updateDb(fn) {
    setDb((d) => {
      const nd = typeof fn === "function" ? fn(d) : fn;
      save(nd);
      return nd;
    });
  }

  // When editing a match, switch to new tab
  function handleEditMatch(m) {
    setEditMatch(m);
    setTab("new");
  }

  function handleMatchDone() {
    setEditMatch(null);
    setTab("matches");
  }

  return (
    <div
      style={{
        maxWidth: 480,
        margin: "0 auto",
        minHeight: "100vh",
        background: T.bg,
        color: T.white,
      }}
    >
      <style>{GLOBAL_CSS}</style>

      {/* Header */}
      <div
        style={{
          background: T.surface,
          borderBottom: `1px solid ${T.border}`,
          padding: "18px 16px 14px",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: -1 }}>
            Five
          </span>
          <span
            style={{
              fontSize: 20,
              fontWeight: 900,
              letterSpacing: -1,
              color: T.yellow,
            }}
          >
            Rating
          </span>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 16,
              fontSize: 12,
              color: T.gray2,
              fontWeight: 600,
            }}
          >
            <span>{db.matches.length} matchs</span>
            <span>{db.players.length} joueurs</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ paddingTop: 8 }}>
        {tab === "matches" && (
          <MatchesTab
            db={db}
            setDb={updateDb}
            setEditMatch={handleEditMatch}
            setTab={setTab}
          />
        )}
        {tab === "new" && (
          <MatchForm
            db={db}
            setDb={updateDb}
            editMatch={editMatch}
            onDone={handleMatchDone}
          />
        )}
        {tab === "players" && <PlayersTab db={db} setDb={updateDb} />}
        {tab === "ranking" && <RankingTab db={db} />}
      </div>

      <BottomNav
        tab={tab}
        setTab={() => {}}
        setTabReal={(t) => {
          if (t === "new") {
            setEditMatch(null);
            setTab("new");
          } else setTab(t);
        }}
      />
      <RealBottomNav
        tab={tab}
        setTab={(t) => {
          if (t === "new") {
            setEditMatch(null);
          }
          setTab(t);
        }}
      />
    </div>
  );
}

function RealBottomNav({ tab, setTab }) {
  const tabs = [
    { key: "matches", label: "Matchs" },
    { key: "new", label: "Créer" },
    { key: "players", label: "Joueurs" },
    { key: "ranking", label: "Classement" },
  ];
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        maxWidth: 480,
        margin: "0 auto",
        background: T.surface,
        borderTop: `1px solid ${T.border}`,
        display: "flex",
        zIndex: 100,
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => setTab(t.key)}
          style={{
            flex: 1,
            background: "none",
            border: "none",
            padding: "13px 0 10px",
            color: tab === t.key ? T.yellow : T.gray2,
            cursor: "pointer",
            transition: "color 0.15s",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 5,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.3,
              textTransform: "uppercase",
            }}
          >
            {t.label}
          </span>
          {tab === t.key && (
            <div
              style={{
                width: 24,
                height: 2,
                background: T.yellow,
                borderRadius: 99,
              }}
            />
          )}
        </button>
      ))}
    </div>
  );
}

/* ─── SHARED STYLES ──────────────────────────────────────────────────────────── */
const S = {
  card: {
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 900,
    letterSpacing: -0.5,
    marginBottom: 20,
    paddingTop: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1.5,
    color: T.gray2,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.5,
    color: T.gray2,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  counterBtn: {
    background: T.gray3,
    border: "none",
    borderRadius: 8,
    width: 34,
    height: 34,
    fontSize: 20,
    cursor: "pointer",
    color: T.white,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
