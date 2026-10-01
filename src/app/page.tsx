"use client";

import {
  ArrowDownLeft, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, CalendarDays, Check,
  ChevronDown, ChevronRight, CircleHelp, Download, FileJson2, FileSpreadsheet, Filter, Home,
  LoaderCircle, MoreHorizontal, Pencil, Plus, Search, Settings2, Trash2, TrendingUp, Wallet, X,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type MajorCategory = "home" | "business";
type Transaction = { id: string; type: "income" | "expense"; majorCategory: MajorCategory; amount: number; category: string; item: string; date: string; paymentMethod: string; notes: string; createdAt: string; updatedAt: string };
type Category = { id: string; name: string; type: "income" | "expense"; majorCategory: MajorCategory };
type CategoryInsight = { name: string; total: number; count: number; majorCategory: MajorCategory };
type Summary = { income: number; expense: number; profit: number; incomeCount: number; expenseCount: number };
type MajorSummary = Record<MajorCategory, { income: number; expense: number }>;
type View = "home" | "transactions" | "analysis";
type Period = "Today" | "This Week" | "This Month" | "Last Month" | "This Year" | "Custom";
type Range = { from: string; to: string };

function localDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
const today = () => localDate(new Date());
function rangeFor(period: Period): Range {
  const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const end = new Date(start);
  if (period === "Today") return { from: localDate(start), to: localDate(end) };
  if (period === "This Week") { start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); return { from: localDate(start), to: localDate(end) }; }
  if (period === "This Month") return { from: localDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: localDate(end) };
  if (period === "Last Month") return { from: localDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: localDate(new Date(now.getFullYear(), now.getMonth(), 0)) };
  if (period === "This Year") return { from: localDate(new Date(now.getFullYear(), 0, 1)), to: localDate(end) };
  return { from: "", to: "" };
}
function money(amount: number) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount || 0); }
function prettyDate(value: string) { return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
const colors = ["#d55e3d", "#1d7165", "#dda743", "#718096", "#a64e47", "#5d8e78", "#8a7967"];
const majorCategoryOptions = [
  { value: "home", label: "Home" },
  { value: "business", label: "Business" },
] as const;
const emptySummary: Summary = { income: 0, expense: 0, profit: 0, incomeCount: 0, expenseCount: 0 };
const emptyMajorSummary: MajorSummary = { home: { income: 0, expense: 0 }, business: { income: 0, expense: 0 } };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.error || "Unable to complete that request. Please try again."); }
  return response.status === 204 ? (undefined as T) : response.json();
}

