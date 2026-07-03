#![no_std]

use soroban_sdk::{
    contract, contractclient, contracterror, contractevent, contractimpl, contracttype, Address,
    Bytes, Env, Vec, U256,
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

#[contractclient(crate_path = "soroban_sdk", name = "ProofVerifierClient")]
pub trait ProofVerifier {
    /// Verifier adapter interface.
    ///
    /// A production deployment should implement this with the concrete Groth16
    /// verifier contract and exact proof/public-input types generated from the
    /// final circuit.
    fn verify(env: Env, proof: Bytes, public_inputs: Vec<U256>) -> bool;
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
        Self::require_initialized(&env)?;

        let inputs = payroll_proof.inputs.clone();
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

        let used_key = DataKey::UsedBatch(inputs.batch_id_hash.clone());
        if env.storage().persistent().has(&used_key) {
            return Err(Error::BatchAlreadyUsed);
        }

        let verifier: Address = env
            .storage()
            .instance()
            .get(&DataKey::Verifier)
            .ok_or(Error::NotInitialized)?;
        let verifier_client = ProofVerifierClient::new(&env, &verifier);
        let public_vec = Self::public_inputs_vec(&env, &inputs);

        if !verifier_client.verify(&payroll_proof.proof, &public_vec) {
            return Err(Error::BadProof);
        }

        env.storage().persistent().set(&used_key, &true);

        PayrollBatchAccepted {
            batch_id_hash: inputs.batch_id_hash,
            batch_commitment: inputs.batch_commitment,
            total: inputs.total,
            asset_hash: inputs.asset_hash,
        }
        .publish(&env);

        Ok(())
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

    fn public_inputs_vec(env: &Env, inputs: &PublicInputs) -> Vec<U256> {
        let mut out = Vec::new(env);
        out.push_back(inputs.batch_id_hash.clone());
        out.push_back(inputs.batch_commitment.clone());
        out.push_back(U256::from_u128(env, inputs.total));
        out.push_back(U256::from_u128(env, inputs.cap));
        out.push_back(inputs.asset_hash.clone());
        out.push_back(inputs.kyc_root.clone());
        out.push_back(inputs.blocked_root.clone());
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
