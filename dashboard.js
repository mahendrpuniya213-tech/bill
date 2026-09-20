let allBills = [];

function num(v) {
  return parseFloat(String(v == null ? "" : v).replace(/[^\d.\-]/g, "")) || 0;
}

function fmtWhen(ts) {
  if (!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("hi-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

function render() {
  const q = document.getElementById("searchBox").value.trim().toLowerCase();
  const type = document.getElementById("filterType").value;
  const tbody = document.getElementById("billTbody");
  tbody.innerHTML = "";

  const filtered = allBills.filter(b => {
    if (type && b.type !== type) return false;
    if (!q) return true;
    const first = (b.pages && b.pages[0]) || {};
    return (first.billNo || "").toLowerCase().includes(q) || (first.custName || "").toLowerCase().includes(q);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#777;">कोई बिल नहीं मिला</td></tr>`;
    return;
  }

  filtered.forEach(b => {
    const first = (b.pages && b.pages[0]) || {};
    const editUrl = (b.type === "estimate" ? "bill-estimate.html" : "bill-total.html") + "?id=" + encodeURIComponent(b.id);
    const pillClass = b.type === "estimate" ? "estimate" : "total";
    const pillLabel = b.type === "estimate" ? "एस्टीमेट" : "टोटल बिल";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="type-pill ${pillClass}">${pillLabel}</span></td>
      <td>${escapeHtml(first.billNo) || "-"}</td>
      <td>${escapeHtml(first.custName) || "-"}</td>
      <td>${escapeHtml(first.date) || "-"}</td>
      <td>${fmtWhen(b.updatedAt)}</td>
      <td>&#8377; ${num(b.finalTotal).toFixed(2)}</td>
      <td>
        <button class="btn small" data-action="open" data-url="${editUrl}">खोलें / एडिट</button>
        <button class="btn small alt" data-action="dup" data-id="${b.id}">कॉपी</button>
        <button class="btn small danger" data-action="del" data-id="${b.id}">हटाएं</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

document.getElementById("billTbody").addEventListener("click", async e => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  if (btn.dataset.action === "open") {
    location.href = btn.dataset.url;
  } else if (btn.dataset.action === "del") {
    if (!confirm("क्या यह बिल हमेशा के लिए हटाना है? यह वापस नहीं आएगा।")) return;
    btn.disabled = true;
    try { await BillStore.delete(btn.dataset.id); }
    catch (err) { alert("हटाने में गड़बड़ी हुई: " + err.message); btn.disabled = false; }
  } else if (btn.dataset.action === "dup") {
    btn.disabled = true;
    try {
      const bill = await BillStore.load(btn.dataset.id);
      if (!bill) { alert("यह बिल अब मौजूद नहीं है।"); return; }
      delete bill.id;
      bill.pages = (bill.pages || []).map(p => ({ ...p, billNo: (p.billNo || "") + "-COPY" }));
      const newId = await BillStore.save(bill);
      const editUrl = (bill.type === "estimate" ? "bill-estimate.html" : "bill-total.html") + "?id=" + encodeURIComponent(newId);
      location.href = editUrl;
    } catch (err) {
      alert("कॉपी करने में गड़बड़ी हुई: " + err.message);
      btn.disabled = false;
    }
  }
});

document.getElementById("searchBox").addEventListener("input", render);
document.getElementById("filterType").addEventListener("change", render);

BillStore.listenAll(
  bills => {
    allBills = bills;
    document.getElementById("status").textContent = bills.length === 0 ? "अभी तक कोई बिल सेव नहीं हुआ है।" : "";
    document.getElementById("status").classList.remove("error");
    render();
  },
  () => {
    const el = document.getElementById("status");
    el.textContent = "Firebase से कनेक्ट नहीं हो पाया। firebase-config.js में अपनी जानकारी भरें (README.md देखें)।";
    el.classList.add("error");
  }
);
