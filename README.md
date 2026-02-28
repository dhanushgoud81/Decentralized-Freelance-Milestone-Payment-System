# Monad Milestone Escrow — Decentralized Freelance Payments

**Trustless milestone-based freelance escrow on Monad Testnet.** Clients fund milestones, freelancers submit proofs, payments release on approval. Built for [Monad Blitz Mumbai](https://github.com/monad-developers/monad-blitz-mumbai).

A **milestone-based freelance payment protocol** on **Monad Testnet**: clients create projects with milestones, lock funds in escrow, freelancers submit work, and clients approve to release payment. Includes optional **dispute resolution** (owner-resolved) and **on-chain reputation** (completed projects + total earnings).

## Architecture

```
React Frontend (Tailwind, Ethers.js)
         ↓
    MetaMask / Wallet
         ↓
MilestoneEscrow.sol (Solidity, OpenZeppelin)
         ↓
   Monad Testnet (Chain ID 10143)
```

- **Smart contract**: Solidity 0.8.24, ReentrancyGuard + Ownable (OpenZeppelin v5), events for transparency.
- **Tooling**: Hardhat (compile, test, deploy).
- **Frontend**: React, Vite, Tailwind CSS, Ethers.js v6, MetaMask.

## Quick Start

### 1. Install and compile

```bash
npm install
npm run compile
```

### 2. Run tests

```bash
npm test
```

### 3. Deploy to Monad Testnet

Create a `.env` in the project root (optional):

```env
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
PRIVATE_KEY=your_deployer_private_key
```

Then:

```bash
npm run deploy
```

Save the printed **MilestoneEscrow** contract address.

### 4. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_ESCROW_ADDRESS=<deployed_contract_address>
```

Start dev server:

```bash
npm run dev
```

Open http://localhost:3000, connect MetaMask, and ensure you’re on **Monad Testnet** (Chain ID 10143). Add the network if needed (RPC: `https://testnet-rpc.monad.xyz`).

## Contract Summary

| Action | Who | Function |
|--------|-----|----------|
| Create project | Client | `createProject(freelancer, title, amounts[], descriptions[])` |
| Lock funds | Client | `deposit(projectId)` with `msg.value` |
| Submit milestone | Freelancer | `submitMilestone(projectId, index, proof)` |
| Approve / release | Client | `approveMilestone(projectId, index)` |
| Reject | Client | `rejectMilestone(projectId, index)` |
| Dispute | Client or Freelancer | `raiseDispute(projectId, index, reason)` |
| Resolve dispute | Owner | `resolveDispute(disputeId, clientWins)` |
| Cancel project | Client | `cancelProject(projectId)` (only if no submitted milestones) |
| Withdraw remaining | Client | `withdrawRemaining(projectId)` (after project completed) |

- **Reentrancy**: Protected with OpenZeppelin `ReentrancyGuard`.
- **Events**: `ProjectCreated`, `FundsDeposited`, `MilestoneSubmitted`, `MilestoneApproved`, `MilestoneRejected`, `DisputeRaised`, `DisputeResolved`, `ProjectCompleted`, `ProjectCancelled`.

## Optional: Reputation

The contract stores per-address:

- `completedProjects`: number of milestones paid out (as freelancer).
- `totalEarnings`: total MON received.

Use `getReputation(address)` to power leaderboards or badges in the UI.

## Networks

- **Monad Testnet**: Chain ID `10143`, RPC `https://testnet-rpc.monad.xyz`, Explorer e.g. `https://testnet.monadscan.com`.

## License

MIT
