const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "seoulpick-mvp-v2.json");
const STORE_VERSION = 2;

fs.mkdirSync(DATA_DIR, { recursive: true });

const now = new Date();
const hoursFromNow = (hours) => new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();

function seedData() {
  const users = [
    {
      id: "u-admin",
      name: "團主 Mina",
      nickname: "Mina",
      bias: "IVE Liz",
      email: "admin@seoulpick.test",
      googleEmailVerified: true,
      phone: "0912000111",
      phoneVerified: true,
      area: "台北市",
      fbName: "Mina SeoulPick",
      igName: "seoulpick.mina",
      account: "admin",
      role: "admin",
    },
    {
      id: "u-mei",
      name: "林小美",
      nickname: "小美",
      bias: "BTS Jungkook",
      email: "mei@example.com",
      googleEmailVerified: true,
      phone: "0912345345",
      phoneVerified: false,
      area: "新北市",
      fbName: "Mei Lin",
      igName: "",
      account: "mei",
      role: "customer",
    },
    {
      id: "u-nana",
      name: "陳娜娜",
      nickname: "Nana",
      bias: "NewJeans Hanni",
      email: "nana@example.com",
      googleEmailVerified: true,
      phone: "0988766123",
      phoneVerified: false,
      area: "台中市",
      fbName: "",
      igName: "nana.kr",
      account: "nana",
      role: "customer",
    },
    {
      id: "u-kai",
      name: "王凱",
      nickname: "Kai",
      bias: "SEVENTEEN Mingyu",
      email: "kai@example.com",
      googleEmailVerified: true,
      phone: "0933555789",
      phoneVerified: false,
      area: "高雄市",
      fbName: "Kai Wang",
      igName: "",
      account: "kai",
      role: "customer",
    },
  ];

  const formTemplates = [
    {
      id: "tpl-beauty",
      name: "美妝代購登記模板",
      description: "適合 Olive Young、彩妝、保養品。含色號、替代品與購買限制。",
      blocks: [
        block("b-basic", "基本資料", "identity", [
          field("name", "text", "本名", true),
          field("phone", "text", "手機號碼", true),
          field("line", "text", "LINE ID", false),
        ]),
        block("b-product", "商品選擇", "product", [
          field("beauty-grid", "radio_grid", "商品 x 代購成員", true, [], ["Torriden 精華", "Round Lab 防曬", "Rom&nd 唇釉"], ["Mina", "Hana"]),
          field("quantity-grid", "checkbox_grid", "商品 x 數量", true, [], ["Torriden 精華", "Round Lab 防曬", "Rom&nd 唇釉"], ["1", "2", "3", "4+"]),
          field("substitute", "radio", "缺貨替代方案", true, ["可替代", "需先確認", "不接受替代"]),
        ]),
        block("b-note", "備註與同意", "notice", [
          field("note", "textarea", "備註", false),
          field("agree", "checkbox", "我了解代購商品有缺貨與價格變動可能", true, ["我已了解"]),
        ]),
      ],
    },
    {
      id: "tpl-fashion",
      name: "服飾尺寸登記模板",
      description: "適合衣服、包包、鞋款。含尺寸、顏色與可接受替代款。",
      blocks: [
        block("f-basic", "基本資料", "identity", [field("name", "text", "本名", true), field("phone", "text", "手機號碼", true)]),
        block("f-size", "規格選擇", "product", [
          field("size", "select", "尺寸", true, ["XS", "S", "M", "L", "XL"]),
          field("color", "radio", "顏色", true, ["黑", "白", "奶茶", "灰"]),
          field("backup", "textarea", "替代款或備註", false),
        ]),
      ],
    },
  ];

  const groups = [
    group("olive-young-may", "5 月 Olive Young 美妝團", "美妝保養", "首爾江南店", "tpl-beauty", -36, 20, "active", { ordered: 82, purchased: 60, customs: 20, shipped: 8, completed: 8 }),
    group("seongsu-fashion", "聖水洞服飾連線", "服飾配件", "Seongsu select shops", "tpl-fashion", -12, 72, "active", { ordered: 36, purchased: 24, customs: 0, shipped: 0, completed: 0 }),
    group("lotte-snack", "樂天超市零食團", "食品零食", "Lotte Mart Seoul Station", "tpl-beauty", -90, -2, "closed", { ordered: 100, purchased: 100, customs: 74, shipped: 42, completed: 42 }),
  ];

  const formBlocks = groups.flatMap((groupItem) => {
    const template = formTemplates.find((item) => item.id === groupItem.templateId);
    return template.blocks.map((templateBlock, index) => ({
      ...templateBlock,
      id: `${groupItem.id}-${templateBlock.id}`,
      groupId: groupItem.id,
      sourceTemplateId: template.id,
      sortOrder: index + 1,
      fields: templateBlock.fields.map((fieldItem, fieldIndex) => ({
        ...fieldItem,
        id: `${groupItem.id}-${fieldItem.id}`,
        sortOrder: fieldIndex + 1,
      })),
    }));
  });

  const products = [
    product("torriden-serum", "olive-young-may", "Torriden", "低分子玻尿酸精華", "50ml", 15800, 520, 18, 2, 260),
    product("round-lab-sun", "olive-young-may", "Round Lab", "白樺水感防曬", "50ml", 13900, 430, 24, 3, 220),
    product("romand-tint", "olive-young-may", "Rom&nd", "果汁唇釉", "色號可選", 8900, 280, 40, 5, 145),
    product("linen-shirt", "seongsu-fashion", "Atempo", "韓製亞麻襯衫", "S / M / L", 36500, 1180, 8, 1, 760),
    product("mini-bag", "seongsu-fashion", "Stand Oil", "皮革迷你肩背包", "黑 / 奶茶 / 銀", 52000, 1680, 5, 1, 1100),
    product("almond-pack", "lotte-snack", "Tom's Farm", "杏仁包", "210g", 9900, 390, 30, 4, 250),
  ];

  const orders = [
    order("SO-1001", "olive-young-may", "u-mei", "torriden-serum", 2, "ordered", "unpaid", "purchased", "pending", "pending", "若有套組可替代", -20),
    order("SO-1002", "olive-young-may", "u-nana", "romand-tint", 4, "arrived", "paid", "purchased", "arrived_tw", "ready", "色號 23、25 各兩支", -16),
    order("SO-1003", "seongsu-fashion", "u-kai", "mini-bag", 1, "ordered", "unpaid", "pending", "pending", "pending", "黑色優先", -8),
    order("SO-1004", "lotte-snack", "u-mei", "almond-pack", 3, "completed", "paid", "purchased", "arrived_tw", "shipped", "原味", -40),
  ].map((orderItem) => {
    const productItem = products.find((item) => item.id === orderItem.productId);
    return { ...orderItem, totalAmount: productItem.priceTwd * orderItem.quantity, costAmount: productItem.costTwd * orderItem.quantity };
  });

  const payments = orders.map((orderItem) => ({
    id: `pay-${orderItem.id}`,
    orderId: orderItem.id,
    userId: orderItem.userId,
    amount: orderItem.totalAmount,
    method: orderItem.paymentStatus === "paid" ? "line_pay" : "bank_transfer",
    paymentDate: orderItem.paymentStatus === "paid" ? hoursFromNow(-10) : null,
    status: orderItem.paymentStatus,
  }));

  return {
    version: STORE_VERSION,
    users,
    formTemplates,
    groups,
    formBlocks,
    products,
    orders,
    payments,
    feedbacks: [
      { id: "fb-1", userId: "u-mei", scope: "customer", title: "希望新增常用地址", message: "每次填資料有點麻煩，希望可以儲存常用資訊。", status: "open", createdAt: hoursFromNow(-12), replies: [{ by: "u-admin", message: "已放進買家基本資料規劃。", createdAt: hoursFromNow(-10) }] },
      { id: "fb-2", userId: "u-nana", scope: "order", title: "想確認唇釉色號", message: "如果 23 缺貨可以改 25。", status: "replied", createdAt: hoursFromNow(-8), replies: [] },
    ],
    ruleVersions: [
      {
        id: "rules-2026-05-01",
        version: "2026.05.01",
        title: "SeoulPick 代購登記與購買規則",
        publishedAt: "2026-05-01T10:00:00+08:00",
        content: [
          "代購商品可能因韓國現場庫存、價格、活動組合而異動。",
          "送出登記不代表一定購買成功，實際以賣家回報狀態為準。",
          "已完成購買後，除重大瑕疵或賣家公告條件外，不接受任意取消。",
          "買家需於通知期限內完成付款與取貨。",
        ],
      },
      {
        id: "rules-2026-05-08",
        version: "2026.05.08",
        title: "SeoulPick 代購登記與購買規則",
        publishedAt: "2026-05-08T09:00:00+08:00",
        content: [
          "代購商品可能因韓國現場庫存、價格、活動組合而異動。",
          "送出登記不代表一定購買成功，實際以賣家回報狀態為準。",
          "商品若為限量或快閃活動，賣家可依付款與登記順序調整購買優先順位。",
          "已完成購買後，除重大瑕疵或賣家公告條件外，不接受任意取消。",
          "買家需於通知期限內完成付款與取貨。",
        ],
      },
    ],
    ruleAcceptances: [
      { userId: "u-nana", ruleVersionId: "rules-2026-05-08", acceptedAt: hoursFromNow(-2) },
      { userId: "u-kai", ruleVersionId: "rules-2026-05-08", acceptedAt: hoursFromNow(-1) },
    ],
  };
}

