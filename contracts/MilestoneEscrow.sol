// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MilestoneEscrow
 * @notice Decentralized milestone-based freelance payment protocol for Monad
 * @dev Optimized for high-throughput: minimal storage writes, event-driven, no external calls in loops
 */
contract MilestoneEscrow is ReentrancyGuard, Ownable {
    // --- Types ---
    enum MilestoneStatus {
        Pending,
        Submitted,
        Approved,
        Disputed,
        Rejected
    }

    enum ProjectStatus {
        Active,
        Completed,
        Cancelled,
        Disputed
    }

    struct Milestone {
        string description;
        uint256 amount;
        MilestoneStatus status;
        uint256 submittedAt;
        string submissionProof; // IPFS hash or proof URL
    }

    struct Project {
        address client;
        address freelancer;
        string title;
        uint256 totalAmount;
        uint256 depositedAmount;
        ProjectStatus status;
        uint256 createdAt;
        uint256 milestoneCount;
        uint256 approvedMilestones;
    }

    struct Dispute {
        uint256 projectId;
        uint256 milestoneIndex;
        address raisedBy;
        string reason;
        uint256 raisedAt;
        bool resolved;
        bool clientWins; // true = client wins (reject), false = freelancer wins (approve)
    }

    // --- State ---
    uint256 public projectCounter;
    uint256 public disputeCounter;

    mapping(uint256 => Project) public projects;
    mapping(uint256 => mapping(uint256 => Milestone)) public projectMilestones;
    mapping(uint256 => Dispute) public disputes;

    // Optional: on-chain reputation (bonus)
    mapping(address => uint256) public completedProjects;
    mapping(address => uint256) public totalEarnings;

    // --- Events (transparency & indexing) ---
    event ProjectCreated(
        uint256 indexed projectId,
        address indexed client,
        address indexed freelancer,
        string title,
        uint256 totalAmount,
        uint256 milestoneCount
    );

    event FundsDeposited(uint256 indexed projectId, address indexed client, uint256 amount);

    event MilestoneSubmitted(
        uint256 indexed projectId,
        uint256 indexed milestoneIndex,
        string submissionProof
    );

    event MilestoneApproved(uint256 indexed projectId, uint256 indexed milestoneIndex, uint256 amount);

    event MilestoneRejected(uint256 indexed projectId, uint256 indexed milestoneIndex);

    event DisputeRaised(
        uint256 indexed disputeId,
        uint256 indexed projectId,
        uint256 milestoneIndex,
        address raisedBy,
        string reason
    );

    event DisputeResolved(
        uint256 indexed disputeId,
        uint256 projectId,
        uint256 milestoneIndex,
        bool clientWins
    );

    event ProjectCompleted(uint256 indexed projectId);
    event ProjectCancelled(uint256 indexed projectId);

    error InvalidAmount();
    error InvalidProject();
    error InvalidMilestone();
    error Unauthorized();
    error InvalidState();
    error InsufficientDeposit();
    error TransferFailed();

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Create a new project with milestones
     * @param _freelancer Address of the freelancer
     * @param _title Project title
     * @param _amounts Array of milestone amounts (wei)
     * @param _descriptions Array of milestone descriptions
     */
    function createProject(
        address _freelancer,
        string calldata _title,
        uint256[] calldata _amounts,
        string[] calldata _descriptions
    ) external returns (uint256 projectId) {
        if (_freelancer == address(0) || _amounts.length == 0 || _amounts.length != _descriptions.length) revert InvalidProject();

        uint256 total = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            if (_amounts[i] == 0) revert InvalidAmount();
            total += _amounts[i];
        }

        projectId = ++projectCounter;
        projects[projectId] = Project({
            client: msg.sender,
            freelancer: _freelancer,
            title: _title,
            totalAmount: total,
            depositedAmount: 0,
            status: ProjectStatus.Active,
            createdAt: block.timestamp,
            milestoneCount: _amounts.length,
            approvedMilestones: 0
        });

        for (uint256 i = 0; i < _amounts.length; i++) {
            projectMilestones[projectId][i] = Milestone({
                description: _descriptions[i],
                amount: _amounts[i],
                status: MilestoneStatus.Pending,
                submittedAt: 0,
                submissionProof: ""
            });
        }

        emit ProjectCreated(projectId, msg.sender, _freelancer, _title, total, _amounts.length);
        return projectId;
    }

    /**
     * @notice Deposit funds for a project (escrow)
     */
    function deposit(uint256 _projectId) external payable nonReentrant {
        Project storage p = projects[_projectId];
        if (p.client != msg.sender || p.status != ProjectStatus.Active) revert Unauthorized();
        if (p.depositedAmount + msg.value > p.totalAmount) revert InvalidAmount();

        p.depositedAmount += msg.value;
        emit FundsDeposited(_projectId, msg.sender, msg.value);
    }

    /**
     * @notice Freelancer submits a milestone as complete
     */
    function submitMilestone(uint256 _projectId, uint256 _milestoneIndex, string calldata _proof) external nonReentrant {
        Project storage p = projects[_projectId];
        if (p.freelancer != msg.sender || p.status != ProjectStatus.Active) revert Unauthorized();
        if (_milestoneIndex >= p.milestoneCount) revert InvalidMilestone();

        Milestone storage m = projectMilestones[_projectId][_milestoneIndex];
        if (m.status != MilestoneStatus.Pending) revert InvalidState();

        m.status = MilestoneStatus.Submitted;
        m.submittedAt = block.timestamp;
        m.submissionProof = _proof;

        emit MilestoneSubmitted(_projectId, _milestoneIndex, _proof);
    }

    /**
     * @notice Client approves a milestone — releases payment to freelancer
     */
    function approveMilestone(uint256 _projectId, uint256 _milestoneIndex) external nonReentrant {
        Project storage p = projects[_projectId];
        if (p.client != msg.sender || p.status != ProjectStatus.Active) revert Unauthorized();
        if (_milestoneIndex >= p.milestoneCount) revert InvalidMilestone();

        Milestone storage m = projectMilestones[_projectId][_milestoneIndex];
        if (m.status != MilestoneStatus.Submitted) revert InvalidState();

        m.status = MilestoneStatus.Approved;
        p.approvedMilestones++;
        uint256 amount = m.amount;

        if (p.depositedAmount < amount) revert InsufficientDeposit();
        p.depositedAmount -= amount;

        // Reputation & earnings
        completedProjects[p.freelancer]++;
        totalEarnings[p.freelancer] += amount;

        (bool ok,) = payable(p.freelancer).call{ value: amount }("");
        if (!ok) revert TransferFailed();

        emit MilestoneApproved(_projectId, _milestoneIndex, amount);

        if (p.approvedMilestones == p.milestoneCount) {
            p.status = ProjectStatus.Completed;
            emit ProjectCompleted(_projectId);
        }
    }

    /**
     * @notice Client rejects a submitted milestone (freelancer can re-submit later)
     */
    function rejectMilestone(uint256 _projectId, uint256 _milestoneIndex) external nonReentrant {
        Project storage p = projects[_projectId];
        if (p.client != msg.sender || p.status != ProjectStatus.Active) revert Unauthorized();
        if (_milestoneIndex >= p.milestoneCount) revert InvalidMilestone();

        Milestone storage m = projectMilestones[_projectId][_milestoneIndex];
        if (m.status != MilestoneStatus.Submitted) revert InvalidState();

        m.status = MilestoneStatus.Rejected;
        m.submissionProof = "";
        m.submittedAt = 0;

        emit MilestoneRejected(_projectId, _milestoneIndex);
    }

    /**
     * @notice Raise a dispute on a submitted milestone (client or freelancer)
     */
    function raiseDispute(uint256 _projectId, uint256 _milestoneIndex, string calldata _reason) external nonReentrant {
        Project storage p = projects[_projectId];
        if (msg.sender != p.client && msg.sender != p.freelancer) revert Unauthorized();
        if (p.status != ProjectStatus.Active) revert InvalidState();
        if (_milestoneIndex >= p.milestoneCount) revert InvalidMilestone();

        Milestone storage m = projectMilestones[_projectId][_milestoneIndex];
        if (m.status != MilestoneStatus.Submitted) revert InvalidState();

        m.status = MilestoneStatus.Disputed;
        p.status = ProjectStatus.Disputed;

        disputeCounter++;
        disputes[disputeCounter] = Dispute({
            projectId: _projectId,
            milestoneIndex: _milestoneIndex,
            raisedBy: msg.sender,
            reason: _reason,
            raisedAt: block.timestamp,
            resolved: false,
            clientWins: false
        });

        emit DisputeRaised(disputeCounter, _projectId, _milestoneIndex, msg.sender, _reason);
    }

    /**
     * @notice Resolve dispute (owner / future: DAO or arbitrator)
     * @param _clientWins true = reject milestone and unblock project; false = approve and pay freelancer
     */
    function resolveDispute(uint256 _disputeId, bool _clientWins) external onlyOwner nonReentrant {
        Dispute storage d = disputes[_disputeId];
        if (d.resolved) revert InvalidState();

        d.resolved = true;
        d.clientWins = _clientWins;

        Project storage p = projects[d.projectId];
        Milestone storage m = projectMilestones[d.projectId][d.milestoneIndex];

        if (_clientWins) {
            m.status = MilestoneStatus.Rejected;
            m.submissionProof = "";
            m.submittedAt = 0;
            p.status = ProjectStatus.Active;
            emit MilestoneRejected(d.projectId, d.milestoneIndex);
        } else {
            m.status = MilestoneStatus.Approved;
            p.approvedMilestones++;
            uint256 amount = m.amount;
            if (p.depositedAmount < amount) revert InsufficientDeposit();
            p.depositedAmount -= amount;
            completedProjects[p.freelancer]++;
            totalEarnings[p.freelancer] += amount;
            (bool ok,) = payable(p.freelancer).call{ value: amount }("");
            if (!ok) revert TransferFailed();
            p.status = ProjectStatus.Active;
            emit MilestoneApproved(d.projectId, d.milestoneIndex, amount);
            if (p.approvedMilestones == p.milestoneCount) {
                p.status = ProjectStatus.Completed;
                emit ProjectCompleted(d.projectId);
            }
        }

        emit DisputeResolved(_disputeId, d.projectId, d.milestoneIndex, _clientWins);
    }

    /**
     * @notice Client cancels project and withdraws uncommitted funds (only if no milestones submitted)
     */
    function cancelProject(uint256 _projectId) external nonReentrant {
        Project storage p = projects[_projectId];
        if (p.client != msg.sender || p.status != ProjectStatus.Active) revert Unauthorized();
        if (p.approvedMilestones > 0) revert InvalidState();

        for (uint256 i = 0; i < p.milestoneCount; i++) {
            if (projectMilestones[_projectId][i].status == MilestoneStatus.Submitted) revert InvalidState();
        }

        p.status = ProjectStatus.Cancelled;
        uint256 refund = p.depositedAmount;
        p.depositedAmount = 0;
        if (refund > 0) {
            (bool ok,) = payable(p.client).call{ value: refund }("");
            if (!ok) revert TransferFailed();
        }
        emit ProjectCancelled(_projectId);
    }

    /**
     * @notice Withdraw remaining deposit after project completion
     */
    function withdrawRemaining(uint256 _projectId) external nonReentrant {
        Project storage p = projects[_projectId];
        if (p.client != msg.sender) revert Unauthorized();
        if (p.status != ProjectStatus.Completed) revert InvalidState();
        if (p.depositedAmount == 0) revert InvalidAmount();

        uint256 amount = p.depositedAmount;
        p.depositedAmount = 0;
        (bool ok,) = payable(p.client).call{ value: amount }("");
        if (!ok) revert TransferFailed();
    }

    // --- View functions (gas-free for frontend) ---
    function getProject(uint256 _projectId) external view returns (
        address client,
        address freelancer,
        string memory title,
        uint256 totalAmount,
        uint256 depositedAmount,
        ProjectStatus status,
        uint256 createdAt,
        uint256 milestoneCount,
        uint256 approvedMilestones
    ) {
        Project storage p = projects[_projectId];
        return (
            p.client,
            p.freelancer,
            p.title,
            p.totalAmount,
            p.depositedAmount,
            p.status,
            p.createdAt,
            p.milestoneCount,
            p.approvedMilestones
        );
    }

    function getMilestone(uint256 _projectId, uint256 _index) external view returns (
        string memory description,
        uint256 amount,
        MilestoneStatus status,
        uint256 submittedAt,
        string memory submissionProof
    ) {
        Milestone storage m = projectMilestones[_projectId][_index];
        return (
            m.description,
            m.amount,
            m.status,
            m.submittedAt,
            m.submissionProof
        );
    }

    function getDispute(uint256 _disputeId) external view returns (
        uint256 projectId,
        uint256 milestoneIndex,
        address raisedBy,
        string memory reason,
        uint256 raisedAt,
        bool resolved,
        bool clientWins
    ) {
        Dispute storage d = disputes[_disputeId];
        return (
            d.projectId,
            d.milestoneIndex,
            d.raisedBy,
            d.reason,
            d.raisedAt,
            d.resolved,
            d.clientWins
        );
    }

    function getReputation(address _user) external view returns (uint256 completed, uint256 earnings) {
        return (completedProjects[_user], totalEarnings[_user]);
    }
}
