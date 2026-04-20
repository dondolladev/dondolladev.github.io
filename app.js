"use strict";

/* =====================================================
   NOLIMIT BUDGET — App Logic
   ===================================================== */

const STORAGE_KEY = "nolimit_budget_v3";

/* ===================== DEFAULT DATA ===================== */
const DEFAULT_GROUPS = [
  { name: "Operator Reserves", items: [
      { name: "NoLimit Empire", planned: 0 },
      { name: "BlacStarMoney", planned: 0 }
    ], quickAdd: ["Ghana Trip", "Neo Hardware", "DonKing LLC", "Sample Capital"] },
  { name: "Savings", items: [{ name: "Emergency Fund", planned: 0 }],
    quickAdd: ["Vacation", "Christmas", "Car Fund"] },
  { name: "Housing", items: [
      { name: "Rent / Mortgage", planned: 0 },
      { name: "Water", planned: 0 },
      { name: "Electricity", planned: 0 },
      { name: "Internet", planned: 0 }
    ], quickAdd: ["Natural Gas", "Trash", "HOA", "Renters Ins", "Security", "Lawn Care"] },
  { name: "Transportation", items: [
      { name: "Gas", planned: 0 },
      { name: "Auto Insurance", planned: 0 },
      { name: "Maintenance", planned: 0 }
    ], quickAdd: ["Parking", "Uber", "Lyft", "Tolls", "Registration"] },
  { name: "Food", items: [
      { name: "Groceries", planned: 0 },
      { name: "Restaurants", planned: 0 }
    ], quickAdd: ["Coffee", "Snacks", "DoorDash", "Lunch"] },
  { name: "Personal", items: [
      { name: "Phone", planned: 0 },
      { name: "Clothing", planned: 0 },
      { name: "Fun Money", planned: 0 },
      { name: "Subscriptions", planned: 0 }
    ], quickAdd: ["Haircuts", "Spotify", "Netflix", "Gym", "Apps"] },
  { name: "Lifestyle", items: [
      { name: "Entertainment", planned: 0 },
      { name: "Misc", planned: 0 }
    ], quickAdd: ["Date Night", "Concerts", "Travel", "Gifts"] },
  { name: "Health", items: [
      { name: "Medicine / Vitamins", planned: 0 },
      { name: "Doctor Visits", planned: 0 }
    ], quickAdd: ["Therapy", "Dental", "Vision"] },
  { name: "Insurance", items: [
      { name: "Health Insurance", planned: 0 }
    ], quickAdd: ["Life", "Identity Theft", "Pet Ins"] },
  { name: "Debt", items: [],
    quickAdd: ["Student Loans", "Credit Card", "Auto Loan", "Collections", "Medical"] }
];

const DEFAULT_PAYCHECKS = [{ name: "Paycheck 1", amount: 0 }];

const DEFAULT_RESERVES = [
  { name: "NoLimit Empire", target: 5000, current: 0, note: "Phase 2 unlock - trading capital" },
  { name: "BlacStarMoney", target: 500, current: 0, note: "Sample + production capital" }
];

/* ===================== HELPERS ===================== */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const fmt = n => {
  const v = Number(n) || 0;
  return (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
};

const today = () => {
  const d = new Date();
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
};

const shortDate = s => {
  if (!s) return "";
  const parts = s.split("-");
  return `${parts[1]}/${parts[2]}`;
};

const currentMonthKey = () => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
};

