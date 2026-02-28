import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { formatEther } from "ethers";
import { useWallet } from "../context/WalletContext";

const STATUS_LABELS = ["Active", "Completed", "Cancelled", "Disputed"];

export default function MyProjects() {
  const { account, contract } = useWallet();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contract) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const count = await contract.projectCounter();
        const list = [];
        for (let i = 1; i <= Number(count); i++) {
          if (cancelled) break;
          try {
            const p = await contract.getProject(i);
            const isClient = p.client.toLowerCase() === account?.toLowerCase();
            const isFreelancer = p.freelancer.toLowerCase() === account?.toLowerCase();
            if (isClient || isFreelancer) {
              list.push({
                id: i,
                client: p.client,
                freelancer: p.freelancer,
                title: p.title,
                totalAmount: p.totalAmount,
                depositedAmount: p.depositedAmount,
                status: Number(p.status),
                milestoneCount: Number(p.milestoneCount),
                approvedMilestones: Number(p.approvedMilestones),
                isClient,
                isFreelancer,
              });
            }
          } catch (_) {}
        }
        if (!cancelled) setProjects(list.reverse());
      } catch (_) {
        setProjects([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [contract, account]);

  const asClient = projects.filter((p) => p.isClient).length;
  const asFreelancer = projects.filter((p) => p.isFreelancer).length;

  if (!account) {
    return (
      <div className="rounded-xl border border-monad-border bg-monad-card p-8 text-center text-gray-400">
        Connect your wallet to see your projects.
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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 bg-monad-card/60 rounded animate-pulse" />
        <div className="space-y-3">
          <div className="h-20 rounded-xl bg-monad-card/60 animate-pulse" />
          <div className="h-20 rounded-xl bg-monad-card/60 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My projects</h1>
          <p className="text-sm text-gray-400 mt-1">
            Overview of every project where you are a client or freelancer.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="px-3 py-2 rounded-lg bg-monad-card border border-monad-border text-xs text-gray-300">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">As client</div>
            <div className="font-semibold text-white text-sm">{asClient}</div>
          </div>
          <div className="px-3 py-2 rounded-lg bg-monad-card border border-monad-border text-xs text-gray-300">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">As freelancer</div>
            <div className="font-semibold text-white text-sm">{asFreelancer}</div>
          </div>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-monad-border bg-monad-card p-8 text-center space-y-3">
          <h2 className="text-lg font-semibold text-white">No projects yet</h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Create your first project as a client, or share your freelancer address with clients to be added to their projects.
          </p>
          <Link
            to="/create"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-monad-accent text-monad-dark text-sm font-medium hover:bg-monad-accentDim transition"
          >
            Create project
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((p) => (
            <Link
              key={p.id}
              to={`/project/${p.id}`}
              className="block rounded-xl border border-monad-border bg-monad-card p-4 hover:border-monad-accent/60 hover:bg-monad-card/90 transition"
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="font-semibold text-white">{p.title}</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {p.approvedMilestones}/{p.milestoneCount} milestones · {formatEther(p.totalAmount)} MON
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-monad-border text-gray-300">
                      {p.isClient ? "Client" : "Freelancer"}
                    </span>
                    <span
                      className="inline-flex items-center text-xs px-2 py-0.5 rounded-full
                      bg-monad-border text-gray-300"
                    >
                      {STATUS_LABELS[p.status]}
                    </span>
                  </div>
                </div>
                <span className="text-monad-accent text-sm">View →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
