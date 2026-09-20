/* ---------------- page-fit constants ---------------- */
function mmToPx(mm){ return mm * 96 / 25.4; }
const MAX_PAGE_PX = mmToPx(292);
const REFLOW_EPS = 2; // px slack to stop float-rounding flicker

/* ---------------- templates ---------------- */
function pageTemplate(){
  return `
  <button class="page-remove no-print" onclick="removePage(this)" title="यह पेज हटाएं">&#10005;</button>
  <div class="header">
    <h2>मोहनलाल पुनिया</h2>
    <p>सोसायटी, बंगलो, ऑफिस तथा शोरूम फर्नीचर बनावनार<br>
    35-वीर रेसिडेंसी, हनुमान मंदिर के पीछे, मु. बाकरोल, जि. आनंद</p>
    <p>Mo: 9898964749</p>
  </div>

  <div class="info">
    <div>
      NAME: <input type="text" class="custName" placeholder="name"><br>
      DATE: <input type="text" class="date" placeholder="DATE">
    </div>
    <div>
      BILL NO: <input type="text" class="billNo" placeholder="estimate no.">
    </div>
  </div>

  <table class="billTable">
    <thead>
      <tr>
        <th style="width:8%;">NO.</th>
        <th style="width:57%;">DETAILS</th>
        <th style="width:15%;">RATE</th>
        <th style="width:20%;">AMOUNT</th>
      </tr>
    </thead>
    <tbody>
      <tr class="page-total-row">
        <td colspan="3" class="ptl">पेज कुल / PAGE TOTAL</td>
        <td><input type="text" class="pageTotal" value="&#8377; 0.00"></td>
      </tr>
    </tbody>
  </table>

  <div class="spacer"></div>

  <div class="footer">
    
    <div>TOTAL AMOUNT: <input type="text" class="grandTotal" value="&#8377; 0.00"></div>
  </div>

  <div class="all-total hidden">सभी पेजों का कुल / GRAND TOTAL: <span class="allTotal">&#8377; 0.00</span></div>
  <div class="page-num"></div>`;
}

function rowTemplate(){
  const tr = document.createElement("tr");
  tr.className = "item-row";
  tr.innerHTML = `
    <td class="sr">1</td>
    <td style="padding:0;">
      <textarea class="bold-text detail-text" style="width:100%;" rows="1"></textarea>
    </td>
    <td><input type="text" class="rate" inputmode="decimal"></td>
    <td><input type="text" class="total"></td>`;
  return tr;
}

/* ---------------- pages ---------------- */
function createBlankPage(){
  const page = document.createElement("div");
  page.className = "invoice-box";
  page.innerHTML = pageTemplate();
  document.getElementById("pages").appendChild(page);
  return page;
}

function addPage(){
  const page = createBlankPage();
  addRow(page);
  return page;
}

function removePage(btn){
  const pages = document.querySelectorAll(".invoice-box");
  if (pages.length <= 1){ alert("कम से कम एक पेज रहना चाहिए।"); return; }
  if (!confirm("क्या यह पेज हटाना है? इसका सारा डेटा चला जाएगा।")) return;
  btn.closest(".invoice-box").remove();
  reflow();
}

function removeLastPage(){
  const pages = document.querySelectorAll(".invoice-box");
  if (pages.length <= 1){ alert("कम से कम एक पेज रहना चाहिए।"); return; }
  removePage(pages[pages.length - 1].querySelector(".page-remove"));
}

/* ---------------- rows ---------------- */
function addRow(targetPage){
  let page = targetPage || document.querySelector("#pages .invoice-box:last-child");
  if (!page) page = createBlankPage();
  const tbody = page.querySelector(".billTable tbody");
  const newRow = rowTemplate();
  tbody.insertBefore(newRow, tbody.querySelector(".page-total-row"));
  autosizeTextarea(newRow.querySelector(".detail-text"));
  reflow();
}

function removeRow(){
  const pages = document.querySelectorAll(".invoice-box");
  const last = pages[pages.length - 1];
  const rows = last.querySelectorAll(".item-row");

  if (rows.length > 1){
    rows[rows.length - 1].remove();
  } else if (pages.length > 1){
    last.remove();
  } else {
    alert("कम से कम एक पंक्ति रहनी चाहिए।");
    return;
  }
  reflow();
}

