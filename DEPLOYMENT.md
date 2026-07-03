# Deployment Guide

This repo has two deployable pieces:

- `contracts/proofpay`: Soroban payout contract adapter
- `noir/payroll_batch`: Noir circuit that generates the UltraHonk proof artifacts

## Local Verification

```bash
npm test
npm run proof:noir
npm run contract:build
```

Expected outputs:

- `npm test` passes the app-level proof, submit, replay, and disclosure checks.
- `npm run proof:noir` generates and verifies the UltraHonk proof with Barretenberg.
- `npm run contract:build` produces `contracts/proofpay/target/wasm32v1-none/release/proofpay.wasm`.

## Proof Artifacts

The real Noir proof flow exports verifier inputs here:

```text
artifacts/noir/payroll_batch/proof
artifacts/noir/payroll_batch/public_inputs
artifacts/noir/payroll_batch/vk
```

These are the artifacts consumed by the deployed Stellar UltraHonk verifier.
The current artifacts are generated from the path-based Merkle circuit.

## Contract Deployment Shape

The ProofPay contract is intentionally an adapter around a verifier contract.
The deployment flow is:

1. Deploy a Stellar UltraHonk verifier contract.
2. Load or configure it with `artifacts/noir/payroll_batch/vk`.
3. Deploy `contracts/proofpay` with:
   - admin address
   - verifier contract address
   - KYC approved root
   - blocked-list root
4. Submit a payout batch with:
   - proof bytes from `artifacts/noir/payroll_batch/proof`
   - public inputs from `artifacts/noir/payroll_batch/public_inputs`
   - the same structured fields the contract uses to reconstruct the Noir
     public-input byte string

## Build Command

```bash
npm run contract:build
```

Current verified wasm hash:

```text
841a237811b701dddcc7fcf31b429848339c6dce7f4d048273832f92d979b825
```

## What Is Deployed

The ProofPay adapter contract and the UltraHonk verifier contract are deployed
on Stellar testnet. The accepted on-chain transaction uses the compact v1 proof.
The current path-based Merkle proof verifies locally and has a verifier deployed,
but direct on-chain verification exceeds the current testnet simulation budget.

The core project is still useful for judging because it includes:

- real Noir proof generation and verification
- generated proof artifacts
- Soroban contract source
- successful Soroban wasm build and testnet proof-verification transaction
- a working product app flow

## Testnet Deployment

Accepted v1 ProofPay adapter contract:

```text
CCQEKN4T6CUGF7UXGCMJ2ERJI2T3IMWB374CD54D3D6WBS57FZ5A4YI5
```

Explorer:

```text
https://lab.stellar.org/r/testnet/contract/CCQEKN4T6CUGF7UXGCMJ2ERJI2T3IMWB374CD54D3D6WBS57FZ5A4YI5
```

Wasm upload transaction:

```text
https://stellar.expert/explorer/testnet/tx/b032ac38b35be7bd279734343bca279f200ff4b9da89f042537af51b54ad1684
```

Contract deployment transaction:

```text
https://stellar.expert/explorer/testnet/tx/1cc8d308f858aa35e485b976b731a624c6d2f8091093d2c92ef319f6d34fddef
```

UltraHonk verifier contract:

```text
CDSL6BD57VNVT2D5DTVXISNW3HZK2IFYOZSBELZ46Q6LGDVVPECTBSME
```

Verifier deployment transactions:

```text
https://stellar.expert/explorer/testnet/tx/5e32122e3f428672e0ae1d9cfe2b6fc8b76047a036d563ccc3e490344dd8ca49
https://stellar.expert/explorer/testnet/tx/0a4597e3d00485ce72e4ee569e57132e5eed489d994ec18c82f66711b990a2d5
```

Direct verifier proof transaction:

```text
https://stellar.expert/explorer/testnet/tx/f94de966163032bf95c6b9796c337224abb81b5f08543da94284870ee54de826
```

