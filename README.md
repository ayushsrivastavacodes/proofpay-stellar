# ProofPay

Compliance-private payroll on Stellar.

ProofPay lets an employer submit a stablecoin payroll batch where individual
salary amounts stay private. The runnable demo uses a deterministic proof
envelope, and the included Soroban/Circom scaffold shows where a real on-chain
Groth16 verifier plugs in.

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
circuits/              Circom circuit source for the payroll proof
contracts/proofpay/    Soroban contract source
frontend/              Static browser demo
scripts/               Local demo, test, and server scripts
shared/                Deterministic proof engine and sample data
```

## Run the local demo

```bash
npm test
npm run demo
npm run serve
```

Open http://localhost:4173 after `npm run serve`.

The local demo uses a deterministic proof envelope so judges can run it without
installing Circom, snarkjs, Rust, or a Stellar RPC. The source also includes the
Circom circuit and Soroban contract that show the intended on-chain verifier
integration.

## Verification status

See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for the exact split
between executable demo code and source-level Stellar/Circom scaffolding.

## Real Stellar integration path

1. Compile `circuits/payroll_batch.circom` with Circom/snarkjs.
2. Generate Groth16 proving and verification keys.
3. Deploy a Groth16 verifier contract on Stellar.
4. Deploy `contracts/proofpay` with the verifier address and compliance roots.
5. Replace the local proof envelope in `shared/proofpay.mjs` with real
   `proof.json` and `public.json` produced by snarkjs.
6. Call `submit_batch` on the Soroban contract with the proof and public inputs.

## Demo narrative

1. Employer uploads a payroll batch.
2. ProofPay computes KYC and blocked-list roots.
3. The app generates a proof locally.
4. The contract simulator verifies the proof and records the batch.
5. Auditor verifies a selective disclosure receipt for one payout.

## Security note

This is hackathon software. The local proof envelope is not cryptographic ZK.
It exists to make the E2E product flow runnable. Production use requires a real
Groth16 setup, audited circuits, audited contracts, and careful compliance
review.
