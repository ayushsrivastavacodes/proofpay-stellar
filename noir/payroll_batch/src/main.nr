global RECIPIENTS: u32 = 5;

fn main(
    total: pub u64,
    cap: pub u64,
    kyc_root: pub Field,
    blocked_root: pub Field,
    batch_commitment: pub Field,
    amounts: [u64; 5],
    kyc_leaves: [Field; 5],
    blocked_leaves: [Field; 5],
    payout_salts: [Field; 5],
) {
    let mut computed_total: u64 = 0;
    let mut computed_kyc_root: Field = 0;
    let mut computed_blocked_root: Field = 0;
    let mut computed_batch_commitment: Field = 0;

    for i in 0..RECIPIENTS {
        assert(amounts[i] > 0);
        assert(amounts[i] <= cap);
        assert(blocked_leaves[i] == 0);

        computed_total = computed_total + amounts[i];
        computed_kyc_root = computed_kyc_root + kyc_leaves[i];
        computed_blocked_root = computed_blocked_root + blocked_leaves[i];

        let amount_field: Field = amounts[i] as Field;
        computed_batch_commitment =
            computed_batch_commitment + amount_field + kyc_leaves[i] + payout_salts[i];
    }

    assert(computed_total == total);
    assert(computed_kyc_root == kyc_root);
    assert(computed_blocked_root == blocked_root);
    assert(computed_batch_commitment == batch_commitment);
}

#[test]
fn test_valid_batch() {
    main(
        4335,
        1200,
        15,
        0,
        5850,
        [875, 640, 990, 720, 1110],
        [1, 2, 3, 4, 5],
        [0, 0, 0, 0, 0],
        [100, 200, 300, 400, 500],
    );
}
