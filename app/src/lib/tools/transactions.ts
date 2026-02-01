import { supabaseServer } from "../supabase/server";
import { normalizeCategoryTitleCase } from "./normalize";
import { err, ok, ToolResponse } from "./types";
import { isNonEmptyString, isNonNegativeInteger, isValidDateIso } from "./validate";

export type TransactionType = "EXPENSE" | "INCOME";
export type CategoryType =
  | "INCOME"
  | "FIXED"
  | "VARIABLE"
  | "DEBT"
  | "DONATION"
  | "SAVINGS";

export type TransactionCandidate = {
  type: TransactionType | null;
  amount_mxn_cents: number | null;
  category_type: CategoryType | null;
  category: string | null;
  description: string | null;
  date_iso: string | null;
};

function mexicoCityDateIso(nowIso: string): string | null {
  try {
    const dt = new Date(nowIso);
    if (Number.isNaN(dt.getTime())) return null;

    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(dt);

    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const d = parts.find((p) => p.type === "day")?.value;

    if (!y || !m || !d) return null;
    return `${y}-${m}-${d}`;
  } catch {
    return null;
  }
}

export async function parse_transaction_from_text(input: {
  user_id?: string;
  thread_id?: string;
  text?: string;
  now_iso?: string;
}): Promise<
  ToolResponse<{
    candidate: TransactionCandidate;
    inferred_fields: string[];
    missing_fields: string[];
    ambiguities: string[];
    confidence: number;
    low_confidence_fields: string[];
  }>
> {
  if (!input || !isNonEmptyString(input.text || "")) {
    return err("VALIDATION_ERROR", "text is required", { field: "text" });
  }

  const inferred_fields: string[] = [];
  const missing_fields: string[] = [];
  const low_confidence_fields: string[] = [];

  const candidate: TransactionCandidate = {
    type: null,
    amount_mxn_cents: null,
    category_type: null,
    category: null,
    description: null,
    date_iso: null,
  };

  if (!isNonEmptyString(input.now_iso || "")) {
    return err("VALIDATION_ERROR", "now_iso is required", { field: "now_iso" });
  }

  const inferred = mexicoCityDateIso(input.now_iso as string);
  if (inferred && isValidDateIso(inferred)) {
    candidate.date_iso = inferred;
    inferred_fields.push("date");
  }

  missing_fields.push("amount", "category", "category_type");

  return ok({
    candidate,
    inferred_fields,
    missing_fields,
    ambiguities: [],
    confidence: 0,
    low_confidence_fields,
  });
}

function isTypeCategoryConsistent(
  type: TransactionType,
  categoryType: CategoryType
): boolean {
  if (type === "INCOME") return categoryType === "INCOME";
  return (
    categoryType === "FIXED" ||
    categoryType === "VARIABLE" ||
    categoryType === "DEBT" ||
    categoryType === "DONATION" ||
    categoryType === "SAVINGS"
  );
}

export async function add_transaction(input: {
  user_id?: string;
  thread_id?: string;
  transaction?: {
    type?: TransactionType;
    amount_mxn_cents?: number;
    category_type?: CategoryType;
    category?: string;
    description?: string | null;
    date_iso?: string;
  };
}): Promise<
  ToolResponse<{
    transaction_id: string;
    stored: {
      type: TransactionType;
      amount_mxn_cents: number;
      category_type: CategoryType;
      category: string;
      description: string | null;
      date_iso: string;
    };
  }>
> {
  if (!input || !isNonEmptyString(input.user_id || "")) {
    return err("VALIDATION_ERROR", "user_id is required", { field: "user_id" });
  }
  if (!isNonEmptyString(input.thread_id || "")) {
    return err("VALIDATION_ERROR", "thread_id is required", { field: "thread_id" });
  }
  if (!input.transaction) {
    return err("VALIDATION_ERROR", "transaction is required", { field: "transaction" });
  }

  const { type, amount_mxn_cents, category_type, category, description, date_iso } =
    input.transaction;

  if (!type || (type !== "EXPENSE" && type !== "INCOME")) {
    return err("VALIDATION_ERROR", "type is required", { field: "transaction.type" });
  }
  if (!isNonNegativeInteger(amount_mxn_cents as number)) {
    return err("VALIDATION_ERROR", "amount_mxn_cents must be a non-negative integer", {
      field: "transaction.amount_mxn_cents",
    });
  }
  if (!category_type) {
    return err("VALIDATION_ERROR", "category_type is required", {
      field: "transaction.category_type",
    });
  }
  if (!isTypeCategoryConsistent(type, category_type)) {
    return err("VALIDATION_ERROR", "type and category_type are inconsistent", {
      field: "transaction.category_type",
    });
  }
  if (!isNonEmptyString(category || "")) {
    return err("VALIDATION_ERROR", "category is required", {
      field: "transaction.category",
    });
  }
  if (!isNonEmptyString(date_iso || "") || !isValidDateIso(date_iso as string)) {
    return err("VALIDATION_ERROR", "date_iso is invalid (expected YYYY-MM-DD)", {
      field: "transaction.date_iso",
    });
  }

  const normalizedCategory = normalizeCategoryTitleCase(category as string);

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: input.user_id,
      thread_id: input.thread_id,
      type,
      amount_mxn_cents,
      category_type,
      category: normalizedCategory,
      description: description ?? null,
      date_iso,
    })
    .select("id, type, amount_mxn_cents, category_type, category, description, date_iso")
    .single();

  if (error || !data) {
    return err("DB_ERROR", "Failed to add transaction");
  }

  return ok({
    transaction_id: data.id,
    stored: {
      type: data.type,
      amount_mxn_cents: data.amount_mxn_cents,
      category_type: data.category_type,
      category: normalizeCategoryTitleCase(data.category),
      description: data.description ?? null,
      date_iso: data.date_iso,
    },
  });
}