/* ---------------- housekeeping ---------------- */
function syncPages(sourcePage){
  const pages = [...document.querySelectorAll(".invoice-box")];
  let n = 0;

  pages.forEach((page, i) => {
    page.querySelectorAll(".item-row .sr").forEach(cell => { cell.textContent = ++n; });
    page.querySelector(".page-num").textContent = `पेज ${i + 1} / ${pages.length}`;
    page.querySelector(".page-remove").classList.toggle("hidden", pages.length <= 1);
    page.querySelector(".all-total").classList.toggle("hidden", !(i === pages.length - 1 && pages.length > 1));
  });

  // sync Name/Date/Bill No across all pages, using whichever page was actually edited as the source
  // (falls back to page 1 when called from reflow/addPage/etc. with no specific source)
  const source = (sourcePage && pages.includes(sourcePage)) ? sourcePage : pages[0];
  if (source){
    ["custName","date","billNo"].forEach(cls => {
      const val = source.querySelector("." + cls).value;
      pages.forEach(p => { if (p !== source) p.querySelector("." + cls).value = val; });
    });
  }
}

/* ---------------- textarea auto-grow ---------------- */
function autosizeTextarea(el){
  if (!el) return;
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

function autosizeAll(){
  document.querySelectorAll(".detail-text").forEach(autosizeTextarea);
}

/* ---------------- dynamic pagination (reflow) ---------------- */
function reflow(){
  markDirty();

  // remember what was focused (and cursor position) so row-moves below don't kick the user out of the field
  const pagesEl = document.getElementById("pages");
  const active = document.activeElement;
  const keepFocus = active && pagesEl.contains(active) && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");
  const selStart = keepFocus && typeof active.selectionStart === "number" ? active.selectionStart : null;
  const selEnd   = keepFocus && typeof active.selectionEnd === "number" ? active.selectionEnd : null;

  autosizeAll();
  syncPages();

  let guard = 0;
  let changed = true;

  while (changed && guard < 400){
    changed = false;
    guard++;
    const pages = [...document.querySelectorAll(".invoice-box")];

    // 1) push overflowing rows down to the next page (creating one if needed)
    for (let i = 0; i < pages.length; i++){
      const page = pages[i];
      const itemRows = () => page.querySelectorAll(".billTable tbody .item-row");

      while (page.getBoundingClientRect().height > MAX_PAGE_PX + REFLOW_EPS && itemRows().length > 1){
        const rows = itemRows();
        const lastRow = rows[rows.length - 1];
        let nextPage = pages[i + 1];
        if (!nextPage){
          nextPage = createBlankPage();
          pages.push(nextPage);
        }
        const nextTbody = nextPage.querySelector(".billTable tbody");
        nextTbody.insertBefore(lastRow, nextTbody.firstChild);
        changed = true;
      }
    }

    // 2) pull spare rows up from the next page while there's room
    for (let i = 0; i < pages.length - 1; i++){
      const page = pages[i];
      const nextPage = pages[i + 1];
      if (!nextPage) continue;

      while (nextPage.querySelectorAll(".item-row").length > 0){
        const nextRows = nextPage.querySelectorAll(".item-row");
        const candidate = nextRows[0];
        const tbody = page.querySelector(".billTable tbody");
        const totalRow = tbody.querySelector(".page-total-row");
        tbody.insertBefore(candidate, totalRow);

        if (page.getBoundingClientRect().height > MAX_PAGE_PX + REFLOW_EPS){
          const nextTbody = nextPage.querySelector(".billTable tbody");
          nextTbody.insertBefore(candidate, nextTbody.firstChild);
          break;
        }
        changed = true;
      }
    }

    // 3) drop trailing pages left empty by the pull-up above
    while (pages.length > 1){
      const lastPg = pages[pages.length - 1];
      if (lastPg.querySelectorAll(".item-row").length === 0){
        lastPg.remove();
        pages.pop();
        changed = true;
      } else break;
    }

    if (changed) syncPages();
  }

  syncPages();
  calculateGrandTotal();

  // restore focus/cursor if the field is still attached (it just moved rows/pages, not gone)
  if (keepFocus && document.body.contains(active)){
    active.focus();
    if (selStart !== null){
      try { active.setSelectionRange(selStart, selEnd); } catch(e){}
    }
  }
}

let reflowFrame = null;
function scheduleReflow(){
  if (reflowFrame) cancelAnimationFrame(reflowFrame);
  reflowFrame = requestAnimationFrame(() => { reflowFrame = null; reflow(); });
}

/* ---------------- save / load (Firebase) ---------------- */
let currentBillId = null;
let isSaving = false;
let hasUnsavedChanges = false;
let suppressDirty = true; // stays true until initial load/build finishes

function markDirty(){
  if (suppressDirty) return;
  hasUnsavedChanges = true;
  updateSaveStatus();
}

function updateSaveStatus(text, cls){
  const el = document.getElementById("saveStatus");
  if (!el) return;
  if (text){ el.textContent = text; el.className = "save-status " + (cls || ""); return; }
  if (hasUnsavedChanges){ el.textContent = "सेव नहीं हुआ बदलाव..."; el.className = "save-status dirty"; }
  else { el.textContent = "सेव हो गया ✓"; el.className = "save-status clean"; }
}

function serializeBill(){
  const pages = [...document.querySelectorAll(".invoice-box")].map(box => {
    const rows = [...box.querySelectorAll(".item-row")].map(row => ({
      detail: row.querySelector(".detail-text").value,
      rate: row.querySelector(".rate").value,
      total: row.querySelector(".total").value,
      totalManual: row.querySelector(".total").classList.contains("manual")
    }));
    return {
      custName: box.querySelector(".custName").value,
      date: box.querySelector(".date").value,
      billNo: box.querySelector(".billNo").value,
      rows,
      pageTotal: box.querySelector(".pageTotal").value,
      pageTotalManual: box.querySelector(".pageTotal").classList.contains("manual"),
      grandTotal: box.querySelector(".grandTotal").value,
      grandTotalManual: box.querySelector(".grandTotal").classList.contains("manual")
    };
  });

  return {
    type: "estimate",
    pages,
    finalTotal: num(document.getElementById("finalGrandTotal").textContent)
  };
}

function deserializeBill(data){
  document.getElementById("pages").innerHTML = "";

  (data.pages && data.pages.length ? data.pages : [{}]).forEach(pageData => {
    const box = createBlankPage();
    box.querySelector(".custName").value = pageData.custName || "";
    box.querySelector(".date").value = pageData.date || "";
    box.querySelector(".billNo").value = pageData.billNo || "";

    const tbody = box.querySelector(".billTable tbody");
    const totalRow = tbody.querySelector(".page-total-row");
    const rows = (pageData.rows && pageData.rows.length) ? pageData.rows : [{}];

    rows.forEach(rowData => {
      const tr = rowTemplate();
      tbody.insertBefore(tr, totalRow);
      tr.querySelector(".detail-text").value = rowData.detail || "";
      tr.querySelector(".rate").value = rowData.rate || "";
      tr.querySelector(".total").value = rowData.total || "";
      if (rowData.totalManual) tr.querySelector(".total").classList.add("manual");
      autosizeTextarea(tr.querySelector(".detail-text"));
    });

    box.querySelector(".pageTotal").value = pageData.pageTotal || "\u20B9 0.00";
    if (pageData.pageTotalManual) box.querySelector(".pageTotal").classList.add("manual");
    box.querySelector(".grandTotal").value = pageData.grandTotal || "\u20B9 0.00";
    if (pageData.grandTotalManual) box.querySelector(".grandTotal").classList.add("manual");
  });

  reflow();
}

async function saveBill(){
  if (isSaving) return;
  isSaving = true;
  const btn = document.getElementById("saveBtn");
  if (btn){ btn.disabled = true; btn.textContent = "सेव हो रहा है..."; }

  try {
    const data = serializeBill();
    if (currentBillId) data.id = currentBillId;
    const id = await BillStore.save(data);
    currentBillId = id;
    history.replaceState(null, "", "?id=" + id);
    hasUnsavedChanges = false;
    updateSaveStatus();
  } catch (err){
    console.error(err);
    updateSaveStatus("सेव नहीं हो पाया — इंटरनेट व firebase-config.js जांचें", "error");
    alert("सेव करने में गड़बड़ी हुई:\n" + err.message);
  } finally {
    isSaving = false;
    if (btn){ btn.disabled = false; btn.innerHTML = "&#128190; सेव करें"; }
  }
}

window.addEventListener("beforeunload", e => {
  if (hasUnsavedChanges){ e.preventDefault(); e.returnValue = ""; }
});

async function initBill(){
  const params = new URLSearchParams(location.search);
  const id = params.get("id");

  if (id){
    updateSaveStatus("लोड हो रहा है...", "");
    try {
      const data = await BillStore.load(id);
      if (data){
        currentBillId = id;
        deserializeBill(data);
        suppressDirty = false;
        hasUnsavedChanges = false;
        updateSaveStatus();
        return;
      } else {
        alert("यह एस्टीमेट अब मौजूद नहीं है। नया शुरू किया जा रहा है।");
      }
    } catch (err){
      console.error(err);
      updateSaveStatus("लोड नहीं हो पाया — इंटरनेट व firebase-config.js जांचें", "error");
    }
  }

  // fresh estimate
  addPage();
  const first = document.querySelector(".invoice-box");
  first.querySelector(".date").value = new Date().toLocaleDateString("hi-IN");
  first.querySelector(".billNo").value = "EST-" + Date.now();
  reflow();
  suppressDirty = false;
  hasUnsavedChanges = false;
  updateSaveStatus();
}

/* ---------------- manual override handling ---------------- */
const OVERRIDABLE = ".total, .pageTotal, .grandTotal";

document.getElementById("pages").addEventListener("input", e => {
  const t = e.target;

  if (t.matches(".custName, .date, .billNo")){ syncPages(t.closest(".invoice-box")); return; }

  if (t.matches(".detail-text")){
    autosizeTextarea(t);
  }

  if (t.matches(OVERRIDABLE)){
    t.classList.toggle("manual", t.value.trim() !== "");
  }

  if (t.matches(".rate, .total")){
    calcRow(t.closest("tr"));
  }
  calculateGrandTotal();

  if (t.matches(".detail-text, .rate, .total")){
    scheduleReflow();
  }
  markDirty();
});

function resetManual(){
  if (!confirm("सभी मैनुअल वैल्यू हटाकर दोबारा अपने आप गिनना शुरू करें?")) return;
  document.querySelectorAll("input.manual").forEach(el => {
    el.classList.remove("manual");
    if (el.matches(".total, .pageTotal, .grandTotal")) el.value = "";
  });
  document.querySelectorAll(".item-row").forEach(calcRow);
  reflow();
}

/* ---------------- calculation ---------------- */
function num(v){
  return parseFloat(String(v == null ? "" : v).replace(/[^\d.\-]/g, "")) || 0;
}

function calcRow(row){
  if (!row || !row.classList.contains("item-row")) return;

  const rateInput  = row.querySelector(".rate");
  const totalInput = row.querySelector(".total");

  if (!totalInput.classList.contains("manual")){
    const rate = num(rateInput.value);
    totalInput.value = rate ? "\u20B9 " + rate.toFixed(2) : "";
  }
}

function calculateGrandTotal(){
  let finalTotal = 0;

  document.querySelectorAll(".invoice-box").forEach(box => {
    let sum = 0;
    box.querySelectorAll(".item-row .total").forEach(input => { sum += num(input.value); });

    const pageTotalCell = box.querySelector(".pageTotal");
    const grandInput    = box.querySelector(".grandTotal");

    let pageTotal = sum;
    if (pageTotalCell.classList.contains("manual")) pageTotal = num(pageTotalCell.value);
    else pageTotalCell.value = "\u20B9 " + sum.toFixed(2);

    if (!grandInput.classList.contains("manual")) grandInput.value = "\u20B9 " + pageTotal.toFixed(2);
    else pageTotal = num(grandInput.value);

    finalTotal += pageTotal;
  });

  const txt = "\u20B9 " + finalTotal.toFixed(2);
  document.getElementById("finalGrandTotal").textContent = txt;
  document.querySelectorAll(".allTotal").forEach(el => { el.textContent = txt; });
}

/* ---------------- PDF ---------------- */
function downloadPDF(){
  const element = document.getElementById("pages");

  const hidden = [...element.querySelectorAll(".no-print, .page-remove")];
  hidden.forEach(el => { el.dataset.prevDisplay = el.style.display; el.style.display = "none"; });

  const fields = [...element.querySelectorAll("input, textarea")];
  fields.forEach(el => {
    el.style.border = "none";
    el.dataset.prevColor = el.style.color;
    el.style.color = "#000";
    if (el.placeholder){ el.dataset.ph = el.placeholder; el.placeholder = ""; }
  });
  const boxes = [...element.querySelectorAll(".invoice-box")];
  boxes.forEach(b => { b.style.margin = "0"; b.style.boxShadow = "none"; });

  const restore = () => {
    hidden.forEach(el => { el.style.display = el.dataset.prevDisplay || ""; });
    fields.forEach(el => {
      el.style.color = el.dataset.prevColor || "";
      if (el.dataset.ph){ el.placeholder = el.dataset.ph; delete el.dataset.ph; }
    });
    boxes.forEach(b => { b.style.margin = ""; b.style.boxShadow = ""; });
    syncPages();
  };

  const opt = {
    margin: 0,
    filename: "Estimate.pdf",
    image: { type: "jpeg", quality: 1 },
    html2canvas: { scale: 2, useCORS: true, scrollY: 0, windowWidth: element.scrollWidth },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"], avoid: "tr" }
  };

  html2pdf().set(opt).from(element).toPdf().get("pdf").then(pdf => {
    const n = pdf.internal.getNumberOfPages();
    for (let i = n; i > boxes.length; i--) pdf.deletePage(i);
  }).save().then(restore).catch(err => { console.error(err); restore(); });
}

/* ---------------- init ---------------- */
initBill();
