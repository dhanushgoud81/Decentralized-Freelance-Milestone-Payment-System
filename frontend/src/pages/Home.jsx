import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatEther } from "ethers";
import { useWallet } from "../context/WalletContext";
import { ESCROW_CONTRACT_ADDRESS } from "../config";

export default function Home() {
  const { account, contract } = useWallet();
  const [reputation, setReputation] = useState({ completed: 0n, earnings: 0n });
  const [loadingRep, setLoadingRep] = useState(false);

  useEffect(() => {
    if (!contract || !account) {
      setReputation({ completed: 0n, earnings: 0n });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingRep(true);
        const [completed, earnings] = await contract.getReputation(account);
        if (!cancelled) setReputation({ completed, earnings });
      } catch {
        if (!cancelled) setReputation({ completed: 0n, earnings: 0n });
      } finally {
        if (!cancelled) setLoadingRep(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contract, account]);

  return (
    <div className="space-y-10">
      <section className="py-10 md:py-14 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1 space-y-4 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Milestone-based freelance payments
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto md:mx-0">
            Trustless escrow on Monad Testnet. Clients fund milestones up front, freelancers get paid automatically on approval.
          </p>
          <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-2">
            <Link
              to="/create"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-monad-accent text-monad-dark font-semibold text-sm hover:bg-monad-accentDim transition"
            >
              Create project
            </Link>
            <Link
              to="/projects"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-monad-border text-sm text-gray-200 hover:border-monad-accent hover:text-white transition"
            >
              View my projects
            </Link>
          </div>
          {!ESCROW_CONTRACT_ADDRESS && (
            <p className="mt-3 text-monad-warn text-sm">
              Deploy the contract and set <code className="font-mono bg-monad-card px-1.5 py-0.5 rounded">VITE_ESCROW_ADDRESS</code> in <span className="font-mono">frontend/.env</span>.
            </p>
          )}
        </div>

        <div className="flex-1 w-full max-w-md">
          <div className="rounded-2xl border border-monad-border bg-monad-card p-5 space-y-4 shadow-lg shadow-black/30">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Your stats</h2>
            {account ? (
              <>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span className="uppercase tracking-wide">Wallet</span>
                  <span className="font-mono text-gray-300 max-w-[160px] truncate">{account}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    label="Completed milestones"
                    value={loadingRep ? "…" : reputation.completed.toString()}
                  />
                  <StatCard
                    label="Total earned (MON)"
                    value={loadingRep ? "…" : formatEther(reputation.earnings)}
                  />
                </div>
              </>
            ) : (
              <p className="text-gray-400 text-sm">
                Connect your wallet to see reputation and activity across projects.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        <Card
          title="For clients"
          description="Define clear milestones, lock funds in escrow, and approve deliverables to release payment. Cancel safely if no work is submitted."
          action={
            <Link to="/create" className="text-monad-accent hover:underline text-sm">
              Create project →
            </Link>
          }
        />
        <Card
          title="For freelancers"
          description="Submit milestone proofs with links or IPFS hashes. Get paid instantly when the client approves on-chain."
          action={
            <Link to="/projects" className="text-monad-accent hover:underline text-sm">
              View assigned projects →
            </Link>
          }
        />
        <Card
          title="Disputes & safety"
          description="If something goes wrong, either side can raise a dispute. The owner resolves by releasing funds or resetting the milestone."
          action={
            <Link to="/disputes" className="text-monad-accent hover:underline text-sm">
              Review disputes →
            </Link>
          }
        />
      </section>

      {contract && (
        <section className="rounded-xl border border-monad-border bg-monad-card p-5 space-y-1 text-sm">
          <p className="text-gray-400">Connected to escrow contract:</p>
          <p className="font-mono text-xs text-gray-300 break-all">{ESCROW_CONTRACT_ADDRESS}</p>
        </section>
      )}
    </div>
  );
}

function Card({ title, description, action }) {
  return (
    <div className="rounded-xl border border-monad-border bg-monad-card p-6 flex flex-col">
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm flex-1">{description}</p>
      <div className="mt-4">{action}</div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-lg bg-monad-dark border border-monad-border px-3 py-2.5 text-xs">
      <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">{label}</div>
      <div className="text-sm font-semibold text-white truncate">{value}</div>
    </div>
  );
}
