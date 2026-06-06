"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/ds/icon";
import { Card, Badge, Eyebrow, CatIcon, Avatar, EmptyState } from "@/components/ds/primitives";
import { Button, Input, Select, Segmented } from "@/components/ds/controls";
import { ExportButtons } from "@/components/expenses/export-buttons";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import {
  type ExpenseRow,
  type FilterOptions,
  type FilterState,
  DEFAULT_FILTERS,
  applyFilters,
  summarize,
} from "@/lib/analytics";
import { categoryMeta, memberColor, sourceMeta, shekel, fmt0, dateHe, monthLabel } from "@/lib/category-meta";
import { getCurrentMonthKey } from "@/lib/dates";
import {
  deleteExpenseAction,
  updateExpenseCategoryAction,
} from "@/app/(dashboard)/expenses/actions";

const MONTH_RE = /^\d{4}-\d{2}$/;
const COLS = "120px 1fr 150px 130px 150px 110px 76px";

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingInline: 18, borderInlineStart: "1px solid var(--border-subtle)" }}>
      <span className="eyebrow">{label}</span>
      <span className="num" style={{ fontSize: 20, fontWeight: 600, color: "var(--fg-0)" }}>{value}</span>
    </div>
  );
}

export function ExpensesExplorer({
  rows,
  options,
  currency,
}: {
  rows: ExpenseRow[];
  options: FilterOptions;
  currency: string;
}) {
  const params = useSearchParams();
  const monthKey = params.get("month") && MONTH_RE.test(params.get("month")!) ? params.get("month")! : getCurrentMonthKey();

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [memFilter, setMemFilter] = useState("all");
  const [scope, setScope] = useState<"month" | "all">("month");
  const [sort, setSort] = useState<"date" | "amount">("date");
  const [dialog, setDialog] = useState(false);

  // Open the add dialog when arriving via the sidebar's "+ הוצאה חדשה" link.
  useEffect(() => {
    if (params.get("add")) setDialog(true);
  }, [params]);

  const filters: FilterState = useMemo(
    () => ({
      ...DEFAULT_FILTERS,
      preset: scope === "month" ? "month" : "all",
      month: scope === "month" ? monthKey : null,
      categoryIds: catFilter === "all" ? [] : [catFilter],
      userIds: memFilter === "all" ? [] : [memFilter],
      search,
    }),
    [scope, monthKey, catFilter, memFilter, search],
  );

  const filtered = useMemo(() => {
    const list = applyFilters(rows, filters);
    return list.slice().sort((a, b) => {
      if (sort === "amount") return b.amount - a.amount;
      return a.expenseDate < b.expenseDate ? 1 : a.expenseDate > b.expenseDate ? -1 : 0;
    });
  }, [rows, filters, sort]);

  const sum = useMemo(() => summarize(filtered), [filtered]);
  const rangeLabel = scope === "month" ? monthLabel(monthKey) : "כל הזמן";

  const Th = ({ children, sortable, k }: { children?: React.ReactNode; sortable?: boolean; k?: "date" | "amount" }) => (
    <div
      onClick={sortable && k ? () => setSort(k) : undefined}
      style={{ display: "flex", alignItems: "center", gap: 5, cursor: sortable ? "pointer" : "default", color: k && sort === k ? "var(--fg-1)" : "var(--fg-3)" }}
    >
      {children}
      {sortable && <Icon name="chevrons-up-down" size={12} style={{ opacity: k && sort === k ? 1 : 0.5 }} />}
    </div>
  );

  const hasFilter = catFilter !== "all" || memFilter !== "all" || search.trim() !== "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="fade-up">
      <AddExpenseDialog open={dialog} onClose={() => setDialog(false)} options={options} currency={currency} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <Eyebrow>הוצאות</Eyebrow>
          <h1 style={{ fontSize: 28, marginTop: 7 }}>כל ההוצאות</h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ExportButtons rows={filtered} rangeLabel={rangeLabel} currency={currency} />
          <Button variant="primary" icon="plus" onClick={() => setDialog(true)}>
            הוצאה חדשה
          </Button>
        </div>
      </div>

      {/* summary band */}
      <Card padding={0}>
        <div style={{ display: "flex", alignItems: "center", padding: "16px 22px", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingInlineEnd: 18 }}>
            <span className="eyebrow">סה״כ מסונן</span>
            <span className="num" style={{ fontSize: 26, fontWeight: 700, color: "var(--accent-400)" }}>{shekel(sum.total, false, currency)}</span>
          </div>
          <SummaryStat label="עסקאות" value={fmt0(sum.count)} />
          <SummaryStat label="ממוצע" value={shekel(sum.average, false, currency)} />
          <SummaryStat label="הגדולה ביותר" value={shekel(sum.largest, false, currency)} />
          <SummaryStat label="בתי עסק" value={fmt0(sum.distinctMerchants)} />
          <div style={{ marginInlineStart: "auto" }}>
            <Segmented
              value={scope}
              onChange={setScope}
              options={[
                { value: "month", label: monthLabel(monthKey) },
                { value: "all", label: "כל הזמן" },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* filter bar */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <Input icon="search" value={search} onChange={setSearch} placeholder="חיפוש לפי בית עסק או קטגוריה…" />
        </div>
        <Select
          value={catFilter}
          onChange={setCatFilter}
          options={[{ value: "all", label: "כל הקטגוריות" }].concat(options.categories.map((c) => ({ value: c.id, label: c.name })))}
        />
        <Select
          value={memFilter}
          onChange={setMemFilter}
          options={[{ value: "all", label: "כל המשפחה" }].concat(options.members.map((m) => ({ value: m.id, label: m.name })))}
        />
        {hasFilter && (
          <Button
            variant="ghost"
            icon="x"
            onClick={() => {
              setCatFilter("all");
              setMemFilter("all");
              setSearch("");
            }}
          >
            נקה
          </Button>
        )}
      </div>

      {/* table */}
      <Card padding={0}>
        <div style={{ display: "grid", gridTemplateColumns: COLS, padding: "12px 22px", borderBottom: "1px solid var(--border-subtle)", fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600, gap: 12 }}>
          <Th sortable k="date">תאריך</Th>
          <Th>בית עסק</Th>
          <Th>קטגוריה</Th>
          <Th>בן משפחה</Th>
          <Th>אמצעי / מקור</Th>
          <Th sortable k="amount">סכום</Th>
          <Th />
        </div>

        {filtered.length === 0 && <EmptyState icon="search-x" title="לא נמצאו הוצאות" hint="נסו לשנות את הסינון או טווח התאריכים." />}

        {filtered.map((e, i) => {
          const meta = categoryMeta(e.categoryName);
          const src = sourceMeta(e.sourceType);
          return (
            <div
              key={e.id}
              className="noc-row"
              style={{ display: "grid", gridTemplateColumns: COLS, padding: "13px 22px", borderBottom: i < filtered.length - 1 ? "1px solid var(--border-subtle)" : "none", alignItems: "center", gap: 12, fontSize: 13.5 }}
            >
              <div className="num" style={{ color: "var(--fg-2)", fontSize: 12.5 }}>{dateHe(e.expenseDate)}</div>

              <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                <CatIcon icon={meta.icon} color={meta.color} size={32} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "var(--fg-0)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.merchantName ?? "—"}</div>
                  {e.status === "NEEDS_REVIEW" && <Badge tone="warning" style={{ marginTop: 3, height: 18, fontSize: 10 }}>לבדיקה</Badge>}
                </div>
              </div>

              <div>
                <form action={updateExpenseCategoryAction}>
                  <input type="hidden" name="id" value={e.id} />
                  <select
                    name="categoryId"
                    defaultValue={e.categoryId ?? ""}
                    onChange={(ev) => ev.currentTarget.form?.requestSubmit()}
                    title="שינוי קטגוריה"
                    className="noc-input"
                    style={{
                      appearance: "none",
                      height: 24,
                      padding: "0 10px",
                      borderRadius: 999,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      background: `color-mix(in oklab, ${meta.color} 14%, transparent)`,
                      color: meta.color,
                      border: `1px solid color-mix(in oklab, ${meta.color} 30%, transparent)`,
                      fontFamily: "var(--font-sans)",
                      maxWidth: "100%",
                    }}
                  >
                    <option value="">— ללא —</option>
                    {options.categories.map((c) => (
                      <option key={c.id} value={c.id} style={{ background: "var(--solid-panel)", color: "var(--fg-0)" }}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </form>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--fg-1)" }}>
                <Avatar name={e.userName} color={memberColor(e.userId ?? e.userName)} size={22} />
                <span style={{ fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.userName}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span className="num" style={{ fontSize: 11.5, color: "var(--fg-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.paymentMethod ?? "—"}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--fg-4)" }}>
                  <Icon name={src.icon} size={11} />
                  {src.label}
                </span>
              </div>

              <div className="num" style={{ fontSize: 14.5, fontWeight: 700, color: "var(--fg-0)" }}>{shekel(e.amount, true, currency)}</div>

              <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                <form action={deleteExpenseAction}>
                  <input type="hidden" name="id" value={e.id} />
                  <button type="submit" className="noc-btn" title="מחיקה" style={{ width: 30, height: 30, borderRadius: 8, background: "transparent", border: "1px solid transparent", color: "var(--fg-danger)", display: "grid", placeItems: "center", cursor: "pointer", transition: "all 120ms var(--ease-out-expo)" }}>
                    <Icon name="trash-2" size={14} />
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
