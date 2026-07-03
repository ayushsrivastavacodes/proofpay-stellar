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
on Stellar testnet. The final adapter calls the verifier with the generated Noir
proof bytes and public-input bytes, then records the submitted batch id.

The core project is still useful for judging because it includes:

- real Noir proof generation and verification
- generated proof artifacts
- Soroban contract source
- successful Soroban wasm build and testnet proof-verification transaction
- a working product app flow

## Testnet Deployment

Final ProofPay adapter contract:

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

ProofPay adapter proof transaction:

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
