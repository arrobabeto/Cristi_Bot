import { parseMxnToCents } from "./parse";
import { TOOLS } from "@/lib/tools";

type ToolResponse<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

type HandleInput = {
  user_id: string;
  thread_id: string;
  text: string;
  now_iso: string;
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

export async function handleTelegramText(input: HandleInput): Promise<string> {
  const raw = input.text.trim();
  if (!raw) return "Mensaje vacio.";
  const lower = raw.toLowerCase();

  if (lower.startsWith("balance") || lower.startsWith("set balance")) {
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

  if (lower.startsWith("budget") || lower.startsWith("set budget")) {
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

  if (lower.startsWith("debt") || lower.startsWith("set debt")) {
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

  if (lower.startsWith("can i buy") || lower.startsWith("simulate")) {
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

  if (lower.startsWith("summary")) {
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

  const parsed = await TOOLS.parse_transaction_from_text({
    user_id: input.user_id,
    thread_id: input.thread_id,
    text: raw,
    now_iso: input.now_iso,
  });

  if (!parsed.ok) return `Error: ${parsed.error.message}`;

  const missing = parsed.data.missing_fields?.length
    ? `Falta: ${parsed.data.missing_fields.join(", ")}.`
    : "";
  const ambiguities = parsed.data.ambiguities?.length
    ? `Dudas: ${parsed.data.ambiguities.join(", ")}.`
    : "";

  return `Necesito mas datos para registrar la transaccion. ${missing} ${ambiguities}`.trim();
}
