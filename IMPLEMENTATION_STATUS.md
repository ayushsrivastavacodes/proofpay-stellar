# Implementation Status

This document separates what is executable today from what is source-level
scaffolding for the real Stellar ZK integration.

## Executable now

- `npm test` runs the local E2E flow.
- `npm run walkthrough` prints a full proof/submit/disclosure walkthrough.
- `npm run proof:noir` builds a real Noir/UltraHonk proof when `nargo` and `bb`
  are installed, verifies it with Barretenberg, and exports proof artifacts to
  `artifacts/noir/payroll_batch`.
- `npm run contract:build` compiles the ProofPay Soroban contract to wasm when
  the Stellar CLI, Rustup, and `wasm32v1-none` target are installed.
- `npm run serve` serves the landing page and payout console.
- The accepted v1 UltraHonk verifier contract is deployed on Stellar testnet at
  `CDSL6BD57VNVT2D5DTVXISNW3HZK2IFYOZSBELZ46Q6LGDVVPECTBSME`.
- The accepted v1 ProofPay adapter contract is deployed on Stellar testnet at
  `CCQEKN4T6CUGF7UXGCMJ2ERJI2T3IMWB374CD54D3D6WBS57FZ5A4YI5`.
- The accepted v1 ProofPay adapter accepted a real Noir/UltraHonk proof on testnet in
  transaction `559dc057f10dae156e53179ba8329c9d29be1e7cb921e6a786c8731fc3e2f3c1`.
- The path-based Merkle verifier is deployed on testnet at
  `CDG3SXXD3H6UOIZXBEMKWSURKWECS36RNSPERDYPLXDSSEFQWLDE7ZKL`, but direct
  verification of the larger proof exceeds current testnet simulation budget.
- `shared/proofpay.mjs` validates batch policy, derives deterministic public
  inputs, rejects replay, rejects tampered disclosure receipts, and rejects proof
  envelopes that do not match the public inputs.

## Source-level scaffold

- `contracts/proofpay/src/lib.rs` is a Soroban contract adapter that calls the
  deployed UltraHonk verifier through `verify_proof(public_inputs, proof_bytes)`,
  validates the public-input bytes against the structured batch fields, requires
  sender/admin auth where needed, persists per-batch replay keys, and emits
  contract events.
- `circuits/*.circom` are retained as an alternate Groth16-oriented scaffold.
  The active proof implementation for this submission is the Noir circuit.
- `noir/payroll_batch` is now a path-based Merkle UltraHonk proof circuit:
  hidden amounts sum to the public total, each amount is under cap, KYC
  membership is proven with private sibling paths, and blocked-list
  non-inclusion is proven as a zero leaf at the same private path.
- `tools/noir-witness` generates the Poseidon2-compatible witness and
  `Prover.toml` before every `npm run proof:noir` run.

## Verified locally

- `npm test`
- `npm run proof:noir`
- `npm run contract:build`
- `cd noir/payroll_batch && nargo test`

## Verified on testnet

- Accepted v1 verifier deployed:
  `CDSL6BD57VNVT2D5DTVXISNW3HZK2IFYOZSBELZ46Q6LGDVVPECTBSME`
- Accepted v1 adapter deployed:
  `CCQEKN4T6CUGF7UXGCMJ2ERJI2T3IMWB374CD54D3D6WBS57FZ5A4YI5`
- `roots` returns `["15","0"]`.
- `submit_noir_batch` accepted `artifacts/noir/payroll_batch/proof` with
  matching `public_inputs`, emitted `PayrollBatchAccepted`, and `is_batch_used`
  returns `true` for batch id `2026070302`.
- Path-based Merkle verifier deployed:
  `CDG3SXXD3H6UOIZXBEMKWSURKWECS36RNSPERDYPLXDSSEFQWLDE7ZKL`
- Path-based Merkle adapter deployed:
  `CA3GXAZAB2QNERSOFLLHB7X63KTNK5KWHNLEJFMGNZEILZGJN3JGUBAA`
- Direct path-based verifier invocation currently fails simulation with
  `HostError: Error(Budget, ExceededLimit)`.

## Not yet complete

- Circom compilation and Groth16 proof generation are not part of the primary
  path. The Circom files remain sketches for a future Groth16/Privacy Pools
  variant.
- The browser app still uses a deterministic local proof envelope for judge UX,
  but now shows live testnet evidence and distinguishes accepted on-chain v1
  proof evidence from the larger path-based Merkle proof.

## Required next engineering step

Cost-optimize the path-based Merkle proof for on-chain verification. The likely
production route is Groth16/BLS12-381, proof aggregation, or a smaller
application-specific policy statement before connecting the browser app to a
wallet/RPC submit flow.