export async function update_last_transaction(input: {
  user_id?: string;
  thread_id?: string;
  patch?: {
    type?: TransactionType;
    amount_mxn_cents?: number;
    category_type?: CategoryType;
    category?: string;
    description?: string | null;
    date_iso?: string;
  };
}): Promise<
  ToolResponse<{
    transaction_id: string;
    previous: {
      type: TransactionType;
      amount_mxn_cents: number;
      category_type: CategoryType;
      category: string;
      description: string | null;
      date_iso: string;
    };
    current: {
      type: TransactionType;
      amount_mxn_cents: number;
      category_type: CategoryType;
      category: string;
      description: string | null;
      date_iso: string;
    };
  }>
> {
  if (!input || !isNonEmptyString(input.user_id || "")) {
    return err("VALIDATION_ERROR", "user_id is required", { field: "user_id" });
  }
  if (!isNonEmptyString(input.thread_id || "")) {
    return err("VALIDATION_ERROR", "thread_id is required", { field: "thread_id" });
  }
  if (!input.patch) {
    return err("VALIDATION_ERROR", "patch is required", { field: "patch" });
  }

  const supabase = supabaseServer();
  const { data: last, error: lastError } = await supabase
    .from("transactions")
    .select("id, type, amount_mxn_cents, category_type, category, description, date_iso")
    .eq("user_id", input.user_id)
    .eq("thread_id", input.thread_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastError) {
    return err("DB_ERROR", "Failed to load last transaction");
  }
  if (!last) {
    return err("NOT_FOUND", "No last transaction found to update");
  }

  const merged = {
    type: input.patch.type ?? last.type,
    amount_mxn_cents: input.patch.amount_mxn_cents ?? last.amount_mxn_cents,
    category_type: input.patch.category_type ?? last.category_type,
    category: input.patch.category ?? last.category,
    description:
      input.patch.description === undefined
        ? last.description
        : input.patch.description,
    date_iso: input.patch.date_iso ?? last.date_iso,
  };

  if (!isNonNegativeInteger(merged.amount_mxn_cents)) {
    return err("VALIDATION_ERROR", "amount_mxn_cents must be a non-negative integer", {
      field: "patch.amount_mxn_cents",
    });
  }
  if (!isNonEmptyString(merged.category)) {
    return err("VALIDATION_ERROR", "category is required", { field: "patch.category" });
  }
  if (!isValidDateIso(merged.date_iso)) {
    return err("VALIDATION_ERROR", "date_iso is invalid (expected YYYY-MM-DD)", {
      field: "patch.date_iso",
    });
  }
  if (!isTypeCategoryConsistent(merged.type, merged.category_type)) {
    return err("VALIDATION_ERROR", "type and category_type are inconsistent", {
      field: "patch.category_type",
    });
  }

  const normalizedCategory = normalizeCategoryTitleCase(merged.category);
  const { data: updated, error: updateError } = await supabase
    .from("transactions")
    .update({
      type: merged.type,
      amount_mxn_cents: merged.amount_mxn_cents,
      category_type: merged.category_type,
      category: normalizedCategory,
      description: merged.description ?? null,
      date_iso: merged.date_iso,
    })
    .eq("id", last.id)
    .select("id, type, amount_mxn_cents, category_type, category, description, date_iso")
    .single();

  if (updateError || !updated) {
    return err("DB_ERROR", "Failed to update transaction");
  }

  return ok({
    transaction_id: updated.id,
    previous: {
      type: last.type,
      amount_mxn_cents: last.amount_mxn_cents,
      category_type: last.category_type,
      category: normalizeCategoryTitleCase(last.category),
      description: last.description ?? null,
      date_iso: last.date_iso,
    },
    current: {
      type: updated.type,
      amount_mxn_cents: updated.amount_mxn_cents,
      category_type: updated.category_type,
      category: normalizeCategoryTitleCase(updated.category),
      description: updated.description ?? null,
      date_iso: updated.date_iso,
    },
  });
}

export async function delete_last_transaction(input: {
  user_id?: string;
  thread_id?: string;
}): Promise<
  ToolResponse<{
    deleted_transaction_id: string;
    deleted: {
      type: TransactionType;
      amount_mxn_cents: number;
      category_type: CategoryType;
      category: string;
      description: string | null;
      date_iso: string;
    };
  }>
> {
  if (!input || !isNonEmptyString(input.user_id || "")) {
    return err("VALIDATION_ERROR", "user_id is required", { field: "user_id" });
  }
  if (!isNonEmptyString(input.thread_id || "")) {
    return err("VALIDATION_ERROR", "thread_id is required", { field: "thread_id" });
  }

  const supabase = supabaseServer();
  const { data: last, error: lastError } = await supabase
    .from("transactions")
    .select("id, type, amount_mxn_cents, category_type, category, description, date_iso")
    .eq("user_id", input.user_id)
    .eq("thread_id", input.thread_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastError) {
    return err("DB_ERROR", "Failed to load last transaction");
  }
  if (!last) {
    return err("NOT_FOUND", "No last transaction found to delete");
  }

  const { error: deleteError } = await supabase
    .from("transactions")
    .delete()
    .eq("id", last.id);

  if (deleteError) {
    return err("DB_ERROR", "Failed to delete transaction");
  }

  return ok({
    deleted_transaction_id: last.id,
    deleted: {
      type: last.type,
      amount_mxn_cents: last.amount_mxn_cents,
      category_type: last.category_type,
      category: normalizeCategoryTitleCase(last.category),
      description: last.description ?? null,
      date_iso: last.date_iso,
    },
  });
}