Accepted v1 ProofPay adapter proof transaction:

```text
https://stellar.expert/explorer/testnet/tx/559dc057f10dae156e53179ba8329c9d29be1e7cb921e6a786c8731fc3e2f3c1
```

Constructor configuration:

```text
admin:    GDU4WHIL3N7ISCEMEBXWQKBJVJNUTMBK2PGQGYMAXS34TOYUNBOLT7BN
verifier: CDSL6BD57VNVT2D5DTVXISNW3HZK2IFYOZSBELZ46Q6LGDVVPECTBSME
kyc_root: 15
blocked_root: 0
```

Verification command:

```bash
stellar contract invoke \
  --network testnet \
  --source-account kompass-deployer \
  --id CCQEKN4T6CUGF7UXGCMJ2ERJI2T3IMWB374CD54D3D6WBS57FZ5A4YI5 \
  -- roots
```

Verified output:

```text
["15","0"]
```

Final proof submission command:

```bash
stellar contract invoke \
  --network testnet \
  --source-account kompass-deployer \
  --send=yes \
  --id CCQEKN4T6CUGF7UXGCMJ2ERJI2T3IMWB374CD54D3D6WBS57FZ5A4YI5 \
  -- submit_noir_batch \
  --sender GDU4WHIL3N7ISCEMEBXWQKBJVJNUTMBK2PGQGYMAXS34TOYUNBOLT7BN \
  --proof-file-path artifacts/noir/payroll_batch/proof \
  --public_inputs-file-path artifacts/noir/payroll_batch/public_inputs \
  --batch_id_hash 2026070302 \
  --batch_commitment 5850 \
  --total 4335 \
  --cap 1200 \
  --asset_hash 1 \
  --kyc_root 15 \
  --blocked_root 0
```

Replay guard verification:

```bash
stellar contract invoke \
  --network testnet \
  --source-account kompass-deployer \
  --id CCQEKN4T6CUGF7UXGCMJ2ERJI2T3IMWB374CD54D3D6WBS57FZ5A4YI5 \
  -- is_batch_used \
  --batch_id_hash 2026070302
```

Verified output:

```text
true
```

## Path-Based Merkle Proof

The current Noir circuit follows the Merkle path pattern from the reviewed
Noir/Stellar references:

- KYC: prove `hash(recipient_key, credential_secret)` is included under the
  public KYC root using private sibling paths.
- Blocked list: prove the leaf at the same private path is `0` under the public
  blocked root.
- Batch: prove hidden amounts are positive, under cap, sum to public total, and
  bind into the public batch commitment.

Generated public inputs:

```text
total:            4335
cap:              1200
kyc_root:         2690698580373620943275020322994090331635272929715942175495000391784299451578
blocked_root:     15366428887851194658173001994030115403889500460316803633813719685335613213216
batch_commitment: 20068219312705964598256362929344189003727442145966635737504581750707804407922
```

Merkle verifier deployment:

```text
CDG3SXXD3H6UOIZXBEMKWSURKWECS36RNSPERDYPLXDSSEFQWLDE7ZKL
```

Verifier deployment transaction:

```text
https://stellar.expert/explorer/testnet/tx/4538e1caaf2fa12914f15579124067a5357bbd23924988e499000c442826fc41
```

Adapter deployment for the Merkle roots:

```text
CA3GXAZAB2QNERSOFLLHB7X63KTNK5KWHNLEJFMGNZEILZGJN3JGUBAA
```

Adapter deployment transaction:

```text
https://stellar.expert/explorer/testnet/tx/d612a3fbb4c0ce8f04bce40d03e89366b339d47111d48b6fe964175a15383872
```

Attempting direct verifier invocation with the path-based Merkle proof currently
fails during simulation with:

```text
HostError: Error(Budget, ExceededLimit)
```

This is why the accepted testnet transaction remains the compact v1 proof while
the production-style Merkle statement is provided as locally verified artifacts.
