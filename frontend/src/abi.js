// ABI for MilestoneEscrow (essential functions + events)
const ESCROW_ABI = [
  "function createProject(address _freelancer, string _title, uint256[] _amounts, string[] _descriptions) external returns (uint256)",
  "function deposit(uint256 _projectId) external payable",
  "function submitMilestone(uint256 _projectId, uint256 _milestoneIndex, string _proof) external",
  "function approveMilestone(uint256 _projectId, uint256 _milestoneIndex) external",
  "function rejectMilestone(uint256 _projectId, uint256 _milestoneIndex) external",
  "function raiseDispute(uint256 _projectId, uint256 _milestoneIndex, string _reason) external",
  "function resolveDispute(uint256 _disputeId, bool _clientWins) external",
  "function cancelProject(uint256 _projectId) external",
  "function withdrawRemaining(uint256 _projectId) external",
  "function getProject(uint256 _projectId) external view returns (address client, address freelancer, string title, uint256 totalAmount, uint256 depositedAmount, uint8 status, uint256 createdAt, uint256 milestoneCount, uint256 approvedMilestones)",
  "function getMilestone(uint256 _projectId, uint256 _index) external view returns (string description, uint256 amount, uint8 status, uint256 submittedAt, string submissionProof)",
  "function getDispute(uint256 _disputeId) external view returns (uint256 projectId, uint256 milestoneIndex, address raisedBy, string reason, uint256 raisedAt, bool resolved, bool clientWins)",
  "function getReputation(address _user) external view returns (uint256 completed, uint256 earnings)",
  "function projectCounter() external view returns (uint256)",
  "function disputeCounter() external view returns (uint256)",
  "function owner() external view returns (address)",
  "event ProjectCreated(uint256 indexed projectId, address indexed client, address indexed freelancer, string title, uint256 totalAmount, uint256 milestoneCount)",
  "event FundsDeposited(uint256 indexed projectId, address indexed client, uint256 amount)",
  "event MilestoneSubmitted(uint256 indexed projectId, uint256 indexed milestoneIndex, string submissionProof)",
  "event MilestoneApproved(uint256 indexed projectId, uint256 indexed milestoneIndex, uint256 amount)",
  "event MilestoneRejected(uint256 indexed projectId, uint256 indexed milestoneIndex)",
  "event DisputeRaised(uint256 indexed disputeId, uint256 indexed projectId, uint256 milestoneIndex, address raisedBy, string reason)",
  "event ProjectCompleted(uint256 indexed projectId)",
  "event ProjectCancelled(uint256 indexed projectId)",
];

export { ESCROW_ABI };
export function getAbi() {
  return ESCROW_ABI;
}
