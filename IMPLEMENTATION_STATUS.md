# Implementation Status

This document separates what is executable today from what is source-level
scaffolding for the real Stellar ZK integration.

## Executable now

- `npm test` runs the local E2E flow.
- `npm run demo` prints a full proof/submit/disclosure walkthrough.
- `npm run proof:noir` builds a real Noir/UltraHonk proof when `nargo` and `bb`
  are installed, verifies it with Barretenberg, and exports proof artifacts to
  `artifacts/noir/payroll_batch`.
- `npm run contract:build` compiles the ProofPay Soroban contract to wasm when
  the Stellar CLI, Rustup, and `wasm32v1-none` target are installed.
- `npm run serve` serves the landing page and payout console.
- The UltraHonk verifier contract is deployed on Stellar testnet at
  `CDSL6BD57VNVT2D5DTVXISNW3HZK2IFYOZSBELZ46Q6LGDVVPECTBSME`.
- The final ProofPay adapter contract is deployed on Stellar testnet at
  `CCQEKN4T6CUGF7UXGCMJ2ERJI2T3IMWB374CD54D3D6WBS57FZ5A4YI5`.
- The final ProofPay adapter accepted a real Noir/UltraHonk proof on testnet in
  transaction `559dc057f10dae156e53179ba8329c9d29be1e7cb921e6a786c8731fc3e2f3c1`.
- `shared/proofpay.mjs` validates batch policy, derives deterministic public
  inputs, rejects replay, rejects tampered disclosure receipts, and rejects proof
  envelopes that do not match the public inputs.

## Source-level scaffold

- `contracts/proofpay/src/lib.rs` is a Soroban contract adapter that calls the
  deployed UltraHonk verifier through `verify_proof(public_inputs, proof_bytes)`,
  validates the public-input bytes against the structured batch fields, requires
  sender/admin auth where needed, persists per-batch replay keys, and emits
  contract events.
- `circuits/*.circom` are circuit sketches. They are not complete production
  circuits yet because the Merkle membership/non-membership constraints and
  batch-root computation are intentionally marked as placeholders.
- `noir/payroll_batch` is a real UltraHonk proof circuit for the narrower v1
  statement: hidden amounts sum to the public total, each amount is under cap,
  and private policy leaves bind to public roots. It is not yet a full Merkle
  ASP implementation.

## Verified locally

- `npm test`
- `npm run proof:noir`
- `npm run contract:build`

## Verified on testnet

- Verifier deployed:
  `CDSL6BD57VNVT2D5DTVXISNW3HZK2IFYOZSBELZ46Q6LGDVVPECTBSME`
- Final adapter deployed:
  `CCQEKN4T6CUGF7UXGCMJ2ERJI2T3IMWB374CD54D3D6WBS57FZ5A4YI5`
- `roots` returns `["15","0"]`.
- `submit_noir_batch` accepted `artifacts/noir/payroll_batch/proof` with
  matching `public_inputs`, emitted `PayrollBatchAccepted`, and `is_batch_used`
  returns `true` for batch id `2026070302`.

## Not yet complete

- Circom compilation and Groth16 proof generation are not part of the primary
  path. The Circom files remain sketches for a future Groth16/Privacy Pools
  variant.
- The browser app still uses a deterministic local proof envelope for judge UX.
  The real ZK path is available through `npm run proof:noir` and the deployed
  testnet verifier transaction.

## Required next engineering step

Replace the simple v1 Noir policy-root arithmetic with full Merkle
membership/non-membership constraints for a production-grade ASP model, then
connect the browser app to a Stellar wallet/RPC submit flow instead of the local
simulator.
