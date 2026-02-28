import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { parseEther } from "ethers";
import { useWallet } from "../context/WalletContext";
import { humanizeTxError } from "../utils/txError";

const MIN_MILESTONES = 1;
const MAX_MILESTONES = 10;

export default function CreateProject() {
  const { account, contract } = useWallet();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [freelancerAddress, setFreelancerAddress] = useState("");
  const [milestones, setMilestones] = useState([
    { description: "", amount: "" },
  ]);
  const [tx, setTx] = useState({ status: "idle", hash: null, error: null });

  const addMilestone = () => {
    if (milestones.length >= MAX_MILESTONES) return;
    setMilestones([...milestones, { description: "", amount: "" }]);
  };

  const removeMilestone = (i) => {
    if (milestones.length <= MIN_MILESTONES) return;
    setMilestones(milestones.filter((_, j) => j !== i));
  };

  const updateMilestone = (i, field, value) => {
    const next = [...milestones];
    next[i] = { ...next[i], [field]: value };
    setMilestones(next);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!contract || !account) return;
    setTx({ status: "pending", hash: null, error: null });
    try {
      const amounts = milestones.map((m) => parseEther(m.amount || "0"));
      const descriptions = milestones.map((m) => m.description || "Milestone");
      const invalid = amounts.some((a) => a === 0n);
      if (invalid) {
        setTx({ status: "idle", hash: null, error: "Each milestone must have amount > 0" });
        return;
      }
      const txResp = await contract.createProject(
        freelancerAddress,
        title,
        amounts,
        descriptions
      );
      setTx({ status: "pending", hash: txResp.hash, error: null });
      const rec = await txResp.wait();
      const projectId = rec?.logs?.[0]?.topics?.[1]
        ? parseInt(rec.logs[0].topics[1], 16)
        : null;
      setTx({ status: "success", hash: txResp.hash, error: null });
      if (projectId != null) navigate(`/project/${projectId}`);
      else navigate("/projects");
    } catch (err) {
      setTx({ status: "idle", hash: null, error: humanizeTxError(err, "Transaction failed") });
    }
  };

  if (!account) {
    return (
      <div className="rounded-xl border border-monad-border bg-monad-card p-8 text-center text-gray-400">
        Connect your wallet to create a project.
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="rounded-xl border border-monad-border bg-monad-card p-8 text-center text-monad-warn">
        Contract not configured. Set VITE_ESCROW_ADDRESS and redeploy.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Create project</h1>
      <form onSubmit={submit} className="space-y-6 rounded-xl border border-monad-border bg-monad-card p-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Project title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-monad-dark border border-monad-border text-white placeholder-gray-500 focus:ring-2 focus:ring-monad-accent focus:border-transparent"
            placeholder="e.g. Landing page + API"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Freelancer address</label>
          <input
            type="text"
            value={freelancerAddress}
            onChange={(e) => setFreelancerAddress(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-monad-dark border border-monad-border text-white font-mono placeholder-gray-500 focus:ring-2 focus:ring-monad-accent focus:border-transparent"
            placeholder="0x..."
            required
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-300">Milestones</label>
            <button
              type="button"
              onClick={addMilestone}
              disabled={milestones.length >= MAX_MILESTONES}
              className="text-sm text-monad-accent hover:underline disabled:opacity-50"
            >
              + Add milestone
            </button>
          </div>
          <div className="space-y-4">
            {milestones.map((m, i) => (
              <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-monad-dark border border-monad-border">
                <span className="text-gray-500 font-mono text-sm pt-2">{i + 1}.</span>
                <div className="flex-1 grid gap-2">
                  <input
                    type="text"
                    value={m.description}
                    onChange={(e) => updateMilestone(i, "description", e.target.value)}
                    className="w-full px-3 py-2 rounded bg-monad-card border border-monad-border text-white text-sm placeholder-gray-500"
                    placeholder="Description"
                  />
                  <input
                    type="text"
                    value={m.amount}
                    onChange={(e) => updateMilestone(i, "amount", e.target.value)}
                    className="w-full px-3 py-2 rounded bg-monad-card border border-monad-border text-white text-sm font-mono placeholder-gray-500"
                    placeholder="Amount (MON)"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeMilestone(i)}
                  disabled={milestones.length <= MIN_MILESTONES}
                  className="text-monad-danger text-sm hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {tx.error && (
          <p className="text-monad-danger text-sm">{tx.error}</p>
        )}
        {tx.hash && (
          <p className="text-monad-accent text-sm">
            Tx: {tx.hash.slice(0, 10)}…{tx.hash.slice(-8)}
          </p>
        )}

        <button
          type="submit"
          disabled={tx.status === "pending"}
          className="w-full py-3 rounded-lg bg-monad-accent text-monad-dark font-semibold hover:bg-monad-accentDim disabled:opacity-50 transition"
        >
          {tx.status === "pending" ? "Creating…" : "Create project"}
        </button>
      </form>
    </div>
  );
}
