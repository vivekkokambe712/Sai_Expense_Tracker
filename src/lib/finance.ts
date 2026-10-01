export const defaults = {
  expense: {
    home: [
      "Groceries",
      "Utilities",
      "Rent",
      "Home Maintenance",
      "Medical",
      "Education",
      "Transport",
    ],
    business: [
      "Raw Material",
      "Electricity",
      "WiFi / Internet",
      "Labour",
      "Transportation",
      "Maintenance",
      "Printing / Production",
      "Stationery",
      "Rent",
      "Miscellaneous",
    ],
  },
  income: {
    home: [
      "Salary",
      "Freelance",
      "Family Support",
      "Side Gig",
      "Other",
    ],
    business: [
      "Printing Orders",
      "Binding",
      "Xerox",
      "Visiting Cards",
      "Pamphlets / Brochures",
      "Stamps",
      "Other",
    ],
  },
} as const;

export const paymentMethods = ["Cash", "UPI", "Bank Transfer", "Card", "Other"] as const;
export type TransactionType = "income" | "expense";
export type MajorCategory = "home" | "business";
export const majorCategoryLabels: Record<MajorCategory, string> = {
  home: "Home",
  business: "Business",
};

export function normalizeMajorCategory(value: unknown): MajorCategory | null {
  return value === "home" || value === "business" ? value : null;
}

export function dateRange(query: URLSearchParams) {
  const from = query.get("from");
  const to = query.get("to");
  if ((from && !isValidDate(from)) || (to && !isValidDate(to))) {
    throw new Error("Invalid date range");
  }
  return { ...(from || to ? { date: { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) } } : {}) };
}

export function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function serialize<T extends { _id: unknown }>(document: T) {
  const { _id, ...fields } = document;
  return { ...fields, id: String(_id) };
}

export function validTransaction(value: unknown): value is {
  type: TransactionType;
  majorCategory: MajorCategory;
  amount: number;
  category: string;
  item: string;
  date: string;
  paymentMethod: string;
  notes: string;
} {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  const majorCategory = normalizeMajorCategory(data.majorCategory);
  return (
    (data.type === "income" || data.type === "expense") &&
    majorCategory !== null &&
    typeof data.amount === "number" && Number.isFinite(data.amount) && data.amount > 0 &&
    typeof data.category === "string" && data.category.trim().length > 0 && data.category.length <= 80 &&
    typeof data.date === "string" && isValidDate(data.date) &&
    typeof data.item === "string" && data.item.length <= 160 &&
    typeof data.notes === "string" && data.notes.length <= 1000 &&
    typeof data.paymentMethod === "string" && paymentMethods.includes(data.paymentMethod as (typeof paymentMethods)[number])
  );
}

export function errorResponse(error: unknown, message = "Unable to reach business data. Check the MongoDB connection and try again.") {
  if (error instanceof Error && error.message === "Invalid date range") {
    return Response.json({ error: error.message }, { status: 400 });
  }
  console.error("API request failed", error);
  return Response.json({ error: message }, { status: 500 });
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}