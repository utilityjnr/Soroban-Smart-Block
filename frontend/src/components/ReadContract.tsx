import { useState } from "react";

interface Param {
  name: string;
  type: string;
}

interface AbiFunction {
  name: string;
  description?: string;
  template?: string;
  params?: Param[];
  mutates?: boolean;
}

interface Props {
  functions: AbiFunction[];
  contractId: string;
}

function inputType(sorobanType: string): string {
  const t = sorobanType.toLowerCase();
  if (t.includes("int") || t === "u32" || t === "i32" || t === "u64" || t === "i64" || t === "u128" || t === "i128") return "number";
  if (t === "bool") return "checkbox";
  return "text";
}

function placeholder(param: Param): string {
  const t = param.type.toLowerCase();
  if (t === "address") return `${param.name} (e.g. GABC…)`;
  if (t.includes("int")) return `${param.name} (integer)`;
  if (t === "bool") return param.name;
  return `${param.name} (${param.type})`;
}

export default function ReadContract({ functions, contractId }: Props) {
  const readFns = functions.filter(f => !f.mutates);

  const [selected, setSelected] = useState<string>(readFns[0]?.name ?? "");
  const [args, setArgs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fn = readFns.find(f => f.name === selected);

  function handleSelect(name: string) {
    setSelected(name);
    setArgs({});
    setResult(null);
    setError(null);
  }

  async function handleCall() {
    if (!fn) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const params = new URLSearchParams({ fn: fn.name, contract: contractId, ...args });
      const res = await fetch(`/api/read?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Call failed");
      setResult(JSON.stringify(data.result, null, 2));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (readFns.length === 0) return null;

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h3 style={{ fontSize: 14 }}>Read Contract</h3>

      <select value={selected} onChange={e => handleSelect(e.target.value)} style={{ width: "100%" }}>
        {readFns.map(f => (
          <option key={f.name} value={f.name}>{f.name}</option>
        ))}
      </select>

      {fn?.params && fn.params.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {fn.params.map(p => (
            <div key={p.name} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, color: "var(--muted)" }}>
                {p.name} <span style={{ color: "var(--accent)" }}>({p.type})</span>
              </label>
              {inputType(p.type) === "checkbox" ? (
                <input
                  type="checkbox"
                  checked={args[p.name] === "true"}
                  onChange={e => setArgs(a => ({ ...a, [p.name]: String(e.target.checked) }))}
                />
              ) : (
                <input
                  type={inputType(p.type)}
                  placeholder={placeholder(p)}
                  value={args[p.name] ?? ""}
                  onChange={e => setArgs(a => ({ ...a, [p.name]: e.target.value }))}
                  style={{ width: "100%" }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <button onClick={handleCall} disabled={loading} style={{ alignSelf: "flex-start" }}>
        {loading ? "Calling…" : "Call"}
      </button>

      {error && <p style={{ color: "#f85149", fontSize: 13 }}>{error}</p>}
      {result !== null && (
        <pre style={{
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: 12,
          fontSize: 12,
          overflowX: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}>{result}</pre>
      )}
    </div>
  );
}
