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

These are the artifacts a Stellar UltraHonk verifier deployment would consume.

## Contract Deployment Shape

The ProofPay contract is intentionally an adapter around a verifier contract.
The expected deployment flow is:

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

## Build Command

```bash
npm run contract:build
```

Current verified wasm hash:

```text
341da078db8895956c1199c72ad82a4af46c88c5ae4f371ead023e02be7a64f0
```

## What Is Not Deployed Yet

The repo does not currently include a live testnet deployment address. The next step is to deploy or vendor a Stellar UltraHonk verifier contract, then connect ProofPay to that verifier address.

The core project is still useful for judging because it includes:

- real Noir proof generation and verification
- generated proof artifacts
- Soroban contract source
- successful Soroban wasm build
- a working product app flow