const monthLabel = () => {
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const d = new Date();
  return months[d.getMonth()] + " " + d.getFullYear();
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const escapeHtml = s => {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/`/g, "&#96;");
};

const STRATEGY_LABELS = {
  pay_full: "Pay in full", pay_for_delete: "Pay-for-delete", dispute: "Dispute",
  validate: "Validate", goodwill: "Goodwill", rehab: "Rehab", keep: "Keep", settle: "Settle"
};
const strategyLabel = s => STRATEGY_LABELS[s] || s;

const TYPE_LABELS = {
  student_loan: "Student Loan", credit_card: "Credit Card", collection: "Collection",
  charge_off: "Charge-off", medical: "Medical", auto_loan: "Auto Loan",
  personal_loan: "Personal Loan", utility: "Utility", other: "Other"
};
const typeLabel = t => TYPE_LABELS[t] || t;

const STATUS_LABELS = {
  open: "Open", in_progress: "In Progress", disputed: "Disputed",
  resolved: "Resolved", paid: "Paid", closed: "Closed"
};
const statusLabel = s => STATUS_LABELS[s] || s;

/* ===================== STATE ===================== */
function freshState() {
  return {
    paychecks: DEFAULT_PAYCHECKS.map(p => ({ id: uid(), ...p })),
    groups: DEFAULT_GROUPS.map(g => ({
      id: uid(),
      name: g.name,
      quickAdd: g.quickAdd.slice(),
      items: g.items.map(i => ({ id: uid(), name: i.name, planned: i.planned }))
    })),
    transactions: [],
    accounts: [],
    reserves: DEFAULT_RESERVES.map(r => ({ id: uid(), ...r })),
    bandgang: {
      scores: [],
      items: [],
      profile: { name: "", addr1: "", addr2: "", city: "", state: "", zip: "" }
    },
    activeTab: "today",
    txnFilter: "all",
    monthKey: currentMonthKey()
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return hydrate(JSON.parse(raw));
  } catch (e) {}
  return freshState();
}

function hydrate(s) {
  const base = freshState();
  const bg = s.bandgang || {};
  return {
    paychecks: Array.isArray(s.paychecks) && s.paychecks.length ? s.paychecks : base.paychecks,
    groups: Array.isArray(s.groups) && s.groups.length ? s.groups : base.groups,
    transactions: Array.isArray(s.transactions) ? s.transactions : [],
    accounts: Array.isArray(s.accounts) ? s.accounts : [],
    reserves: Array.isArray(s.reserves) ? s.reserves : base.reserves,
    bandgang: {
      scores: Array.isArray(bg.scores) ? bg.scores : [],
      items: Array.isArray(bg.items) ? bg.items : [],
      profile: Object.assign({}, base.bandgang.profile, bg.profile || {})
    },
    activeTab: s.activeTab || "today",
    txnFilter: s.txnFilter || "all",
    monthKey: s.monthKey || currentMonthKey()
  };
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { alert("Storage failed — device may be full."); }
}

let state = loadState();

/* ===================== COMPUTED ===================== */
function totalIncome() {
  return state.paychecks.reduce((a, p) => a + (Number(p.amount) || 0), 0);
}
function totalPlanned() {
  return state.groups.reduce((a, g) =>
    a + g.items.reduce((x, i) => x + (Number(i.planned) || 0), 0), 0);
}
function spentOnItem(itemId, monthOnly = true) {
  const mk = state.monthKey;
  return state.transactions
    .filter(t => t.itemId === itemId && (!monthOnly || (t.date || "").startsWith(mk)))
    .reduce((a, t) => a + Number(t.amount), 0);
}
function spentInGroup(groupId, monthOnly = true) {
  const g = state.groups.find(x => x.id === groupId);
  if (!g) return 0;
  return g.items.reduce((a, i) => a + spentOnItem(i.id, monthOnly), 0);
}
function totalSpent(monthOnly = true) {
  const mk = state.monthKey;
  return state.transactions
    .filter(t => !monthOnly || (t.date || "").startsWith(mk))
    .reduce((a, t) => a + Number(t.amount), 0);
}
function leftToBudget() { return totalIncome() - totalPlanned(); }
function findItem(id) {
  for (const g of state.groups) {
    const i = g.items.find(x => x.id === id);
    if (i) return { group: g, item: i };
  }
  return null;
}

/* ===================== HEADER ===================== */
function renderHeader() {
  document.getElementById("monthLabel").textContent = monthLabel() + " - ZERO-BASED";
  const left = leftToBudget();
  const leftEl = document.getElementById("leftToBudget");
  leftEl.textContent = fmt(left);
  leftEl.className = "zero-amt " + (Math.abs(left) < 0.01 ? "zero" : left > 0 ? "pos" : "neg");

  const income = totalIncome();
  const planned = totalPlanned();
  const fill = document.getElementById("zeroFill");
  let pct = 0;
  if (income > 0) pct = Math.min(100, (planned / income) * 100);
  fill.style.width = pct + "%";
  fill.className = "zero-fill" + (planned > income ? " over" : (planned < income && income > 0 ? " under" : ""));
}

/* ===================== TODAY ===================== */
function renderToday() {
  const income = totalIncome();
  document.getElementById("todayIncome").textContent = fmt(income);
  document.getElementById("todayIncomeSub").textContent =
    income > 0
      ? state.paychecks.length + " paycheck" + (state.paychecks.length === 1 ? "" : "s") + " logged"
      : "tap Budget to set paychecks";
  document.getElementById("todayPlanned").textContent = fmt(totalPlanned());
  document.getElementById("todaySpent").textContent = fmt(totalSpent(true));

  // Reserves
  const resEl = document.getElementById("reservesList");
  if (!state.reserves.length) {
    resEl.innerHTML = `<div class="empty">No reserves. Tap + Add to create one.</div>`;
  } else {
    resEl.innerHTML = state.reserves.map(r => {
      const pct = r.target > 0 ? Math.min(100, (r.current / r.target) * 100) : 0;
      const noteHtml = r.note
        ? `<div class="reserve-note">${escapeHtml(r.note)} &mdash; ${Math.round(pct)}%</div>`
        : `<div class="reserve-note">${Math.round(pct)}% of target</div>`;
      return `
        <div class="reserve-row" onclick="editReserve('${r.id}')">
          <div class="reserve-head">
            <div class="reserve-name">${escapeHtml(r.name)}</div>
            <div class="reserve-amts"><span class="cur">${fmt(r.current)}</span> / ${fmt(r.target)}</div>
          </div>
          <div class="reserve-bar"><div class="reserve-bar-fill" style="width:${pct}%"></div></div>
          ${noteHtml}
        </div>`;
    }).join("");
  }

  // Recent txns
  const recent = state.transactions.slice()
    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.id.localeCompare(a.id))
    .slice(0, 5);
  document.getElementById("todayRecent").innerHTML = recent.length
    ? recent.map(t => txnRowHtml(t)).join("")
    : `<div class="empty">No activity yet. Tap Txns to log.</div>`;

  // At-risk items
  const risks = [];
  state.groups.forEach(g => {
    g.items.forEach(i => {
      if (i.planned > 0) {
        const s = spentOnItem(i.id, true);
        const pct = (s / i.planned) * 100;
        if (pct >= 75) risks.push({ item: i, group: g, spent: s, pct });
      }
    });
  });
  risks.sort((a, b) => b.pct - a.pct);
  const riskEl = document.getElementById("todayAtRisk");
  riskEl.innerHTML = risks.length
    ? risks.slice(0, 5).map(r => {
        const over = r.pct > 100;
        const cls = over ? "red" : "amber";
        const footerTxt = over
          ? fmt(r.spent - r.item.planned) + " over budget"
          : Math.round(r.pct) + "% used";
        return `
          <div class="item-row">
            <div class="item-top">
              <div class="dot ${cls}"></div>
              <div class="item-name">${escapeHtml(r.group.name)} &rsaquo; ${escapeHtml(r.item.name)}</div>
              <div class="item-amounts"><span class="spent">${fmt(r.spent)}</span> / ${fmt(r.item.planned)}</div>
            </div>
            <div class="item-bar"><div class="item-bar-fill ${cls}" style="width:${Math.min(100,r.pct)}%"></div></div>
            <div style="font-size:10px;color:var(--text-dim)">${footerTxt}</div>
          </div>`;
      }).join("")
    : `<div class="empty">All categories within budget.</div>`;
}

/* ===================== BUDGET ===================== */
function renderBudget() {
  // Paychecks
  const plEl = document.getElementById("paycheckList");
  plEl.innerHTML = state.paychecks.map(p => `
    <div class="paycheck-row" onclick="editPaycheck('${p.id}')">
      <div class="paycheck-name">${escapeHtml(p.name)}</div>
      <div class="paycheck-amt">${fmt(p.amount)}</div>
    </div>`).join("");
  document.getElementById("paycheckTotal").textContent = fmt(totalIncome());

  // Groups
  const glEl = document.getElementById("groupList");
  glEl.innerHTML = state.groups.map(g => renderGroupBlock(g)).join("");
}

function renderGroupBlock(g) {
  const groupSpent = spentInGroup(g.id, true);
  const groupPlanned = g.items.reduce((a, i) => a + (Number(i.planned) || 0), 0);
  const itemsHtml = g.items.map(i => renderItemRow(i)).join("");
  const quickHtml = g.quickAdd && g.quickAdd.length
    ? `<div class="quick-add-row">${g.quickAdd.map(q =>
        `<button class="quick-add-btn" onclick="quickAddItem('${g.id}','${escapeHtml(q)}')">${escapeHtml(q)}</button>`
      ).join("")}</div>`
    : "";
  return `
    <div class="group-block">
      <div class="group-head">
        <div class="group-name">${escapeHtml(g.name)}</div>
        <div class="group-total"><span class="spent">${fmt(groupSpent)}</span> / ${fmt(groupPlanned)}</div>
        <button class="group-menu" onclick="groupMenu('${g.id}')" aria-label="Group menu">&hellip;</button>
      </div>
      ${itemsHtml}
      ${quickHtml}
      <button class="group-add-btn" onclick="addItemToGroup('${g.id}')">+ Add Line Item</button>
    </div>`;
}

function renderItemRow(i) {
  const spent = spentOnItem(i.id, true);
  const planned = Number(i.planned) || 0;
  const pct = planned > 0 ? Math.min(100, (spent / planned) * 100) : 0;
  const over = planned > 0 && spent > planned;
  const nearLimit = planned > 0 && pct >= 75 && !over;
  const dotCls = over ? "red" : nearLimit ? "amber" : planned === 0 ? "dim" : "teal";
  const barCls = over ? "red" : nearLimit ? "amber" : "";
  return `
    <div class="item-row" onclick="editItem('${i.id}')">
      <div class="item-top">
        <div class="dot ${dotCls}"></div>
        <div class="item-name">${escapeHtml(i.name)}</div>
        <div class="item-amounts"><span class="spent">${fmt(spent)}</span> / ${fmt(planned)}</div>
      </div>
      ${planned > 0 ? `<div class="item-bar"><div class="item-bar-fill ${barCls}" style="width:${pct}%"></div></div>` : ""}
    </div>`;
}

/* ===================== TRANSACTIONS ===================== */
function renderTxns() {
  const filter = state.txnFilter || "all";
  let txns = state.transactions.slice()
    .filter(t => {
      if (filter === "income") return t.type === "income";
      if (filter === "spent") return t.type !== "income";
      return true;
    })
    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.id.localeCompare(a.id));

  const el = document.getElementById("txnList");
  el.innerHTML = txns.length
    ? txns.map(t => txnRowHtml(t)).join("")
    : `<div class="empty">No transactions. Tap + Add to log one.</div>`;
}

function txnRowHtml(t) {
  const isIncome = t.type === "income";
  const fi = findItem(t.itemId);
  const cat = fi ? fi.group.name + " › " + fi.item.name : (t.categoryName || "Uncategorized");
  return `
    <div class="txn-row${isIncome ? " income-row" : ""}" onclick="editTxn('${t.id}')">
      <div class="txn-date">${shortDate(t.date)}</div>
      <div class="txn-info">
        <div class="txn-name">${escapeHtml(t.name || "Transaction")}</div>
        <div class="txn-cat">${escapeHtml(cat)}</div>
      </div>
      <div class="txn-amt${isIncome ? " income" : ""}">${isIncome ? "+" : "-"}${fmt(Math.abs(Number(t.amount)))}</div>
    </div>`;
}

/* ===================== BANDGANG ===================== */
function renderBandgang() {
  renderScores();
  renderCreditItems();
  renderActionPlan();
  loadProfile();
}

function scoreClass(n) {
  if (!n) return "none";
  n = Number(n);
  if (n >= 750) return "excellent";
  if (n >= 700) return "good";
  if (n >= 650) return "fair";
  return "poor";
}

function renderScores() {
  const bureaus = ["Equifax", "Experian", "TransUnion"];
  const scores = state.bandgang.scores;
  const el = document.getElementById("scoreList");
  const cards = bureaus.map(b => {
    const sc = scores.find(s => s.bureau === b);
    const num = sc ? sc.score : null;
    const cls = scoreClass(num);
    const date = sc ? `<div class="score-date">${sc.date || ""}</div>` : "";
    return `
      <div class="score-card" onclick="editScore('${b}')">
        <div class="score-bureau">${b}</div>
        <div class="score-num ${cls}">${num || "--"}</div>
        ${date}
      </div>`;
  });
  el.innerHTML = `<div class="score-grid">${cards.join("")}</div>`;
}

function renderCreditItems() {
  const el = document.getElementById("creditItemList");
  const items = state.bandgang.items;
  if (!items.length) {
    el.innerHTML = `<div class="empty">No credit items. Add manually or upload report.</div>`;
    return;
  }
  el.innerHTML = items.map(item => {
    const tags = [
      `<span class="credit-tag">${escapeHtml(typeLabel(item.type))}</span>`,
      item.strategy ? `<span class="credit-tag strategy">${escapeHtml(strategyLabel(item.strategy))}</span>` : "",
      item.status ? `<span class="credit-tag status-${item.status}">${escapeHtml(statusLabel(item.status))}</span>` : ""
    ].filter(Boolean).join("");
    return `
      <div class="credit-item-row" onclick="editCreditItem('${item.id}')">
        <div class="credit-item-top">
          <div class="credit-item-name">${escapeHtml(item.creditor)}</div>
          ${item.balance ? `<div class="credit-item-amt">${fmt(item.balance)}</div>` : ""}
        </div>
        ${item.acctNum ? `<div style="font-size:10px;color:var(--text-dim);margin-bottom:4px">Acct: ${escapeHtml(item.acctNum)}</div>` : ""}
        <div class="credit-item-tags">${tags}</div>
        ${item.notes ? `<div style="font-size:11px;color:var(--text-dim);margin-top:6px">${escapeHtml(item.notes)}</div>` : ""}
      </div>`;
  }).join("");
}

function renderActionPlan() {
  const el = document.getElementById("actionPlanList");
  const plan = buildActionPlan();
  plan.forEach((step, idx) => {
    if (actionPlanStates[idx] !== undefined) step.done = actionPlanStates[idx];
  });
  if (!plan.length) {
    el.innerHTML = `<div class="empty">Add credit items above to generate your action plan.</div>`;
    return;
  }
  el.innerHTML = plan.map((step, idx) => `
    <div class="action-item-row">
      <div class="action-item-check ${step.done ? "done" : ""}" onclick="toggleAction(${idx})">
        ${step.done ? "&#10003;" : ""}
      </div>
      <div>
        <div class="action-item-text">${escapeHtml(step.text)}</div>
        <div class="action-item-sub">${escapeHtml(step.sub)}</div>
      </div>
    </div>`).join("");
}

function buildActionPlan() {
  const items = state.bandgang.items;
  const plan = [];

  if (!items.length) return plan;

  const profile = state.bandgang.profile;
  const hasProfile = profile.name && profile.addr1;
  if (!hasProfile) {
    plan.push({ text: "Complete your profile", sub: "Needed to generate dispute letters — fill out the Profile section below", done: false });
  }

  const scoreData = state.bandgang.scores;
  if (scoreData.length === 0) {
    plan.push({ text: "Log your credit scores", sub: "Tap each bureau card to add your current scores", done: false });
  }

  // Sort by priority: disputes > collections > charge-offs > others
  const disputes = items.filter(i => i.strategy === "dispute");
  const deletions = items.filter(i => i.strategy === "pay_for_delete");
  const goodwills = items.filter(i => i.strategy === "goodwill");
  const validates = items.filter(i => i.strategy === "validate");
  const payFull = items.filter(i => i.strategy === "pay_full");

  disputes.forEach(i => {
    plan.push({
      text: `Dispute: ${i.creditor}`,
      sub: `Send dispute letter to all 3 bureaus — ${i.type ? typeLabel(i.type) : "item"} ${i.acctNum ? "#" + i.acctNum : ""}`,
      done: i.status === "resolved" || i.status === "closed"
    });
  });

  validates.forEach(i => {
    plan.push({
      text: `Request debt validation: ${i.creditor}`,
      sub: `Send within 30 days of first contact — ${i.balance ? fmt(i.balance) : ""}`,
      done: i.status === "resolved" || i.status === "closed"
    });
  });

  deletions.forEach(i => {
    plan.push({
      text: `Negotiate pay-for-delete: ${i.creditor}`,
      sub: `Offer to pay ${i.balance ? fmt(i.balance) : "balance"} in exchange for deletion`,
      done: i.status === "paid" || i.status === "resolved"
    });
  });

  goodwills.forEach(i => {
    plan.push({
      text: `Send goodwill letter: ${i.creditor}`,
      sub: `Request removal of late payment or negative mark as a courtesy`,
      done: i.status === "resolved"
    });
  });

  payFull.forEach(i => {
    plan.push({
      text: `Pay in full: ${i.creditor}`,
      sub: `Balance: ${i.balance ? fmt(i.balance) : "unknown"} — get paid-in-full letter`,
      done: i.status === "paid"
    });
  });

  plan.push({
    text: "Keep all current accounts in good standing",
    sub: "Payment history = 35% of score. Never miss a payment.",
    done: false
  });

  const scores = scoreData.map(s => Number(s.score)).filter(Boolean);
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  if (avgScore > 0 && avgScore < 700) {
    plan.push({
      text: "Become an authorized user on a trusted account",
      sub: "Ask a family member or friend with excellent credit to add you",
      done: false
    });
  }
  if (avgScore > 0 && avgScore >= 650) {
    plan.push({
      text: "Apply for a secured credit card",
      sub: "Build positive payment history — use for small purchases, pay in full monthly",
      done: false
    });
  }

  return plan;
}

let actionPlanStates = [];
function toggleAction(idx) {
  while (actionPlanStates.length <= idx) actionPlanStates.push(false);
  actionPlanStates[idx] = !actionPlanStates[idx];
  renderActionPlan();
}

function loadProfile() {
  const p = state.bandgang.profile;
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ""; };
  setVal("pf-name", p.name);
  setVal("pf-addr1", p.addr1);
  setVal("pf-addr2", p.addr2);
  setVal("pf-city", p.city);
  setVal("pf-state", p.state);
  setVal("pf-zip", p.zip);
}

function saveProfile() {
  state.bandgang.profile = {
    name: document.getElementById("pf-name").value,
    addr1: document.getElementById("pf-addr1").value,
    addr2: document.getElementById("pf-addr2").value,
    city: document.getElementById("pf-city").value,
    state: document.getElementById("pf-state").value,
    zip: document.getElementById("pf-zip").value
  };
  saveState();
}

/* ===================== ACCOUNTS ===================== */
function renderAccounts() {
  const el = document.getElementById("acctList");
  if (!state.accounts.length) {
    el.innerHTML = `<div class="empty">No accounts. Tap + Add to track one.</div>`;
  } else {
    el.innerHTML = state.accounts.map(a => {
      const bal = Number(a.balance) || 0;
      const isAsset = a.kind === "asset";
      const balClass = isAsset ? (bal >= 0 ? "pos" : "neg") : (bal > 0 ? "neg" : "pos");
      return `
        <div class="acct-row ${a.kind}" onclick="editAccount('${a.id}')">
          <div class="acct-info">
            <div class="acct-name">${escapeHtml(a.name)}</div>
            <div class="acct-type">${escapeHtml(a.type || a.kind)}</div>
          </div>
          <div class="acct-bal ${balClass}">${fmt(bal)}</div>
        </div>`;
    }).join("");
  }

  let assets = 0, liabilities = 0;
  state.accounts.forEach(a => {
    const bal = Number(a.balance) || 0;
    if (a.kind === "asset") assets += bal;
    else liabilities += Math.abs(bal);
  });
  document.getElementById("totalAssets").textContent = fmt(assets);
  document.getElementById("totalLiabilities").textContent = fmt(liabilities);
  const netEl = document.getElementById("netWorth");
  const net = assets - liabilities;
  netEl.textContent = fmt(net);
  netEl.className = "stat " + (net >= 0 ? "teal" : "red");
}

/* ===================== STATS ===================== */
function renderStats() {
  const income = totalIncome();
  const planned = totalPlanned();
  const spent = totalSpent(true);
  document.getElementById("statsIncome").textContent = fmt(income);
  document.getElementById("statsPlanned").textContent = fmt(planned);
  document.getElementById("statsSpent").textContent = fmt(spent);
  const rem = planned - spent;
  const remEl = document.getElementById("statsRemaining");
  remEl.textContent = fmt(rem);
  remEl.className = "stat " + (rem >= 0 ? "green" : "red");

  // Spending by group
  const groupData = state.groups
    .map(g => ({ name: g.name, spent: spentInGroup(g.id, true) }))
    .filter(g => g.spent > 0)
    .sort((a, b) => b.spent - a.spent);

  const maxSpent = groupData.length ? groupData[0].spent : 1;
  const glEl = document.getElementById("statsGroupList");
  glEl.innerHTML = groupData.length
    ? groupData.map(g => {
        const pct = spent > 0 ? (g.spent / spent) * 100 : 0;
        const barW = (g.spent / Math.max(spent, maxSpent)) * 100;
        const barCls = pct > 40 ? "red" : pct > 20 ? "amber" : "";
        return `
          <div class="stats-group-row">
            <div class="stats-group-head">
              <div class="stats-group-name">${escapeHtml(g.name)}</div>
              <div class="stats-group-pct">${Math.round(pct)}%</div>
              <div class="stats-group-amt">${fmt(g.spent)}</div>
            </div>
            <div class="stats-bar"><div class="stats-bar-fill ${barCls}" style="width:${barW}%"></div></div>
          </div>`;
      }).join("")
    : `<div class="empty">No spending this month yet.</div>`;

  // Top expenses
  const txns = state.transactions
    .filter(t => (t.date || "").startsWith(state.monthKey) && t.type !== "income")
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 8);
  const tlEl = document.getElementById("statsTopList");
  tlEl.innerHTML = txns.length
    ? txns.map(t => {
        const fi = findItem(t.itemId);
        const cat = fi ? fi.item.name : (t.categoryName || "");
        return `
          <div class="stats-top-row">
            <div class="stats-top-name">${escapeHtml(t.name || cat)}</div>
            <div class="stats-top-amt">${fmt(t.amount)}</div>
          </div>`;
      }).join("")
    : `<div class="empty">No transactions this month.</div>`;

  // Monthly history
  renderHistory();
}

function renderHistory() {
  // Build last 6 months of data
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mk = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    const label = MONTHS[d.getMonth()] + " " + String(d.getFullYear()).slice(2);
    const s = state.transactions
      .filter(t => (t.date || "").startsWith(mk) && t.type !== "income")
      .reduce((a, t) => a + Number(t.amount), 0);
    months.push({ label, mk, spent: s });
  }
  const maxS = Math.max(...months.map(m => m.spent), 1);
  const el = document.getElementById("statsHistory");
  el.innerHTML = months.map(m => `
    <div class="history-row">
      <div class="history-month">${m.label}</div>
      <div class="history-bar-wrap">
        <div class="history-bar">
          <div class="history-bar-inner" style="width:${(m.spent/maxS)*100}%"></div>
        </div>
      </div>
      <div class="history-amts">${fmt(m.spent)}</div>
    </div>`).join("");
}

/* ===================== TAB NAVIGATION ===================== */
function switchTab(tab) {
  const tabs = ["today", "budget", "txns", "bandgang", "accts", "stats"];
  tabs.forEach(t => {
    const view = document.getElementById("view-" + t);
    const btn = document.getElementById("tab-" + t);
    if (view) view.hidden = t !== tab;
    if (btn) btn.className = "tab" + (t === "bandgang" ? " bandgang-tab" : "") + (t === tab ? " active" : "");
  });
  state.activeTab = tab;
  saveState();
  renderAll();
}

function renderAll() {
  renderHeader();
  const tab = state.activeTab;
  if (tab === "today") renderToday();
  else if (tab === "budget") renderBudget();
  else if (tab === "txns") renderTxns();
  else if (tab === "bandgang") renderBandgang();
  else if (tab === "accts") renderAccounts();
  else if (tab === "stats") renderStats();
}

function setTxnFilter(f, btn) {
  state.txnFilter = f;
  saveState();
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderTxns();
}

/* ===================== MODAL SYSTEM ===================== */
let _modalConfirm = null;

function openModal(title, bodyHtml, confirmLabel, onConfirm, extraBtns) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalBody").innerHTML = bodyHtml;
  const confirmBtn = document.getElementById("modalConfirm");
  confirmBtn.textContent = confirmLabel || "Save";
  confirmBtn.className = "modal-btn confirm";
  _modalConfirm = onConfirm;

  const actionsEl = document.getElementById("modalActions");
  // Rebuild actions
  actionsEl.innerHTML = `
    <button class="modal-btn cancel" onclick="closeModal()">Cancel</button>
    ${extraBtns || ""}
    <button class="modal-btn confirm" id="modalConfirm" onclick="modalConfirmAction()">${confirmLabel || "Save"}</button>
  `;
  document.getElementById("modal").hidden = false;
  const firstInput = document.querySelector("#modalBody input, #modalBody select, #modalBody textarea");
  if (firstInput) setTimeout(() => firstInput.focus(), 100);
}

function closeModal() { document.getElementById("modal").hidden = true; _modalConfirm = null; }
function closeModalIfBg(e) { if (e.target === document.getElementById("modal")) closeModal(); }
function modalConfirmAction() { if (_modalConfirm) _modalConfirm(); }

/* ===================== LETTER MODAL ===================== */
function openLetter(title, content) {
  document.getElementById("letterTitle").textContent = title;
  document.getElementById("letterContent").textContent = content;
  document.getElementById("letterModal").hidden = false;
}
function closeLetter() { document.getElementById("letterModal").hidden = true; }
function closeLetterIfBg(e) { if (e.target === document.getElementById("letterModal")) closeLetter(); }
function copyLetter() {
  const text = document.getElementById("letterContent").innerText;
  navigator.clipboard.writeText(text).then(() => showToast("Letter copied!")).catch(() => showToast("Copy failed — select and copy manually"));
}
function printLetter() { window.print(); }
function downloadLetter() {
  const text = document.getElementById("letterContent").innerText;
  const title = document.getElementById("letterTitle").textContent.replace(/\s+/g, "_");
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = title + ".txt"; a.click();
  URL.revokeObjectURL(url);
}

/* ===================== TOAST ===================== */
function showToast(msg) {
  let t = document.getElementById("_toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "_toast";
    Object.assign(t.style, {
      position: "fixed", bottom: "80px", left: "50%", transform: "translateX(-50%)",
      background: "#1f1f1f", border: "1px solid var(--teal)", color: "var(--teal)",
      padding: "8px 18px", fontSize: "11px", letterSpacing: "0.15em", zIndex: "200",
      whiteSpace: "nowrap", transition: "opacity 0.3s"
    });
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = "1";
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = "0"; }, 2000);
}

/* ===================== PAYCHECKS ===================== */
function addPaycheck() {
  openModal("Add Paycheck", `
    <div class="field-group">
      <label class="field-label">Name</label>
      <input class="field-input" id="m-pc-name" placeholder="e.g. Paycheck 1" />
    </div>
    <div class="field-group">
      <label class="field-label">Amount</label>
      <input class="field-input" id="m-pc-amt" type="number" step="0.01" min="0" placeholder="0.00" />
    </div>
  `, "Add", () => {
    const name = document.getElementById("m-pc-name").value.trim() || "Paycheck";
    const amount = parseFloat(document.getElementById("m-pc-amt").value) || 0;
    state.paychecks.push({ id: uid(), name, amount });
    saveState(); closeModal(); renderAll();
  });
}

function editPaycheck(id) {
  const p = state.paychecks.find(x => x.id === id);
  if (!p) return;
  openModal("Edit Paycheck", `
    <div class="field-group">
      <label class="field-label">Name</label>
      <input class="field-input" id="m-pc-name" value="${escapeHtml(p.name)}" />
    </div>
    <div class="field-group">
      <label class="field-label">Amount</label>
      <input class="field-input" id="m-pc-amt" type="number" step="0.01" min="0" value="${p.amount}" />
    </div>
  `, "Save", () => {
    p.name = document.getElementById("m-pc-name").value.trim() || p.name;
    p.amount = parseFloat(document.getElementById("m-pc-amt").value) || 0;
    saveState(); closeModal(); renderAll();
  }, `<button class="modal-btn danger" onclick="deletePaycheck('${id}')">Delete</button>`);
}

function deletePaycheck(id) {
  if (state.paychecks.length <= 1) { showToast("Must have at least one paycheck"); return; }
  state.paychecks = state.paychecks.filter(x => x.id !== id);
  saveState(); closeModal(); renderAll();
}

/* ===================== GROUPS ===================== */
function addGroup() {
  openModal("Add Budget Group", `
    <div class="field-group">
      <label class="field-label">Group Name</label>
      <input class="field-input" id="m-g-name" placeholder="e.g. Business" />
    </div>
  `, "Add", () => {
    const name = document.getElementById("m-g-name").value.trim();
    if (!name) return;
    state.groups.push({ id: uid(), name, items: [], quickAdd: [] });
    saveState(); closeModal(); renderAll();
  });
}

function groupMenu(id) {
  const g = state.groups.find(x => x.id === id);
  if (!g) return;
  openModal("Group: " + g.name, `
    <div class="field-group">
      <label class="field-label">Rename Group</label>
      <input class="field-input" id="m-gn-name" value="${escapeHtml(g.name)}" />
    </div>
  `, "Save", () => {
    const name = document.getElementById("m-gn-name").value.trim();
    if (name) g.name = name;
    saveState(); closeModal(); renderAll();
  }, `<button class="modal-btn danger" onclick="deleteGroup('${id}')">Delete Group</button>`);
}

function deleteGroup(id) {
  if (!confirm("Delete this group and all its items?")) return;
  // Remove related transactions
  const g = state.groups.find(x => x.id === id);
  if (g) {
    const itemIds = new Set(g.items.map(i => i.id));
    state.transactions = state.transactions.filter(t => !itemIds.has(t.itemId));
  }
  state.groups = state.groups.filter(x => x.id !== id);
  saveState(); closeModal(); renderAll();
}

/* ===================== ITEMS ===================== */
function addItemToGroup(groupId) {
  openModal("Add Line Item", `
    <div class="field-group">
      <label class="field-label">Item Name</label>
      <input class="field-input" id="m-i-name" placeholder="e.g. Netflix" />
    </div>
    <div class="field-group">
      <label class="field-label">Planned Amount</label>
      <input class="field-input" id="m-i-planned" type="number" step="0.01" min="0" placeholder="0.00" />
    </div>
  `, "Add", () => {
    const g = state.groups.find(x => x.id === groupId);
    if (!g) return;
    const name = document.getElementById("m-i-name").value.trim();
    if (!name) return;
    const planned = parseFloat(document.getElementById("m-i-planned").value) || 0;
    g.items.push({ id: uid(), name, planned });
    saveState(); closeModal(); renderAll();
  });
}

function quickAddItem(groupId, name) {
  const g = state.groups.find(x => x.id === groupId);
  if (!g) return;
  const existing = g.items.find(i => i.name.toLowerCase() === name.toLowerCase());
  if (existing) { editItem(existing.id); return; }
  openModal("Add: " + name, `
    <div class="field-group">
      <label class="field-label">Planned Amount</label>
      <input class="field-input" id="m-i-planned" type="number" step="0.01" min="0" placeholder="0.00" />
    </div>
  `, "Add", () => {
    const planned = parseFloat(document.getElementById("m-i-planned").value) || 0;
    g.items.push({ id: uid(), name, planned });
    // Remove from quickAdd
    g.quickAdd = g.quickAdd.filter(q => q.toLowerCase() !== name.toLowerCase());
    saveState(); closeModal(); renderAll();
  });
}

function editItem(id) {
  const fi = findItem(id);
  if (!fi) return;
  const { group: g, item: i } = fi;
  const spent = spentOnItem(i.id, true);
  openModal("Edit: " + i.name, `
    <div style="margin-bottom:12px;font-size:11px;color:var(--text-dim)">
      Spent ${fmt(spent)} of ${fmt(i.planned)} planned this month
    </div>
    <div class="field-group">
      <label class="field-label">Name</label>
      <input class="field-input" id="m-i-name" value="${escapeHtml(i.name)}" />
    </div>
    <div class="field-group">
      <label class="field-label">Planned Amount</label>
      <input class="field-input" id="m-i-planned" type="number" step="0.01" min="0" value="${i.planned}" />
    </div>
    <div style="margin-top:4px">
      <button class="inline-btn" onclick="addTxnForItem('${i.id}','${escapeHtml(i.name).replace(/'/g,"\\'")}')">+ Log Transaction</button>
    </div>
  `, "Save", () => {
    i.name = document.getElementById("m-i-name").value.trim() || i.name;
    i.planned = parseFloat(document.getElementById("m-i-planned").value) || 0;
    saveState(); closeModal(); renderAll();
  }, `<button class="modal-btn danger" onclick="deleteItem('${g.id}','${i.id}')">Delete</button>`);
}

function deleteItem(groupId, itemId) {
  const g = state.groups.find(x => x.id === groupId);
  if (!g) return;
  // Remove related transactions
  state.transactions = state.transactions.filter(t => t.itemId !== itemId);
  g.items = g.items.filter(x => x.id !== itemId);
  saveState(); closeModal(); renderAll();
}

function addTxnForItem(itemId, itemName) {
  closeModal();
  setTimeout(() => {
    openAddTxnModal(itemId, itemName);
  }, 200);
}

/* ===================== TRANSACTIONS MODALS ===================== */
function addTransaction() {
  openAddTxnModal(null, null);
}

function buildCategoryOptions(selectedId) {
  let opts = '<option value="">-- Select Category --</option>';
  state.groups.forEach(g => {
    opts += `<optgroup label="${escapeHtml(g.name)}">`;
    g.items.forEach(i => {
      opts += `<option value="${i.id}"${i.id === selectedId ? " selected" : ""}>${escapeHtml(i.name)}</option>`;
    });
    opts += `</optgroup>`;
  });
  return opts;
}

function openAddTxnModal(itemId, itemName) {
  openModal("Add Transaction", `
    <div class="field-group">
      <label class="field-label">Description</label>
      <input class="field-input" id="m-t-name" placeholder="e.g. Groceries run" />
    </div>
    <div class="field-group">
      <label class="field-label">Amount</label>
      <input class="field-input" id="m-t-amt" type="number" step="0.01" min="0" placeholder="0.00" />
    </div>
    <div class="field-group">
      <label class="field-label">Date</label>
      <input class="field-input" id="m-t-date" type="date" value="${today()}" />
    </div>
    <div class="field-group">
      <label class="field-label">Type</label>
      <select class="field-input" id="m-t-type">
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </select>
    </div>
    <div class="field-group" id="m-t-cat-group">
      <label class="field-label">Category</label>
      <select class="field-input" id="m-t-cat">${buildCategoryOptions(itemId)}</select>
    </div>
    <div class="field-group">
      <label class="field-label">Note (optional)</label>
      <input class="field-input" id="m-t-note" placeholder="Optional note" />
    </div>
  `, "Add", () => {
    const name = document.getElementById("m-t-name").value.trim() || "Transaction";
    const amt = parseFloat(document.getElementById("m-t-amt").value) || 0;
    const date = document.getElementById("m-t-date").value || today();
    const type = document.getElementById("m-t-type").value;
    const catId = document.getElementById("m-t-cat").value;
    const note = document.getElementById("m-t-note").value.trim();
    state.transactions.push({
      id: uid(), name, amount: amt, date, type,
      itemId: catId || null, note
    });
    saveState(); closeModal(); renderAll();
  });

  // Show/hide category on type change
  const typeEl = document.getElementById("m-t-type");
  if (typeEl) {
    typeEl.addEventListener("change", () => {
      const cg = document.getElementById("m-t-cat-group");
      if (cg) cg.style.display = typeEl.value === "income" ? "none" : "";
    });
  }
}

function editTxn(id) {
  const t = state.transactions.find(x => x.id === id);
  if (!t) return;
  openModal("Edit Transaction", `
    <div class="field-group">
      <label class="field-label">Description</label>
      <input class="field-input" id="m-t-name" value="${escapeHtml(t.name || "")}" />
    </div>
    <div class="field-group">
      <label class="field-label">Amount</label>
      <input class="field-input" id="m-t-amt" type="number" step="0.01" min="0" value="${t.amount}" />
    </div>
    <div class="field-group">
      <label class="field-label">Date</label>
      <input class="field-input" id="m-t-date" type="date" value="${t.date || today()}" />
    </div>
    <div class="field-group">
      <label class="field-label">Type</label>
      <select class="field-input" id="m-t-type">
        <option value="expense"${t.type !== "income" ? " selected" : ""}>Expense</option>
        <option value="income"${t.type === "income" ? " selected" : ""}>Income</option>
      </select>
    </div>
    <div class="field-group">
      <label class="field-label">Category</label>
      <select class="field-input" id="m-t-cat">${buildCategoryOptions(t.itemId)}</select>
    </div>
    <div class="field-group">
      <label class="field-label">Note</label>
      <input class="field-input" id="m-t-note" value="${escapeHtml(t.note || "")}" />
    </div>
  `, "Save", () => {
    t.name = document.getElementById("m-t-name").value.trim() || t.name;
    t.amount = parseFloat(document.getElementById("m-t-amt").value) || 0;
    t.date = document.getElementById("m-t-date").value || t.date;
    t.type = document.getElementById("m-t-type").value;
    t.itemId = document.getElementById("m-t-cat").value || null;
    t.note = document.getElementById("m-t-note").value.trim();
    saveState(); closeModal(); renderAll();
  }, `<button class="modal-btn danger" onclick="deleteTxn('${id}')">Delete</button>`);
}

function deleteTxn(id) {
  state.transactions = state.transactions.filter(x => x.id !== id);
  saveState(); closeModal(); renderAll();
}

/* ===================== RESERVES ===================== */
function addReserve() {
  openModal("Add Reserve", `
    <div class="field-group">
      <label class="field-label">Name</label>
      <input class="field-input" id="m-r-name" placeholder="e.g. Car Fund" />
    </div>
    <div class="field-group">
      <label class="field-label">Target Amount</label>
      <input class="field-input" id="m-r-target" type="number" step="0.01" min="0" placeholder="1000.00" />
    </div>
    <div class="field-group">
      <label class="field-label">Current Balance</label>
      <input class="field-input" id="m-r-current" type="number" step="0.01" min="0" placeholder="0.00" />
    </div>
    <div class="field-group">
      <label class="field-label">Note (optional)</label>
      <input class="field-input" id="m-r-note" placeholder="Optional note" />
    </div>
  `, "Add", () => {
    const name = document.getElementById("m-r-name").value.trim();
    if (!name) return;
    state.reserves.push({
      id: uid(),
      name,
      target: parseFloat(document.getElementById("m-r-target").value) || 0,
      current: parseFloat(document.getElementById("m-r-current").value) || 0,
      note: document.getElementById("m-r-note").value.trim()
    });
    saveState(); closeModal(); renderAll();
  });
}

function editReserve(id) {
  const r = state.reserves.find(x => x.id === id);
  if (!r) return;
  openModal("Edit Reserve", `
    <div class="field-group">
      <label class="field-label">Name</label>
      <input class="field-input" id="m-r-name" value="${escapeHtml(r.name)}" />
    </div>
    <div class="field-group">
      <label class="field-label">Target Amount</label>
      <input class="field-input" id="m-r-target" type="number" step="0.01" min="0" value="${r.target}" />
    </div>
    <div class="field-group">
      <label class="field-label">Current Balance</label>
      <input class="field-input" id="m-r-current" type="number" step="0.01" min="0" value="${r.current}" />
    </div>
    <div class="field-group">
      <label class="field-label">Note</label>
      <input class="field-input" id="m-r-note" value="${escapeHtml(r.note || "")}" />
    </div>
    <div class="field-group">
      <label class="field-label">Add Contribution</label>
      <input class="field-input" id="m-r-add" type="number" step="0.01" min="0" placeholder="0.00" />
    </div>
  `, "Save", () => {
    r.name = document.getElementById("m-r-name").value.trim() || r.name;
    r.target = parseFloat(document.getElementById("m-r-target").value) || r.target;
    r.current = parseFloat(document.getElementById("m-r-current").value) || r.current;
    const add = parseFloat(document.getElementById("m-r-add").value) || 0;
    r.current += add;
    r.note = document.getElementById("m-r-note").value.trim();
    saveState(); closeModal(); renderAll();
  }, `<button class="modal-btn danger" onclick="deleteReserve('${id}')">Delete</button>`);
}

function deleteReserve(id) {
  state.reserves = state.reserves.filter(x => x.id !== id);
  saveState(); closeModal(); renderAll();
}

/* ===================== ACCOUNTS ===================== */
function addAccount() {
  openModal("Add Account", `
    <div class="field-group">
      <label class="field-label">Account Name</label>
      <input class="field-input" id="m-a-name" placeholder="e.g. Chase Checking" />
    </div>
    <div class="field-group">
      <label class="field-label">Type</label>
      <select class="field-input" id="m-a-type">
        <option value="checking">Checking</option>
        <option value="savings">Savings</option>
        <option value="investment">Investment</option>
        <option value="cash">Cash</option>
        <option value="credit card">Credit Card</option>
        <option value="student loan">Student Loan</option>
        <option value="auto loan">Auto Loan</option>
        <option value="mortgage">Mortgage</option>
        <option value="other debt">Other Debt</option>
      </select>
    </div>
    <div class="field-group">
      <label class="field-label">Balance</label>
      <input class="field-input" id="m-a-bal" type="number" step="0.01" placeholder="0.00" />
    </div>
    <div class="field-group">
      <label class="field-label">Kind</label>
      <select class="field-input" id="m-a-kind">
        <option value="asset">Asset</option>
        <option value="liability">Liability</option>
      </select>
    </div>
  `, "Add", () => {
    const name = document.getElementById("m-a-name").value.trim();
    if (!name) return;
    state.accounts.push({
      id: uid(),
      name,
      type: document.getElementById("m-a-type").value,
      balance: parseFloat(document.getElementById("m-a-bal").value) || 0,
      kind: document.getElementById("m-a-kind").value
    });
    saveState(); closeModal(); renderAll();
  });
}

function editAccount(id) {
  const a = state.accounts.find(x => x.id === id);
  if (!a) return;
  const typeOpts = ["checking","savings","investment","cash","credit card","student loan","auto loan","mortgage","other debt"]
    .map(t => `<option value="${t}"${a.type===t?" selected":""}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join("");
  openModal("Edit Account", `
    <div class="field-group">
      <label class="field-label">Name</label>
      <input class="field-input" id="m-a-name" value="${escapeHtml(a.name)}" />
    </div>
    <div class="field-group">
      <label class="field-label">Type</label>
      <select class="field-input" id="m-a-type">${typeOpts}</select>
    </div>
    <div class="field-group">
      <label class="field-label">Balance</label>
      <input class="field-input" id="m-a-bal" type="number" step="0.01" value="${a.balance}" />
    </div>
    <div class="field-group">
      <label class="field-label">Kind</label>
      <select class="field-input" id="m-a-kind">
        <option value="asset"${a.kind==="asset"?" selected":""}>Asset</option>
        <option value="liability"${a.kind==="liability"?" selected":""}>Liability</option>
      </select>
    </div>
  `, "Save", () => {
    a.name = document.getElementById("m-a-name").value.trim() || a.name;
    a.type = document.getElementById("m-a-type").value;
    a.balance = parseFloat(document.getElementById("m-a-bal").value) || 0;
    a.kind = document.getElementById("m-a-kind").value;
    saveState(); closeModal(); renderAll();
  }, `<button class="modal-btn danger" onclick="deleteAccount('${id}')">Delete</button>`);
}

