const API_BASE = window.location.protocol === "file:" ? "http://localhost:4173" : "";

let store = {};
let selectedGroupId = "";
let selectedReport = "statement";

const money = new Intl.NumberFormat("zh-TW", { style: "currency", currency: "TWD", maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" });
const $ = (selector) => document.querySelector(selector);

const labels = {
  paymentStatus: { unpaid: "未付款", paid: "已付款" },
  purchaseStatus: { pending: "待購買", purchased: "已購買" },
  customsStatus: { pending: "未抵台", arrived_tw: "報關抵台" },
  shippingStatus: { pending: "未出貨", ready: "可出貨", shipped: "已出貨" },
  status: { ordered: "已下單", arrived: "已到貨", completed: "已取貨" },
  fieldType: { text: "簡答", textarea: "詳答", radio: "單選", checkbox: "核取方塊", select: "下拉選單", number: "數字", date: "日期", radio_grid: "單選方格", checkbox_grid: "核取方塊方格" },
};

const els = {
  customerSelect: $("#customerSelect"),
  sellerMetricGrid: $("#sellerMetricGrid"),
  templateGrid: $("#templateGrid"),
  groupCount: $("#groupCount"),
  groupList: $("#groupList"),
  workflowBoard: $("#workflowBoard"),
  selectedGroupLabel: $("#selectedGroupLabel"),
  formBlockList: $("#formBlockList"),
  formPreview: $("#formPreview"),
  orderGroupFilter: $("#orderGroupFilter"),
  orderStatusFilter: $("#orderStatusFilter"),
  sellerOrderRows: $("#sellerOrderRows"),
  reportSearch: $("#reportSearch"),
  reportGroupFilter: $("#reportGroupFilter"),
  reportCustomerFilter: $("#reportCustomerFilter"),
  reportPeriodFilter: $("#reportPeriodFilter"),
  reportContent: $("#reportContent"),
  sellerFeedbackList: $("#sellerFeedbackList"),
  ruleVersionList: $("#ruleVersionList"),
  ruleAcceptanceList: $("#ruleAcceptanceList"),
  profileForm: $("#profileForm"),
  customerRulePanel: $("#customerRulePanel"),
  customerGroupGrid: $("#customerGroupGrid"),
  customerOrders: $("#customerOrders"),
  feedbackForm: $("#feedbackForm"),
  customerFeedbackList: $("#customerFeedbackList"),
  toast: $("#toast"),
};

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || response.statusText);
  const type = response.headers.get("content-type") || "";
  return type.includes("json") ? response.json() : response.text();
}

async function loadData() {
  store = await api("/api/bootstrap");
  selectedGroupId = selectedGroupId || store.groups[0]?.id || "";
  hydrateSelectors();
  render();
}

function hydrateSelectors() {
  const currentUser = els.customerSelect.value;
  const customers = store.users.filter((user) => user.role === "customer");
  els.customerSelect.innerHTML = customers.map((user) => `<option value="${user.id}">${user.nickname} / ${maskPhone(user.phone)}</option>`).join("");
  els.customerSelect.value = customers.some((user) => user.id === currentUser) ? currentUser : customers[0]?.id || "";

  const groupOptions = [`<option value="all">全部團務</option>`, ...store.groups.map((group) => `<option value="${group.id}">${group.title}</option>`)].join("");
  [els.orderGroupFilter, els.reportGroupFilter].forEach((select) => {
    const previous = select.value || "all";
    select.innerHTML = groupOptions;
    select.value = store.groups.some((group) => group.id === previous) ? previous : "all";
  });
  els.reportCustomerFilter.innerHTML = [`<option value="all">全部顧客</option>`, ...customers.map((user) => `<option value="${user.id}">${user.name}</option>`)].join("");
}

function currentUser() {
  return store.users.find((user) => user.id === els.customerSelect.value) || store.users.find((user) => user.role === "customer");
}

function latestRule() {
  return [...store.ruleVersions].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))[0];
}

function hasAcceptedLatestRule(userId = currentUser()?.id) {
  const rule = latestRule();
  return store.ruleAcceptances.some((item) => item.userId === userId && item.ruleVersionId === rule?.id);
}

function groupById(id) {
  return store.groups.find((group) => group.id === id);
}

function userById(id) {
  return store.users.find((user) => user.id === id);
}

function productById(id) {
  return store.products.find((product) => product.id === id);
}

