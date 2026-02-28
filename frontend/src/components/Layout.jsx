import React from "react";
import { Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext";

export default function Layout({ children }) {
  const { account, connect, disconnect, loading, error, isMonad } = useWallet();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-monad-border bg-monad-card/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-semibold text-xl text-monad-accent flex items-center gap-2">
            <span className="font-mono">Monad Escrow</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/" className="text-gray-400 hover:text-white transition">Home</Link>
            <Link to="/create" className="text-gray-400 hover:text-white transition">Create Project</Link>
            <Link to="/projects" className="text-gray-400 hover:text-white transition">My Projects</Link>
            <Link to="/disputes" className="text-gray-400 hover:text-white transition">Disputes</Link>
            <div className="flex items-center gap-3">
              {!account ? (
                <button
                  onClick={connect}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-monad-accent text-monad-dark font-medium hover:bg-monad-accentDim disabled:opacity-50 transition"
                >
                  {loading ? "Connecting…" : "Connect MetaMask"}
                </button>
              ) : (
                <>
                  {!isMonad && (
                    <span className="text-monad-warn text-sm">Switch to Monad Testnet</span>
                  )}
                  <span className="font-mono text-sm text-gray-400 max-w-[120px] truncate" title={account}>
                    {account.slice(0, 6)}…{account.slice(-4)}
                  </span>
                  <button
                    onClick={disconnect}
                    className="px-3 py-1.5 rounded-lg border border-monad-border text-gray-400 hover:text-white hover:border-monad-muted transition text-sm"
                  >
                    Disconnect
                  </button>
                </>
              )}
            </div>
          </nav>
        </div>
        {error && (
          <div className="max-w-5xl mx-auto px-4 py-2">
            <p className="text-monad-danger text-sm">{error}</p>
          </div>
        )}
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="border-t border-monad-border py-4 text-center text-gray-500 text-sm">
        Milestone-based freelance escrow on Monad Testnet · Chain ID 10143
      </footer>
    </div>
  );
}
