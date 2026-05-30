import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import EventTable from "../components/EventTable";
import ReadContract from "../components/ReadContract";
import WriteContract from "../components/WriteContract";

export default function ContractPage() {
  const { id = "" } = useParams();

  const { data: meta, isLoading: metaLoading } = useQuery({
    queryKey: ["contract", id],
    queryFn: () => api.contract(id),
    enabled: !!id,
  });

  const { data: events = [], isLoading: evLoading } = useQuery({
    queryKey: ["events", id],
    queryFn: () => api.events({ contract: id }),
    enabled: !!id,
  });

  if (metaLoading) return <p style={{ color: "var(--muted)" }}>Loading…</p>;
  if (!meta) return <p>Contract not found.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="card">
        <h2 style={{ marginBottom: 8 }}>{meta.name}</h2>
        <p style={{ color: "var(--muted)", marginBottom: 12 }}>{meta.description}</p>
        <code style={{ fontSize: 12, color: "var(--muted)", wordBreak: "break-all" }}>{id}</code>

        {meta.functions.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h3 style={{ marginBottom: 8, fontSize: 14 }}>Functions</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {meta.functions.map(f => (
                <div key={f.name} className="card" style={{ padding: "8px 12px" }}>
                  <span className="badge">{f.name}</span>
                  <span style={{ marginLeft: 8, color: "var(--muted)" }}>{f.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {meta.functions.length > 0 && (
        <>
          <ReadContract functions={meta.functions as any} contractId={id} />
          <WriteContract functions={meta.functions as any} contractId={id} />
        </>
      )}

      <h3>Recent Events</h3>
      <div className="card">
        {evLoading ? <p style={{ color: "var(--muted)" }}>Loading…</p> : <EventTable events={events} />}
      </div>
    </div>
  );
}
