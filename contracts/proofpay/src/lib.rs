#![no_std]

use soroban_sdk::{
    contract, contractclient, contracterror, contractevent, contractimpl, contracttype, Address,
    Bytes, Env, U256,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotAdmin = 3,
    BadRoots = 4,
    BadProof = 5,
    BatchAlreadyUsed = 6,
    InvalidPublicInputs = 7,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum VerifierError {
    VkParseError = 1,
    ProofParseError = 2,
    VerificationFailed = 3,
    VkNotSet = 4,
}

#[contracttype]
#[derive(Clone)]
pub struct PublicInputs {
    pub batch_id_hash: U256,
    pub batch_commitment: U256,
    pub total: u128,
    pub cap: u128,
    pub asset_hash: U256,
    pub kyc_root: U256,
    pub blocked_root: U256,
}

#[contracttype]
#[derive(Clone)]
pub struct PayrollProof {
    pub proof: Bytes,
    pub public_inputs: Bytes,
    pub inputs: PublicInputs,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Verifier,
    KycRoot,
    BlockedRoot,
    UsedBatch(U256),
}

#[contractevent]
#[derive(Clone)]
pub struct PayrollBatchAccepted {
    #[topic]
    pub batch_id_hash: U256,
    pub batch_commitment: U256,
    pub total: u128,
    pub asset_hash: U256,
}

#[contractclient(crate_path = "soroban_sdk", name = "UltraHonkVerifierClient")]
pub trait UltraHonkVerifier {
    fn verify_proof(
        env: Env,
        public_inputs: Bytes,
        proof_bytes: Bytes,
    ) -> Result<(), VerifierError>;
}

#[contract]
pub struct ProofPay;

#[contractimpl]
impl ProofPay {
    pub fn __constructor(
        env: Env,
        admin: Address,
        verifier: Address,
        kyc_root: U256,
        blocked_root: U256,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Verifier, &verifier);
        env.storage().instance().set(&DataKey::KycRoot, &kyc_root);
        env.storage()
            .instance()
            .set(&DataKey::BlockedRoot, &blocked_root);
        Ok(())
    }

    pub fn update_roots(
        env: Env,
        admin: Address,
        kyc_root: U256,
        blocked_root: U256,
    ) -> Result<(), Error> {
        admin.require_auth();
        Self::require_admin(&env, &admin)?;
        env.storage().instance().set(&DataKey::KycRoot, &kyc_root);
        env.storage()
            .instance()
            .set(&DataKey::BlockedRoot, &blocked_root);
        Ok(())
    }

    pub fn submit_batch(
        env: Env,
        sender: Address,
        payroll_proof: PayrollProof,
    ) -> Result<(), Error> {
        sender.require_auth();
        Self::accept_batch(
            &env,
            payroll_proof.inputs,
            payroll_proof.public_inputs,
            payroll_proof.proof,
        )
    }

    pub fn submit_noir_batch(
        env: Env,
        sender: Address,
        proof: Bytes,
        public_inputs: Bytes,
        batch_id_hash: U256,
        batch_commitment: U256,
        total: u128,
        cap: u128,
        asset_hash: U256,
        kyc_root: U256,
        blocked_root: U256,
    ) -> Result<(), Error> {
        sender.require_auth();
        Self::accept_batch(
            &env,
            PublicInputs {
                batch_id_hash,
                batch_commitment,
                total,
                cap,
                asset_hash,
                kyc_root,
                blocked_root,
            },
            public_inputs,
            proof,
        )
    }

    pub fn is_batch_used(env: Env, batch_id_hash: U256) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::UsedBatch(batch_id_hash))
    }

    pub fn roots(env: Env) -> Result<(U256, U256), Error> {
        Self::require_initialized(&env)?;
        Ok((
            env.storage().instance().get(&DataKey::KycRoot).unwrap(),
            env.storage().instance().get(&DataKey::BlockedRoot).unwrap(),
        ))
    }

    fn accept_batch(
        env: &Env,
        inputs: PublicInputs,
        public_inputs: Bytes,
        proof: Bytes,
    ) -> Result<(), Error> {
        Self::require_initialized(env)?;

        if inputs.total == 0 || inputs.cap == 0 {
            return Err(Error::InvalidPublicInputs);
        }

        let kyc_root: U256 = env
            .storage()
            .instance()
            .get(&DataKey::KycRoot)
            .ok_or(Error::NotInitialized)?;
        let blocked_root: U256 = env
            .storage()
            .instance()
            .get(&DataKey::BlockedRoot)
            .ok_or(Error::NotInitialized)?;

        if inputs.kyc_root != kyc_root || inputs.blocked_root != blocked_root {
            return Err(Error::BadRoots);
        }

        if public_inputs != Self::noir_public_inputs(env, &inputs) {
            return Err(Error::InvalidPublicInputs);
        }

        let used_key = DataKey::UsedBatch(inputs.batch_id_hash.clone());
        if env.storage().persistent().has(&used_key) {
            return Err(Error::BatchAlreadyUsed);
        }

        let verifier: Address = env
            .storage()
            .instance()
            .get(&DataKey::Verifier)
            .ok_or(Error::NotInitialized)?;
        let verifier_client = UltraHonkVerifierClient::new(env, &verifier);
        verifier_client.verify_proof(&public_inputs, &proof);

        env.storage().persistent().set(&used_key, &true);

        PayrollBatchAccepted {
            batch_id_hash: inputs.batch_id_hash,
            batch_commitment: inputs.batch_commitment,
            total: inputs.total,
            asset_hash: inputs.asset_hash,
        }
        .publish(env);

        Ok(())
    }

    fn noir_public_inputs(env: &Env, inputs: &PublicInputs) -> Bytes {
        let mut out = Bytes::new(env);
        out.append(&U256::from_u128(env, inputs.total).to_be_bytes());
        out.append(&U256::from_u128(env, inputs.cap).to_be_bytes());
        out.append(&inputs.kyc_root.to_be_bytes());
        out.append(&inputs.blocked_root.to_be_bytes());
        out.append(&inputs.batch_commitment.to_be_bytes());
        out
    }

    fn require_initialized(env: &Env) -> Result<(), Error> {
        if !env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::NotInitialized);
        }
        Ok(())
    }

    fn require_admin(env: &Env, caller: &Address) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        if &admin != caller {
            return Err(Error::NotAdmin);
        }
        Ok(())
    }
}