function deleteAccount(id) {
  state.accounts = state.accounts.filter(x => x.id !== id);
  saveState(); closeModal(); renderAll();
}

/* ===================== BANDGANG MODALS ===================== */
function addScore() {
  openModal("Add Credit Score", `
    <div class="field-group">
      <label class="field-label">Bureau</label>
      <select class="field-input" id="m-sc-bureau">
        <option value="Equifax">Equifax</option>
        <option value="Experian">Experian</option>
        <option value="TransUnion">TransUnion</option>
      </select>
    </div>
    <div class="field-group">
      <label class="field-label">Score</label>
      <input class="field-input" id="m-sc-score" type="number" min="300" max="850" placeholder="e.g. 620" />
    </div>
    <div class="field-group">
      <label class="field-label">Date Pulled</label>
      <input class="field-input" id="m-sc-date" type="date" value="${today()}" />
    </div>
  `, "Save", () => {
    const bureau = document.getElementById("m-sc-bureau").value;
    const score = parseInt(document.getElementById("m-sc-score").value) || 0;
    const date = document.getElementById("m-sc-date").value;
    if (!score) return;
    // Upsert by bureau
    const existing = state.bandgang.scores.findIndex(s => s.bureau === bureau);
    if (existing >= 0) {
      state.bandgang.scores[existing] = { bureau, score, date };
    } else {
      state.bandgang.scores.push({ bureau, score, date });
    }
    saveState(); closeModal(); renderBandgang();
  });
}

