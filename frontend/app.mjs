const FIELD_MODULUS =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

const payrollBatch = {
  batchId: "2026-07-global-contractors",
  asset: "USDC",
  cap: 1200,
  payouts: [
    {
      id: "ctr-001",
      name: "Asha Rao",
      country: "IN",
      stellarAddress: "GASHA000000000000000000000000000000000000000000000000000",
      amount: 875,
    },
    {
      id: "ctr-002",
      name: "Luis Gomez",
      country: "MX",
      stellarAddress: "GLUIS00000000000000000000000000000000000000000000000000",
      amount: 640,
    },
    {
      id: "ctr-003",
      name: "Mina Park",
      country: "KR",
      stellarAddress: "GMINA00000000000000000000000000000000000000000000000000",
      amount: 990,
    },
    {
      id: "ctr-004",
      name: "Sam Okafor",
      country: "NG",
      stellarAddress: "GSAM000000000000000000000000000000000000000000000000000",
      amount: 720,
    },
    {
      id: "ctr-005",
      name: "Elena Ionescu",
      country: "RO",
      stellarAddress: "GELENA000000000000000000000000000000000000000000000000",
      amount: 1110,
    },
  ],
};

const allowlist = payrollBatch.payouts.map((payout) => payout.stellarAddress);
const blockedList = [
  "GBLOCKED0000000000000000000000000000000000000000000000000",
  "GSANCTIONED0000000000000000000000000000000000000000000000",
];

const state = {
  proof: null,
  submitted: false,
};

const $ = (id) => document.getElementById(id);

async function sha256Hex(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function fieldHash(value) {
  const digest = BigInt(`0x${await sha256Hex(value)}`);
  return (digest % FIELD_MODULUS).toString();
}

async function leaf(value) {
  return fieldHash(`leaf:${value}`);
}

async function merkleRoot(values) {
  if (values.length === 0) return fieldHash("empty-tree");
  let level = await Promise.all(values.map((value) => leaf(value)));
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? level[i];
      next.push(fieldHash(`node:${left}:${right}`));
    }
    level = await Promise.all(next);
  }
  return level[0];
}

async function payoutCommitment(payout, batchId) {
  return fieldHash(
    ["payout", batchId, payout.id, payout.stellarAddress, payout.amount, payout.country].join(":")
  );
}

async function batchCommitment(batch) {
  const commitments = await Promise.all(
    batch.payouts.map((payout) => payoutCommitment(payout, batch.batchId))
  );
  return merkleRoot(commitments);
}

function shortHash(value) {
  if (!value || value === "-") return value;
  return `${value.slice(0, 12)}...${value.slice(-8)}`;
}

function validateWitness(batch) {
  const allow = new Set(allowlist);
  const blocked = new Set(blockedList);
  return batch.payouts.every(
    (payout) =>
      allow.has(payout.stellarAddress) &&
      !blocked.has(payout.stellarAddress) &&
      payout.amount > 0 &&
      payout.amount <= batch.cap
  );
}

async function publicSignals(batch) {
  return {
    batchIdHash: await fieldHash(`batch:${batch.batchId}`),
    batchCommitment: await batchCommitment(batch),
    total: batch.payouts.reduce((sum, payout) => sum + payout.amount, 0),
    cap: batch.cap,
    assetHash: await fieldHash(`asset:${batch.asset}`),
    kycRoot: await merkleRoot(allowlist),
    blockedRoot: await merkleRoot(blockedList),
  };
}

async function generateProof() {
  if (!validateWitness(payrollBatch)) throw new Error("invalid witness");
  const inputs = await publicSignals(payrollBatch);
  const proofDigest = await sha256Hex(JSON.stringify({ signals: inputs }));
  return {
    proofSystem: "demo-groth16-placeholder",
    verifier: "ProofPayPayrollBatchCircuit-v0",
    proof: `0x${proofDigest}${await sha256Hex(`seal:${proofDigest}`)}`,
    publicInputs: inputs,
  };
}

async function createDisclosureReceipt(payout) {
  const commitment = await payoutCommitment(payout, payrollBatch.batchId);
  const batchRoot = await batchCommitment(payrollBatch);
  const contextHash = await fieldHash(
    `disclosure:${payrollBatch.batchId}:${payout.id}:Acme Audit LLP:quarterly-payroll-review`
  );
  return {
    version: 1,
    circuit: "ProofPaySelectiveDisclosure-v0",
    context: {
      batchId: payrollBatch.batchId,
      authority: "Acme Audit LLP",
      purpose: "quarterly-payroll-review",
      issuedAt: new Date().toISOString(),
    },
    publicInputs: {
      batchCommitment: batchRoot,
      payoutCommitment: commitment,
      contextHash,
    },
    disclosed: {
      recipientId: payout.id,
      recipientName: payout.name,
      country: payout.country,
      asset: payrollBatch.asset,
      amount: payout.amount,
    },
    proof: `0x${await sha256Hex(`disclose:${commitment}:${contextHash}`)}`,
  };
}

function renderRows() {
  $("payroll-body").innerHTML = payrollBatch.payouts
    .map(
      (payout) => `
      <tr>
        <td><strong>${payout.name}</strong><br><code>${payout.id}</code></td>
        <td>${payout.country}</td>
        <td><code>${payout.stellarAddress.slice(0, 8)}...${payout.stellarAddress.slice(-5)}</code></td>
        <td><span class="masked">${payout.amount}</span></td>
        <td><span class="ok">KYC + clear</span></td>
      </tr>`
    )
    .join("");
}

async function renderInitial() {
  renderRows();
  const inputs = await publicSignals(payrollBatch);
  $("batch-id").textContent = payrollBatch.batchId;
  $("total").textContent = `${inputs.total} ${payrollBatch.asset}`;
  $("cap").textContent = `${payrollBatch.cap} ${payrollBatch.asset}`;
  $("count").textContent = String(payrollBatch.payouts.length);
  $("kyc-root").textContent = shortHash(inputs.kycRoot);
  $("blocked-root").textContent = shortHash(inputs.blockedRoot);
  $("batch-root").textContent = shortHash(inputs.batchCommitment);
}

$("prove-button").addEventListener("click", async () => {
  $("prove-button").disabled = true;
  $("proof-seal").textContent = "Generating...";
  state.proof = await generateProof();
  $("proof-seal").textContent = `${state.proof.proof.slice(0, 18)}...${state.proof.proof.slice(-12)}`;
  $("step-proof").classList.add("active");
  $("submit-button").disabled = false;
});

$("submit-button").addEventListener("click", () => {
  if (!state.proof) return;
  state.submitted = true;
  $("batch-state").textContent = "Accepted";
  $("batch-state").classList.add("done");
  $("step-chain").classList.add("active");
  $("submit-button").disabled = true;
  $("receipt-button").disabled = false;
});

$("receipt-button").addEventListener("click", async () => {
  const receipt = await createDisclosureReceipt(payrollBatch.payouts[0]);
  $("receipt-output").textContent = JSON.stringify(receipt, null, 2);
});

renderInitial();
