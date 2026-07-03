use num_bigint::BigUint;
use soroban_poseidon::{poseidon2_hash, Field};
use soroban_sdk::{crypto::BnScalar, Bytes, Env, Vec as SorobanVec, U256};
use std::{fs, path::PathBuf};

const RECIPIENTS: usize = 5;
const TREE_DEPTH: usize = 3;
const TREE_SIZE: usize = 1 << TREE_DEPTH;

fn be32_from_biguint(x: &BigUint) -> [u8; 32] {
    let mut be = x.to_bytes_be();
    if be.len() > 32 {
        be = be[be.len() - 32..].to_vec();
    }
    let mut out = [0u8; 32];
    let start = 32 - be.len();
    out[start..].copy_from_slice(&be);
    out
}

fn hash2(env: &Env, a: &BigUint, b: &BigUint) -> BigUint {
    let a_bytes = Bytes::from_array(env, &be32_from_biguint(a));
    let b_bytes = Bytes::from_array(env, &be32_from_biguint(b));
    let modulus = <BnScalar as Field>::modulus(env);
    let mut inputs = SorobanVec::new(env);
    inputs.push_back(U256::from_be_bytes(env, &a_bytes).rem_euclid(&modulus));
    inputs.push_back(U256::from_be_bytes(env, &b_bytes).rem_euclid(&modulus));
    let out = poseidon2_hash::<4, BnScalar>(env, &inputs);
    let out_bytes = out.to_be_bytes();
    let mut out_arr = [0u8; 32];
    out_bytes.copy_into_slice(&mut out_arr);
    BigUint::from_bytes_be(&out_arr)
}

fn tree_levels(env: &Env, leaves: &[BigUint; TREE_SIZE]) -> Vec<Vec<BigUint>> {
    let mut levels = Vec::new();
    levels.push(leaves.to_vec());
    for depth in 0..TREE_DEPTH {
        let prev = &levels[depth];
        let next = prev
            .chunks(2)
            .map(|pair| hash2(env, &pair[0], &pair[1]))
            .collect::<Vec<_>>();
        levels.push(next);
    }
    levels
}

fn path(levels: &[Vec<BigUint>], index: usize) -> ([BigUint; TREE_DEPTH], [u8; TREE_DEPTH]) {
    let mut siblings: [BigUint; TREE_DEPTH] = Default::default();
    let mut bits = [0u8; TREE_DEPTH];
    let mut idx = index;
    for level in 0..TREE_DEPTH {
        bits[level] = (idx & 1) as u8;
        siblings[level] = levels[level][idx ^ 1].clone();
        idx >>= 1;
    }
    (siblings, bits)
}

fn field_list(values: &[BigUint]) -> String {
    let items = values
        .iter()
        .map(|v| format!("\"{}\"", v))
        .collect::<Vec<_>>()
        .join(", ");
    format!("[{}]", items)
}

fn nested_field_list(values: &[[BigUint; TREE_DEPTH]; RECIPIENTS]) -> String {
    let items = values
        .iter()
        .map(|row| field_list(row))
        .collect::<Vec<_>>()
        .join(",\n  ");
    format!("[\n  {}\n]", items)
}

fn bit_list(values: &[[u8; TREE_DEPTH]; RECIPIENTS]) -> String {
    let items = values
        .iter()
        .map(|row| {
            let inner = row
                .iter()
                .map(|bit| bit.to_string())
                .collect::<Vec<_>>()
                .join(", ");
            format!("[{}]", inner)
        })
        .collect::<Vec<_>>()
        .join(",\n  ");
    format!("[\n  {}\n]", items)
}

fn main() {
    let env = Env::default();
    env.cost_estimate().budget().reset_unlimited();

    let total = 4335u64;
    let cap = 1200u64;
    let amounts = [875u64, 640, 990, 720, 1110];
    let recipient_keys = [
        BigUint::from(11u32),
        BigUint::from(22u32),
        BigUint::from(33u32),
        BigUint::from(44u32),
        BigUint::from(55u32),
    ];
    let credential_secrets = [
        BigUint::from(101u32),
        BigUint::from(102u32),
        BigUint::from(103u32),
        BigUint::from(104u32),
        BigUint::from(105u32),
    ];
    let payout_salts = [
        BigUint::from(100u32),
        BigUint::from(200u32),
        BigUint::from(300u32),
        BigUint::from(400u32),
        BigUint::from(500u32),
    ];

    let mut kyc_leaves: [BigUint; TREE_SIZE] = Default::default();
    let blocked_leaves: [BigUint; TREE_SIZE] = Default::default();
    for i in 0..RECIPIENTS {
        kyc_leaves[i] = hash2(&env, &recipient_keys[i], &credential_secrets[i]);
    }

    let kyc_levels = tree_levels(&env, &kyc_leaves);
    let blocked_levels = tree_levels(&env, &blocked_leaves);
    let kyc_root = kyc_levels[TREE_DEPTH][0].clone();
    let blocked_root = blocked_levels[TREE_DEPTH][0].clone();

    let mut batch_commitment = BigUint::from(0u32);
    for i in 0..RECIPIENTS {
        let amount = BigUint::from(amounts[i]);
        let payout = hash2(
            &env,
            &hash2(&env, &amount, &recipient_keys[i]),
            &payout_salts[i],
        );
        batch_commitment = hash2(&env, &batch_commitment, &payout);
    }

    let mut kyc_path_siblings: [[BigUint; TREE_DEPTH]; RECIPIENTS] = Default::default();
    let mut blocked_path_siblings: [[BigUint; TREE_DEPTH]; RECIPIENTS] = Default::default();
    let mut kyc_path_bits = [[0u8; TREE_DEPTH]; RECIPIENTS];
    let mut blocked_path_bits = [[0u8; TREE_DEPTH]; RECIPIENTS];
    for i in 0..RECIPIENTS {
        let (siblings, bits) = path(&kyc_levels, i);
        kyc_path_siblings[i] = siblings;
        kyc_path_bits[i] = bits;
        let (siblings, bits) = path(&blocked_levels, i);
        blocked_path_siblings[i] = siblings;
        blocked_path_bits[i] = bits;
    }

    let out = format!(
        r#"total = {total}
cap = {cap}
kyc_root = "{kyc_root}"
blocked_root = "{blocked_root}"
batch_commitment = "{batch_commitment}"

amounts = [{amounts}]
recipient_keys = {recipient_keys}
credential_secrets = {credential_secrets}
payout_salts = {payout_salts}
kyc_path_siblings = {kyc_path_siblings}
kyc_path_bits = {kyc_path_bits}
blocked_path_siblings = {blocked_path_siblings}
blocked_path_bits = {blocked_path_bits}
"#,
        amounts = amounts
            .iter()
            .map(|v| v.to_string())
            .collect::<Vec<_>>()
            .join(", "),
        recipient_keys = field_list(&recipient_keys),
        credential_secrets = field_list(&credential_secrets),
        payout_salts = field_list(&payout_salts),
        kyc_path_siblings = nested_field_list(&kyc_path_siblings),
        kyc_path_bits = bit_list(&kyc_path_bits),
        blocked_path_siblings = nested_field_list(&blocked_path_siblings),
        blocked_path_bits = bit_list(&blocked_path_bits),
    );

    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../noir/payroll_batch/Prover.toml");
    fs::write(path, out).expect("write Prover.toml");
    println!("kyc_root={kyc_root}");
    println!("blocked_root={blocked_root}");
    println!("batch_commitment={batch_commitment}");
}