function editScore(bureau) {
  const sc = state.bandgang.scores.find(s => s.bureau === bureau);
  openModal("Edit Score: " + bureau, `
    <div class="field-group">
      <label class="field-label">Score</label>
      <input class="field-input" id="m-sc-score" type="number" min="300" max="850" value="${sc ? sc.score : ""}" placeholder="300–850" />
    </div>
    <div class="field-group">
      <label class="field-label">Date Pulled</label>
      <input class="field-input" id="m-sc-date" type="date" value="${sc ? sc.date : today()}" />
    </div>
  `, "Save", () => {
    const score = parseInt(document.getElementById("m-sc-score").value) || 0;
    const date = document.getElementById("m-sc-date").value;
    const existing = state.bandgang.scores.findIndex(s => s.bureau === bureau);
    if (existing >= 0) {
      state.bandgang.scores[existing] = { bureau, score, date };
    } else {
      state.bandgang.scores.push({ bureau, score, date });
    }
    saveState(); closeModal(); renderBandgang();
  }, sc ? `<button class="modal-btn danger" onclick="deleteScore('${bureau}')">Remove</button>` : "");
}

function deleteScore(bureau) {
  state.bandgang.scores = state.bandgang.scores.filter(s => s.bureau !== bureau);
  saveState(); closeModal(); renderBandgang();
}