export default function HomePage() {
  const [view, setView] = useState<View>("home");
  const [period, setPeriod] = useState<Period>("This Month");
  const [customRange, setCustomRange] = useState<Range>({ from: "", to: "" });
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [todaySummary, setTodaySummary] = useState<Summary>(emptySummary);
  const [majorSummary, setMajorSummary] = useState<MajorSummary>(emptyMajorSummary);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryInsight[]>([]);
  const [itemData, setItemData] = useState<{ name: string; total: number; count: number }[]>([]);
  const [topExpenses, setTopExpenses] = useState<{ item: string; category: string; amount: number; date: string }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; income: number; expense: number; profit: number }[]>([]);
  const [search, setSearch] = useState(""); const [typeFilter, setTypeFilter] = useState("all"); const [categoryFilter, setCategoryFilter] = useState("");
  const [periodMenu, setPeriodMenu] = useState(false); const [dialog, setDialog] = useState<"transaction" | "categories" | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null); const [initialType, setInitialType] = useState<"income" | "expense">("expense"); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState("");
  const activeRange = period === "Custom" ? customRange : rangeFor(period);
  const query = useMemo(() => { const params = new URLSearchParams(); if (activeRange.from) params.set("from", activeRange.from); if (activeRange.to) params.set("to", activeRange.to); return params.toString(); }, [activeRange.from, activeRange.to]);

  const refresh = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true); setError("");
    try {
      const [sum, todaySum, majorResult, categoryResult, itemsResult, trend, topResult, categoryList] = await Promise.all([
        api<Summary>(`/api/analytics/summary?${query}`), api<Summary>(`/api/analytics/summary?from=${today()}&to=${today()}`),
        api<MajorSummary>(`/api/analytics/major-categories?${query}`),
        api<{ categories: CategoryInsight[] }>(`/api/analytics/categories?${query}`), api<{ items: typeof itemData }>(`/api/analytics/items?${query}`),
        api<{ months: typeof monthlyData }>(`/api/analytics/monthly?${query}`), api<{ expenses: typeof topExpenses }>(`/api/analytics/top-expenses?${query}`), api<{ categories: Category[] }>("/api/categories"),
      ]);
      setSummary(sum); setTodaySummary(todaySum); setMajorSummary(majorResult); setCategoryData(categoryResult.categories); setItemData(itemsResult.items); setMonthlyData(trend.months); setTopExpenses(topResult.expenses); setCategories(categoryList.categories);
      const params = new URLSearchParams({ page: "1", limit: "50" });
      if (activeRange.from) params.set("from", activeRange.from); if (activeRange.to) params.set("to", activeRange.to);
      if (typeFilter !== "all") params.set("type", typeFilter); if (categoryFilter) params.set("category", categoryFilter); if (search.trim()) params.set("q", search.trim());
      const result = await api<{ transactions: Transaction[]; total: number }>(`/api/transactions?${params}`);
      setTransactions(result.transactions); setTotalTransactions(result.total);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load business data."); }
    finally { setLoading(false); setRefreshing(false); }
  }, [query, activeRange.from, activeRange.to, typeFilter, categoryFilter, search]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const addTransaction = (transaction?: Transaction, type: "income" | "expense" = "expense") => { setEditing(transaction || null); setInitialType(transaction?.type || type); setDialog("transaction"); };
  const afterSave = () => { setDialog(null); setEditing(null); void refresh(true); };
  async function deleteTransaction(transaction: Transaction) {
    if (!window.confirm(`Delete this ${transaction.type} of ${money(transaction.amount)}?`)) return;
    try { await api(`/api/transactions/${transaction.id}`, { method: "DELETE" }); void refresh(true); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to delete transaction."); }
  }
  async function loadMore() {
    const params = new URLSearchParams({ page: String(Math.floor(transactions.length / 50) + 1), limit: "50" });
    if (activeRange.from) params.set("from", activeRange.from); if (activeRange.to) params.set("to", activeRange.to);
    if (typeFilter !== "all") params.set("type", typeFilter); if (categoryFilter) params.set("category", categoryFilter); if (search.trim()) params.set("q", search.trim());
    try { const result = await api<{ transactions: Transaction[] }>(`/api/transactions?${params}`); setTransactions((current) => [...current, ...result.transactions]); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load transactions."); }
  }
  return <main className="app-shell">
    <aside className="side-rail"><a className="brand" href="#home" onClick={() => setView("home")}><span className="brand-mark"><span>S</span></span><span className="brand-copy">Sai<span> Enterprise</span><small>PRINT BUSINESS</small></span></a><div className="rail-label">WORKSPACE</div>
      <NavButton active={view === "home"} onClick={() => setView("home")} icon={<Home size={18} />} label="Overview" /><NavButton active={view === "transactions"} onClick={() => setView("transactions")} icon={<ArrowDownLeft size={18} />} label="Transactions" /><NavButton active={view === "analysis"} onClick={() => setView("analysis")} icon={<BarChart3 size={18} />} label="Analysis" />
      <div className="rail-bottom"><button className="rail-settings" onClick={() => setDialog("categories")}><Settings2 size={17} /> Categories</button><div className="business-chip"><div className="business-avatar">S</div><div><strong>Sai Enterprise</strong><span>Business workspace</span></div><MoreHorizontal size={18} /></div></div>
    </aside>
    <section className="main-column"><header className="topbar"><div className="mobile-brand"><span className="brand-mark"><span>S</span></span><span>Sai<span> Enterprise</span></span></div><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{view === "home" ? "Overview" : view === "transactions" ? "Transactions" : "Analysis"}</strong></div><div className="top-actions"><a className="download-link" href="/api/export/csv" title="Download CSV"><Download size={16} /><span>Export</span><ChevronDown size={13} /></a><button className="icon-button" title="Manage categories" onClick={() => setDialog("categories")}><Settings2 size={18} /></button><button className="profile-button" title="Sai Enterprise">S</button></div></header>
      <div className="page-content"><div className="page-heading"><div><div className="eyebrow"><span className="live-dot" /> {view === "home" ? "SAI ENTERPRISE · FINANCIAL OVERVIEW" : "YOUR BUSINESS, AT A GLANCE"}</div><h1>{view === "home" ? "Financial Dashboard" : view === "transactions" ? "Money in, money out." : "Know where it goes."}</h1><p>{view === "home" ? "Overview of your business and household finances." : view === "transactions" ? "Every rupee, accounted for." : "Your business patterns, made simple."}</p></div><button className="primary-button heading-add" onClick={() => addTransaction()}><Plus size={17} /> Add transaction</button></div>
        {error && <div className="error-banner"><CircleHelp size={17} />{error}<button onClick={() => void refresh(true)}>Retry</button></div>}
        <div className={`toolbar-row ${view === "home" ? "dashboard-toolbar" : ""}`}>{view === "home" ? <div className="period-chips" role="group" aria-label="Dashboard date range">{(["Today", "This Week", "This Month", "Last Month", "This Year", "Custom"] as Period[]).map((option) => <button key={option} className={period === option ? "selected" : ""} aria-pressed={period === option} onClick={() => setPeriod(option)}>{option}</button>)}</div> : <div className="period-picker-wrap"><button className="period-picker" onClick={() => setPeriodMenu((open) => !open)}><CalendarDays size={16} /><span>{period}</span><ChevronDown size={15} /></button>{periodMenu && <div className="period-menu">{(["Today", "This Week", "This Month", "Last Month", "This Year", "Custom"] as Period[]).map((option) => <button key={option} className={period === option ? "selected" : ""} onClick={() => { setPeriod(option); setPeriodMenu(false); }}>{option}{period === option && <Check size={14} />}</button>)}</div>}</div>}
          {period === "Custom" && <div className="custom-dates"><input aria-label="Start date" type="date" value={customRange.from} onChange={(event) => setCustomRange((value) => ({ ...value, from: event.target.value }))} /><ArrowRight size={14} /><input aria-label="End date" type="date" value={customRange.to} onChange={(event) => setCustomRange((value) => ({ ...value, to: event.target.value }))} /></div>}
          <div className="toolbar-spacer" />{refreshing && <span className="sync-label"><LoaderCircle size={14} className="spin" /> Updating</span>}<div className="export-buttons"><a href="/api/export/csv" title="Download CSV"><FileSpreadsheet size={15} /><span>CSV</span></a><a href="/api/export/json" title="Download JSON"><FileJson2 size={15} /><span>JSON</span></a></div></div>
        {view === "home" && <Dashboard period={period} summary={summary} todaySummary={todaySummary} majorSummary={majorSummary} categoryData={categoryData} transactions={transactions.slice(0, 5)} loading={loading} onAdd={addTransaction} onViewAll={() => setView("transactions")} onEdit={addTransaction} onDelete={deleteTransaction} />}
        {view === "transactions" && <TransactionsView transactions={transactions} total={totalTransactions} categories={categories} search={search} setSearch={setSearch} typeFilter={typeFilter} setTypeFilter={setTypeFilter} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} loading={loading} onAdd={addTransaction} onEdit={addTransaction} onDelete={deleteTransaction} onMore={loadMore} />}
        {view === "analysis" && <AnalysisView summary={summary} majorSummary={majorSummary} categoryData={categoryData} itemData={itemData} topExpenses={topExpenses} monthlyData={monthlyData} loading={loading} />}
        <footer className="page-footer"><span>Sai Enterprise <span className="footer-dot">·</span> Business finances, made clear.</span><span>INR <span className="footer-dot">·</span> Data stored securely</span></footer>
      </div>
    </section>
    <button className="mobile-add" onClick={() => addTransaction()}><Plus size={19} /><span>Add</span></button><nav className="mobile-nav" aria-label="Main navigation"><NavButton active={view === "home"} onClick={() => setView("home")} icon={<Home size={19} />} label="Home" /><NavButton active={view === "transactions"} onClick={() => setView("transactions")} icon={<ArrowDownLeft size={19} />} label="Transactions" /><NavButton active={view === "analysis"} onClick={() => setView("analysis")} icon={<BarChart3 size={19} />} label="Analysis" /></nav>
    {dialog === "transaction" && <TransactionDialog categories={categories} editing={editing} initialType={initialType} onClose={() => { setDialog(null); setEditing(null); }} onSaved={afterSave} />}{dialog === "categories" && <CategoryDialog categories={categories} onClose={() => setDialog(null)} onChanged={() => void refresh(true)} />}
  </main>;
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) { return <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}>{icon}<span>{label}</span></button>; }

