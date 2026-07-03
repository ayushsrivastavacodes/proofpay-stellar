use dep::poseidon::poseidon2::Poseidon2;

global RECIPIENTS: u32 = 5;
global TREE_DEPTH: u32 = 3;

fn hash2(a: Field, b: Field) -> Field {
    Poseidon2::hash([a, b], 2)
}

fn constrain_bit(bit: Field) {
    assert(bit * (1 - bit) == 0);
}

fn compute_root(leaf: Field, path_siblings: [Field; 3], path_bits: [Field; 3]) -> Field {
    let mut cur = leaf;
    for i in 0..TREE_DEPTH {
        let bit = path_bits[i];
        constrain_bit(bit);
        if bit == 0 {
            cur = hash2(cur, path_siblings[i]);
        } else {
            cur = hash2(path_siblings[i], cur);
        }
    }
    cur
}

fn credential_leaf(recipient_key: Field, credential_secret: Field) -> Field {
    hash2(recipient_key, credential_secret)
}

fn payout_commitment(amount: u64, recipient_key: Field, payout_salt: Field) -> Field {
    hash2(hash2(amount as Field, recipient_key), payout_salt)
}

fn assert_same_path(a: [Field; 3], b: [Field; 3]) {
    for i in 0..TREE_DEPTH {
        assert(a[i] == b[i]);
    }
}

fn main(
    total: pub u64,
    cap: pub u64,
    kyc_root: pub Field,
    blocked_root: pub Field,
    batch_commitment: pub Field,
    amounts: [u64; 5],
    recipient_keys: [Field; 5],
    credential_secrets: [Field; 5],
    payout_salts: [Field; 5],
    kyc_path_siblings: [[Field; 3]; 5],
    kyc_path_bits: [[Field; 3]; 5],
    blocked_path_siblings: [[Field; 3]; 5],
    blocked_path_bits: [[Field; 3]; 5],
) {
    let mut computed_total: u64 = 0;
    let mut computed_batch_commitment: Field = 0;

    for i in 0..RECIPIENTS {
        assert(amounts[i] > 0);
        assert(amounts[i] <= cap);
        assert(recipient_keys[i] != 0);
        assert(credential_secrets[i] != 0);
        assert_same_path(kyc_path_bits[i], blocked_path_bits[i]);

        let kyc_leaf = credential_leaf(recipient_keys[i], credential_secrets[i]);
        assert(compute_root(kyc_leaf, kyc_path_siblings[i], kyc_path_bits[i]) == kyc_root);
        assert(compute_root(0, blocked_path_siblings[i], blocked_path_bits[i]) == blocked_root);

        computed_total = computed_total + amounts[i];
        computed_batch_commitment = hash2(
            computed_batch_commitment,
            payout_commitment(amounts[i], recipient_keys[i], payout_salts[i]),
        );
    }

    assert(computed_total == total);
    assert(computed_batch_commitment == batch_commitment);
}

#[test]
fn test_bit_constraint_accepts_boolean_values() {
    constrain_bit(0);
    constrain_bit(1);
}