function addCreditItem() {
  openModal("Add Credit Item", creditItemFormHtml(null), "Add", () => {
    const item = readCreditItemForm();
    if (!item.creditor) return;
    item.id = uid();
    state.bandgang.items.push(item);
    saveState(); closeModal(); renderBandgang();
  });
}

function editCreditItem(id) {
  const item = state.bandgang.items.find(x => x.id === id);
  if (!item) return;
  openModal("Edit Credit Item", creditItemFormHtml(item), "Save", () => {
    const updated = readCreditItemForm();
    Object.assign(item, updated);
    saveState(); closeModal(); renderBandgang();
  }, `<button class="modal-btn danger" onclick="deleteCreditItem('${id}')">Delete</button>`);
}

function deleteCreditItem(id) {
  state.bandgang.items = state.bandgang.items.filter(x => x.id !== id);
  saveState(); closeModal(); renderBandgang();
}

function creditItemFormHtml(item) {
  const v = item || {};
  const typeOpts = Object.entries(TYPE_LABELS).map(([k, l]) =>
    `<option value="${k}"${v.type===k?" selected":""}>${l}</option>`).join("");
  const stratOpts = Object.entries(STRATEGY_LABELS).map(([k, l]) =>
    `<option value="${k}"${v.strategy===k?" selected":""}>${l}</option>`).join("");
  const statOpts = Object.entries(STATUS_LABELS).map(([k, l]) =>
    `<option value="${k}"${v.status===k?" selected":""}>${l}</option>`).join("");
  return `
    <div class="field-group">
      <label class="field-label">Creditor / Collection Agency</label>
      <input class="field-input" id="ci-creditor" value="${escapeHtml(v.creditor||"")}" placeholder="e.g. Capital One" />
    </div>
    <div class="field-group">
      <label class="field-label">Account Number (last 4 ok)</label>
      <input class="field-input" id="ci-acctnum" value="${escapeHtml(v.acctNum||"")}" placeholder="xxxx-xxxx" />
    </div>
    <div class="field-group">
      <label class="field-label">Balance Owed</label>
      <input class="field-input" id="ci-balance" type="number" step="0.01" min="0" value="${v.balance||""}" placeholder="0.00" />
    </div>
    <div class="field-group">
      <label class="field-label">Type</label>
      <select class="field-input" id="ci-type"><option value="">-- Select Type --</option>${typeOpts}</select>
    </div>
    <div class="field-group">
      <label class="field-label">Dispute Strategy</label>
      <select class="field-input" id="ci-strategy"><option value="">-- Select Strategy --</option>${stratOpts}</select>
    </div>
    <div class="field-group">
      <label class="field-label">Status</label>
      <select class="field-input" id="ci-status"><option value="">-- Select Status --</option>${statOpts}</select>
    </div>
    <div class="field-group">
      <label class="field-label">Open Date</label>
      <input class="field-input" id="ci-opendate" type="date" value="${v.openDate||""}" />
    </div>
    <div class="field-group">
      <label class="field-label">Notes</label>
      <textarea class="field-input" id="ci-notes" rows="2" placeholder="Any notes...">${escapeHtml(v.notes||"")}</textarea>
    </div>`;
}

