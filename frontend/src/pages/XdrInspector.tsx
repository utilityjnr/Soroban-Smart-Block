import { useState } from "react";
import { xdr } from "@stellar/stellar-sdk";

type TreeNode = string | { [key: string]: TreeNode } | TreeNode[];

function scValToTree(val: xdr.ScVal): TreeNode {
  const type = val.switch().name;
  switch (val.switch()) {
    case xdr.ScValType.scvBool():       return { bool: String(val.b()) };
    case xdr.ScValType.scvVoid():       return "void";
    case xdr.ScValType.scvU32():        return { u32: String(val.u32()) };
    case xdr.ScValType.scvI32():        return { i32: String(val.i32()) };
    case xdr.ScValType.scvU64():        return { u64: String(val.u64()) };
    case xdr.ScValType.scvI64():        return { i64: String(val.i64()) };
    case xdr.ScValType.scvU128(): {
      const u = val.u128();
      return { u128: String((BigInt(u.hi().toString()) << 64n) | BigInt(u.lo().toString())) };
    }
    case xdr.ScValType.scvI128(): {
      const i = val.i128();
      return { i128: String((BigInt(i.hi().toString()) << 64n) | BigInt(i.lo().toString())) };
    }
    case xdr.ScValType.scvBytes():      return { bytes: val.bytes().toString("hex") };
    case xdr.ScValType.scvString():     return { string: val.str().toString() };
    case xdr.ScValType.scvSymbol():     return { symbol: val.sym().toString() };
    case xdr.ScValType.scvAddress():    return { address: val.address().toString() };
    case xdr.ScValType.scvVec(): {
      const items = val.vec();
      return { vec: items ? items.map(scValToTree) : [] };
    }
    case xdr.ScValType.scvMap(): {
      const entries = val.map();
      if (!entries) return { map: {} };
      const obj: Record<string, TreeNode> = {};
      entries.forEach(e => {
        const k = JSON.stringify(scValToTree(e.key()));
        obj[k] = scValToTree(e.val());
      });
      return { map: obj };
    }
    case xdr.ScValType.scvContractInstance(): return { contractInstance: "…" };
    case xdr.ScValType.scvLedgerKeyContractInstance(): return "ledgerKeyContractInstance";
    case xdr.ScValType.scvLedgerKeyNonce(): return { ledgerKeyNonce: String(val.nonceKey()?.nonce()) };
    default: return { [type]: "…" };
  }
}

function tryDecode(b64: string): { tree: TreeNode; label: string } | { error: string } {
  const trimmed = b64.trim();
  if (!trimmed) return { error: "Paste a Base64 XDR string above." };

  const decoders: Array<{ label: string; fn: () => TreeNode }> = [
    {
      label: "TransactionEnvelope",
      fn: () => {
        const env = xdr.TransactionEnvelope.fromXDR(trimmed, "base64");
        const tx = env.value().tx ? env.value().tx() : (env as any).v0?.().tx?.();
        const ops = (tx as any).operations?.() ?? [];
        return {
          type: "TransactionEnvelope",
          operations: ops.map((op: xdr.Operation) => {
            const body = op.body();
            const name = body.switch().name;
            if (name === "invokeHostFunction") {
              const ihf = body.invokeHostFunction();
              const hf = ihf.hostFunction();
              if (hf.switch() === xdr.HostFunctionType.hostFunctionTypeInvokeContract()) {
                const inv = hf.invokeContract();
                return {
                  operation: "invokeHostFunction",
                  contract: inv.contractAddress().toString(),
                  function: inv.functionName().toString(),
                  args: inv.args().map(scValToTree),
                };
              }
            }
            return { operation: name };
          }),
        };
      },
    },
    {
      label: "ScVal",
      fn: () => scValToTree(xdr.ScVal.fromXDR(trimmed, "base64")),
    },
    {
      label: "OperationResult",
      fn: () => {
        const r = xdr.OperationResult.fromXDR(trimmed, "base64");
        return { operationResult: r.switch().name };
      },
    },
    {
      label: "TransactionResult",
      fn: () => {
        const r = xdr.TransactionResult.fromXDR(trimmed, "base64");
        return { result: r.result().switch().name, feeCharged: String(r.feeCharged()) };
      },
    },
  ];

  for (const d of decoders) {
    try {
      return { tree: d.fn(), label: d.label };
    } catch { /* try next */ }
  }
  return { error: "Could not decode XDR. Ensure it is a valid Base64-encoded Soroban XDR string." };
}

function TreeView({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [collapsed, setCollapsed] = useState(false);
  const indent = depth * 16;

  if (typeof node === "string") {
    return <span style={{ color: "var(--green)" }}>{node}</span>;
  }

  if (Array.isArray(node)) {
    if (node.length === 0) return <span style={{ color: "var(--muted)" }}>[]</span>;
    return (
      <span>
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{ background: "none", color: "var(--accent)", padding: "0 4px", fontSize: 12, fontWeight: 400 }}
        >
          {collapsed ? "▶" : "▼"} [{node.length}]
        </button>
        {!collapsed && (
          <div style={{ marginLeft: indent + 16 }}>
            {node.map((item, i) => (
              <div key={i} style={{ marginTop: 2 }}>
                <span style={{ color: "var(--muted)", fontSize: 11 }}>[{i}] </span>
                <TreeView node={item} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </span>
    );
  }

  const entries = Object.entries(node);
  return (
    <div>
      {entries.map(([k, v]) => (
        <div key={k} style={{ marginTop: 4, marginLeft: indent }}>
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>{k}: </span>
          <TreeView node={v} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}

export default function XdrInspector() {
  const [input, setInput] = useState("");
  const decoded = input.trim() ? tryDecode(input) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="card">
        <h2 style={{ marginBottom: 8 }}>Base64 XDR Inspector</h2>
        <p style={{ color: "var(--muted)", marginBottom: 12, fontSize: 13 }}>
          Paste a raw Base64-encoded Soroban XDR string to inspect its internal structure.
        </p>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Paste Base64 XDR here…"
          rows={4}
          style={{
            width: "100%",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--text)",
            padding: "8px 10px",
            fontSize: 12,
            fontFamily: "monospace",
            resize: "vertical",
          }}
        />
      </div>

      {decoded && (
        <div className="card">
          {"error" in decoded ? (
            <p style={{ color: "#f85149", fontSize: 13 }}>{decoded.error}</p>
          ) : (
            <>
              <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span className="badge">{decoded.label}</span>
                <span style={{ color: "var(--muted)", fontSize: 12 }}>decoded successfully</span>
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 13, lineHeight: 1.6 }}>
                <TreeView node={decoded.tree} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
