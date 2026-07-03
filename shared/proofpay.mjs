import crypto from "node:crypto";

const FIELD_MODULUS =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

export function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function fieldHash(value) {
  const digest = BigInt(`0x${sha256Hex(value)}`);
  return (digest % FIELD_MODULUS).toString();
}

export function leaf(value) {
  return fieldHash(`leaf:${value}`);
}

export function merkleRoot(values) {
  if (values.length === 0) return fieldHash("empty-tree");
  let level = values.map((value) => leaf(value));
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? level[i];
      next.push(fieldHash(`node:${left}:${right}`));
    }
    level = next;
  }
  return level[0];
}

export function payoutCommitment(payout, batchId) {
  return fieldHash(
    [
      "payout",
      batchId,
      payout.id,
      payout.stellarAddress,
      payout.amount,
      payout.country,
    ].join(":")
  );
}

export function batchCommitment(batch) {
  return merkleRoot(batch.payouts.map((payout) => payoutCommitment(payout, batch.batchId)));
}

export function publicSignals(batch, allowlist, blockedList) {
  const total = batch.payouts.reduce((sum, payout) => sum + payout.amount, 0);
  return {
    batchIdHash: fieldHash(`batch:${batch.batchId}`),
    batchCommitment: batchCommitment(batch),
    total,
    cap: batch.cap,
    assetHash: fieldHash(`asset:${batch.asset}`),
    kycRoot: merkleRoot(allowlist),
    blockedRoot: merkleRoot(blockedList),
  };
}

export function validateWitness(batch, allowlist, blockedList) {
  const allow = new Set(allowlist);
  const blocked = new Set(blockedList);
  const errors = [];

  for (const payout of batch.payouts) {
    if (!allow.has(payout.stellarAddress)) {
      errors.push(`${payout.id} is not in the KYC allowlist`);
    }
    if (blocked.has(payout.stellarAddress)) {
      errors.push(`${payout.id} is in the blocked list`);
    }
    if (!Number.isInteger(payout.amount) || payout.amount <= 0) {
      errors.push(`${payout.id} amount must be a positive integer`);
    }
    if (payout.amount > batch.cap) {
      errors.push(`${payout.id} exceeds cap ${batch.cap}`);
    }
  }

  if (!batch.batchId) errors.push("batchId is required");
  if (!batch.asset) errors.push("asset is required");
  return errors;
}

export function generateProof(batch, allowlist, blockedList) {
  const errors = validateWitness(batch, allowlist, blockedList);
  if (errors.length > 0) {
    const err = new Error("Payroll witness violates compliance constraints");
    err.errors = errors;
    throw err;
  }

  const signals = publicSignals(batch, allowlist, blockedList);
  const proofDigest = proofDigestForSignals(signals);
  return {
    proofSystem: "demo-groth16-placeholder",
    verifier: "ProofPayPayrollBatchCircuit-v0",
    proof: `0x${proofDigest}${sha256Hex(`seal:${proofDigest}`)}`,
    publicInputs: signals,
  };
}

export function proofDigestForSignals(signals) {
  return sha256Hex(JSON.stringify({ signals }));
}

export class ProofPayContractSimulator {
  constructor({ kycRoot, blockedRoot }) {
    this.kycRoot = kycRoot;
    this.blockedRoot = blockedRoot;
    this.usedBatches = new Set();
    this.acceptedBatches = [];
  }

  submitBatch(proofEnvelope) {
    const inputs = proofEnvelope.publicInputs;
    const expectedDigest = proofDigestForSignals(inputs);
    const expectedProof = `0x${expectedDigest}${sha256Hex(`seal:${expectedDigest}`)}`;
    if (proofEnvelope.proofSystem !== "demo-groth16-placeholder") {
      throw new Error("unsupported proof system");
    }
    if (inputs.kycRoot !== this.kycRoot) {
      throw new Error("KYC root mismatch");
    }
    if (inputs.blockedRoot !== this.blockedRoot) {
      throw new Error("blocked root mismatch");
    }
    if (this.usedBatches.has(inputs.batchIdHash)) {
      throw new Error("batch already submitted");
    }
    if (proofEnvelope.proof !== expectedProof) {
      throw new Error("malformed proof");
    }

    this.usedBatches.add(inputs.batchIdHash);
    const record = {
      batchIdHash: inputs.batchIdHash,
      batchCommitment: inputs.batchCommitment,
      total: inputs.total,
      cap: inputs.cap,
      acceptedAt: new Date().toISOString(),
    };
    this.acceptedBatches.push(record);
    return record;
  }
}

export function createDisclosureReceipt({ batch, payout, authority, purpose }) {
  const commitment = payoutCommitment(payout, batch.batchId);
  const contextHash = fieldHash(
    `disclosure:${batch.batchId}:${payout.id}:${authority}:${purpose}`
  );
  return {
    version: 1,
    circuit: "ProofPaySelectiveDisclosure-v0",
    context: {
      batchId: batch.batchId,
      authority,
      purpose,
      issuedAt: new Date().toISOString(),
    },
    publicInputs: {
      batchCommitment: batchCommitment(batch),
      payoutCommitment: commitment,
      contextHash,
    },
    disclosed: {
      recipientId: payout.id,
      recipientName: payout.name,
      country: payout.country,
      asset: batch.asset,
      amount: payout.amount,
    },
    proof: `0x${sha256Hex(`disclose:${commitment}:${contextHash}`)}`,
  };
}

export function verifyDisclosureReceipt(receipt, batch) {
  const expectedBatchCommitment = batchCommitment(batch);
  const payout = batch.payouts.find((item) => item.id === receipt.disclosed.recipientId);
  if (!payout) return false;
  const expectedPayoutCommitment = payoutCommitment(payout, batch.batchId);
  return (
    receipt.publicInputs.batchCommitment === expectedBatchCommitment &&
    receipt.publicInputs.payoutCommitment === expectedPayoutCommitment &&
    receipt.disclosed.amount === payout.amount &&
    receipt.proof ===
      `0x${sha256Hex(
        `disclose:${receipt.publicInputs.payoutCommitment}:${receipt.publicInputs.contextHash}`
      )}`
  );
}