function Dashboard({ period, summary, todaySummary, majorSummary, categoryData, transactions, loading, onAdd, onViewAll, onEdit, onDelete }: { period: Period; summary: Summary; todaySummary: Summary; majorSummary: MajorSummary; categoryData: CategoryInsight[]; transactions: Transaction[]; loading: boolean; onAdd: (transaction?: Transaction, type?: "income" | "expense") => void; onViewAll: () => void; onEdit: (transaction?: Transaction) => void; onDelete: (transaction: Transaction) => void }) {
  const topCategories = Object.values(categoryData.reduce<Record<string, { name: string; total: number; count: number }>>((groups, category) => {
    const current = groups[category.name] ??= { name: category.name, total: 0, count: 0 };
    current.total += category.total;
    current.count += category.count;
    return groups;
  }, {})).sort((first, second) => second.total - first.total).slice(0, 5);
  const maxCategory = topCategories[0]?.total || 1;
  const businessNet = majorSummary.business.income - majorSummary.business.expense;
  const homeNet = majorSummary.home.income - majorSummary.home.expense;
  return <div className="dashboard-layout"><section className="today-strip" aria-label="Today's totals"><div><span>Today&apos;s income</span><strong className="green-text">{loading ? "—" : money(todaySummary.income)}</strong></div><div><span>Today&apos;s expense</span><strong className="red-text">{loading ? "—" : money(todaySummary.expense)}</strong></div><div><span>Today&apos;s net</span><strong className={todaySummary.profit < 0 ? "red-text" : "green-text"}>{loading ? "—" : money(todaySummary.profit)}</strong></div></section>
    <section className="dashboard-metrics" aria-label="Selected period totals"><MetricCard label="Total income" amount={summary.income} count={summary.incomeCount} tone="green" icon={<ArrowDownLeft size={17} />} loading={loading} /><MetricCard label="Total expenses" amount={summary.expense} count={summary.expenseCount} tone="red" icon={<ArrowUpRight size={17} />} loading={loading} /><MetricCard label="Net profit / result" amount={summary.profit} count={summary.incomeCount + summary.expenseCount} tone="gold" icon={<Wallet size={17} />} loading={loading} /></section>
    <section className="separation-panel"><div className="separation-heading"><div><span className="separation-icon"><BarChart3 size={16} /></span><h2>Business vs Home</h2></div><span>{period}</span></div><div className="separation-grid"><div><span className="separation-label">Business net</span><strong className={businessNet < 0 ? "red-text" : "green-text"}>{loading ? "—" : money(businessNet)}</strong><small>Income {money(majorSummary.business.income)} · Expenses {money(majorSummary.business.expense)}</small></div><div><span className="separation-label">Home net</span><strong className={homeNet < 0 ? "red-text" : "green-text"}>{loading ? "—" : money(homeNet)}</strong><small>Income {money(majorSummary.home.income)} · Expenses {money(majorSummary.home.expense)}</small></div><div><span className="separation-label">Available overall</span><strong className={summary.profit < 0 ? "red-text" : "green-text"}>{loading ? "—" : money(summary.profit)}</strong><small>Income less expenses for {period.toLowerCase()}</small></div></div></section>
    <section className="dashboard-quick-actions" aria-label="Quick actions"><button className="dashboard-action expense-action" onClick={() => onAdd()}><ArrowUpRight size={16} /> Add expense</button><button className="dashboard-action income-action" onClick={() => onAdd(undefined, "income")}><ArrowDownRight size={16} /> Add income</button><a className="dashboard-action export-action" href="/api/export/csv"><Download size={16} /> Export CSV</a></section>
    <div className="dashboard-lower"><section className="dashboard-panel top-categories-panel"><div className="dashboard-panel-heading"><h2>Top categories</h2><span>EXPENSES</span></div>{topCategories.length ? <div className="top-category-list">{topCategories.map((category) => <div className="top-category-row" key={category.name}><div><span>{category.name}</span><strong>{money(category.total)}</strong></div><div className="category-progress"><i style={{ width: `${Math.max(4, category.total / maxCategory * 100)}%` }} /></div></div>)}</div> : <EmptyAnalysis loading={loading} />}</section>
      <section className="dashboard-panel recent-panel"><div className="dashboard-panel-heading"><h2>Recent transactions</h2><button className="text-action" onClick={onViewAll}>View all <ChevronRight size={14} /></button></div>{transactions.length ? <div className="transaction-list compact-list">{transactions.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} onEdit={onEdit} onDelete={onDelete} />)}</div> : <EmptyTransactions loading={loading} onAdd={onAdd} />}</section></div></div>;
}