function readCreditItemForm() {
  return {
    creditor: document.getElementById("ci-creditor").value.trim(),
    acctNum: document.getElementById("ci-acctnum").value.trim(),
    balance: parseFloat(document.getElementById("ci-balance").value) || 0,
    type: document.getElementById("ci-type").value,
    strategy: document.getElementById("ci-strategy").value,
    status: document.getElementById("ci-status").value,
    openDate: document.getElementById("ci-opendate").value,
    notes: document.getElementById("ci-notes").value.trim()
  };
}

/* ===================== CREDIT REPORT UPLOAD ===================== */
function handleReportFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const content = e.target.result;
    processReportText(content, file.name);
  };
  if (file.name.endsWith(".pdf")) {
    showToast("PDF detected — showing raw text. For best results use a TXT or CSV export.");
    reader.readAsText(file);
  } else {
    reader.readAsText(file);
  }
}

function handleReportDrop(e) {
  e.preventDefault();
  document.getElementById("uploadZone").classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => processReportText(ev.target.result, file.name);
  reader.readAsText(file);
}

document.addEventListener("dragover", () => {
  const z = document.getElementById("uploadZone");
  if (z) z.classList.add("drag-over");
});
document.addEventListener("dragleave", () => {
  const z = document.getElementById("uploadZone");
  if (z) z.classList.remove("drag-over");
});

