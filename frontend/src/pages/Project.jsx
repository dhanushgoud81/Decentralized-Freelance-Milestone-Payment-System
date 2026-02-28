import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { formatEther, parseEther } from "ethers";
import { useWallet } from "../context/WalletContext";
import { humanizeTxError } from "../utils/txError";

const MILESTONE_STATUS = ["Pending", "Submitted", "Approved", "Disputed", "Rejected"];
const PROJECT_STATUS = ["Active", "Completed", "Cancelled", "Disputed"];

export default function Project() {
  const { id } = useParams();
  const { account, contract } = useWallet();
  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState("");
  const [submitProof, setSubmitProof] = useState("");
  const [submitIndex, setSubmitIndex] = useState(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeIndex, setDisputeIndex] = useState(null);
  const [tx, setTx] = useState({ status: "idle", error: null });

  const projectId = id ? parseInt(id, 10) : 0;

  useEffect(() => {
    if (!contract || !projectId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const p = await contract.getProject(projectId);
        setProject({
          id: projectId,
          client: p.client,
          freelancer: p.freelancer,
          title: p.title,
          totalAmount: p.totalAmount,
          depositedAmount: p.depositedAmount,
          status: Number(p.status),
          milestoneCount: Number(p.milestoneCount),
          approvedMilestones: Number(p.approvedMilestones),
        });
        const list = [];
        for (let i = 0; i < Number(p.milestoneCount); i++) {
          const m = await contract.getMilestone(projectId, i);
          list.push({
            index: i,
            description: m.description,
            amount: m.amount,
            status: Number(m.status),
            submittedAt: m.submittedAt,
            submissionProof: m.submissionProof,
          });
        }
        setMilestones(list);
      } catch (_) {
        setProject(null);
        setMilestones([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [contract, projectId]);

  const isClient = account && project && project.client.toLowerCase() === account.toLowerCase();
  const isFreelancer = account && project && project.freelancer.toLowerCase() === account.toLowerCase();

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!contract || !isClient || !depositAmount) return;
    setTx({ status: "pending", error: null });
    try {
      const txResp = await contract.deposit(projectId, { value: parseEther(depositAmount) });
      await txResp.wait();
      setDepositAmount("");
      setTx({ status: "idle", error: null });
      const p = await contract.getProject(projectId);
      setProject((prev) => ({ ...prev, depositedAmount: p.depositedAmount }));
    } catch (err) {
      setTx({ status: "idle", error: humanizeTxError(err, "Deposit failed") });
    }
  };

  const handleSubmitMilestone = async (e) => {
    e.preventDefault();
    if (!contract || !isFreelancer || submitIndex == null || !submitProof) return;
    setTx({ status: "pending", error: null });
    try {
      const txResp = await contract.submitMilestone(projectId, submitIndex, submitProof);
      await txResp.wait();
      setSubmitProof("");
      setSubmitIndex(null);
      setTx({ status: "idle", error: null });
      const m = await contract.getMilestone(projectId, submitIndex);
      setMilestones((prev) =>
        prev.map((x, i) => (i === submitIndex ? { ...x, status: Number(m.status), submissionProof: m.submissionProof, submittedAt: m.submittedAt } : x))
      );
    } catch (err) {
      setTx({ status: "idle", error: humanizeTxError(err, "Submit failed") });
    }
  };

  const handleApprove = async (idx) => {
    if (!contract || !isClient) return;
    setTx({ status: "pending", error: null });
    try {
      const txResp = await contract.approveMilestone(projectId, idx);
      await txResp.wait();
      setTx({ status: "idle", error: null });
      const [p, m] = await Promise.all([contract.getProject(projectId), contract.getMilestone(projectId, idx)]);
      setProject((prev) => ({ ...prev, depositedAmount: p.depositedAmount, status: Number(p.status), approvedMilestones: Number(p.approvedMilestones) }));
      setMilestones((prev) => prev.map((x, i) => (i === idx ? { ...x, status: Number(m.status) } : x)));
    } catch (err) {
      setTx({ status: "idle", error: humanizeTxError(err, "Approve failed") });
    }
  };

  const handleReject = async (idx) => {
    if (!contract || !isClient) return;
    setTx({ status: "pending", error: null });
    try {
      const txResp = await contract.rejectMilestone(projectId, idx);
      await txResp.wait();
      setTx({ status: "idle", error: null });
      const m = await contract.getMilestone(projectId, idx);
      setMilestones((prev) => prev.map((x, i) => (i === idx ? { ...x, status: Number(m.status), submissionProof: "", submittedAt: 0n } : x)));
    } catch (err) {
      setTx({ status: "idle", error: humanizeTxError(err, "Reject failed") });
    }
  };

  const handleDispute = async (e) => {
    e.preventDefault();
    if (!contract || disputeIndex == null || !disputeReason) return;
    setTx({ status: "pending", error: null });
    try {
      const txResp = await contract.raiseDispute(projectId, disputeIndex, disputeReason);
      await txResp.wait();
      setDisputeReason("");
      setDisputeIndex(null);
      setTx({ status: "idle", error: null });
      const p = await contract.getProject(projectId);
      const m = await contract.getMilestone(projectId, disputeIndex);
      setProject((prev) => ({ ...prev, status: Number(p.status) }));
      setMilestones((prev) => prev.map((x, i) => (i === disputeIndex ? { ...x, status: Number(m.status) } : x)));
    } catch (err) {
      setTx({ status: "idle", error: humanizeTxError(err, "Dispute failed") });
    }
  };

  const handleCancel = async () => {
    if (!contract || !isClient) return;
    setTx({ status: "pending", error: null });
    try {
      const txResp = await contract.cancelProject(projectId);
      await txResp.wait();
      setTx({ status: "idle", error: null });
      const p = await contract.getProject(projectId);
      setProject((prev) => ({ ...prev, status: Number(p.status) }));
    } catch (err) {
      setTx({ status: "idle", error: humanizeTxError(err, "Cancel failed") });
    }
  };

  const handleWithdrawRemaining = async () => {
    if (!contract || !isClient) return;
    setTx({ status: "pending", error: null });
    try {
      const txResp = await contract.withdrawRemaining(projectId);
      await txResp.wait();
      setTx({ status: "idle", error: null });
      const p = await contract.getProject(projectId);
      setProject((prev) => ({ ...prev, depositedAmount: p.depositedAmount }));
    } catch (err) {
      setTx({ status: "idle", error: humanizeTxError(err, "Withdraw failed") });
    }
  };

  if (!account || !contract) {
    return (
      <div className="rounded-xl border border-monad-border bg-monad-card p-8 text-center text-gray-400">
        Connect wallet and ensure contract is configured.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-monad-border bg-monad-card p-8 text-center text-gray-400">
        Loading project…
      </div>
    );
  }

  if (!project) {
    return (
      <div className="rounded-xl border border-monad-border bg-monad-card p-8 text-center text-gray-400">
        Project not found.
      </div>
    );
  }

  const canDeposit = isClient && project.status === 0 && project.depositedAmount < project.totalAmount;
  const completed = project.status === 1;
  const hasRemaining = completed && project.depositedAmount > 0n;

  const nextAction = (() => {
    if (project.status === 1) return "Project completed. You can withdraw any remaining escrow.";
    if (project.status === 2) return "Project cancelled. No further actions are available.";
    if (project.status === 3) return "Project is disputed. Awaiting owner resolution.";
    if (isClient) {
      if (project.depositedAmount < project.totalAmount) return "Deposit funds to fully collateralize all milestones.";
      const hasSubmitted = milestones.some((m) => m.status === 1);
      if (hasSubmitted) return "Review submitted milestones and approve or reject.";
      return "Waiting for the freelancer to submit the next milestone.";
    }
    if (isFreelancer) {
      const nextPending = milestones.findIndex((m) => m.status === 0);
      if (nextPending >= 0) return `Submit proof for milestone #${nextPending + 1}.`;
      const awaitingApproval = milestones.some((m) => m.status === 1);
      if (awaitingApproval) return "Waiting for the client to approve submitted milestones.";
    }
    return null;
  })();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-white">{project.title}</h1>
          <p className="text-gray-400 mt-1">
            #{project.id} · {PROJECT_STATUS[project.status]}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="px-3 py-1 rounded-full text-sm bg-monad-border text-gray-300">
            {isClient ? "Viewing as client" : "Viewing as freelancer"}
          </span>
          {nextAction && (
            <p className="text-xs text-gray-400 max-w-xs text-right">
              Next: {nextAction}
            </p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-monad-border bg-monad-card p-4">
          <p className="text-sm text-gray-500">Client</p>
          <p className="font-mono text-sm text-white break-all">{project.client}</p>
        </div>
        <div className="rounded-xl border border-monad-border bg-monad-card p-4">
          <p className="text-sm text-gray-500">Freelancer</p>
          <p className="font-mono text-sm text-white break-all">{project.freelancer}</p>
        </div>
      </div>

      <div className="rounded-xl border border-monad-border bg-monad-card p-4 flex gap-6 flex-wrap">
        <div>
          <p className="text-sm text-gray-500">Total</p>
          <p className="font-mono text-monad-accent">{formatEther(project.totalAmount)} MON</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Deposited</p>
          <p className="font-mono">{formatEther(project.depositedAmount)} MON</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Milestones</p>
          <p className="font-mono">{project.approvedMilestones} / {project.milestoneCount}</p>
        </div>
      </div>

      {canDeposit && (
        <form onSubmit={handleDeposit} className="rounded-xl border border-monad-border bg-monad-card p-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">Deposit (MON)</label>
            <input
              type="text"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-monad-dark border border-monad-border text-white font-mono"
              placeholder="0.1"
            />
          </div>
          <button type="submit" disabled={tx.status === "pending"} className="px-4 py-2 rounded-lg bg-monad-accent text-monad-dark font-medium disabled:opacity-50">
            Deposit
          </button>
        </form>
      )}

      {hasRemaining && (
        <div className="rounded-xl border border-monad-border bg-monad-card p-4">
          <p className="text-sm text-gray-400 mb-2">Remaining in escrow: {formatEther(project.depositedAmount)} MON</p>
          <button onClick={handleWithdrawRemaining} disabled={tx.status === "pending"} className="px-4 py-2 rounded-lg bg-monad-accent text-monad-dark font-medium disabled:opacity-50">
            Withdraw remaining
          </button>
        </div>
      )}

      {isClient && project.status === 0 && project.approvedMilestones === 0 && (
        <button onClick={handleCancel} disabled={tx.status === "pending"} className="px-4 py-2 rounded-lg border border-monad-danger text-monad-danger hover:bg-monad-danger/10 disabled:opacity-50">
          Cancel project
        </button>
      )}

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Milestones</h2>
        <div className="space-y-3">
          {milestones.map((m) => (
            <div key={m.index} className="rounded-xl border border-monad-border bg-monad-card p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-white">{m.description}</p>
                  <p className="text-sm text-monad-accent font-mono">{formatEther(m.amount)} MON</p>
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-monad-border text-gray-300">
                    {MILESTONE_STATUS[m.status]}
                  </span>
                  {m.submissionProof && (
                    <p className="text-xs text-gray-500 mt-1 break-all">Proof: {m.submissionProof}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {isFreelancer && project.status === 0 && m.status === 0 && submitIndex === null && (
                    <button onClick={() => setSubmitIndex(m.index)} className="text-sm text-monad-accent hover:underline">
                      Submit
                    </button>
                  )}
                  {isClient && m.status === 1 && (
                    <>
                      <button onClick={() => handleApprove(m.index)} disabled={tx.status === "pending"} className="text-sm text-green-400 hover:underline disabled:opacity-50">
                        Approve
                      </button>
                      <button onClick={() => handleReject(m.index)} disabled={tx.status === "pending"} className="text-sm text-monad-danger hover:underline disabled:opacity-50">
                        Reject
                      </button>
                    </>
                  )}
                  {(isClient || isFreelancer) && project.status === 0 && m.status === 1 && disputeIndex === null && (
                    <button onClick={() => setDisputeIndex(m.index)} className="text-sm text-monad-warn hover:underline">
                      Dispute
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {submitIndex !== null && (
        <form onSubmit={handleSubmitMilestone} className="rounded-xl border border-monad-border bg-monad-card p-4 space-y-3">
          <h3 className="font-medium text-white">Submit milestone #{submitIndex + 1}</h3>
          <input
            type="text"
            value={submitProof}
            onChange={(e) => setSubmitProof(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-monad-dark border border-monad-border text-white"
            placeholder="Proof (e.g. IPFS hash or URL)"
            required
          />
          <div className="flex gap-2">
            <button type="submit" disabled={tx.status === "pending"} className="px-4 py-2 rounded-lg bg-monad-accent text-monad-dark font-medium disabled:opacity-50">
              Submit
            </button>
            <button type="button" onClick={() => { setSubmitIndex(null); setSubmitProof(""); }} className="px-4 py-2 rounded-lg border border-monad-border text-gray-400">
              Cancel
            </button>
          </div>
        </form>
      )}

      {disputeIndex !== null && (
        <form onSubmit={handleDispute} className="rounded-xl border border-monad-border bg-monad-card p-4 space-y-3">
          <h3 className="font-medium text-white">Raise dispute for milestone #{disputeIndex + 1}</h3>
          <input
            type="text"
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-monad-dark border border-monad-border text-white"
            placeholder="Reason for dispute"
            required
          />
          <div className="flex gap-2">
            <button type="submit" disabled={tx.status === "pending"} className="px-4 py-2 rounded-lg bg-monad-warn text-monad-dark font-medium disabled:opacity-50">
              Raise dispute
            </button>
            <button type="button" onClick={() => { setDisputeIndex(null); setDisputeReason(""); }} className="px-4 py-2 rounded-lg border border-monad-border text-gray-400">
              Cancel
            </button>
          </div>
        </form>
      )}

      {tx.error && <p className="text-monad-danger text-sm">{tx.error}</p>}
    </div>
  );
}
