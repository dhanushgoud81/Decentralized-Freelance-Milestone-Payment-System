import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { humanizeTxError } from "../utils/txError";

export default function Disputes() {
  const { account, contract } = useWallet();
  const [disputes, setDisputes] = useState([]);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!contract) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const count = await contract.disputeCounter();
        const o = await contract.owner();
        setOwner(o?.toLowerCase());
        const list = [];
        for (let i = 1; i <= Number(count); i++) {
          const d = await contract.getDispute(i);
          if (!d.resolved) {
            list.push({
              id: i,
              projectId: Number(d.projectId),
              milestoneIndex: Number(d.milestoneIndex),
              raisedBy: d.raisedBy,
              reason: d.reason,
              raisedAt: Number(d.raisedAt),
            });
          }
        }
        setDisputes(list);
      } catch (e) {
        setDisputes([]);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [contract]);

  const resolve = async (disputeId, clientWins) => {
    if (!contract || resolving) return;
    setResolving(disputeId);
    setError(null);
    try {
      const tx = await contract.resolveDispute(disputeId, clientWins);
      await tx.wait();
      setDisputes((prev) => prev.filter((d) => d.id !== disputeId));
    } catch (e) {
      setError(humanizeTxError(e, "Resolve failed"));
    } finally {
      setResolving(null);
    }
  };

  if (!account) {
    return (
      <div className="rounded-xl border border-monad-border bg-monad-card p-8 text-center text-gray-400">
        Connect your wallet.
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="rounded-xl border border-monad-border bg-monad-card p-8 text-center text-monad-warn">
        Contract not configured.
      </div>
    );
  }

  const isOwner = owner && account.toLowerCase() === owner;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Disputes</h1>
      <p className="text-gray-400 text-sm mb-6">
        {isOwner ? "You are the contract owner. Resolve disputes below." : "Only the contract owner can resolve disputes."}
      </p>
      {error && <p className="text-monad-danger text-sm mb-4">{error}</p>}
      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : disputes.length === 0 ? (
        <div className="rounded-xl border border-monad-border bg-monad-card p-8 text-center text-gray-400">
          No open disputes.
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((d) => (
            <div key={d.id} className="rounded-xl border border-monad-border bg-monad-card p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-white">
                    Dispute #{d.id} · Project #{d.projectId} · Milestone #{d.milestoneIndex + 1}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">Raised by: <span className="font-mono">{d.raisedBy.slice(0, 10)}…</span></p>
                  <p className="text-sm text-gray-300 mt-1">{d.reason}</p>
                  <Link to={`/project/${d.projectId}`} className="text-monad-accent text-sm hover:underline mt-2 inline-block">View project →</Link>
                </div>
                {isOwner && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => resolve(d.id, true)}
                      disabled={resolving === d.id}
                      className="px-3 py-1.5 rounded-lg bg-monad-danger/20 text-monad-danger text-sm hover:bg-monad-danger/30 disabled:opacity-50"
                    >
                      {resolving === d.id ? "…" : "Client wins"}
                    </button>
                    <button
                      onClick={() => resolve(d.id, false)}
                      disabled={resolving === d.id}
                      className="px-3 py-1.5 rounded-lg bg-monad-accent/20 text-monad-accent text-sm hover:bg-monad-accent/30 disabled:opacity-50"
                    >
                      {resolving === d.id ? "…" : "Freelancer wins"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
