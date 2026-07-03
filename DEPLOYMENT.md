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

## What Is Deployed

The ProofPay adapter contract is deployed on Stellar testnet. The next step is
to deploy or vendor a Stellar UltraHonk verifier contract, then connect ProofPay
to that verifier address.

The core project is still useful for judging because it includes:

- real Noir proof generation and verification
- generated proof artifacts
- Soroban contract source
- successful Soroban wasm build and testnet deployment
- a working product app flow

## Testnet Deployment

ProofPay adapter contract:

```text
CD77FKSOPNONXZNMTRZE5YDRTEI7ZR6PYFCQYJILXQZI6TPV6FYO4E23
```

Explorer:

```text
https://lab.stellar.org/r/testnet/contract/CD77FKSOPNONXZNMTRZE5YDRTEI7ZR6PYFCQYJILXQZI6TPV6FYO4E23
```

Wasm upload transaction:

```text
https://stellar.expert/explorer/testnet/tx/f249c3e020d16df4c8e3f26ce56abc387fd78051c333745d419e4586d76a9ca0
```

Contract deployment transaction:

```text
https://stellar.expert/explorer/testnet/tx/3f42fee56b3dcb6d54e19c2852dcab68b9997f68d34285b79ac681030689732e
```

Constructor configuration:

```text
admin:    GDU4WHIL3N7ISCEMEBXWQKBJVJNUTMBK2PGQGYMAXS34TOYUNBOLT7BN
verifier: GDU4WHIL3N7ISCEMEBXWQKBJVJNUTMBK2PGQGYMAXS34TOYUNBOLT7BN
kyc_root: 8425791797386173461612178423803209042195791018538165848973966991927341408870
blocked_root: 15176266821631068193760670691412429136168215003412106874011712206722057118973
```

Verification command:

```bash
stellar contract invoke \
  --network testnet \
  --source-account kompass-deployer \
  --id CD77FKSOPNONXZNMTRZE5YDRTEI7ZR6PYFCQYJILXQZI6TPV6FYO4E23 \
  -- roots
```

Verified output:

```text
["8425791797386173461612178423803209042195791018538165848973966991927341408870","15176266821631068193760670691412429136168215003412106874011712206722057118973"]
```

Important: the deployed adapter currently uses the deployer account as a
temporary verifier placeholder. That is enough to prove the ProofPay Soroban
contract is deployed and initialized on testnet, but `submit_batch` requires a
real UltraHonk verifier contract to be deployed and wired in next.
