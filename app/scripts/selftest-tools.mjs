const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TOOLS_API_KEY = process.env.TOOLS_API_KEY;

if (!TOOLS_API_KEY) {
  console.error("TOOLS_API_KEY is required");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  "x-tools-key": TOOLS_API_KEY,
};

async function callTool(name, payload) {
  const res = await fetch(`${BASE_URL}/api/tools/${name}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json?.ok) {
    throw new Error(`Tool ${name} failed: ${JSON.stringify(json)}`);
  }
  return json.data;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${expected} but got ${actual}`);
  }
}

async function main() {
  const user_id = "selftest";
  const thread_id = "t1";

  await callTool("set_bank_balance", {
    user_id,
    thread_id,
    bank_balance_mxn_cents: 500000,
    now_iso: "2026-02-01T10:00:00Z",
  });

  await callTool("set_budget_cap", {
    user_id,
    thread_id,
    variable_cap_mxn_cents: 600000,
    effective_month: "2026-02",
  });

  await callTool("add_or_update_debt", {
    user_id,
    thread_id,
    debt: {
      name: "Debt15",
      minimum_payment_mxn_cents: 50000,
      due_day_of_month: 15,
      priority: "HIGH",
      do_not_accelerate: false,
    },
  });

  await callTool("add_or_update_debt", {
    user_id,
    thread_id,
    debt: {
      name: "Debt31",
      minimum_payment_mxn_cents: 50000,
      due_day_of_month: 31,
      priority: "HIGH",
      do_not_accelerate: false,
    },
  });

  await callTool("add_or_update_debt", {
    user_id,
    thread_id,
    debt: {
      name: "Debt1",
      minimum_payment_mxn_cents: 50000,
      due_day_of_month: 1,
      priority: "HIGH",
      do_not_accelerate: false,
    },
  });

  const cases = [
    {
      date_iso: "2026-02-05",
      expected: { Debt15: "2026-02-15" },
      label: "case-1",
    },
    {
      date_iso: "2026-02-20",
      expected: { Debt15: "2026-03-15" },
      label: "case-2",
    },
    {
      date_iso: "2026-02-20",
      expected: { Debt31: "2026-02-28" },
      label: "case-3",
    },
    {
      date_iso: "2026-12-31",
      expected: { Debt1: "2027-01-01" },
      label: "case-4",
    },
  ];

  for (const testCase of cases) {
    const result = await callTool("simulate_purchase", {
      user_id,
      thread_id,
      purchase: {
        amount_mxn_cents: 10000,
        date_iso: testCase.date_iso,
        category: "Test",
        description: "selftest",
      },
    });

    const map = new Map(
      result.next_obligations.map((o) => [o.name, o.due_date_iso])
    );

    for (const [name, expectedDate] of Object.entries(testCase.expected)) {
      const actual = map.get(name);
      assertEqual(actual, expectedDate, `${testCase.label}:${name}`);
    }
  }

  console.log("OK");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
