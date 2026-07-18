import { useEffect, useRef, useState, useId } from "react";
import mermaid from "mermaid";

// ── One-time initialisation ───────────────────────────────────────────────────
mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    background:          "#071525",
    primaryColor:        "#0e4b6b",
    primaryTextColor:    "#e2f0fa",
    primaryBorderColor:  "#4fc3f7",
    lineColor:           "#4fc3f7",
    secondaryColor:      "#0d2137",
    tertiaryColor:       "#0a1e35",
    edgeLabelBackground: "#0d2137",
    clusterBkg:          "#0a1e35",
    titleColor:          "#7dd3fc",
    nodeBorder:          "#4fc3f7",
    mainBkg:             "#0e2a42",
    fontFamily:          "Rajdhani, sans-serif",
    fontSize:            "14px",
  },
  flowchart:     { htmlLabels: false, curve: "basis" },
  securityLevel: "loose",
});

// ── Comprehensive sanitiser ───────────────────────────────────────────────────
// Handles every pattern Llama 3.3 70B is known to produce that breaks Mermaid.
function sanitize(raw) {
  if (!raw) return "";
  let code = raw.trim();

  // 1. Strip ```mermaid ... ``` or ``` ... ``` fences
  code = code.replace(/^```[\w]*\s*/i, "").replace(/\s*```$/, "").trim();

  // 2. Normalize line endings
  code = code.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 3. Unsupported diagram types → convert to flowchart TD
  //    Covers: usecase, usecaseDiagram, use case, sequenceDiagram, classDiagram, erDiagram
  if (/^(usecase|use\s+case|usecasediagram)/i.test(code)) {
    code = "flowchart LR\n" + code.replace(/^[^\n]+\n?/, "");
  }
  if (/^sequenceDiagram/i.test(code)) {
    // sequence diagrams can sometimes render — keep but strip invalid lines
    // Actually just convert to flowchart to be safe
    code = "flowchart TD\n    A[Sequence diagram not supported - see explanation below]";
  }

  // 4. Normalise "graph TD/LR/TB" → "flowchart TD/LR/TB"
  code = code.replace(/^graph\s+(TD|LR|TB|BT|RL)/im, "flowchart $1");
  code = code.replace(/^graph\b/im, "flowchart TD");

  // 5. If there's no valid diagram type header at all, add one
  if (!/^(flowchart|graph|pie|gantt|classDiagram|erDiagram|journey|gitGraph)/im.test(code.split("\n")[0])) {
    code = "flowchart TD\n" + code;
  }

  // 6. Remove markdown bold/italic inside labels: **text** → text
  code = code.replace(/\*\*([^*]+)\*\*/g, "$1");
  code = code.replace(/\*([^*]+)\*/g, "$1");

  // 7. Escape or remove characters that break Mermaid's lexer inside node labels.
  //    Process line by line so we don't touch the diagram header or arrow syntax.
  const lines = code.split("\n");
  const fixed = lines.map((line, idx) => {
    // Skip the first line (diagram type declaration)
    if (idx === 0) return line;
    // Skip comment lines
    if (line.trim().startsWith("%%")) return line;
    // Skip subgraph / end lines
    if (/^\s*(subgraph|end)\b/i.test(line)) return line;

    // Fix label content inside [ ], { }, ( ), > brackets
    // Replace unescaped quotes inside labels with smart alternatives
    line = line.replace(/\[([^\]]+)\]/g, (_, inner) => {
      let clean = inner;
      // Remove or replace characters that break the parser
      clean = clean.replace(/"/g, "");          // remove double quotes
      clean = clean.replace(/[(]/g, "");        // remove open parens
      clean = clean.replace(/[)]/g, "");        // remove close parens
      clean = clean.replace(/&/g, "and");       // & → and
      clean = clean.replace(/</g, "lt ");       // < → lt
      clean = clean.replace(/>/g, "gt ");       // > → gt
      clean = clean.replace(/\//g, " or ");     // / → or
      clean = clean.replace(/'/g, "");          // remove apostrophes
      clean = clean.replace(/`/g, "");          // remove backticks
      clean = clean.replace(/\|/g, "-");        // | → - (pipes break edge labels)
      return `[${clean}]`;
    });

    // Fix edge labels between pipes: -->|label| — same cleaning
    line = line.replace(/\|([^|]+)\|/g, (_, inner) => {
      let clean = inner;
      clean = clean.replace(/"/g, "");
      clean = clean.replace(/[()/]/g, "");
      clean = clean.replace(/&/g, "and");
      clean = clean.replace(/[<>]/g, "");
      clean = clean.replace(/'/g, "");
      return `|${clean}|`;
    });

    // Fix broken fancy arrows: -->|label|> → -->|label|
    line = line.replace(/\|([^|]*)\|>/g, "|$1|");

    // Fix dotted arrows written as --.-> or --..->
    line = line.replace(/--\.->/g, "-.->").replace(/--\.\.\.->/g, "-..->");

    // Remove stray trailing pipe before closing bracket: A[text|] → A[text]
    line = line.replace(/\|(\s*[\]})>])/g, "$1");

    return line;
  });

  code = fixed.join("\n");

  // 8. Collapse 3+ blank lines → single blank line
  code = code.replace(/\n{3,}/g, "\n\n").trim();

  return code;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MermaidDiagram({ code, title, diagramType, explanation }) {
  const uid         = useId().replace(/:/g, "");
  const containerId = `mm-${uid}`;
  const containerRef = useRef(null);

  const [svg,      setSvg]      = useState("");
  const [error,    setError]    = useState(null);
  const [showCode, setShowCode] = useState(false);
  const [loading,  setLoading]  = useState(true);

  const clean = sanitize(code);

  useEffect(() => {
    if (!clean) {
      setError("No diagram code available.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setSvg("");

    (async () => {
      try {
        const { svg: rendered } = await mermaid.render(containerId, clean);
        if (!cancelled) {
          setSvg(rendered);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err?.message || String(err);
          console.warn("Mermaid render failed:", msg, "\nCode was:\n", clean);
          setError(msg);
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [clean, containerId]);

  return (
    <div className="mm-card">
      {/* Header */}
      <div className="mm-header">
        <div className="mm-header__left">
          <span className="mm-title">{title || "Diagram"}</span>
          {diagramType && <span className="mm-type-badge">{diagramType}</span>}
        </div>
        <button
          className={`mm-toggle ${showCode ? "mm-toggle--active" : ""}`}
          onClick={() => setShowCode(s => !s)}
          title={showCode ? "Show rendered diagram" : "Show Mermaid code"}>
          {showCode ? "◈ Render" : "</> Code"}
        </button>
      </div>

      {/* Body */}
      <div className="mm-body">
        {showCode ? (
          <pre className="mm-code">{clean || "(no code)"}</pre>
        ) : loading ? (
          <div className="mm-state">
            <span className="dev-spinner" />
            <span style={{ color: "var(--text2)", fontSize: 12, fontFamily: "var(--font-b)" }}>
              Rendering diagram…
            </span>
          </div>
        ) : error ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="mm-error">
              ⚠ Diagram rendered with syntax issues — showing source code. Use the &quot;&lt;/&gt; Code&quot; button to inspect or re-generate.
            </div>
            <pre className="mm-code">{clean}</pre>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="mm-svg-wrap"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        )}
      </div>

      {/* Explanation */}
      {explanation && (
        <div className="mm-explanation">{explanation}</div>
      )}
    </div>
  );
}