function blocksForGroup(groupId = selectedGroupId) {
  return store.formBlocks.filter((block) => block.groupId === groupId).sort((a, b) => a.sortOrder - b.sortOrder);
}

function ordersForGroup(groupId) {
  return store.orders.filter((order) => order.groupId === groupId);
}

function maskPhone(phone = "") {
  return phone.length >= 10 ? `${phone.slice(0, 4)}***${phone.slice(-3)}` : phone || "-";
}

function totalsForGroup(groupId) {
  const orders = ordersForGroup(groupId);
  return {
    orderCount: orders.length,
    revenue: sum(orders, "totalAmount"),
    cost: sum(orders, "costAmount"),
    unpaid: sum(orders.filter((order) => order.paymentStatus === "unpaid"), "totalAmount"),
    quantity: sum(orders, "quantity"),
  };
}

function sum(items, key) {
  return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}

function renderMetrics() {
  const revenue = sum(store.orders, "totalAmount");
  const cost = sum(store.orders, "costAmount");
  const unpaid = sum(store.orders.filter((order) => order.paymentStatus === "unpaid"), "totalAmount");
  const metrics = [
    ["進行中團務", `${store.groups.filter((group) => group.status === "active").length} 團`],
    ["訂單數", `${store.orders.length} 筆`],
    ["未收款", money.format(unpaid)],
    ["預估毛利", money.format(revenue - cost)],
  ];
  els.sellerMetricGrid.innerHTML = metrics.map(([label, value]) => `<article class="metric"><span>${label}</span><strong>${value}</strong></article>`).join("");
}

function renderTemplates() {
  els.templateGrid.innerHTML = store.formTemplates.map((template) => `
    <article class="template-card">
      <div><strong>${template.name}</strong><p class="mini-meta">${template.description}</p></div>
      <div class="question-tools">${template.blocks.map((block) => `<span class="tool-chip">${block.title}</span>`).join("")}</div>
      <button class="ghost-action" type="button" data-template="${template.id}">套用建立團務</button>
    </article>
  `).join("");
  document.querySelectorAll("[data-template]").forEach((button) => button.addEventListener("click", () => createGroup(button.dataset.template)));
}

function renderGroups() {
  els.groupCount.textContent = `${store.groups.length} 團`;
  els.groupList.innerHTML = store.groups.map((group) => {
    const totals = totalsForGroup(group.id);
    return `
      <button class="group-button ${group.id === selectedGroupId ? "active" : ""}" data-group="${group.id}" type="button">
        <div class="row-between"><strong>${group.title}</strong><span class="pill ${group.status === "active" ? "open" : "closed"}">${group.status}</span></div>
        <div class="product-meta">${group.category} / ${group.buyer} / ${dateFmt.format(new Date(group.deadline))}</div>
        <div class="product-meta">${totals.orderCount} 筆 / ${totals.quantity} 件 / ${money.format(totals.revenue)}</div>
      </button>
    `;
  }).join("");
  document.querySelectorAll("[data-group]").forEach((button) => button.addEventListener("click", () => {
    selectedGroupId = button.dataset.group;
    render();
  }));
}

function renderWorkflow() {
  const group = groupById(selectedGroupId);
  if (!group) return;
  els.selectedGroupLabel.textContent = group.title;
  const items = [["登記", "ordered"], ["購買", "purchased"], ["報關抵台", "customs"], ["出貨", "shipped"], ["取貨", "completed"]];
  els.workflowBoard.innerHTML = items.map(([label, key]) => `
    <article class="status-card">
      <div class="row-between"><strong>${label}</strong><span class="pill">${group.workflow[key]}%</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${group.workflow[key]}%"></div></div>
      <span class="mini-meta">${group.title}</span>
    </article>
  `).join("");
}

function renderFormDesigner() {
  const blocks = blocksForGroup();
  els.formBlockList.innerHTML = blocks.map((block) => `
    <article class="form-question">
      <div class="question-top"><div class="question-title">${block.title}</div><div class="question-type">${block.layout}</div></div>
      <div class="question-preview">${block.fields.length} 個欄位 / 可拖曳排序與微調</div>
      <div class="question-tools">${block.fields.map((field) => `<span class="tool-chip">${labels.fieldType[field.type] || field.type}</span>`).join("")}</div>
    </article>
  `).join("");
  els.formPreview.innerHTML = blocks.map((block) => `
    <fieldset class="field-box">
      <legend>${block.title}</legend>
      ${block.fields.map(renderField).join("")}
    </fieldset>
  `).join("");
}

