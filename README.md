# ProofPay

Confidential stablecoin payouts on Stellar.

ProofPay lets an organization submit a stablecoin payout batch where individual
amounts stay private but compliance policy remains publicly verifiable. Payroll
is the first use case; the same pattern also fits contractor payouts, supplier
payments, grants, and aid disbursements. The browser app is runnable without
RPC, the Noir circuit generates a real UltraHonk proof, and the Soroban adapter
has been deployed on Stellar testnet calling an on-chain UltraHonk verifier.

## What the ZK proof proves

For a confidential payout batch, the proof binds these public claims:

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
circuits/              Circom circuit sketches for the payout proof
contracts/proofpay/    Soroban contract source
frontend/              Landing page and payout console
noir/payroll_batch/    Real Noir payout proof circuit
scripts/               Local app, proof, test, and server scripts
shared/                Deterministic proof engine and sample data
```

## Run Locally

```bash
npm test
npm run demo
npm run proof:noir
npm run contract:build
npm run serve
```

Open the landing page after `npm run serve`:

```text
http://localhost:4173/
```

The product app is available at:

```text
http://localhost:4173/app
```

The local app uses a deterministic proof envelope so judges can run it
without a Stellar RPC. `npm run proof:noir` generates and verifies a real
Noir/UltraHonk proof, then exports the proof, public inputs, and verifying key
to `artifacts/noir/payroll_batch`. `npm run contract:build` compiles the
ProofPay Soroban contract to wasm.

## Submission Docs

- [DEPLOYMENT.md](./DEPLOYMENT.md) explains the contract, proof artifacts, and
  Stellar verifier deployment path.
- [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) gives a 2-3 minute walkthrough script for
  the hackathon video.
- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) separates executable
  code from source-level scaffolding.
- [VERIFICATION_REPORT.md](./VERIFICATION_REPORT.md) records the cloned
  references, line-level contract audit, and testnet proof evidence.

## Testnet Contracts

Final ProofPay adapter contract on Stellar testnet:

```text
CCQEKN4T6CUGF7UXGCMJ2ERJI2T3IMWB374CD54D3D6WBS57FZ5A4YI5
```

Explorer:

```text
https://lab.stellar.org/r/testnet/contract/CCQEKN4T6CUGF7UXGCMJ2ERJI2T3IMWB374CD54D3D6WBS57FZ5A4YI5
```

UltraHonk verifier contract on Stellar testnet:

```text
CDSL6BD57VNVT2D5DTVXISNW3HZK2IFYOZSBELZ46Q6LGDVVPECTBSME
```

Real ProofPay proof submission transaction:

```text
https://stellar.expert/explorer/testnet/tx/559dc057f10dae156e53179ba8329c9d29be1e7cb921e6a786c8731fc3e2f3c1
```

The final adapter was initialized with the Noir circuit roots `15` and `0`,
calls the deployed UltraHonk verifier, records a replay guard, and emitted
`PayrollBatchAccepted` for batch id `2026070302`.

## Verification Status

See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for the exact split
between executable demo code and source-level Stellar/Circom scaffolding.

## Real Stellar Integration Path

1. Generate the Noir proof artifacts under `artifacts/noir/payroll_batch`.
2. Deploy the UltraHonk verifier with `artifacts/noir/payroll_batch/vk`.
3. Deploy `contracts/proofpay` with that verifier address and the circuit roots.
4. Submit `artifacts/noir/payroll_batch/proof` and matching public inputs to
   `submit_noir_batch`.
5. For a fuller privacy-pool version, replace the simple Noir policy-root
   checks with Merkle membership/non-membership constraints from the Circom
   sketches and Stellar Private Payments references.

## Product Narrative

1. Organization uploads a payout batch.
2. ProofPay computes KYC and blocked-list roots.
3. The app generates a proof for total, cap, roots, and hidden amounts.
4. The contract adapter verifies the proof and records the batch hash.
5. Auditor verifies a selective disclosure receipt for one payout.

## Security note

This is hackathon software. The local browser proof envelope is not
cryptographic ZK; it exists to make the product flow runnable without wallet
or RPC setup. The Noir proof path and Stellar testnet verifier transaction are
real, but production use still requires audited circuits, audited contracts, a
real Merkle/ASP policy circuit, and careful compliance review.
