import assert from "node:assert/strict";
import {
  ProofPayContractSimulator,
  createDisclosureReceipt,
  generateProof,
  merkleRoot,
  verifyDisclosureReceipt,
} from "../shared/proofpay.mjs";
import { blockedList, kycAllowlist, payrollBatch } from "../shared/sample-data.mjs";

const proof = generateProof(payrollBatch, kycAllowlist, blockedList);

assert.equal(proof.publicInputs.total, 4335);
assert.equal(proof.publicInputs.cap, 1200);
assert.equal(proof.publicInputs.kycRoot, merkleRoot(kycAllowlist));
assert.equal(proof.publicInputs.blockedRoot, merkleRoot(blockedList));

const contract = new ProofPayContractSimulator({
  kycRoot: merkleRoot(kycAllowlist),
  blockedRoot: merkleRoot(blockedList),
});

const accepted = contract.submitBatch(proof);
assert.equal(accepted.total, 4335);
assert.equal(contract.acceptedBatches.length, 1);

assert.throws(() => contract.submitBatch(proof), /batch already submitted/);

const freshContract = new ProofPayContractSimulator({
  kycRoot: merkleRoot(kycAllowlist),
  blockedRoot: merkleRoot(blockedList),
});
const tamperedProof = structuredClone(proof);
tamperedProof.publicInputs.total = 1;
assert.throws(() => freshContract.submitBatch(tamperedProof), /malformed proof/);

const malformedProof = structuredClone(proof);
malformedProof.proof = `${malformedProof.proof.slice(0, -1)}0`;
assert.throws(() => freshContract.submitBatch(malformedProof), /malformed proof/);

const blockedBatch = structuredClone(payrollBatch);
blockedBatch.payouts[0].stellarAddress = blockedList[0];
assert.throws(
  () => generateProof(blockedBatch, kycAllowlist, blockedList),
  /violates compliance constraints/
);

const oversizedBatch = structuredClone(payrollBatch);
oversizedBatch.payouts[0].amount = 5000;
assert.throws(
  () => generateProof(oversizedBatch, kycAllowlist, blockedList),
  /violates compliance constraints/
);

const receipt = createDisclosureReceipt({
  batch: payrollBatch,
  payout: payrollBatch.payouts[2],
  authority: "Acme Audit LLP",
  purpose: "quarterly-payroll-review",
});

assert.equal(verifyDisclosureReceipt(receipt, payrollBatch), true);

const tamperedReceipt = structuredClone(receipt);
tamperedReceipt.disclosed.amount = 1;
assert.equal(verifyDisclosureReceipt(tamperedReceipt, payrollBatch), false);

console.log("ProofPay E2E test passed");
