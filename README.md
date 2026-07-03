# ProofPay

Compliance-private payroll on Stellar.

ProofPay lets an employer submit a stablecoin payroll batch where individual
salary amounts stay private. The browser demo is runnable without RPC, the Noir
circuit generates a real UltraHonk proof, and the Soroban contract compiles to a
Stellar wasm adapter that can call an on-chain proof verifier.

## What the ZK proof proves

For a private payroll batch, the proof binds these public claims:

- hidden payout amounts sum to the public batch total
- every recipient is in the KYC-approved Merkle root
- no recipient appears in the blocked-list Merkle root
- every payout is positive and below the configured cap
- the batch id has not been used before
- disclosure receipts can reveal selected payouts to an auditor without exposing
  the whole batch

## Repo layout

```text
artifacts/             Generated Noir proof, public inputs, and verifying key
circuits/              Circom circuit sketches for the payroll proof
contracts/proofpay/    Soroban contract source
frontend/              Static browser demo
noir/payroll_batch/    Real Noir payroll proof circuit
scripts/               Local demo, test, and server scripts
shared/                Deterministic proof engine and sample data
```

## Run the local demo

```bash
npm test
npm run demo
npm run proof:noir
npm run contract:build
npm run serve
```

Open http://localhost:4173 after `npm run serve`.

The local UI demo uses a deterministic proof envelope so judges can run it
without a Stellar RPC. `npm run proof:noir` generates and verifies a real
Noir/UltraHonk proof, then exports the proof, public inputs, and verifying key
to `artifacts/noir/payroll_batch`. `npm run contract:build` compiles the
ProofPay Soroban contract to wasm.

## Verification status

See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for the exact split
between executable demo code and source-level Stellar/Circom scaffolding.

## Real Stellar integration path

1. Deploy a Noir UltraHonk verifier contract on Stellar, using the generated
   verifying key from `artifacts/noir/payroll_batch/vk`.
2. Deploy `contracts/proofpay` with that verifier address and compliance roots.
3. Submit `artifacts/noir/payroll_batch/proof` and the matching public inputs to
   `submit_batch`.
4. For a fuller privacy-pool version, replace the simple Noir policy-root
   checks with Merkle membership/non-membership constraints from the Circom
   sketches and Stellar Private Payments references.

## Demo narrative

1. Employer uploads a payroll batch.
2. ProofPay computes KYC and blocked-list roots.
3. The app generates a proof locally.
4. The contract simulator verifies the proof and records the batch.
5. Auditor verifies a selective disclosure receipt for one payout.

## Security note

This is hackathon software. The local browser proof envelope is not
cryptographic ZK; it exists to make the E2E product flow runnable without wallet
or RPC setup. The Noir proof path is real, but production use still requires a
complete verifier deployment, audited circuits, audited contracts, and careful
compliance review.
