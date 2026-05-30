import { useState } from "react";
import {
  isConnected,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";
import {
  Contract,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  Address,
  Account,
  xdr,
} from "@stellar/stellar-sdk";

interface Param {
  name: string;
  type: string;
}

interface AbiFunction {
  name: string;
  description?: string;
  params?: Param[];
  mutates?: boolean;
}

interface Props {
  functions: AbiFunction[];
  contractId: string;
}

const NETWORK_PASSPHRASE = Networks.TESTNET;
const RPC_URL = "/api/rpc-proxy"; // proxied through backend to avoid CORS

function toScVal(value: string, type: string): xdr.ScVal {
  const t = type.toLowerCase();
  if (t === "address") return new Address(value).toScVal();
  if (t === "u32") return nativeToScVal(Number(value), { type: "u32" });
  if (t === "i32") return nativeToScVal(Number(value), { type: "i32" });
  if (t === "u64") return nativeToScVal(BigInt(value), { type: "u64" });
  if (t === "i64") return nativeToScVal(BigInt(value), { type: "i64" });
  if (t === "u128") return nativeToScVal(BigInt(value), { type: "u128" });
  if (t === "i128") return nativeToScVal(BigInt(value), { type: "i128" });
  if (t === "bool") return nativeToScVal(value === "true", { type: "bool" });
  if (t === "string") return nativeToScVal(value, { type: "string" });
  if (t === "bytes") return nativeToScVal(Buffer.from(value, "hex"), { type: "bytes" });
  return nativeToScVal(value, { type: "string" });
}

export default function WriteContract({ functions, contractId }: Props) {
  const writeFns = functions.filter(f => f.mutates);

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>(writeFns[0]?.name ?? "");
  const [args, setArgs] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const fn = writeFns.find(f => f.name === selected);

  async function connectWallet() {
    try {
      const connected = await isConnected();
      if (!connected) {
        setStatus({ type: "error", msg: "Freighter extension not found. Please install it." });
        return;
      }
      const { address } = await getAddress();
      setWalletAddress(address);
      setStatus(null);
    } catch (e: any) {
      setStatus({ type: "error", msg: e.message });
    }
  }

  function handleSelect(name: string) {
    setSelected(name);
    setArgs({});
    setStatus(null);
  }

  async function handleWrite() {
    if (!fn || !walletAddress) return;
    setLoading(true);
    setStatus(null);
    try {
      // Fetch account sequence from backend proxy
      const accRes = await fetch(`/api/account/${walletAddress}`);
      if (!accRes.ok) throw new Error("Failed to fetch account info");
      const accData = await accRes.json();
      const account = new Account(accData.id, accData.sequence);

      const contract = new Contract(contractId);
      const callArgs = (fn.params ?? []).map(p => toScVal(args[p.name] ?? "", p.type));

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call(fn.name, ...callArgs))
        .setTimeout(30)
        .build();

      const { signedTxXdr } = await signTransaction(tx.toXDR(), {
        networkPassphrase: NETWORK_PASSPHRASE,
      });

      const submitRes = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xdr: signedTxXdr }),
      });
      const data = await submitRes.json();
      if (!submitRes.ok) throw new Error(data.error ?? "Submission failed");

      setStatus({ type: "success", msg: `Transaction submitted! Hash: ${data.hash}` });
    } catch (e: any) {
      setStatus({ type: "error", msg: e.message });
    } finally {
      setLoading(false);
    }
  }

  if (writeFns.length === 0) return null;

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h3 style={{ fontSize: 14 }}>Write Contract</h3>

      {!walletAddress ? (
        <button onClick={connectWallet} style={{ alignSelf: "flex-start" }}>
          Connect Freighter Wallet
        </button>
      ) : (
        <p style={{ fontSize: 12, color: "var(--green)" }}>
          Connected: <code style={{ wordBreak: "break-all" }}>{walletAddress}</code>
        </p>
      )}

      <select value={selected} onChange={e => handleSelect(e.target.value)} style={{ width: "100%" }}>
        {writeFns.map(f => (
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
              <input
                type={p.type.toLowerCase() === "address" ? "text" : p.type.toLowerCase().includes("int") ? "number" : "text"}
                placeholder={p.type.toLowerCase() === "address" ? `${p.name} (e.g. GABC…)` : `${p.name} (${p.type})`}
                value={args[p.name] ?? ""}
                onChange={e => setArgs(a => ({ ...a, [p.name]: e.target.value }))}
                style={{ width: "100%" }}
              />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleWrite}
        disabled={loading || !walletAddress}
        style={{ alignSelf: "flex-start", background: walletAddress ? "var(--accent)" : "var(--border)" }}
      >
        {loading ? "Signing…" : "Write"}
      </button>

      {status && (
        <p style={{ fontSize: 13, color: status.type === "success" ? "var(--green)" : "#f85149", wordBreak: "break-all" }}>
          {status.msg}
        </p>
      )}
    </div>
  );
}
