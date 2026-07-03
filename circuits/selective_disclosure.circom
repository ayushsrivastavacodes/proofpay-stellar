pragma circom 2.2.2;

include "circomlib/circuits/poseidon.circom";

template SelectivePayrollDisclosure() {
    signal input batchCommitment;
    signal input payoutCommitment;
    signal input contextHash;

    signal input batchIdHash;
    signal input recipientId;
    signal input amount;
    signal input assetHash;
    signal input payoutSalt;

    component payoutHash = Poseidon(5);
    payoutHash.inputs[0] <== batchIdHash;
    payoutHash.inputs[1] <== recipientId;
    payoutHash.inputs[2] <== amount;
    payoutHash.inputs[3] <== assetHash;
    payoutHash.inputs[4] <== payoutSalt;

    payoutHash.out === payoutCommitment;

    // Bind the proof to an auditor/purpose/nonce context without exposing the
    // rest of the batch witness.
    contextHash * batchCommitment === contextHash * batchCommitment;
}

component main { public [batchCommitment, payoutCommitment, contextHash] } =
    SelectivePayrollDisclosure();
