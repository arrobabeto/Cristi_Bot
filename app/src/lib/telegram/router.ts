import { parseMxnToCents } from "./parse";
import { TOOLS } from "@/lib/tools";

type ToolResponse<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

type HandleInput = {
  user_id: string;
  thread_id: string;
  text: string;
  now_iso: string;
};

type NormalizedCommand = {
  command: string;
  commandLower: string;
  rest: string;
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)} MXN`;
}

function extractMonth(nowIso: string): string | null {
  if (nowIso.length >= 7) return nowIso.slice(0, 7);
  return null;
}

function extractDateIso(nowIso: string): string | null {
  if (nowIso.length >= 10) return nowIso.slice(0, 10);
  return null;
}

function normalizeCommand(raw: string): NormalizedCommand {
  const trimmed = raw.trim();
  if (!trimmed) return { command: "", commandLower: "", rest: "" };
  const firstToken = trimmed.split(/\s+/)[0] ?? "";
  let commandToken = firstToken;
  if (commandToken.startsWith("/")) {
    commandToken = commandToken.replace(/^\/+/, "");
  }
  const atIndex = commandToken.indexOf("@");
  if (atIndex >= 0) {
    commandToken = commandToken.slice(0, atIndex);
  }
  const rest = trimmed.slice(firstToken.length).trim();
  return { command: commandToken, commandLower: commandToken.toLowerCase(), rest };
}

function helpMessage(): string {
  return (
    "Comandos disponibles:\n" +
    "- /help o ayuda\n" +
    "- /summary [YYYY-MM]\n" +
    "- /balance 5000\n" +
    "- /budget 6000 2026-02\n" +
    "- /deudas\n" +
    "- debt Visa priority=HIGH balance=12000 min=500 due=15\n" +
    "- can i buy 250 \"Comida\" 2026-02-01\n" +
    "\nEjemplos rapidos:\n" +
    "summary\n" +
    "balance 5000\n" +
    "budget 6000 2026-02\n" +
    "debt Visa priority=HIGH balance=12000 min=500 due=15\n" +
    "can i buy 250 \"Comida\" 2026-02-01\n" +
    "gasto 87 openai"
  );
}

function formatMissingFields(fields: string[]): string {
  if (!fields.length) return "";
  const mapped = fields.map((field) => {
    if (field === "amount") return "monto";
    if (field === "category") return "categoria";
    if (field === "category_type") return "tipo de categoria";
    return field;
  });
  return `Falta: ${mapped.join(", ")}.`;
}

function extractTransactionCandidate(input: {
  raw: string;
  now_iso: string;
  type: "EXPENSE" | "INCOME";
  category_type: "VARIABLE" | "INCOME";
}): {
  amount_mxn_cents: number | null;
  category: string | null;
  date_iso: string | null;
  missing_fields: string[];
} {
  const missing_fields: string[] = [];
  const dateMatch = input.raw.match(/\b\d{4}-\d{2}-\d{2}\b/);
  const date_iso = dateMatch?.[0] ?? extractDateIso(input.now_iso);

  const withoutPrefix = input.raw.replace(/^(gasto|expense|ingreso|income)\b/i, "").trim();
  const amountMatch = withoutPrefix.match(/-?\d[\d,]*(?:\.\d+)?/);
  const amount_mxn_cents = amountMatch ? parseMxnToCents(amountMatch[0]) : null;
  if (amount_mxn_cents === null) missing_fields.push("amount");

  const quoted = withoutPrefix.match(/"([^"]+)"/);
  let category = quoted?.[1]?.trim() ?? null;
  if (!category && amountMatch?.index !== undefined) {
    const afterAmount = withoutPrefix
      .slice(amountMatch.index + amountMatch[0].length)
      .replace(dateMatch?.[0] ?? "", "")
      .trim();
    category = afterAmount || null;
  }

  if (!category) missing_fields.push("category");

  return { amount_mxn_cents, category, date_iso, missing_fields };
}

export async function handleTelegramText(input: HandleInput): Promise<string> {
  const raw = input.text.trim();
  if (!raw) return "Mensaje vacio.";
  const lower = raw.toLowerCase();
  const normalized = normalizeCommand(raw);
  const commandLower = normalized.commandLower;

  if (["help", "ayuda", "start"].includes(commandLower)) {
    return helpMessage();
  }

  if (commandLower === "deudas") {
    const result = await TOOLS.get_debts({
      user_id: input.user_id,
      thread_id: input.thread_id,
    });

    if (!result.ok) return `Error: ${result.error.message}`;
    if (!result.data.debts.length) return "No hay deudas registradas.";

    const lines = result.data.debts.map((debt, index) => {
      const balance =
        debt.balance_mxn_cents === null ? "sin saldo" : formatCents(debt.balance_mxn_cents);
      const minimum =
        debt.minimum_payment_mxn_cents === null
          ? "sin minimo"
          : formatCents(debt.minimum_payment_mxn_cents);
      const due = debt.due_day_of_month ? `vence dia ${debt.due_day_of_month}` : "sin vencimiento";
      return `${index + 1}. ${debt.name} · ${balance} · ${minimum} · ${due} · prioridad ${debt.priority}`;
    });

    return `Deudas:\n${lines.join("\n")}`;
  }

  if (commandLower === "balance" || commandLower === "saldo" || lower.startsWith("set balance")) {
    const cents = parseMxnToCents(raw);
    if (cents === null) return "No pude leer el monto de saldo.";

    const result = await TOOLS.set_bank_balance({
      user_id: input.user_id,
      thread_id: input.thread_id,
      bank_balance_mxn_cents: cents,
      now_iso: input.now_iso,
    });

    if (!result.ok) return `Error: ${result.error.message}`;
    return `Saldo actualizado: ${formatCents(cents)}.`;
  }

  if (commandLower === "budget" || commandLower === "presupuesto" || lower.startsWith("set budget")) {
    const cents = parseMxnToCents(raw);
    if (cents === null) return "No pude leer el monto del presupuesto.";

    const monthMatch = raw.match(/\b\d{4}-\d{2}\b/);
    const month = monthMatch?.[0] ?? extractMonth(input.now_iso);
    if (!month) return "No pude determinar el mes (YYYY-MM).";

    const result = await TOOLS.set_budget_cap({
      user_id: input.user_id,
      thread_id: input.thread_id,
      variable_cap_mxn_cents: cents,
      effective_month: month,
    });

    if (!result.ok) return `Error: ${result.error.message}`;
    return `Presupuesto establecido para ${month}: ${formatCents(cents)}.`;
  }

  if (commandLower === "debt" || lower.startsWith("debt") || lower.startsWith("set debt")) {
    const rest = raw.replace(/^set\s+debt\s+|^debt\s+/i, "").trim();
    if (!rest) return "Falta el nombre de la deuda.";

    const tokens = rest.split(/\s+/);
    const nameParts: string[] = [];
    const fields: Record<string, string> = {};

    for (const token of tokens) {
      const eqIndex = token.indexOf("=");
      if (eqIndex > 0) {
        const key = token.slice(0, eqIndex).toLowerCase();
        const value = token.slice(eqIndex + 1);
        fields[key] = value;
      } else {
        nameParts.push(token);
      }
    }

    const name = nameParts.join(" ").trim();
    if (!name) return "Falta el nombre de la deuda.";

    const priority = fields.priority;
    if (!priority) return "Falta prioridad (priority=... ).";

    const balance = fields.balance ? parseMxnToCents(fields.balance) : null;
    const min = fields.min ? parseMxnToCents(fields.min) : null;
    const due = fields.due ? Number(fields.due) : null;
    const dna = fields.dna ? fields.dna.toLowerCase() : null;

    if (fields.balance && balance === null) return "No pude leer balance=.";
    if (fields.min && min === null) return "No pude leer min=.";
    if (fields.due) {
      if (due === null || !Number.isInteger(due) || due < 1 || due > 31) {
        return "due= debe ser un numero entre 1 y 31.";
      }
    }

    const result = await TOOLS.add_or_update_debt({
      user_id: input.user_id,
      thread_id: input.thread_id,
      debt: {
        name,
        balance_mxn_cents: balance === null ? undefined : balance,
        minimum_payment_mxn_cents: min === null ? undefined : min,
        due_day_of_month: due ?? undefined,
        priority,
        do_not_accelerate: dna === "true" ? true : dna === "false" ? false : undefined,
      },
    });

    if (!result.ok) return `Error: ${result.error.message}`;
    return `Deuda guardada: ${name}.`;
  }

  if (
    commandLower === "simulate" ||
    lower.startsWith("can i buy") ||
    lower.startsWith("puedo comprar")
  ) {
    const cents = parseMxnToCents(raw);
    if (cents === null) return "No pude leer el monto.";

    const dateMatch = raw.match(/\b\d{4}-\d{2}-\d{2}\b/);
    const dateIso = dateMatch?.[0] ?? extractDateIso(input.now_iso);
    if (!dateIso) return "No pude determinar la fecha (YYYY-MM-DD).";

    const quoted = raw.match(/"([^"]+)"/);
    const catMatch = raw.match(/cat:\s*([\w\s-]+)/i);
    const category = quoted?.[1]?.trim() ?? catMatch?.[1]?.trim();
    if (!category) return "Falta categoria (usa comillas o cat:).";

    const result = await TOOLS.simulate_purchase({
      user_id: input.user_id,
      thread_id: input.thread_id,
      purchase: {
        amount_mxn_cents: cents,
        date_iso: dateIso,
        category,
        description: raw,
      },
      assumptions: {
        cash_available_definition: "BANK_BALANCE_ONLY",
        include_cash: false,
      },
    });

    if (!result.ok) return `Error: ${result.error.message}`;

    const affordable = result.data.affordable ? "Si" : "No";
    const reasons = result.data.reasons.length
      ? `Razones: ${result.data.reasons.join("; ")}`
      : "";
    const remaining = formatCents(result.data.variable_remaining_mxn_cents);
    const obligations = result.data.next_obligations
      .map((o) => `${o.name}: ${formatCents(o.amount_mxn_cents)} (${o.due_date_iso ?? "sin fecha"})`)
      .join(" | ");

    return `Asequible: ${affordable}. ${reasons} Disponible variable: ${remaining}. Obligaciones: ${obligations}`.trim();
  }

  if (commandLower === "summary" || commandLower === "resumen" || lower.startsWith("summary")) {
    const monthMatch = raw.match(/\b\d{4}-\d{2}\b/);
    const month = monthMatch?.[0] ?? extractMonth(input.now_iso);
    if (!month) return "No pude determinar el mes (YYYY-MM).";

    const summary = await TOOLS.get_month_summary({
      user_id: input.user_id,
      thread_id: input.thread_id,
      month,
    });
    if (!summary.ok) return `Error: ${summary.error.message}`;

    const categories = await TOOLS.get_category_summary({
      user_id: input.user_id,
      thread_id: input.thread_id,
      month,
    });
    if (!categories.ok) return `Error: ${categories.error.message}`;

    const lines = categories.data.categories
      .map(
        (c: { category: string; category_type: string; expense_total_mxn_cents: number }) =>
          `${c.category} (${c.category_type}): ${formatCents(c.expense_total_mxn_cents)}`
      )
      .join(" | ");

    return (
      `Resumen ${month}: ` +
      `Ingresos ${formatCents(summary.data.income_total_mxn_cents)}, ` +
      `Gastos ${formatCents(summary.data.expense_total_mxn_cents)}, ` +
      `Variable restante ${formatCents(summary.data.variable_remaining_mxn_cents)}. ` +
      (lines ? `Categorias: ${lines}` : "")
    ).trim();
  }

  const isExpense = /^(gasto|expense)\b/i.test(raw);
  const isIncome = /^(ingreso|income)\b/i.test(raw);
  const defaultCategoryType = isExpense ? "VARIABLE" : isIncome ? "INCOME" : null;
  const parsed = await TOOLS.parse_transaction_from_text({
    user_id: input.user_id,
    thread_id: input.thread_id,
    text: raw,
    now_iso: input.now_iso,
  });

  if (!parsed.ok) return `Error: ${parsed.error.message}`;

  let missingFields = parsed.data.missing_fields ?? [];
  if (defaultCategoryType && missingFields.includes("category_type")) {
    const enriched = await TOOLS.parse_transaction_from_text({
      user_id: input.user_id,
      thread_id: input.thread_id,
      text: `${raw} category_type:${defaultCategoryType}`,
      now_iso: input.now_iso,
    });
    if (enriched.ok) {
      missingFields = enriched.data.missing_fields ?? missingFields;
    }
  }

  if (defaultCategoryType) {
    const extracted = extractTransactionCandidate({
      raw,
      now_iso: input.now_iso,
      type: isExpense ? "EXPENSE" : "INCOME",
      category_type: defaultCategoryType,
    });

    if (!extracted.missing_fields.length) {
      const addResult = await TOOLS.add_transaction({
        user_id: input.user_id,
        thread_id: input.thread_id,
        transaction: {
          type: isExpense ? "EXPENSE" : "INCOME",
          amount_mxn_cents: extracted.amount_mxn_cents ?? undefined,
          category_type: defaultCategoryType,
          category: extracted.category ?? undefined,
          description: raw,
          date_iso: extracted.date_iso ?? undefined,
        },
      });

      if (!addResult.ok) return `Error: ${addResult.error.message}`;

      const label = isExpense ? "Gasto" : "Ingreso";
      return `${label} registrado: ${formatCents(
        addResult.data.stored.amount_mxn_cents
      )} en ${addResult.data.stored.category}.`;
    }

    return `Necesito mas datos para registrar la transaccion. ${formatMissingFields(
      extracted.missing_fields
    )}`.trim();
  }

  const missing = missingFields.length ? formatMissingFields(missingFields) : "";
  const ambiguities = parsed.data.ambiguities?.length
    ? `Dudas: ${parsed.data.ambiguities.join(", ")}.`
    : "";

  return (
    "Necesito mas datos para registrar la transaccion. " +
    `${missing} ${ambiguities}`.trim() +
    "\nEjemplos: \"gasto 87 openai\" o \"ingreso 12000 sueldo\"."
  ).trim();
}
