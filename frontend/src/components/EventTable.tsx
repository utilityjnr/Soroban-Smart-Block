import { Link } from "react-router-dom";
import type { DecodedEvent } from "../api";

interface Props {
  events: DecodedEvent[];
}

function FunctionBadge({ fn }: { fn: string }) {
  if (fn === "wrap_native") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <span className="badge wrap">Wrap Native Asset</span>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>Classic XLM → Soroban</span>
      </span>
    );
  }
  if (fn === "unwrap_native") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <span className="badge unwrap">Unwrap Native Asset</span>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>Soroban → Classic XLM</span>
      </span>
    );
  }
  return <span className="badge">{fn}</span>;
}

export default function EventTable({ events }: Props) {
  if (!events.length) return <p style={{ color: "var(--muted)" }}>No events found.</p>;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--muted)" }}>
            <th style={th}>Seq</th>
            <th style={th}>Ledger</th>
            <th style={th}>Function</th>
            <th style={th}>Description</th>
          </tr>
        </thead>
        <tbody>
          {events.map(ev => (
            <tr key={ev.seq} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={td}>
                <Link to={`/event/${ev.seq}`}>#{ev.seq}</Link>
              </td>
              <td style={td}>{ev.ledger.toLocaleString()}</td>
              <td style={td}>
                <FunctionBadge fn={ev.function} />
              </td>
              <td style={{ ...td, maxWidth: 480, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {ev.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "8px 12px", fontWeight: 500 };
const td: React.CSSProperties = { padding: "10px 12px" };