function renderField(field) {
  const mark = field.required ? " *" : "";
  if (field.type === "textarea") return `<label>${field.label}${mark}<textarea rows="3" placeholder="請輸入"></textarea></label>`;
  if (field.type === "select") return `<label>${field.label}${mark}<select>${field.options.map((option) => `<option>${option}</option>`).join("")}</select></label>`;
  if (field.type === "radio" || field.type === "checkbox") return `<div class="stack-label"><strong>${field.label}${mark}</strong>${field.options.map((option) => `<label><input type="${field.type}" name="${field.id}" /> ${option}</label>`).join("")}</div>`;
  if (field.type === "radio_grid" || field.type === "checkbox_grid") return renderGridField(field);
  return `<label>${field.label}${mark}<input type="${field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}" placeholder="請輸入" /></label>`;
}

function renderGridField(field) {
  const type = field.type === "radio_grid" ? "radio" : "checkbox";
  return `
    <div class="stack-label">
      <strong>${field.label}${field.required ? " *" : ""}</strong>
      <div class="grid-field" style="grid-template-columns: 1.2fr repeat(${field.columns.length}, 1fr)">
        <span></span>${field.columns.map((col) => `<strong>${col}</strong>`).join("")}
        ${field.rows.map((row) => `<strong>${row}</strong>${field.columns.map((col) => `<label><input type="${type}" name="${field.id}-${row}" /> ${col}</label>`).join("")}`).join("")}
      </div>
    </div>
  `;
}

function renderOrders() {
  const groupFilter = els.orderGroupFilter.value || "all";
  const statusFilter = els.orderStatusFilter.value || "all";
  const orders = store.orders.filter((order) => {
    const groupOk = groupFilter === "all" || order.groupId === groupFilter;
    const statusOk = statusFilter === "all" || [order.paymentStatus, order.purchaseStatus, order.customsStatus, order.shippingStatus, order.status].includes(statusFilter);
    return groupOk && statusOk;
  });
  els.sellerOrderRows.innerHTML = orders.map((order) => {
    const user = userById(order.userId);
    const group = groupById(order.groupId);
    const product = productById(order.productId);
    return `
      <tr>
        <td><strong>${order.id}</strong><div class="mini-meta">${maskPhone(user?.phone)}</div></td>
        <td>${user?.name || "-"}</td>
        <td>${group?.title || "-"}</td>
        <td>${product?.name || "-"}</td>
        <td>${statusSelect(order, "paymentStatus")}</td>
        <td>${statusSelect(order, "purchaseStatus")}</td>
        <td>${statusSelect(order, "customsStatus")}</td>
        <td>${statusSelect(order, "shippingStatus")}</td>
        <td>${statusSelect(order, "status")}</td>
        <td>${money.format(order.totalAmount)}</td>
      </tr>
    `;
  }).join("");
  document.querySelectorAll("[data-status-order]").forEach((select) => {
    select.addEventListener("change", () => updateOrder(select.dataset.statusOrder, { [select.dataset.statusKey]: select.value }));
  });
}

function statusSelect(order, key) {
  return `<select class="inline-select" data-status-order="${order.id}" data-status-key="${key}">${Object.entries(labels[key]).map(([value, label]) => `<option value="${value}" ${order[key] === value ? "selected" : ""}>${label}</option>`).join("")}</select>`;
}

function renderReports() {
  document.querySelectorAll("[data-report]").forEach((button) => button.classList.toggle("active", button.dataset.report === selectedReport));
  const rows = filteredReportOrders();
  if (selectedReport === "statement") renderStatementReport(rows);
  if (selectedReport === "group") renderGroupReport(rows);
  if (selectedReport === "profit") renderProfitReport(rows);
  if (selectedReport === "customer") renderCustomerReport(rows);
}

function filteredReportOrders() {
  const query = (els.reportSearch.value || "").trim().toLowerCase();
  const groupFilter = els.reportGroupFilter.value || "all";
  const customerFilter = els.reportCustomerFilter.value || "all";
  return store.orders.filter((order) => {
    const user = userById(order.userId);
    const product = productById(order.productId);
    const group = groupById(order.groupId);
    const text = `${order.id} ${user?.name} ${product?.name} ${group?.title}`.toLowerCase();
    return (groupFilter === "all" || order.groupId === groupFilter) && (customerFilter === "all" || order.userId === customerFilter) && text.includes(query);
  });
}