function MetricCard({ label, amount, count, tone, icon, loading }: { label: string; amount: number; count: number; tone: string; icon: React.ReactNode; loading: boolean }) { return <div className={`metric-card metric-${tone}`}><div className="metric-top"><span>{label}</span><span className="metric-icon">{icon}</span></div><strong>{loading ? "—" : money(amount)}</strong><div className="metric-bottom"><span>{count} {count === 1 ? "entry" : "entries"}</span><span className="metric-spark"><i /><i /><i /><i /><i /><i /></span></div></div>; }

function TransactionsView({ transactions, total, categories, search, setSearch, typeFilter, setTypeFilter, categoryFilter, setCategoryFilter, loading, onAdd, onEdit, onDelete, onMore }: { transactions: Transaction[]; total: number; categories: Category[]; search: string; setSearch: (value: string) => void; typeFilter: string; setTypeFilter: (value: string) => void; categoryFilter: string; setCategoryFilter: (value: string) => void; loading: boolean; onAdd: (transaction?: Transaction) => void; onEdit: (transaction?: Transaction) => void; onDelete: (transaction: Transaction) => void; onMore: () => void }) {
  const grouped = useMemo(() => transactions.reduce<Record<string, Transaction[]>>((groups, item) => { (groups[item.date] ||= []).push(item); return groups; }, {}), [transactions]);
  return <section className="section-block list-page"><div className="list-intro"><div><h2>Transaction history</h2><p>{total} recorded {total === 1 ? "entry" : "entries"}</p></div><div className="list-balance"><span>Net for period</span><strong>{money(transactions.reduce((net, item) => net + (item.type === "income" ? item.amount : -item.amount), 0))}</strong></div></div>
    <div className="filter-toolbar"><label className="search-box"><Search size={17} /><input placeholder="Search item, category, notes..." value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>/</kbd></label><div className="segmented-filter">{["all", "income", "expense"].map((type) => <button key={type} className={typeFilter === type ? "selected" : ""} onClick={() => setTypeFilter(type)}>{type[0].toUpperCase() + type.slice(1)}</button>)}</div><label className="category-select"><Filter size={15} /><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select><ChevronDown size={13} /></label></div>
    {loading ? <div className="loading-state"><LoaderCircle className="spin" size={20} /> Loading transactions...</div> : transactions.length ? <div className="transaction-groups">{Object.entries(grouped).map(([date, records]) => <div className="transaction-group" key={date}><div className="date-heading"><span>{new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span><i /></div><div className="transaction-list">{records.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} onEdit={onEdit} onDelete={onDelete} />)}</div></div>)}</div> : <EmptyTransactions loading={false} onAdd={onAdd} />}
    {transactions.length < total && <button className="load-more" onClick={onMore}>Load more <ChevronDown size={15} /></button>}</section>;
}

