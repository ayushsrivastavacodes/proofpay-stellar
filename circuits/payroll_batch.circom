pragma circom 2.2.2;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";

// Hackathon circuit sketch for ProofPay.
//
// Public inputs:
// - batchIdHash
// - batchCommitment
// - total
// - cap
// - assetHash
// - kycRoot
// - blockedRoot
//
// Private witness:
// - recipient ids / wallet ids
// - payout amounts
// - allowlist and blocked-list membership paths
//
// This source documents the Groth16-oriented circuit shape. The active
// implementation lives in noir/payroll_batch and wires Poseidon2 Merkle paths.

template PayrollBatch(MAX_RECIPIENTS) {
    signal input batchIdHash;
    signal input batchCommitment;
    signal input total;
    signal input cap;
    signal input assetHash;
    signal input kycRoot;
    signal input blockedRoot;

    signal input recipientId[MAX_RECIPIENTS];
    signal input amount[MAX_RECIPIENTS];
    signal input payoutSalt[MAX_RECIPIENTS];

    signal input kycLeaf[MAX_RECIPIENTS];
    signal input blockedAbsenceLeaf[MAX_RECIPIENTS];

    component amountLtCap[MAX_RECIPIENTS];
    component amountPositive[MAX_RECIPIENTS];
    component payoutHash[MAX_RECIPIENTS];

    var runningTotal = 0;

    for (var i = 0; i < MAX_RECIPIENTS; i++) {
        amountLtCap[i] = LessEqThan(64);
        amountLtCap[i].in[0] <== amount[i];
        amountLtCap[i].in[1] <== cap;
        amountLtCap[i].out === 1;

        amountPositive[i] = LessThan(64);
        amountPositive[i].in[0] <== 0;
        amountPositive[i].in[1] <== amount[i];
        amountPositive[i].out === 1;

        // Commitment to private payout row.
        payoutHash[i] = Poseidon(5);
        payoutHash[i].inputs[0] <== batchIdHash;
        payoutHash[i].inputs[1] <== recipientId[i];
        payoutHash[i].inputs[2] <== amount[i];
        payoutHash[i].inputs[3] <== assetHash;
        payoutHash[i].inputs[4] <== payoutSalt[i];

        // Policy binding scaffold for a future Groth16 version. The active
        // Noir circuit wires these as Merkle membership and blocked-null paths.
        kycLeaf[i] * kycRoot === kycLeaf[i] * kycRoot;
        blockedAbsenceLeaf[i] * blockedRoot === blockedAbsenceLeaf[i] * blockedRoot;

        runningTotal += amount[i];
    }

    runningTotal === total;

    // Placeholder batch commitment binding. Production version should compute a
    // Merkle root over payoutHash[*] and constrain it to batchCommitment.
    batchCommitment * batchIdHash === batchCommitment * batchIdHash;
}

component main { public [
    batchIdHash,
    batchCommitment,
    total,
    cap,
    assetHash,
    kycRoot,
    blockedRoot
] } = PayrollBatch(5);
