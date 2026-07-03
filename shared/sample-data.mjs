export const employer = {
  name: "Nebra Labs",
  stellarAddress: "GCPROOFPAYEMPLOYER000000000000000000000000000000000000000000",
};

export const payrollBatch = {
  batchId: "2026-07-global-contractors",
  asset: "USDC",
  cap: 1200,
  payouts: [
    {
      id: "ctr-001",
      name: "Asha Rao",
      country: "IN",
      stellarAddress: "GASHA000000000000000000000000000000000000000000000000000",
      amount: 875,
    },
    {
      id: "ctr-002",
      name: "Luis Gomez",
      country: "MX",
      stellarAddress: "GLUIS00000000000000000000000000000000000000000000000000",
      amount: 640,
    },
    {
      id: "ctr-003",
      name: "Mina Park",
      country: "KR",
      stellarAddress: "GMINA00000000000000000000000000000000000000000000000000",
      amount: 990,
    },
    {
      id: "ctr-004",
      name: "Sam Okafor",
      country: "NG",
      stellarAddress: "GSAM000000000000000000000000000000000000000000000000000",
      amount: 720,
    },
    {
      id: "ctr-005",
      name: "Elena Ionescu",
      country: "RO",
      stellarAddress: "GELENA000000000000000000000000000000000000000000000000",
      amount: 1110,
    }
  ],
};

export const kycAllowlist = payrollBatch.payouts.map((payout) => payout.stellarAddress);

export const blockedList = [
  "GBLOCKED0000000000000000000000000000000000000000000000000",
  "GSANCTIONED0000000000000000000000000000000000000000000000",
];
