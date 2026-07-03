# Implementation Status

This document separates what is executable today from what is source-level
scaffolding for the real Stellar ZK integration.

## Executable now

- `npm test` runs the local E2E flow.
- `npm run demo` prints a full proof/submit/disclosure walkthrough.
- `npm run serve` serves the static browser demo.
- `shared/proofpay.mjs` validates batch policy, derives deterministic public
  inputs, rejects replay, rejects tampered disclosure receipts, and rejects proof
  envelopes that do not match the public inputs.

## Source-level scaffold

- `contracts/proofpay/src/lib.rs` is a Soroban contract scaffold following the
  documented contract structure: auth via `Address::require_auth`, instance
  storage for small config, persistent per-batch replay keys, generated
  cross-contract client, and contract events.
- `circuits/*.circom` are circuit sketches. They are not complete production
  circuits yet because the Merkle membership/non-membership constraints and
  batch-root computation are intentionally marked as placeholders.

## Not yet verified locally

- Soroban contract compilation. This environment has `stellar` CLI but no
  `rustc` or `cargo`.
- Circom compilation. This environment does not include `circom` or `snarkjs`.
- Real Groth16 proof generation and verification.

## Required next engineering step

Replace the placeholder circuit constraints with the Merkle proof templates from
the Stellar Private Payments / Privacy Pools references, then wire `snarkjs`
outputs into the Soroban verifier contract.