function processReportText(text, filename) {
  const preview = document.getElementById("reportPreview");
  preview.hidden = false;
  preview.textContent = text.slice(0, 2000) + (text.length > 2000 ? "\n... [truncated — " + text.length + " chars total]" : "");

  // Try to auto-extract credit items from common report formats
  const extracted = extractCreditItems(text);
  if (extracted.length > 0) {
    const existing = new Set(state.bandgang.items.map(i => i.creditor.toLowerCase()));
    const newItems = extracted.filter(i => !existing.has(i.creditor.toLowerCase()));
    if (newItems.length > 0) {
      if (confirm(`Found ${newItems.length} new account(s) in your report. Add them to BANDGANG?`)) {
        newItems.forEach(i => {
          i.id = uid();
          state.bandgang.items.push(i);
        });
        saveState();
        renderBandgang();
        showToast(`Added ${newItems.length} items from report`);
      }
    } else {
      showToast("Accounts already tracked — review credit items below.");
    }
  } else {
    showToast("Report loaded. Add items manually if auto-extract didn't detect them.");
  }
}

function extractCreditItems(text) {
  const items = [];
  const lines = text.split("\n");

  // Common patterns in credit report exports
  const creditorPatterns = [
    /account\s+name[:\s]+(.+)/i,
    /creditor[:\s]+(.+)/i,
    /furnisher[:\s]+(.+)/i,
  ];
  const balancePatterns = [
    /balance[:\s]+\$?([\d,]+\.?\d*)/i,
    /amount\s+owed[:\s]+\$?([\d,]+\.?\d*)/i,
  ];
  const acctPatterns = [
    /account\s+number[:\s]+([*\d\w-]+)/i,
    /acct[#:\s]+([*\d\w-]+)/i,
  ];
  const typePatterns = [
    /account\s+type[:\s]+(.+)/i,
    /type[:\s]+(.+)/i,
  ];

  let current = null;
  lines.forEach(line => {
    const l = line.trim();

    for (const p of creditorPatterns) {
      const m = l.match(p);
      if (m) {
        if (current && current.creditor) items.push(current);
        current = { creditor: m[1].trim(), balance: 0, type: "other", status: "open", strategy: "" };
        break;
      }
    }

    if (current) {
      for (const p of balancePatterns) {
        const m = l.match(p);
        if (m) {
          current.balance = parseFloat(m[1].replace(/,/g, "")) || 0;
          break;
        }
      }
      for (const p of acctPatterns) {
        const m = l.match(p);
        if (m) { current.acctNum = m[1].trim(); break; }
      }
      for (const p of typePatterns) {
        const m = l.match(p);
        if (m) {
          const t = m[1].trim().toLowerCase();
          if (t.includes("credit card")) current.type = "credit_card";
          else if (t.includes("student")) current.type = "student_loan";
          else if (t.includes("auto") || t.includes("vehicle")) current.type = "auto_loan";
          else if (t.includes("collection")) current.type = "collection";
          else if (t.includes("medical")) current.type = "medical";
          else if (t.includes("charge")) current.type = "charge_off";
          break;
        }
      }
    }
  });
  if (current && current.creditor) items.push(current);

  return items;
}

/* ===================== LETTER DRAFTING ===================== */
function draftLetter(type) {
  const profile = state.bandgang.profile;
  const hasProfile = profile.name && profile.addr1;
  const items = state.bandgang.items;

  if (!hasProfile) {
    showToast("Fill out your profile below first for personalized letters.");
  }

  const myName = profile.name || "[YOUR FULL NAME]";
  const myAddr = [profile.addr1, profile.addr2, [profile.city, profile.state, profile.zip].filter(Boolean).join(", ")].filter(Boolean).join("\n");
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // Find relevant items for context
  const relevantItems = items.filter(i => {
    if (type === "dispute" || type === "method_of_verification") return i.strategy === "dispute" || !i.strategy;
    if (type === "goodwill") return i.strategy === "goodwill";
    if (type === "pay_for_delete") return i.strategy === "pay_for_delete";
    if (type === "validate") return i.strategy === "validate";
    if (type === "cease") return true;
    return true;
  });

  const itemContext = relevantItems.length > 0
    ? relevantItems.map(i =>
        `  Account: ${i.creditor}${i.acctNum ? " — Account #" + i.acctNum : ""}${i.balance ? " — Balance: " + fmt(i.balance) : ""}`
      ).join("\n")
    : "  [List specific accounts here]";

  let title, letter;

  if (type === "dispute") {
    title = "Credit Bureau Dispute Letter";
    letter = `${myName}
${myAddr}

${dateStr}

[BUREAU NAME]
[BUREAU ADDRESS]

Re: Request to Investigate and Remove Inaccurate Information

To Whom It May Concern:

I am writing pursuant to my rights under the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681 et seq., to dispute the accuracy of information appearing on my credit report.

After reviewing my credit report, I have identified the following items that are inaccurate, incomplete, or unverifiable and I am requesting their immediate investigation and removal:

${itemContext}

Under Section 611 of the FCRA, you are required to conduct a reasonable investigation and correct or delete any information that cannot be verified. If you are unable to verify the accuracy of any of the disputed items within 30 days, they must be deleted from my credit report.

I am also requesting:
  1. A copy of my updated credit report showing the results of your investigation
  2. The name, address, and phone number of anyone contacted during your investigation
  3. A description of the investigation process

Please provide written confirmation of the outcome of your investigation within 30 days as required by law.

Sincerely,

${myName}

[SIGNATURE]

Enclosures:
  — Copy of Government-Issued ID
  — Proof of Current Address (utility bill or bank statement)`;
  }
  else if (type === "goodwill") {
    title = "Goodwill Adjustment Letter";
    letter = `${myName}
${myAddr}

${dateStr}

[CREDITOR NAME]
[CREDITOR ADDRESS]

Re: Goodwill Adjustment Request

To Whom It May Concern:

I am writing to request a goodwill adjustment on my account with your company. I have been a customer and I take full responsibility for the late payment(s) that appear on my credit report.

Accounts in question:
${itemContext}

I want to be transparent — I experienced [brief explanation: job loss / medical emergency / personal hardship] which caused me to fall behind on my obligations. Since then, I have made every effort to get back on track and have maintained consistent, on-time payments.

A single negative mark can have an outsized impact on my credit score and my ability to [buy a home / secure employment / obtain financing]. I am asking — as a courtesy — that you consider removing this negative mark from my credit report as a gesture of goodwill.

I assure you that this was an isolated incident and does not reflect my character or commitment as a customer. I would be grateful for your understanding and assistance in this matter.

Thank you sincerely for your consideration.

Respectfully,

${myName}

[SIGNATURE]`;
  }
  else if (type === "pay_for_delete") {
    title = "Pay-For-Delete Letter";
    letter = `${myName}
${myAddr}

${dateStr}

[COLLECTION AGENCY NAME]
[COLLECTION AGENCY ADDRESS]

Re: Settlement Offer — Pay-For-Delete Agreement

To Whom It May Concern:

I am writing regarding the following account(s):

${itemContext}

I am prepared to resolve this account in full — or settle for a mutually agreed-upon amount — in exchange for the complete deletion of this account from all three major credit bureaus (Equifax, Experian, and TransUnion).

My offer:
  — I will pay [AMOUNT OFFERED] in full within [X] days of receiving written confirmation of your agreement to delete this account from all three credit bureaus.
  — Payment will be made by [cashier's check / money order / certified funds].

IMPORTANT: This offer is contingent upon receiving written confirmation (letter on company letterhead, signed by an authorized representative) that upon receipt of payment, your company will:
  1. Report the account as "Deleted" to all three credit bureaus
  2. Never sell or transfer the alleged debt to another collection agency

This offer expires [30 DAYS FROM DATE]. If I do not receive a written response within that time, I will consider this matter unresolved.

Please respond in writing to the address listed above.

Sincerely,

${myName}

[SIGNATURE]

Note: This letter is not an acknowledgment of the debt. It is a settlement offer only.`;
  }
  else if (type === "validate") {
    title = "Debt Validation Letter";
    letter = `${myName}
${myAddr}

${dateStr}

[COLLECTION AGENCY NAME]
[COLLECTION AGENCY ADDRESS]

Re: Debt Validation Request — Pursuant to FDCPA § 809(b)

To Whom It May Concern:

I recently received a communication regarding an alleged debt. Pursuant to my rights under the Fair Debt Collection Practices Act (FDCPA), 15 U.S.C. § 1692g(b), I am formally requesting validation of this alleged debt before taking any further action.

Account(s) referenced:
${itemContext}

Please provide the following:
  1. The name and address of the original creditor
  2. Proof that your company has the legal right to collect this debt
  3. A complete account history showing how the alleged amount was calculated
  4. A copy of any original signed agreement between me and the original creditor
  5. Proof that the statute of limitations has not expired on this alleged debt
  6. Proof that you are licensed to collect debts in my state

Until this debt is properly validated, please cease all collection activities including reporting this account to any credit bureau. If you continue to report this account or take collection action without providing validation, you may be in violation of the FDCPA and subject to legal action.

This letter is being sent via Certified Mail. Please respond within 30 days.

Sincerely,

${myName}

[SIGNATURE]

Certified Mail Tracking #: [TRACKING NUMBER]`;
  }
  else if (type === "cease") {
    title = "Cease & Desist Letter";
    letter = `${myName}
${myAddr}

${dateStr}

[COLLECTION AGENCY NAME]
[COLLECTION AGENCY ADDRESS]

Re: Cease and Desist All Collection Activity

To Whom It May Concern:

This letter serves as formal notice, pursuant to the Fair Debt Collection Practices Act (FDCPA), 15 U.S.C. § 1692c(c), that you must CEASE AND DESIST all communication and collection activity regarding the alleged debt(s) associated with my name.

Accounts in question:
${itemContext}

You are hereby notified that:
  1. Any further contact will be considered harassment under the FDCPA
  2. All future communications must be in writing only, sent to the address above
  3. You may NOT contact me at my place of employment
  4. You may NOT contact third parties regarding this alleged debt

If you continue to contact me after receipt of this letter, I will immediately file complaints with:
  — The Consumer Financial Protection Bureau (CFPB)
  — The Federal Trade Commission (FTC)
  — My state Attorney General
  — And pursue all legal remedies available to me under the FDCPA

This letter is being sent via Certified Mail, Return Receipt Requested.

Sincerely,

${myName}

[SIGNATURE]

Certified Mail Tracking #: [TRACKING NUMBER]`;
  }
  else if (type === "method_of_verification") {
    title = "Method of Verification Letter";
    letter = `${myName}
${myAddr}

${dateStr}

[BUREAU NAME]
[BUREAU ADDRESS]

Re: Method of Verification Request — FCRA § 611(a)(7)

To Whom It May Concern:

I recently disputed the following items on my credit report and received notification that your investigation concluded that the information is "verified." Pursuant to Section 611(a)(7) of the Fair Credit Reporting Act (FCRA), I am now formally requesting a description of the procedure used to determine the accuracy and completeness of the disputed information.

Disputed Items:
${itemContext}

Specifically, I am requesting:
  1. The name, address, and telephone number of any person contacted during the investigation
  2. The documents reviewed during the investigation
  3. A description of the investigation procedure used
  4. How you verified the accuracy of the disputed information

If you cannot provide this information, or if your investigation was limited to simply receiving confirmation from the original furnisher without independent verification, then the items must be deleted from my credit report.

Please respond within 15 days as required by law.

Sincerely,

${myName}

[SIGNATURE]`;
  }

  if (title && letter) {
    openLetter(title, letter);
  }
}

/* ===================== DATA IMPORT / EXPORT ===================== */
function exportData() {
  const data = { ...state, exportDate: today(), version: "v3" };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "nolimit-budget-" + today() + ".json";
  a.click();
  URL.revokeObjectURL(url);
  showToast("Budget exported!");
}

function importData() {
  document.getElementById("importInput").click();
}

function handleImport(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.paychecks && !data.groups) {
        showToast("Invalid backup file.");
        return;
      }
      if (!confirm("This will replace all your current data. Continue?")) return;
      state = hydrate(data);
      saveState();
      renderAll();
      showToast("Data imported successfully!");
    } catch (err) {
      showToast("Failed to import — invalid file.");
    }
  };
  reader.readAsText(file);
  input.value = "";
}

/* ===================== SERVICE WORKER ===================== */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

/* ===================== INIT ===================== */
document.addEventListener("DOMContentLoaded", () => {
  switchTab(state.activeTab || "today");
});