function renderStatementReport(rows) {
  els.reportContent.innerHTML = table(["訂單", "買家", "團務", "商品", "金額", "付款", "取貨"], rows.map((order) => [order.id, userById(order.userId)?.name, groupById(order.groupId)?.title, productById(order.productId)?.name, money.format(order.totalAmount), labels.paymentStatus[order.paymentStatus], labels.status[order.status]]));
}

function renderGroupReport(rows) {
  els.reportContent.innerHTML = table(["訂單", "買家", "商品", "數量", "購買", "報關", "出貨", "金額"], rows.map((order) => [order.id, userById(order.userId)?.name, productById(order.productId)?.name, order.quantity, labels.purchaseStatus[order.purchaseStatus], labels.customsStatus[order.customsStatus], labels.shippingStatus[order.shippingStatus], money.format(order.totalAmount)]));
}

function renderProfitReport(rows) {
  const revenue = sum(rows, "totalAmount");
  const cost = sum(rows, "costAmount");
  const unpaid = sum(rows.filter((order) => order.paymentStatus === "unpaid"), "totalAmount");
  els.reportContent.innerHTML = `<div class="metric-grid">${[["收入", revenue], ["成本", cost], ["未收", unpaid], ["毛利", revenue - cost]].map(([label, value]) => `<article class="metric"><span>${label}</span><strong>${money.format(value)}</strong></article>`).join("")}</div>${table(["團務", "訂單", "收入", "成本", "未收", "毛利"], store.groups.map((group) => {
    const groupRows = rows.filter((order) => order.groupId === group.id);
    const groupRevenue = sum(groupRows, "totalAmount");
    const groupCost = sum(groupRows, "costAmount");
    const groupUnpaid = sum(groupRows.filter((order) => order.paymentStatus === "unpaid"), "totalAmount");
    return [group.title, groupRows.length, money.format(groupRevenue), money.format(groupCost), money.format(groupUnpaid), money.format(groupRevenue - groupCost)];
  }))}`;
}

function renderCustomerReport(rows) {
  const customers = store.users.filter((user) => user.role === "customer");
  els.reportContent.innerHTML = table(["顧客", "訂單", "消費", "已付", "未付", "取貨完成"], customers.map((user) => {
    const userRows = rows.filter((order) => order.userId === user.id);
    const total = sum(userRows, "totalAmount");
    const paid = sum(userRows.filter((order) => order.paymentStatus === "paid"), "totalAmount");
    return [user.name, userRows.length, money.format(total), money.format(paid), money.format(total - paid), userRows.filter((order) => order.status === "completed").length];
  }));
}

