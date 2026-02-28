import { Interface } from "ethers";
import { ESCROW_ABI } from "../abi";

const iface = new Interface(ESCROW_ABI);

export function humanizeTxError(err, fallback = "Transaction failed") {
  const data = err?.error?.data || err?.data || err?.info?.error?.data;

  if (typeof data === "string" && data.startsWith("0x")) {
    try {
      const decoded = iface.parseError(data);
      switch (decoded?.name) {
        case "InvalidProject":
          return "Invalid project. Check freelancer address and milestones.";
        case "InvalidAmount":
          return "Invalid amount. Check milestone amounts and deposit.";
        case "InsufficientDeposit":
          return "Not enough MON deposited for this milestone.";
        case "Unauthorized":
          return "Your wallet is not allowed to perform this action.";
        case "InvalidState":
          return "This action isn’t allowed in the current project/milestone state.";
        case "InvalidMilestone":
          return "That milestone index doesn’t exist.";
        default:
          break;
      }
    } catch {
      // ignore
    }
  }

  return err?.shortMessage || err?.message || fallback;
}