function block(id, title, layout, fields) {
  return { id, title, layout, fields };
}

function field(id, type, label, required, options = [], rows = [], columns = []) {
  return { id, type, label, required, options, rows, columns };
}

function group(id, title, category, buyer, templateId, publishOffset, deadlineOffset, status, workflow) {
  return { id, title, category, buyer, templateId, publishDate: hoursFromNow(publishOffset), deadline: hoursFromNow(deadlineOffset), status, createdBy: "u-admin", workflow };
}

function product(id, groupId, brand, name, spec, costKrw, priceTwd, stock, limitQty, costTwd) {
  return { id, groupId, brand, name, spec, costKrw, priceTwd, stock, limitQty, costTwd };
}

function order(id, groupId, userId, productId, quantity, status, paymentStatus, purchaseStatus, customsStatus, shippingStatus, note, createdOffset) {
  return { id, groupId, userId, productId, quantity, status, paymentStatus, purchaseStatus, customsStatus, shippingStatus, note, createdAt: hoursFromNow(createdOffset), updatedAt: hoursFromNow(createdOffset) };
}

function readStore() {
  if (!fs.existsSync(DB_PATH)) writeStore(seedData());
  const data = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  if (data.version !== STORE_VERSION) {
    const fresh = seedData();
    writeStore(fresh);
    return fresh;
  }
  return data;
}

