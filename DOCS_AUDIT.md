# Docs Audit

Audit date: 2026-07-03

## Sources checked

- Stellar smart contract getting started docs: Rust + Stellar CLI are the
  expected contract path.
- Stellar contract storage docs: instance storage is appropriate for small
  contract config; persistent storage is appropriate for per-batch replay state.
- Stellar contract authorization docs: account-gated operations should use
  Soroban contract authorization such as `Address::require_auth`.
- Stellar contract events docs and `soroban-sdk` event source: `#[contractevent]`
  generates an event type with `.publish(&env)`.
- Stellar ZK docs: real ZK proof verification belongs in a Stellar contract via
  the supported host cryptographic primitives and a verifier contract.
- Circom docs: signals and public inputs are declared in the circuit; the
  current circuit files are marked as sketches because Merkle membership and
  non-membership constraints are not implemented yet.
- Local `soroban-sdk-25.2.0` crate source: confirmed `U256::from_u128`,
  `U256::from_u32`, storage accessors, and event publication APIs.

## Code changes from audit

- Replaced a single growing replay `Map` with one persistent replay key per
  batch hash in `contracts/proofpay/src/lib.rs`.
- Renamed the verifier interface to `ProofVerifier` to make clear that the
  current contract expects a verifier adapter, not the final concrete Groth16
  contract ABI.
- Removed an unused Soroban import.
- Tightened the demo proof simulator so proof bytes must match public inputs.
- Added regression tests for proof/public-input tampering.
- Added `IMPLEMENTATION_STATUS.md` and updated README language so the runnable
  local demo is not misrepresented as cryptographic ZK.

## Verified executable checks

```bash
npm test
npm run demo
node --check frontend/app.mjs
node --check scripts/e2e.test.mjs
node --check scripts/run-demo.mjs
node --check scripts/serve.mjs
```

## Not verified in this environment

- Rust/Soroban compilation: `rustc` and `cargo` are not installed.
- Circom/snarkjs compilation: `circom` and `snarkjs` are not installed.
- Real Groth16 proof generation.
- Real Stellar testnet deployment.