function TransactionRow({ transaction, onEdit, onDelete }: { transaction: Transaction; onEdit: (transaction?: Transaction) => void; onDelete?: (transaction: Transaction) => void }) { return <article className="transaction-row"><div className={`transaction-symbol ${transaction.type}`}>{transaction.type === "income" ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</div><button className="transaction-copy" onClick={() => onEdit(transaction)}><strong>{transaction.item || transaction.category}</strong><span>{transaction.category}<b>·</b>{transaction.paymentMethod}</span></button><div className="transaction-amount-wrap"><strong className={`transaction-amount ${transaction.type}`}>{transaction.type === "income" ? "+" : "−"}{money(transaction.amount)}</strong><span className="transaction-date-mobile">{prettyDate(transaction.date)}</span></div><button className="row-edit" title="Edit transaction" aria-label={`Edit ${transaction.item || transaction.category}`} onClick={() => onEdit(transaction)}><Pencil size={15} /></button>{onDelete && <button className="row-delete" title={`Delete ${transaction.item || transaction.category}`} aria-label={`Delete ${transaction.item || transaction.category}`} onClick={() => onDelete(transaction)}><Trash2 size={15} /></button>}</article>; }

function AnalysisView({ summary, majorSummary, categoryData, itemData, topExpenses, monthlyData, loading }: { summary: Summary; majorSummary: MajorSummary; categoryData: CategoryInsight[]; itemData: { name: string; total: number; count: number }[]; topExpenses: { item: string; category: string; amount: number; date: string }[]; monthlyData: { month: string; income: number; expense: number; profit: number }[]; loading: boolean }) {
  const [majorFilter, setMajorFilter] = useState<"all" | MajorCategory>("all");
  const filteredCategories = categoryData.filter((entry) => majorFilter === "all" || entry.majorCategory === majorFilter);
  const filteredSpend = filteredCategories.reduce((total, entry) => total + entry.total, 0);
  const leadingCategory = filteredCategories[0];
  const averageExpense = summary.expenseCount ? summary.expense / summary.expenseCount : 0;
  const leadingShare = filteredSpend ? (leadingCategory?.total ?? 0) / filteredSpend * 100 : 0;
  const overallSpend = majorSummary.home.expense + majorSummary.business.expense;
  const homeShare = overallSpend ? majorSummary.home.expense / overallSpend * 100 : 0;
  const businessShare = overallSpend ? majorSummary.business.expense / overallSpend * 100 : 0;
  const majorRows = [
    { key: "home" as const, label: "Home", totals: majorSummary.home, share: homeShare },
    { key: "business" as const, label: "Business", totals: majorSummary.business, share: businessShare },
  ];
  return <div className="analysis-layout"><section className="analysis-total-strip"><div><span>INCOME</span><strong className="green-text">{loading ? "—" : money(summary.income)}</strong></div><span className="strip-operator">−</span><div><span>EXPENSES</span><strong className="red-text">{loading ? "—" : money(summary.expense)}</strong></div><span className="strip-operator">=</span><div><span>PROFIT</span><strong>{loading ? "—" : money(summary.profit)}</strong></div></section>
    <section className="analysis-insights"><div><span>Average expense</span><strong>{loading ? "—" : money(averageExpense)}</strong><small>per expense transaction</small></div><div><span>Highest subcategory</span><strong>{loading ? "—" : leadingCategory?.name ?? "No data"}</strong><small>{leadingCategory ? money(leadingCategory.total) : "Add expenses to see a leading category"}</small></div><div><span>Top category share</span><strong>{loading ? "—" : `${leadingShare.toFixed(0)}%`}</strong><small>{majorFilter === "all" ? "of selected-period spending" : `of ${majorFilter} spending`}</small></div></section>
    <div className="analysis-grid"><section className="analysis-panel category-panel"><div className="panel-heading"><div><span className="section-index">01</span><h2>Where expenses go</h2></div><div className="analysis-major-filter" role="group" aria-label="Filter spending by major category">{(["all", "home", "business"] as const).map((filter) => <button key={filter} className={majorFilter === filter ? "selected" : ""} aria-pressed={majorFilter === filter} onClick={() => setMajorFilter(filter)}>{filter === "all" ? "All" : filter === "home" ? "Home" : "Business"}</button>)}</div></div><p className="panel-caption">Subcategory spend and transaction counts</p>{filteredCategories.length ? <div className="donut-layout"><div className="donut-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={filteredCategories} dataKey="total" nameKey="name" innerRadius="68%" outerRadius="94%" paddingAngle={3} stroke="none">{filteredCategories.map((entry, index) => <Cell key={`${entry.majorCategory}-${entry.name}`} fill={colors[index % colors.length]} />)}</Pie><Tooltip formatter={(value) => money(Number(value))} /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{money(filteredSpend)}</strong><span>spent</span></div></div><div className="legend-list">{filteredCategories.slice(0, 6).map((entry, index) => <div className="legend-item" key={`${entry.majorCategory}-${entry.name}`}><i style={{ backgroundColor: colors[index % colors.length] }} /><span>{entry.name}<small>{entry.majorCategory} · {entry.count} {entry.count === 1 ? "entry" : "entries"}</small></span><strong>{money(entry.total)}</strong></div>)}</div></div> : <EmptyAnalysis loading={loading} />}</section>
      <section className="analysis-panel performance-panel"><div className="panel-heading"><div><span className="section-index">02</span><h2>Income & expenses</h2></div><span className="panel-icon"><BarChart3 size={18} /></span></div><p className="panel-caption">Monthly performance in this period</p>{monthlyData.length ? <div className="performance-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyData} barGap={8}><CartesianGrid vertical={false} stroke="#e9e8e3" /><XAxis dataKey="month" tickFormatter={(value) => new Date(`${value}-02`).toLocaleDateString("en-IN", { month: "short" })} axisLine={false} tickLine={false} tick={{ fill: "#898a83", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} width={48} tickFormatter={(value) => value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)} tick={{ fill: "#898a83", fontSize: 10 }} /><Tooltip formatter={(value) => money(Number(value))} /><Bar dataKey="income" fill="#267565" radius={[3, 3, 0, 0]} maxBarSize={27} /><Bar dataKey="expense" fill="#d86c52" radius={[3, 3, 0, 0]} maxBarSize={27} /></BarChart></ResponsiveContainer></div> : <EmptyAnalysis loading={loading} />}<div className="chart-key"><span><i className="key-income" />Income</span><span><i className="key-expense" />Expenses</span></div></section></div>
    <div className="analysis-grid lower-analysis"><section className="analysis-panel top-expenses-panel"><div className="panel-heading"><div><span className="section-index">03</span><h2>Top expenses</h2></div><span className="small-tag">BY AMOUNT</span></div><p className="panel-caption">Largest individual outflows</p>{topExpenses.length ? <div className="item-rank-list">{topExpenses.map((expense, index) => <div className="item-rank" key={`${expense.date}-${expense.item}-${index}`}><span className="rank-number">0{index + 1}</span><span className="rank-name"><strong>{expense.item || expense.category}</strong><small>{expense.category} · {prettyDate(expense.date)}</small></span><span className="rank-total">{money(expense.amount)}</span></div>)}</div> : <EmptyAnalysis loading={loading} />}</section>
      <section className="analysis-panel frequently-panel"><div className="panel-heading"><div><span className="section-index">04</span><h2>Frequently used items</h2></div><span className="small-tag">BY COUNT</span></div><p className="panel-caption">Your regular shop essentials</p>{itemData.length ? <div className="item-rank-list">{itemData.slice(0, 5).map((item, index) => <div className="item-rank" key={item.name}><span className="rank-number">0{index + 1}</span><span className="rank-name"><strong>{item.name}</strong><small>{item.count} {item.count === 1 ? "transaction" : "transactions"}</small></span><span className="rank-total">{money(item.total)}</span></div>)}</div> : <EmptyAnalysis loading={loading} />}</section>
      <section className="analysis-panel major-comparison-panel"><div className="panel-heading"><div><span className="section-index">05</span><h2>Home vs Business</h2></div><span className="small-tag">SPENDING MIX</span></div><p className="panel-caption">Compare outflows and net by major category</p><div className="major-comparison-list">{majorRows.map((row) => { const net = row.totals.income - row.totals.expense; return <div className="major-comparison-row" key={row.key}><div className="major-comparison-title"><strong>{row.label}</strong><span>{row.share.toFixed(0)}% of expenses</span></div><div className="major-share-track"><i className={row.key} style={{ width: `${row.share}%` }} /></div><div className="major-comparison-values"><span>Income <strong>{money(row.totals.income)}</strong></span><span>Expenses <strong>{money(row.totals.expense)}</strong></span><span>Net <strong className={net < 0 ? "red-text" : "green-text"}>{money(net)}</strong></span></div></div>; })}</div></section>
      <section className="analysis-panel monthly-panel"><div className="panel-heading"><div><span className="section-index">06</span><h2>Monthly snapshot</h2></div><span className="panel-icon"><TrendingUp size={17} /></span></div><p className="panel-caption">A closer look at your selected range</p>{monthlyData.length ? <div className="month-list">{monthlyData.slice(-5).map((month) => <div className="month-row" key={month.month}><span>{new Date(`${month.month}-02`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span><div><small>IN</small><strong>{money(month.income)}</strong></div><div><small>OUT</small><strong>{money(month.expense)}</strong></div><div className={month.profit < 0 ? "red-text" : "green-text"}><small>NET</small><strong>{money(month.profit)}</strong></div></div>)}</div> : <EmptyAnalysis loading={loading} />}</section></div></div>;
}

function EmptyTransactions({ loading, onAdd }: { loading: boolean; onAdd: (transaction?: Transaction) => void }) { if (loading) return <div className="loading-state"><LoaderCircle className="spin" size={20} /> Loading transactions...</div>; return <div className="empty-state"><div className="empty-art"><Wallet size={27} /><span>+</span></div><h3>No transactions yet</h3><p>Start with your first business income or expense.</p><button className="primary-button" onClick={() => onAdd()}><Plus size={16} /> Add transaction</button></div>; }
function EmptyAnalysis({ loading }: { loading: boolean }) { return <div className="empty-analysis">{loading ? <LoaderCircle className="spin" size={18} /> : <><div className="empty-analysis-bars"><i /><i /><i /><i /></div><strong>Not enough data yet</strong><span>Add a few transactions to see your business analysis.</span></>}</div>; }

function TransactionDialog({ categories, editing, initialType, onClose, onSaved }: { categories: Category[]; editing: Transaction | null; initialType: "income" | "expense"; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<"expense" | "income">(editing?.type || initialType);
  const [majorCategory, setMajorCategory] = useState<MajorCategory>(editing?.majorCategory || "home");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [category, setCategory] = useState(editing?.category || ""); const [item, setItem] = useState(editing?.item || ""); const [vendor, setVendor] = useState(""); const [tags, setTags] = useState(""); const [date, setDate] = useState(editing?.date || today());
  const [paymentMethod, setPaymentMethod] = useState(editing?.paymentMethod || "UPI"); const [notes, setNotes] = useState(editing?.notes || ""); const [suggestions, setSuggestions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const categoryChoices = categories.filter((choice) => choice.type === type && (choice.majorCategory ?? "home") === majorCategory);
  const majorOptions = [
    { value: "home", label: type === "expense" ? "Home Expense" : "Home Income" },
    { value: "business", label: type === "expense" ? "Business Expense" : "Business Income" },
  ] as const;
  useEffect(() => {
    const controller = new AbortController(); const timer = window.setTimeout(async () => {
      if (!item.trim() || type !== "expense") return;
      try { const result = await api<{ items: { name: string }[] }>(`/api/analytics/items?q=${encodeURIComponent(item.trim())}`, { signal: controller.signal }); setSuggestions(result.items.map((entry) => entry.name).filter((name) => name.toLowerCase() !== item.toLowerCase()).slice(0, 5)); }
      catch { setSuggestions([]); }
    }, 180); return () => { window.clearTimeout(timer); controller.abort(); };
  }, [item, type]);
  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault(); setBusy(true); setError(""); const payload = { type, majorCategory, amount: Number(amount), category, item: item.trim(), vendor: vendor.trim(), tags: tags.trim(), date, paymentMethod, notes: notes.trim() };
    try { await api(editing ? `/api/transactions/${editing.id}` : "/api/transactions", { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) }); onSaved(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save transaction. Please try again."); setBusy(false); }
  }
  const updateType = (nextType: "expense" | "income") => {
    setType(nextType);
    const nextChoices = categories.filter((choice) => choice.type === nextType && (choice.majorCategory ?? "home") === majorCategory);
    setCategory(nextChoices[0]?.name ?? "");
  };
  const updateMajorCategory = (nextMajorCategory: MajorCategory) => {
    setMajorCategory(nextMajorCategory);
    const nextChoices = categories.filter((choice) => choice.type === type && (choice.majorCategory ?? "home") === nextMajorCategory);
    setCategory(nextChoices[0]?.name ?? "");
  };
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="transaction-modal" role="dialog" aria-modal="true" aria-labelledby="transaction-title"><div className="modal-top"><div><h2 id="transaction-title">{editing ? "Edit transaction" : "Record Transaction"}</h2></div><button className="icon-button" title="Close" onClick={onClose}><X size={19} /></button></div>
    <div className="type-toggle"><button className={type === "expense" ? "selected expense-selected" : ""} onClick={() => updateType("expense")} type="button"><ArrowUpRight size={16} /> Expense</button><button className={type === "income" ? "selected income-selected" : ""} onClick={() => updateType("income")} type="button"><ArrowDownLeft size={16} /> Income</button></div>
    <form onSubmit={submit}><label className="form-label amount-label">Amount <b>*</b><span className="amount-input-wrap"><span>₹</span><input required type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} autoFocus /></span></label>
      <label className="form-label item-field">{type === "expense" ? "Item / description" : "Description"}<span className="optional">SMART SUGGESTIONS</span><input autoComplete="off" placeholder={type === "expense" ? "e.g. Chicken, Milk, Paper A4, WiFi" : "e.g. ABC Company · Log books"} value={item} onChange={(event) => setItem(event.target.value)} />{type === "expense" && item.trim() && suggestions.filter((suggestion) => suggestion.toLowerCase().includes(item.toLowerCase())).length > 0 && <div className="suggestion-list">{suggestions.filter((suggestion) => suggestion.toLowerCase().includes(item.toLowerCase())).map((suggestion) => <button type="button" key={suggestion} onClick={() => setItem(suggestion)}>{suggestion}<span>Previous item</span></button>)}</div>}</label>
      <div className="form-two"><label className="form-label">Category <b>*</b><span className="select-wrap"><select required value={majorCategory} onChange={(event) => updateMajorCategory(event.target.value as MajorCategory)}>{majorOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={15} /></span></label><label className="form-label accent-field">Subcategory <b>*</b><span className="select-wrap"><select required value={category} onChange={(event) => setCategory(event.target.value)}>{categoryChoices.map((choice) => <option key={choice.id} value={choice.name}>{choice.name}</option>)}</select><ChevronDown size={15} /></span></label></div>
      <div className="form-two"><label className="form-label">Date <input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="form-label">Payment method<span className="select-wrap"><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>{["Cash", "UPI", "Bank Transfer", "Card", "Other"].map((method) => <option key={method}>{method}</option>)}</select><ChevronDown size={15} /></span></label></div>
      <div className="form-two"><label className="form-label">Vendor / Store <span className="optional">OPTIONAL</span><input value={vendor} onChange={(event) => setVendor(event.target.value)} placeholder="e.g. Local Mart, Amazon, Electric Board" /></label><label className="form-label">Tags <span className="optional">E.G. #MONTHLY #URGENT</span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="#urgent, #monthly" /></label></div>
      <label className="form-label">Notes <span className="optional">OPTIONAL</span><textarea rows={2} placeholder="Additional details..." value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      {error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button save-and-another" onClick={() => void submit()}>+ Save &amp; Add Another</button><button type="submit" className="primary-button save-transaction" disabled={busy}><span>{busy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}</span>{busy ? "Saving..." : editing ? "Save changes" : `Save ${type}`}</button></div>
    </form></section></div>;
}

function CategoryDialog({ categories, onClose, onChanged }: { categories: Category[]; onClose: () => void; onChanged: () => void }) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [majorCategory, setMajorCategory] = useState<MajorCategory>("home");
  const [name, setName] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function add(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); try { await api("/api/categories", { method: "POST", body: JSON.stringify({ type, majorCategory, name }) }); setName(""); onChanged(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to add category."); } finally { setBusy(false); } }
  async function remove(category: Category) { try { await api(`/api/categories/${category.id}`, { method: "DELETE" }); onChanged(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to remove category."); } }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="category-modal" role="dialog" aria-modal="true" aria-labelledby="categories-title"><div className="modal-top"><div><span className="modal-eyebrow">MAKE IT YOURS</span><h2 id="categories-title">Manage categories</h2></div><button className="icon-button" onClick={onClose} title="Close"><X size={19} /></button></div>
    <div className="type-toggle category-type-toggle"><button className={type === "expense" ? "selected expense-selected" : ""} onClick={() => setType("expense")}>Expense</button><button className={type === "income" ? "selected income-selected" : ""} onClick={() => setType("income")}>Income</button></div>
    <div className="category-major-select"><label className="form-label">Major category <span className="select-wrap"><select value={majorCategory} onChange={(event) => setMajorCategory(event.target.value as MajorCategory)}>{majorCategoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={15} /></span></label></div>
    <form className="category-add-form" onSubmit={add}><input required maxLength={80} placeholder="Add a category" value={name} onChange={(event) => setName(event.target.value)} /><button className="primary-button" disabled={busy}><Plus size={16} /> Add</button></form>
    {error && <div className="form-error">{error}</div>}<div className="category-manage-list">{categories.filter((category) => category.type === type && (category.majorCategory ?? "home") === majorCategory).map((category) => <div key={category.id}><span>{category.name}</span><button title={`Remove ${category.name}`} onClick={() => void remove(category)}><X size={15} /></button></div>)}</div><p className="category-footnote">Removing a category keeps existing transaction records unchanged.</p></section></div>;
}