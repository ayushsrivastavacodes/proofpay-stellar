# Verification Report

This report records the reference resources used to verify the final ProofPay
adapter and the split between real testnet behavior and local demo behavior.

## Cloned Reference Repos

The following repos were cloned under `/private/tmp/proofpay-verify-*` and used
for line-level checks:

- `stellar/stellar-dev-skill`: Soroban contract structure, auth, constructors,
  replay guards, and the warning that contracts must validate public-input
  semantics instead of only checking proof validity.
- `stellar/soroban-examples`: canonical Soroban patterns, including
  `groth16_verifier`, auth examples, constructor usage, and privacy-pool public
  signal handling.
- `indextree/ultrahonk_soroban_contract`: exact deployed verifier ABI,
  constructor VK loading, `verify_proof(public_inputs, proof_bytes)`, test
  patterns, and direct Stellar CLI invocation with proof/public-input files.
- `NethermindEth/stellar-private-payments`: privacy-pool architecture,
  proof/public-input extraction, browser-side proof generation context, and
  selective disclosure patterns.
- `NethermindEth/stellar-risc0-verifier`: alternate ZK verifier architecture on
  Stellar, used as a comparison point but not used in ProofPay's final path.

## Line-Level Contract Check

File: `contracts/proofpay/src/lib.rs`

- Lines 1-6: `#![no_std]` and Soroban SDK imports match the deployed contract
  environment. `Vec` was removed because the UltraHonk verifier consumes raw
  `Bytes`, not `Vec<U256>`.
- Lines 8-19: ProofPay errors remain typed `#[contracterror]` values. `BadProof`
  is retained for the public API, although the current generated verifier client
  traps failed verifier calls before returning a mapped error.
- Lines 21-29: `VerifierError` mirrors the cloned UltraHonk verifier error
  values: `VkParseError`, `ProofParseError`, `VerificationFailed`, `VkNotSet`.
- Lines 31-49: `PublicInputs` keeps app-level batch metadata, while
  `PayrollProof` now carries raw Noir `public_inputs` bytes so the adapter can
  compare the verifier statement to the batch metadata.
- Lines 51-69: storage keys and event fields are minimal: admin, verifier, roots,
  replay key, and accepted-batch event data.
- Lines 71-78: the generated client matches the UltraHonk contract ABI:
  `verify_proof(public_inputs: Bytes, proof_bytes: Bytes)`.
- Lines 85-102: constructor stores admin, verifier, KYC root, and blocked root
  once at deploy time, matching Stellar's constructor guidance.
- Lines 104-117: root updates require admin auth before mutating instance
  storage.
- Lines 119-161: `submit_batch` is the structured entrypoint; `submit_noir_batch`
  is the CLI-friendly entrypoint used for the final testnet transaction.
- Lines 163-175: read-only helpers expose replay status and configured roots.
- Lines 177-232: `accept_batch` enforces initialization, nonzero total/cap,
  root matching, public-input byte matching, replay protection, verifier call,
  persistent replay storage, and event emission.
- Lines 234-242: `noir_public_inputs` reconstructs the exact five 32-byte
  big-endian public inputs used by `artifacts/noir/payroll_batch/public_inputs`:
  total, cap, KYC root, blocked root, batch commitment.
- Lines 244-261: initialization and admin checks use instance storage and typed
  errors.

## Real Testnet Evidence

UltraHonk verifier contract:

```text
CDSL6BD57VNVT2D5DTVXISNW3HZK2IFYOZSBELZ46Q6LGDVVPECTBSME
```

Final ProofPay adapter contract:

```text
CCQEKN4T6CUGF7UXGCMJ2ERJI2T3IMWB374CD54D3D6WBS57FZ5A4YI5
```

Final adapter wasm hash:

```text
841a237811b701dddcc7fcf31b429848339c6dce7f4d048273832f92d979b825
```

Final proof transaction:

```text
https://stellar.expert/explorer/testnet/tx/559dc057f10dae156e53179ba8329c9d29be1e7cb921e6a786c8731fc3e2f3c1
```

Verified read calls:

```text
roots -> ["15","0"]
is_batch_used(2026070302) -> true
```

The deployer account was funded with Stellar testnet XLM through the Stellar
testnet friendbot/CLI funding flow. No mainnet funds were used.

## What Is Real vs Local

Real:

- Noir/UltraHonk proof generation through `npm run proof:noir`
- proof, public inputs, and VK artifacts under `artifacts/noir/payroll_batch`
- UltraHonk verifier deployed on Stellar testnet
- ProofPay adapter deployed on Stellar testnet
- final proof accepted by ProofPay through the verifier on Stellar testnet

Local/demo:

- Browser payout console uses deterministic proof envelopes so judges can click
  through the product without wallet/RPC setup.
- The current Noir circuit is a v1 policy statement, not the final
  Privacy-Pools-style Merkle membership/non-membership circuit.
- The app UI is not yet submitting directly to wallet/RPC; the real submission
  is documented and reproducible through Stellar CLI.
