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
- `npm run serve` serves the static browser demo.
- `shared/proofpay.mjs` validates batch policy, derives deterministic public
  inputs, rejects replay, rejects tampered disclosure receipts, and rejects proof
  envelopes that do not match the public inputs.

## Source-level scaffold

- `contracts/proofpay/src/lib.rs` is a Soroban contract adapter following the
  documented contract structure: auth via `Address::require_auth`, instance
  storage for small config, persistent per-batch replay keys, generated
  cross-contract client, and contract events.
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

## Not yet complete

- Circom compilation and Groth16 proof generation are not part of the primary
  path. The Circom files remain sketches for a future Groth16/Privacy Pools
  variant.
- The ProofPay contract calls a generic verifier adapter. The next integration
  step is deploying a Stellar UltraHonk verifier contract and passing the
  generated Noir proof bytes and public inputs through that adapter.

## Required next engineering step

Deploy or vendor a Stellar UltraHonk verifier contract, load
`artifacts/noir/payroll_batch/vk` as its verifying key, then invoke
`submit_batch` with `artifacts/noir/payroll_batch/proof` and the matching public
inputs. After that, replace the simple policy-root checks with full Merkle
membership/non-membership constraints for a production-grade ASP model.