function writeStore(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
}

function json(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
  });
  res.end(JSON.stringify(data));
}

function text(res, status, body, type) {
  res.writeHead(status, { "Content-Type": type, "Access-Control-Allow-Origin": "*" });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function handleApi(req, res, url) {
  if (req.method === "OPTIONS") return json(res, 204, {});
  const store = readStore();

  if (req.method === "GET" && url.pathname === "/api/bootstrap") return json(res, 200, store);

  if (req.method === "POST" && url.pathname === "/api/groups") {
    const body = await readBody(req);
    const id = `group-${Date.now()}`;
    const template = store.formTemplates.find((item) => item.id === body.templateId);
    store.groups.unshift({
      id,
      title: body.title || "新韓國代購團",
      category: body.category || "未分類",
      buyer: body.buyer || "韓國現場採購",
      templateId: body.templateId || null,
      publishDate: body.publishDate || hoursFromNow(0),
      deadline: body.deadline || hoursFromNow(72),
      status: "draft",
      createdBy: "u-admin",
      workflow: { ordered: 0, purchased: 0, customs: 0, shipped: 0, completed: 0 },
    });
    if (template) {
      template.blocks.forEach((templateBlock, blockIndex) => {
        store.formBlocks.push({
          ...templateBlock,
          id: `${id}-${templateBlock.id}-${Date.now()}`,
          groupId: id,
          sourceTemplateId: template.id,
          sortOrder: blockIndex + 1,
          fields: templateBlock.fields.map((fieldItem, fieldIndex) => ({ ...fieldItem, id: `${id}-${fieldItem.id}-${fieldIndex}`, sortOrder: fieldIndex + 1 })),
        });
      });
    }
    writeStore(store);
    return json(res, 201, store);
  }

  if (req.method === "POST" && url.pathname === "/api/form-blocks") {
    const body = await readBody(req);
    store.formBlocks.push({
      id: `block-${Date.now()}`,
      groupId: body.groupId,
      title: body.title || "新版型區塊",
      layout: body.layout || "custom",
      sortOrder: store.formBlocks.filter((item) => item.groupId === body.groupId).length + 1,
      fields: body.fields || [field(`field-${Date.now()}`, "text", "新欄位", true)],
    });
    writeStore(store);
    return json(res, 201, store);
  }

  if (req.method === "POST" && url.pathname === "/api/form-templates") {
    const body = await readBody(req);
    store.formTemplates.unshift({
      id: `tpl-${Date.now()}`,
      name: body.name || "新預設模板",
      description: body.description || "可套用到相似團務後再微調。",
      blocks: body.blocks || [],
    });
    writeStore(store);
    return json(res, 201, store);
  }

  if (req.method === "POST" && url.pathname === "/api/orders") {
    const body = await readBody(req);
    const productItem = store.products.find((item) => item.id === body.productId);
    const user = store.users.find((item) => item.id === body.userId);
    const quantity = Number(body.quantity || 1);
    const id = `SO-${Date.now().toString().slice(-6)}`;
    store.orders.unshift({
      id,
      groupId: body.groupId,
      userId: body.userId,
      productId: body.productId,
      quantity,
      totalAmount: (productItem?.priceTwd || 0) * quantity,
      costAmount: (productItem?.costTwd || 0) * quantity,
      status: "ordered",
      paymentStatus: "unpaid",
      purchaseStatus: "pending",
      customsStatus: "pending",
      shippingStatus: "pending",
      note: body.note || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    store.payments.unshift({ id: `pay-${Date.now()}`, orderId: id, userId: user.id, amount: (productItem?.priceTwd || 0) * quantity, method: "bank_transfer", paymentDate: null, status: "unpaid" });
    writeStore(store);
    return json(res, 201, store);
  }

  const orderMatch = url.pathname.match(/^\/api\/orders\/([^/]+)$/);
  if (req.method === "PATCH" && orderMatch) {
    const body = await readBody(req);
    const orderItem = store.orders.find((item) => item.id === orderMatch[1]);
    if (!orderItem) return json(res, 404, { message: "Order not found" });
    ["status", "paymentStatus", "purchaseStatus", "customsStatus", "shippingStatus"].forEach((key) => {
      if (body[key]) orderItem[key] = body[key];
    });
    orderItem.updatedAt = new Date().toISOString();
    const paymentItem = store.payments.find((item) => item.orderId === orderItem.id);
    if (paymentItem && body.paymentStatus) {
      paymentItem.status = body.paymentStatus;
      paymentItem.paymentDate = body.paymentStatus === "paid" ? new Date().toISOString() : null;
    }
    writeStore(store);
    return json(res, 200, store);
  }

  const userMatch = url.pathname.match(/^\/api\/users\/([^/]+)$/);
  if (req.method === "PATCH" && userMatch) {
    const body = await readBody(req);
    const user = store.users.find((item) => item.id === userMatch[1]);
    if (!user) return json(res, 404, { message: "User not found" });
    Object.assign(user, body);
    writeStore(store);
    return json(res, 200, store);
  }

  if (req.method === "POST" && url.pathname === "/api/feedbacks") {
    const body = await readBody(req);
    store.feedbacks.unshift({
      id: `fb-${Date.now()}`,
      userId: body.userId,
      scope: body.scope || "general",
      title: body.title || "未命名回饋",
      message: body.message || "",
      status: "open",
      createdAt: new Date().toISOString(),
      replies: [],
    });
    writeStore(store);
    return json(res, 201, store);
  }

  if (req.method === "POST" && url.pathname === "/api/rules") {
    const body = await readBody(req);
    store.ruleVersions.unshift({
      id: `rules-${Date.now()}`,
      version: body.version || new Date().toISOString().slice(0, 10),
      title: body.title || "SeoulPick 代購登記與購買規則",
      publishedAt: new Date().toISOString(),
      content: body.content || ["新增規則內容"],
    });
    writeStore(store);
    return json(res, 201, store);
  }

  const acceptMatch = url.pathname.match(/^\/api\/rules\/([^/]+)\/accept$/);
  if (req.method === "POST" && acceptMatch) {
    const body = await readBody(req);
    const exists = store.ruleAcceptances.some((item) => item.userId === body.userId && item.ruleVersionId === acceptMatch[1]);
    if (!exists) store.ruleAcceptances.push({ userId: body.userId, ruleVersionId: acceptMatch[1], acceptedAt: new Date().toISOString() });
    writeStore(store);
    return json(res, 201, store);
  }

  if (req.method === "GET" && url.pathname === "/api/export/excel") {
    return text(res, 200, buildExcelXml(store), "application/vnd.ms-excel; charset=utf-8");
  }

  return json(res, 404, { message: "API route not found" });
}

function buildExcelXml(store) {
  const worksheets = [
    worksheet("對帳單現況", [["訂單", "買家", "團務", "商品", "金額", "付款", "取貨"], ...store.orders.map((orderItem) => orderRow(store, orderItem))]),
    ...store.groups.map((groupItem) => worksheet(groupItem.title.slice(0, 28), [["訂單", "買家", "商品", "數量", "金額", "購買", "報關", "出貨"], ...store.orders.filter((orderItem) => orderItem.groupId === groupItem.id).map((orderItem) => orderRow(store, orderItem))])),
    worksheet("月年統計", [["團務", "訂單", "收入", "成本", "未收", "毛利"], ...store.groups.map((groupItem) => groupSummaryRow(store, groupItem))]),
    worksheet("顧客消費", [["顧客", "訂單", "消費", "已付", "未付"], ...store.users.filter((user) => user.role === "customer").map((user) => customerSummaryRow(store, user))]),
  ];
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${worksheets.join("\n")}
</Workbook>`;
}

function worksheet(name, rows) {
  return `<Worksheet ss:Name="${escapeXml(name)}"><Table>${rows.map((row) => `<Row>${row.map((cell) => `<Cell><Data ss:Type="String">${escapeXml(String(cell ?? ""))}</Data></Cell>`).join("")}</Row>`).join("")}</Table></Worksheet>`;
}

function orderRow(store, orderItem) {
  const user = store.users.find((item) => item.id === orderItem.userId);
  const groupItem = store.groups.find((item) => item.id === orderItem.groupId);
  const productItem = store.products.find((item) => item.id === orderItem.productId);
  return [orderItem.id, user?.name, groupItem?.title, productItem?.name, orderItem.totalAmount, orderItem.paymentStatus, orderItem.status, orderItem.quantity, orderItem.purchaseStatus, orderItem.customsStatus, orderItem.shippingStatus];
}

function groupSummaryRow(store, groupItem) {
  const orders = store.orders.filter((item) => item.groupId === groupItem.id);
  const revenue = sum(orders, "totalAmount");
  const cost = sum(orders, "costAmount");
  const unpaid = sum(orders.filter((item) => item.paymentStatus === "unpaid"), "totalAmount");
  return [groupItem.title, orders.length, revenue, cost, unpaid, revenue - cost];
}

function customerSummaryRow(store, user) {
  const orders = store.orders.filter((item) => item.userId === user.id);
  const revenue = sum(orders, "totalAmount");
  const paid = sum(orders.filter((item) => item.paymentStatus === "paid"), "totalAmount");
  return [user.name, orders.length, revenue, paid, revenue - paid];
}

function sum(items, key) {
  return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}

function escapeXml(value) {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char]);
}

function serveStatic(req, res, url) {
  const pathname = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(ROOT, pathname));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      return res.end("Not found");
    }
    const ext = path.extname(filePath);
    const type = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8" }[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith("/api/")) {
    handleApi(req, res, url).catch((error) => json(res, 500, { message: error.message }));
    return;
  }
  serveStatic(req, res, url);
});

server.listen(PORT, () => {
  console.log(`SeoulPick MVP v2 running at http://localhost:${PORT}`);
  console.log(`Data store: ${DB_PATH}`);
});
