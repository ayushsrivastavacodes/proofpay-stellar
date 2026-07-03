import {
  ProofPayContractSimulator,
  createDisclosureReceipt,
  generateProof,
  merkleRoot,
  verifyDisclosureReceipt,
} from "../shared/proofpay.mjs";
import { blockedList, employer, kycAllowlist, payrollBatch } from "../shared/sample-data.mjs";

const proof = generateProof(payrollBatch, kycAllowlist, blockedList);
const contract = new ProofPayContractSimulator({
  kycRoot: merkleRoot(kycAllowlist),
  blockedRoot: merkleRoot(blockedList),
});
const accepted = contract.submitBatch(proof);
const receipt = createDisclosureReceipt({
  batch: payrollBatch,
  payout: payrollBatch.payouts[0],
  authority: "Acme Audit LLP",
  purpose: "contractor-payment-sample",
});

console.log("ProofPay walkthrough");
console.log("--------------------");
console.log(`Employer: ${employer.name}`);
console.log(`Batch: ${payrollBatch.batchId}`);
console.log(`Asset: ${payrollBatch.asset}`);
console.log(`Recipients: ${payrollBatch.payouts.length}`);
console.log(`Public total: ${proof.publicInputs.total} ${payrollBatch.asset}`);
console.log(`KYC root: ${proof.publicInputs.kycRoot}`);
console.log(`Blocked root: ${proof.publicInputs.blockedRoot}`);
console.log(`Batch commitment: ${proof.publicInputs.batchCommitment}`);
console.log(`Proof: ${proof.proof.slice(0, 34)}...`);
console.log("");
console.log("Contract accepted batch:");
console.log(JSON.stringify(accepted, null, 2));
console.log("");
console.log("Disclosure receipt verifies:");
console.log(verifyDisclosureReceipt(receipt, payrollBatch));
console.log(JSON.stringify(receipt, null, 2));