function table(headers, rows) {
  return `<div class="table-wrap"><table class="data-table"><thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell ?? ""}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function renderFeedback() {
  const cards = store.feedbacks.map((item) => feedbackCard(item)).join("");
  els.sellerFeedbackList.innerHTML = cards;
  const user = currentUser();
  els.customerFeedbackList.innerHTML = store.feedbacks.filter((item) => item.userId === user.id).map((item) => feedbackCard(item)).join("") || `<div class="panel">目前沒有回饋紀錄。</div>`;
  els.feedbackForm.innerHTML = `<label>標題<input id="feedbackTitle" type="text" placeholder="想回饋的主題" /></label><label>內容<textarea id="feedbackMessage" rows="5" placeholder="請描述你遇到的問題或建議"></textarea></label><button class="primary-action" type="submit">送出回饋</button>`;
}

function feedbackCard(item) {
  const user = userById(item.userId);
  return `<article class="feedback-card"><div class="row-between"><strong>${item.title}</strong><span class="pill">${item.status}</span></div><p>${item.message}</p><div class="mini-meta">${user?.name || "-"} / ${dateFmt.format(new Date(item.createdAt))}</div>${item.replies.map((reply) => `<div class="reply-box">${reply.message}</div>`).join("")}</article>`;
}

function renderRules() {
  const latest = latestRule();
  els.ruleVersionList.innerHTML = store.ruleVersions.map((rule) => `<article class="rule-card"><strong>${rule.title}</strong><div class="mini-meta">版本 ${rule.version} / 發布 ${dateFmt.format(new Date(rule.publishedAt))}</div><ol>${rule.content.map((line) => `<li>${line}</li>`).join("")}</ol></article>`).join("");
  els.ruleAcceptanceList.innerHTML = store.users.filter((user) => user.role === "customer").map((user) => `<div class="row-line"><span>${user.name}</span><span class="pill ${hasAcceptedLatestRule(user.id) ? "open" : "closed"}">${hasAcceptedLatestRule(user.id) ? "已同意" : "未同意"}</span></div>`).join("");
  const accepted = hasAcceptedLatestRule();
  els.customerRulePanel.innerHTML = `<div class="rule-card"><strong>${latest.title}</strong><div class="mini-meta">版本 ${latest.version} / 發布 ${dateFmt.format(new Date(latest.publishedAt))}</div><ol>${latest.content.map((line) => `<li>${line}</li>`).join("")}</ol><button class="primary-action" id="acceptRuleBtn" type="button" ${accepted ? "disabled" : ""}>${accepted ? "已閱讀並同意" : "我已閱讀並同意"}</button></div>`;
  $("#acceptRuleBtn")?.addEventListener("click", acceptRule);
}

function renderProfile() {
  const user = currentUser();
  els.profileForm.innerHTML = `
    ${profileInput("本名", "name", user.name, true)}
    ${profileInput("暱稱", "nickname", user.nickname, true)}
    ${profileInput("偶像本命", "bias", user.bias, true)}
    ${profileInput("FB 名稱", "fbName", user.fbName, false)}
    ${profileInput("IG 名稱", "igName", user.igName, false)}
    ${profileInput("Google 信箱", "email", user.email, true)}
    ${profileInput("手機", "phone", user.phone, false)}
    ${profileInput("住址地區", "area", user.area, false)}
    ${profileInput("帳號", "account", user.account, true)}
    <label>密碼<input id="profile-password" type="password" placeholder="原型不儲存密碼" /></label>
    <button class="primary-action" type="submit">儲存個人資料</button>
  `;
}

function profileInput(label, key, value, required) {
  return `<label>${label}${required ? " *" : ""}<input id="profile-${key}" data-profile-key="${key}" value="${value || ""}" /></label>`;
}

function renderCustomerGroups() {
  const accepted = hasAcceptedLatestRule();
  els.customerGroupGrid.innerHTML = store.groups.map((group) => `
    <article class="customer-group-card">
      <div class="row-between"><strong>${group.title}</strong><span class="pill ${group.status === "active" ? "open" : "closed"}">${group.status}</span></div>
      <div class="mini-meta">${group.category} / 截止 ${dateFmt.format(new Date(group.deadline))}</div>
      <div class="mini-meta">${store.products.filter((product) => product.groupId === group.id).map((product) => product.name).join("、")}</div>
      <button class="${accepted && group.status === "active" ? "primary-action" : "ghost-action"}" data-order-group="${group.id}" type="button">${accepted ? "模擬登記一筆" : "先閱讀規則"}</button>
    </article>
  `).join("");
  document.querySelectorAll("[data-order-group]").forEach((button) => button.addEventListener("click", () => {
    if (!hasAcceptedLatestRule()) {
      location.hash = "#/customer/rules";
      return;
    }
    createOrder(button.dataset.orderGroup);
  }));
}

function renderCustomerOrders() {
  const user = currentUser();
  const rows = store.orders.filter((order) => order.userId === user.id);
  els.customerOrders.innerHTML = rows.length ? rows.map((order) => {
    const product = productById(order.productId);
    const group = groupById(order.groupId);
    return `<article class="order-card"><div class="row-between"><strong>${order.id}</strong><span class="pill">${labels.paymentStatus[order.paymentStatus]}</span></div><div><strong>${product?.name}</strong><div class="order-meta">${group?.title} / ${money.format(order.totalAmount)}</div></div><div class="order-meta">購買：${labels.purchaseStatus[order.purchaseStatus]} / 報關：${labels.customsStatus[order.customsStatus]} / 出貨：${labels.shippingStatus[order.shippingStatus]} / 取貨：${labels.status[order.status]}</div></article>`;
  }).join("") : `<section class="panel">目前沒有訂單。</section>`;
}

async function createGroup(templateId) {
  await mutate("/api/groups", { templateId, title: `新團務 ${store.groups.length + 1}`, category: "模板套用" }, "已套用模板建立團務，原模板不會被修改。");
}

async function addBlock() {
  await mutate("/api/form-blocks", { groupId: selectedGroupId, title: "自訂版型區塊", layout: "custom" }, "已新增表單版型區塊。");
}

async function createOrder(groupId) {
  const product = store.products.find((item) => item.groupId === groupId);
  if (!product) return showToast("這個團務還沒有商品。");
  await mutate("/api/orders", { groupId, productId: product.id, userId: currentUser().id, quantity: 1, note: "前台模擬登記" }, "已送出登記，賣家後台已同步。");
}

async function updateOrder(orderId, patch) {
  const data = await api(`/api/orders/${orderId}`, { method: "PATCH", body: JSON.stringify(patch) });
  applyStore(data);
  showToast("訂單狀態已更新。");
}

async function submitFeedback(event) {
  event.preventDefault();
  await mutate("/api/feedbacks", { userId: currentUser().id, title: $("#feedbackTitle").value, message: $("#feedbackMessage").value }, "已送出回饋。");
}

async function saveProfile(event) {
  event.preventDefault();
  const patch = {};
  document.querySelectorAll("[data-profile-key]").forEach((input) => {
    patch[input.dataset.profileKey] = input.value;
  });
  if (!patch.fbName && !patch.igName) return showToast("FB 名稱 / IG 名稱請至少填一個。");
  const data = await api(`/api/users/${currentUser().id}`, { method: "PATCH", body: JSON.stringify(patch) });
  applyStore(data);
  showToast("個人資料已儲存。");
}

async function acceptRule() {
  const data = await api(`/api/rules/${latestRule().id}/accept`, { method: "POST", body: JSON.stringify({ userId: currentUser().id }) });
  applyStore(data);
  showToast("已同意最新版規則，可以繼續登記團務。");
}

async function publishRule() {
  await mutate("/api/rules", { content: [...latestRule().content, "新增條款：特殊活動商品將依賣家公告流程處理。"] }, "已發布新版規則，買家需重新同意。");
}

async function exportExcel() {
  await api("/api/export/excel");
  showToast("已產生 Excel 多頁籤資料。正式版會直接下載 .xls/.xlsx。");
}

async function mutate(path, body, message) {
  const data = await api(path, { method: "POST", body: JSON.stringify(body) });
  applyStore(data);
  showToast(message);
}

function applyStore(data) {
  store = data;
  hydrateSelectors();
  render();
}

function render() {
  renderMetrics();
  renderTemplates();
  renderGroups();
  renderWorkflow();
  renderFormDesigner();
  renderOrders();
  renderReports();
  renderFeedback();
  renderRules();
  renderProfile();
  renderCustomerGroups();
  renderCustomerOrders();
  syncRoute();
}

function setupEvents() {
  window.addEventListener("hashchange", syncRoute);
  els.customerSelect.addEventListener("change", render);
  $("#createGroupBtn").addEventListener("click", () => createGroup(store.formTemplates[0]?.id));
  $("#addBlockBtn").addEventListener("click", addBlock);
  $("#bulkNotifyBtn").addEventListener("click", () => showToast("通知摘要：目前可依訂單數、商品數、未付款數生成。"));
  $("#exportExcelBtn").addEventListener("click", exportExcel);
  $("#publishRuleBtn").addEventListener("click", publishRule);
  els.orderGroupFilter.addEventListener("change", renderOrders);
  els.orderStatusFilter.addEventListener("change", renderOrders);
  [els.reportSearch, els.reportGroupFilter, els.reportCustomerFilter, els.reportPeriodFilter].forEach((input) => input.addEventListener("input", renderReports));
  document.querySelectorAll("[data-report]").forEach((button) => button.addEventListener("click", () => {
    selectedReport = button.dataset.report;
    renderReports();
  }));
  els.feedbackForm.addEventListener("submit", submitFeedback);
  els.profileForm.addEventListener("submit", saveProfile);
}

function routeFromHash() {
  return window.location.hash.replace("#/", "") || "seller/groups";
}

function syncRoute() {
  const map = {
    "seller/groups": "sellerGroupsView",
    "seller/forms": "sellerFormsView",
    "seller/orders": "sellerOrdersView",
    "seller/reports": "sellerReportsView",
    "seller/feedback": "sellerFeedbackView",
    "seller/rules": "sellerRulesView",
    "customer/profile": "customerProfileView",
    "customer/rules": "customerRulesView",
    "customer/browse": "customerBrowseView",
    "customer/orders": "customerOrdersView",
    "customer/feedback": "customerFeedbackView",
  };
  const route = map[routeFromHash()] ? routeFromHash() : "seller/groups";
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.route === route));
  document.querySelectorAll(".route-view").forEach((view) => view.classList.remove("active"));
  $(`#${map[route]}`).classList.add("active");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  setTimeout(() => els.toast.classList.remove("show"), 3200);
}

setupEvents();
loadData().catch((error) => {
  console.error(error);
  showToast(`API 尚未啟動：${error.message}`);
});
