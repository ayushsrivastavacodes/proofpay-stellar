# Demo Script

Target length: 2-3 minutes.

## 1. Problem

ProofPay is a confidential payout console for Stellar stablecoin payments.

Many real-world payout flows need privacy: contractor payroll, supplier payments, grants, aid disbursements, and institutional settlement. Public blockchains make every transaction visible, but businesses still need to prove compliance.

ProofPay keeps individual payout amounts private while proving the batch follows policy.

## 2. Product Walkthrough

Open:

```text
http://127.0.0.1:4173/
```

Show the landing page and explain:

- the category is confidential payouts
- payroll is the first use case
- Stellar is the settlement layer
- ZK proves policy without exposing the payout table

Then open:

```text
http://127.0.0.1:4173/app
```

Show:

- total payout is public
- individual amounts are hidden
- KYC root and blocked-list root are public
- cap and total are public policy inputs
- batch rows remain private

## 3. Proof Flow

Click `Generate proof`.

Explain that the local app validates the product flow, while the repo also includes a real Noir proof path.

Click `Submit batch`.

Show the accepted state and proof pipeline.

Click the auditor receipt button.

Explain selective disclosure: one payout can be revealed to an auditor without revealing the entire batch.

## 4. Real ZK Artifacts

Show the terminal:

```bash
npm run proof:noir
```

Explain:

- Noir circuit witness is solved
- Barretenberg generates an UltraHonk proof
- `bb verify` verifies the proof
- proof, public inputs, and verifying key are exported under `artifacts/noir/payroll_batch`

## 5. Stellar Contract

Show:

```bash
npm run contract:build
```

Explain:

- ProofPay contract compiles to Soroban wasm
- contract stores compliance roots
- contract prevents replay with used batch hashes
- contract calls a verifier adapter for proof verification

## 6. Close

ProofPay is aligned with Stellar's real-world focus: stablecoin payments, payroll, compliance-ready privacy, and ZK proof verification on Soroban.

The next step is deploying a Stellar UltraHonk verifier contract on testnet and connecting this payout console to wallet/RPC.
