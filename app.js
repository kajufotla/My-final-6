// ==========================================================================
// MAIN APPLICATION CONTROLLER (App.js) - ENTERPRISE PRODUCTION READY
// ==========================================================================

import { UndoRedoEngine, runSmartFieldValidation, itemActions, debounce } from './invoiceCore.js';

import { 
  initTabSwitching, 
  initDarkMode, 
  updateDropdowns as domUpdateDropdowns, 
  initClientSelection, 
  initPaymentSelection,
  initModalClosers
} from './domHandlers.js';

import { setLanguage } from './language.js';
import { executeStorageBackup, generateAutoNumber, formatMoney } from './calculations.js';
import { sanitizeHTML, safeParseJSON, validateUploadedFile } from './security.js';
import { updatePreview as previewUpdater } from './preview.js';

document.addEventListener('DOMContentLoaded', () => {

  const cache = {
    bizName: document.getElementById('bizName'),
    bizEmail: document.getElementById('bizEmail'),
    bizPhone: document.getElementById('bizPhone'),
    bizAddress: document.getElementById('bizAddress'),
    custName: document.getElementById('custName'),
    custCompany: document.getElementById('custCompany'),
    custEmail: document.getElementById('custEmail'),
    custPhone: document.getElementById('custPhone'),
    custAddress: document.getElementById('custAddress'),
    receiptNumber: document.getElementById('receiptNumber'),
    issueDate: document.getElementById('issueDate'),
    dueDate: document.getElementById('dueDate'),
    invoiceStatus: document.getElementById('invoiceStatus'),
    watermarkSelect: document.getElementById('watermarkSelect'),
    receiptType: document.getElementById('receiptType'),
    payUrl: document.getElementById('payUrl'),
    payMethod: document.getElementById('payMethod'),
    bankAccTitle: document.getElementById('bankAccTitle'),
    bankName: document.getElementById('bankName'),
    bankAccNo: document.getElementById('bankAccNo'),
    bankIban: document.getElementById('bankIban'),
    bankSwift: document.getElementById('bankSwift'),
    bankBranch: document.getElementById('bankBranch'),
    bankCode: document.getElementById('bankCode'),
    bankRef: document.getElementById('bankRef'),
    itemsBody: document.getElementById('itemsBody'),
    discountVal: document.getElementById('discountVal'),
    taxRate: document.getElementById('taxRate'),
    taxLabelInput: document.getElementById('taxLabelInput'),
    shippingCost: document.getElementById('shippingCost'),
    currencySelect: document.getElementById('currencySelect'),
    themeColorSelect: document.getElementById('themeColorSelect'),
    paymentArchType: document.getElementById('paymentArchType'),
    bankFields: document.getElementById('bankFields'),
    stripeFields: document.getElementById('stripeFields'),
    bankDetails: document.getElementById('bankDetails'),
    notes: document.getElementById('notes'),
    terms: document.getElementById('terms'),
    historyLogsContainer: document.getElementById('historyLogsContainer'),
    searchHistory: document.getElementById('searchHistory'),
    mainForm: document.getElementById('mainForm'),
    receiptPaper: document.getElementById('receiptPaper'),
    prevItemsBody: document.getElementById('prevItemsBody'),
    prevSubtotal: document.getElementById('prevSubtotal'),
    rowDiscount: document.getElementById('rowDiscount'),
    prevDiscount: document.getElementById('prevDiscount'),
    rowTax: document.getElementById('rowTax'),
    prevTax: document.getElementById('prevTax'),
    rowShipping: document.getElementById('rowShipping'),
    prevShipping: document.getElementById('prevShipping'),
    prevTotal: document.getElementById('prevTotal'),
    prevTaxLabel: document.getElementById('prevTaxLabel'),
    prevBizContact: document.getElementById('prevBizContact'),
    prevCustContact: document.getElementById('prevCustContact'),
    prevPayMethod: document.getElementById('prevPayMethod'),
    prevBankDetails: document.getElementById('prevBankDetails'),
    prevPayUrl: document.getElementById('prevPayUrl'),
    prevLogo: document.getElementById('prevLogo'),
    prevSig: document.getElementById('prevSig'),
    prevQr: document.getElementById('prevQr'),
    wrapQr: document.getElementById('wrapQr'),
    prevWatermark: document.getElementById('prevWatermark'),
    prevInvoiceStatus: document.getElementById('prevInvoiceStatus'),
    dashTotalClients: document.getElementById('dashTotalClients'),
    dashTotalInvoiced: document.getElementById('dashTotalInvoiced')
  };

  let state = {
    items: [{ id: Date.now(), desc: '', qty: '', price: '' }],
    logoData: localStorage.getItem('rgp_logoData') || null,
    sigData: localStorage.getItem('rgp_sigData') || null,
    qrData: localStorage.getItem('rgp_qrData') || null,
    activeTemplate: localStorage.getItem('rgp_template_layout') || 'default'
  };

  let historyLogs = safeParseJSON(localStorage.getItem('rgp_history'), []);
  let savedClients = safeParseJSON(localStorage.getItem('rgp_clients'), []);
  let savedPayments = safeParseJSON(localStorage.getItem('rgp_payments'), []);
  let itemMemory = safeParseJSON(localStorage.getItem('rgp_item_memory'), []);
  let notesLibrary = safeParseJSON(localStorage.getItem('rgp_notes_library'), []);

  const calculateCalculatedDueDate = () => {
    const offsetSelect = document.getElementById('dueDateOffset');
    if (!offsetSelect || offsetSelect.value === 'manual' || !cache.issueDate?.value) return;
    const offsetDays = parseInt(offsetSelect.value, 10);
    const baseDate = new Date(cache.issueDate.value);
    if (!isNaN(baseDate.getTime())) {
      baseDate.setDate(baseDate.getDate() + offsetDays);
      if(cache.dueDate) cache.dueDate.value = baseDate.toISOString().split('T')[0];
      updatePreview();
    }
  };

  document.getElementById('dueDateOffset')?.addEventListener('change', calculateCalculatedDueDate);
  cache.issueDate?.addEventListener('change', calculateCalculatedDueDate);

  const renderNotesLibraryDropdown = () => {
    const dbox = document.getElementById('libraryTargetSelect');
    if (!dbox) return;
    const fragment = document.createDocumentFragment();
    const defaultOpt = document.createElement('option');
    defaultOpt.value = "";
    defaultOpt.textContent = "-- Choose From Notes & Terms Library --";
    fragment.appendChild(defaultOpt);
    notesLibrary.forEach((item, index) => {
      const opt = document.createElement('option');
      opt.value = index;
      opt.textContent = `${item.title} (${item.type})`;
      fragment.appendChild(opt);
    });
    dbox.innerHTML = '';
    dbox.appendChild(fragment);
  };

  document.getElementById('btnSaveToLibrary')?.addEventListener('click', () => {
    const titlePrompt = prompt("Enter a unique lookup name for this snippet asset:");
    if (!titlePrompt) return;
    const noteVal = cache.notes?.value || '';
    const termVal = cache.terms?.value || '';
    const bankVal = cache.bankDetails?.value || '';
    const record = { title: titlePrompt, notes: noteVal, terms: termVal, bank: bankVal, type: noteVal ? 'Notes' : (termVal ? 'Terms' : 'Bank') };
    notesLibrary.push(record);
    localStorage.setItem('rgp_notes_library', JSON.stringify(notesLibrary));
    renderNotesLibraryDropdown();
    alert("Asset stored inside workspace library profile.");
  });

  document.getElementById('libraryTargetSelect')?.addEventListener('change', (e) => {
    if (e.target.value === "") return;
    const activeItem = notesLibrary[e.target.value];
    if (activeItem) {
      if (activeItem.notes && cache.notes) cache.notes.value = activeItem.notes;
      if (activeItem.terms && cache.terms) cache.terms.value = activeItem.terms;
      if (activeItem.bank && cache.bankDetails) cache.bankDetails.value = activeItem.bank;
      updatePreview();
    }
  });

  document.getElementById('btnDeleteLibraryItem')?.addEventListener('click', () => {
    const target = document.getElementById('libraryTargetSelect');
    if (!target || target.value === "") return alert("Please select an item to delete.");
    if (confirm("Remove this snippet item from local storage configurations permanently?")) {
      notesLibrary.splice(target.value, 1);
      localStorage.setItem('rgp_notes_library', JSON.stringify(notesLibrary));
      renderNotesLibraryDropdown();
      updatePreview();
    }
  });

  renderNotesLibraryDropdown();

  const captureCurrentFormSnapshot = () => ({
      bizName: cache.bizName?.value || '', bizEmail: cache.bizEmail?.value || '', bizPhone: cache.bizPhone?.value || '', bizAddress: cache.bizAddress?.value || '',
      custName: cache.custName?.value || '', custCompany: cache.custCompany?.value || '', custEmail: cache.custEmail?.value || '', custPhone: cache.custPhone?.value || '',
      custAddress: cache.custAddress?.value || '', receiptNumber: cache.receiptNumber?.value || '', issueDate: cache.issueDate?.value || '', dueDate: cache.dueDate?.value || '',
      invoiceStatus: cache.invoiceStatus?.value || 'Draft', watermark: cache.watermarkSelect?.value || '', receiptType: cache.receiptType?.value || 'Invoice', currency: cache.currencySelect?.value || '',
      discount: cache.discountVal?.value || '', tax: cache.taxRate?.value || '', taxLabel: cache.taxLabelInput?.value || '', shipping: cache.shippingCost?.value || '',
      themeColor: cache.themeColorSelect?.value || '', paymentArch: cache.paymentArchType?.value || '', bankDetails: cache.bankDetails?.value || '', payUrl: cache.payUrl?.value || '',
      payMethodText: cache.payMethod?.value || '', notes: cache.notes?.value || '', terms: cache.terms?.value || '', items: state.items
  });

  const applySnapshotToForm = (snap) => {
    if (!snap) return;
    Object.keys(snap).forEach(key => {
      if (cache[key] && key !== 'items') cache[key].value = snap[key];
      else if (key === 'watermark' && cache.watermarkSelect) cache.watermarkSelect.value = snap.watermark;
      else if (key === 'paymentArch' && cache.paymentArchType) cache.paymentArchType.value = snap.paymentArch;
      else if (key === 'taxLabel' && cache.taxLabelInput) cache.taxLabelInput.value = snap.taxLabel;
      else if (key === 'payMethodText' && cache.payMethod) cache.payMethod.value = snap.payMethodText;
    });
    if (snap.items !== undefined) state.items = snap.items;
    renderItemsEditor(); updatePreview();
  };

  const autoSaveDraftAction = debounce(() => {
    const snap = captureCurrentFormSnapshot();
    localStorage.setItem('rgp_autosave_draft_cache', JSON.stringify(snap));
    UndoRedoEngine.pushState(snap);
    executeStorageBackup(snap);
  }, 700);

  const validateForm = () => {
    let formsValid = true;
    if (cache.bizName && !runSmartFieldValidation(cache.bizName, 'string', cache)) formsValid = false;
    if (cache.custName && !runSmartFieldValidation(cache.custName, 'string', cache)) formsValid = false;
    if (cache.bizEmail?.value && !runSmartFieldValidation(cache.bizEmail, 'email', cache)) formsValid = false;
    if (cache.custEmail?.value && !runSmartFieldValidation(cache.custEmail, 'email', cache)) formsValid = false;
    if (cache.custPhone?.value && !runSmartFieldValidation(cache.custPhone, 'phone', cache)) formsValid = false;
    if (cache.dueDate?.value && !runSmartFieldValidation(cache.dueDate, 'date-order', cache)) formsValid = false;
    state.items.forEach(item => {
      if (!item.desc.trim()) formsValid = false;
      if (parseFloat(item.qty) < 0 || isNaN(parseFloat(item.qty))) formsValid = false;
      if (parseFloat(item.price) < 0 || isNaN(parseFloat(item.price))) formsValid = false;
    });
    return formsValid;
  };

  document.getElementById('templateSelector')?.addEventListener('change', (e) => {
    state.activeTemplate = e.target.value;
    localStorage.setItem('rgp_template_layout', state.activeTemplate);
    if(cache.receiptPaper) cache.receiptPaper.className = `template-${state.activeTemplate}`;
    updatePreview();
  });

  const recomputeDashboardMetrics = () => {
    const metrics = { count: historyLogs.length, paid: 0, pending: 0, overdue: 0, draft: 0, revenue: 0 };
    historyLogs.forEach(log => {
      const status = log.status || 'Draft';
      const parsedValue = parseFloat(String(log.totalVal).replace(/[^0-9.-]+/g, "")) || 0;
      if (status === 'Paid') { metrics.paid++; metrics.revenue += parsedValue; }
      else if (status === 'Pending') metrics.pending++;
      else if (status === 'Overdue') metrics.overdue++;
      else metrics.draft++;
    });
    if (document.getElementById('statTotalCount')) {
      document.getElementById('statTotalCount').textContent = metrics.count;
      document.getElementById('statPaidCount').textContent = metrics.paid;
      document.getElementById('statPendingCount').textContent = metrics.pending;
      document.getElementById('statOverdueCount').textContent = metrics.overdue;
      document.getElementById('statTotalRevenue').textContent = formatMoney(metrics.revenue, cache.currencySelect?.value);
    }
  };

  const renderHistoryLogs = (filterKeyword = "") => {
    if(!cache.historyLogsContainer) return;
    if(cache.dashTotalClients) cache.dashTotalClients.textContent = savedClients.length;
    const query = filterKeyword.toLowerCase().trim();
    const filteredLogs = historyLogs.filter(h => 
      (h.custName || '').toLowerCase().includes(query) || (h.number || '').toLowerCase().includes(query) ||
      (h.date || '').toLowerCase().includes(query) || (h.status || '').toLowerCase().includes(query) ||
      (h.totalVal || '').toLowerCase().includes(query) || (h.bizName || '').toLowerCase().includes(query)
    );
    if (filteredLogs.length === 0) {
      cache.historyLogsContainer.innerHTML = `<p class="text-sm" style="color:var(--text-secondary);">No historical metrics match current filters.</p>`;
      recomputeDashboardMetrics(); return;
    }
    const fragment = document.createDocumentFragment();
    filteredLogs.forEach((h) => {
      const realIndex = historyLogs.indexOf(h);
      const itemRow = document.createElement('div');
      itemRow.className = "list-item";
      itemRow.style.cssText = "padding: 8px; border-bottom: 1px solid rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center;";
      itemRow.innerHTML = `<div><strong>${sanitizeHTML(h.custName || 'Unknown Profile')}</strong><br><small>${sanitizeHTML(h.number)} | ${sanitizeHTML(h.date)} | Total: ${sanitizeHTML(h.totalVal)} | <span style="font-weight:bold;">${sanitizeHTML(h.status || 'Draft')}</span></small></div><div><button class="btn-secondary text-sm btn-action-load" data-index="${realIndex}">Load</button> <button class="btn-danger text-sm btn-action-del" data-index="${realIndex}">Del</button></div>`;
      fragment.appendChild(itemRow);
    });
    cache.historyLogsContainer.innerHTML = ''; cache.historyLogsContainer.appendChild(fragment);
    recomputeDashboardMetrics();
  };

  cache.historyLogsContainer?.addEventListener('click', (e) => {
    const loadBtn = e.target.closest('.btn-action-load');
    const delBtn = e.target.closest('.btn-action-del');
    if (loadBtn) handlers.loadHistoryItem(parseInt(loadBtn.dataset.index, 10));
    else if (delBtn) handlers.deleteHistoryItem(parseInt(delBtn.dataset.index, 10));
  });

  cache.searchHistory?.addEventListener('input', (e) => renderHistoryLogs(e.target.value));

  const savedProfile = safeParseJSON(localStorage.getItem('rgp_company_profile'), {});
  if(savedProfile.bizName && cache.bizName) cache.bizName.value = savedProfile.bizName;
  if(savedProfile.bizEmail && cache.bizEmail) cache.bizEmail.value = savedProfile.bizEmail;
  if(savedProfile.bizPhone && cache.bizPhone) cache.bizPhone.value = savedProfile.bizPhone;
  if(savedProfile.bizAddress && cache.bizAddress) cache.bizAddress.value = savedProfile.bizAddress;

  document.getElementById('btnQuickSaveProfile')?.addEventListener('click', () => {
    const profile = { bizName: cache.bizName?.value || '', bizEmail: cache.bizEmail?.value || '', bizPhone: cache.bizPhone?.value || '', bizAddress: cache.bizAddress?.value || '' };
    localStorage.setItem('rgp_company_profile', JSON.stringify(profile));
    updatePreview(); alert("Company Profile Configuration Saved!");
  });

  const savedLang = localStorage.getItem('rgp_lang') || 'en';
  const langSwitcher = document.getElementById('langSwitcher');
  if(langSwitcher) {
      langSwitcher.value = savedLang;
      langSwitcher.addEventListener('change', (e) => setLanguage(e.target.value));
  }
  setLanguage(savedLang);

  document.getElementById('btnDuplicate')?.addEventListener('click', () => {
    validateForm();
    if(cache.receiptNumber) cache.receiptNumber.value = generateAutoNumber(historyLogs);
    if(cache.issueDate) cache.issueDate.valueAsDate = new Date();
    if(cache.invoiceStatus) cache.invoiceStatus.value = 'Draft';
    updatePreview(); alert("Invoice Duplicated safely. A sequential generation ID has been provisioned.");
  });

  cache.themeColorSelect?.addEventListener('input', (e) => {
    const selectedColor = e.target.value;
    document.documentElement.style.setProperty('--receipt-theme-color', selectedColor);
    document.documentElement.style.setProperty('--receipt-light-bg', selectedColor + '15');
    updatePreview();
  });

  cache.paymentArchType?.addEventListener('change', (e) => {
    const isBank = e.target.value === 'bank';
    if(cache.bankFields) cache.bankFields.style.display = isBank ? 'block' : 'none';
    if(cache.stripeFields) cache.stripeFields.style.display = isBank ? 'none' : 'block';
    updatePreview();
  });

  const saveLayoutConfig = () => {
    localStorage.setItem('rgp_extras_defaults', JSON.stringify({ notes: cache.notes?.value || '', terms: cache.terms?.value || '' }));
    alert("Layout baseline defaults provisioned.");
  };
  document.getElementById('btnSaveNotesOnly')?.addEventListener('click', saveLayoutConfig);
  document.getElementById('btnSaveTermsOnly')?.addEventListener('click', saveLayoutConfig);

  const autoNumberLineHook = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); const el = e.target; const start = el.selectionStart; const end = el.selectionEnd; const val = el.value;
      const linesBeforeCaret = val.substring(0, start).split('\n'); const currentLine = linesBeforeCaret[linesBeforeCaret.length - 1];
      const match = currentLine.match(/^(\d+)\.\s/); let insertText = '\n';
      if (match) insertText += `${parseInt(match[1], 10) + 1}. `; else if (val.trim() === '') insertText += '1. ';
      el.value = val.substring(0, start) + insertText + val.substring(end);
      el.selectionStart = el.selectionEnd = start + insertText.length; updatePreview();
    }
  };
  cache.notes?.addEventListener('keydown', autoNumberLineHook); cache.terms?.addEventListener('keydown', autoNumberLineHook);

  const updateBankString = () => {
    let str = '';
    const fields = ['bankAccTitle', 'bankName', 'bankAccNo', 'bankIban', 'bankSwift', 'bankBranch', 'bankCode', 'bankRef'];
    const labels = ['Account Title', 'Bank Name', 'Account No', 'IBAN', 'SWIFT', 'Branch', 'Code', 'Ref'];
    fields.forEach((id, idx) => {
      const el = document.getElementById(id);
      if(el?.value) str += `${labels[idx]}: ${el.value}\n`;
    });
    if(cache.bankDetails) cache.bankDetails.value = str.trim(); updatePreview();
  };
  document.querySelectorAll('.bank-grid input').forEach(input => input.addEventListener('input', updateBankString));

  document.addEventListener('input', (e) => {
    if(['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) { updatePreview(); autoSaveDraftAction(); }
  });

  initTabSwitching(validateForm, updatePreview); initDarkMode(); initModalClosers();

  const updateItemMemoryList = () => {
    const dl = document.getElementById('itemMemoryList');
    if (!dl) return;
    const fragment = document.createDocumentFragment();
    itemMemory.forEach(desc => {
      const opt = document.createElement('option'); opt.value = desc; fragment.appendChild(opt);
    });
    dl.innerHTML = ''; dl.appendChild(fragment);
  };
  updateItemMemoryList();

  const internalItemActions = {
    duplicate(id) { state.items = itemActions.duplicate(state.items, id); postMutationSequence(); },
    moveUp(id) { state.items = itemActions.moveUp(state.items, id); postMutationSequence(); },
    moveDown(id) { state.items = itemActions.moveDown(state.items, id); postMutationSequence(); },
    remove(id) { if(state.items.length > 1) { state.items = state.items.filter(i => i.id !== id); postMutationSequence(); } }
  };

  const postMutationSequence = () => { renderItemsEditor(); updatePreview(); autoSaveDraftAction(); };

  const renderItemsEditor = () => {
    if(!cache.itemsBody) return;
    const fragment = document.createDocumentFragment();
    state.items.forEach((item, index) => {
      const tr = document.createElement('tr'); tr.dataset.id = item.id;
      tr.innerHTML = `<td style="vertical-align: middle; text-align: center; font-weight: bold; color: #666;">${index + 1}</td>
        <td><input type="text" class="item-desc req-field" value="${sanitizeHTML(item.desc)}" list="itemMemoryList" placeholder="Item Description" style="width:100%;"></td>
        <td><input type="number" class="item-qty req-field" value="${item.qty}" placeholder="Quantity (e.g. 1)" min="0" style="width:100%;"></td>
        <td><input type="number" class="item-price req-field" value="${item.price}" placeholder="Price (e.g. 100)" min="0" style="width:100%;"></td>
        <td style="text-align:right; white-space: nowrap;"><button type="button" class="btn-secondary text-sm action-up" title="Move Up">↑</button> <button type="button" class="btn-secondary text-sm action-down" title="Move Down">↓</button> <button type="button" class="btn-secondary text-sm action-dup" title="Duplicate Item">📋</button> <button type="button" class="btn-danger action-del" aria-label="Remove Item">✕</button></td>`;
      fragment.appendChild(tr);
    });
    cache.itemsBody.innerHTML = ''; cache.itemsBody.appendChild(fragment);
  };

  cache.itemsBody?.addEventListener('click', (e) => {
    const tr = e.target.closest('tr'); if (!tr) return;
    const id = parseInt(tr.dataset.id, 10);
    if (e.target.classList.contains('action-up')) internalItemActions.moveUp(id);
    else if (e.target.classList.contains('action-down')) internalItemActions.moveDown(id);
    else if (e.target.classList.contains('action-dup')) internalItemActions.duplicate(id);
    else if (e.target.classList.contains('action-del')) internalItemActions.remove(id);
  });

  cache.itemsBody?.addEventListener('input', (e) => {
    const tr = e.target.closest('tr'); if (!tr) return;
    const id = parseInt(tr.dataset.id, 10); const item = state.items.find(i => i.id === id); if (!item) return;
    if (e.target.classList.contains('item-desc')) { item.desc = e.target.value; runSmartFieldValidation(e.target, 'string', cache); }
    else if (e.target.classList.contains('item-qty')) { item.qty = e.target.value; runSmartFieldValidation(e.target, 'numeric-positive', cache); }
    else if (e.target.classList.contains('item-price')) { item.price = e.target.value; runSmartFieldValidation(e.target, 'numeric-positive', cache); }
  });

  cache.itemsBody?.addEventListener('blur', (e) => {
    if (e.target.classList.contains('item-desc') && e.target.value) {
      if (!itemMemory.includes(e.target.value)) { itemMemory.push(e.target.value); localStorage.setItem('rgp_item_memory', JSON.stringify(itemMemory)); updateItemMemoryList(); }
    }
  }, true);

  document.getElementById('btnAddItem')?.addEventListener('click', () => {
    state.items.push({ id: Date.now(), desc: '', qty: '', price: '' }); renderItemsEditor();
  });

  const updatePreview = () => previewUpdater(cache, state, sanitizeHTML); window.updatePreview = updatePreview;

  const handleFile = (id, stateKey) => {
    const fileInput = document.getElementById(id);
    fileInput?.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if(file && validateUploadedFile(file)) {
        const reader = new FileReader();
        reader.onload = (ev) => { state[stateKey] = ev.target.result; localStorage.setItem('rgp_' + stateKey, ev.target.result); updatePreview(); };
        reader.readAsDataURL(file);
      }
    });
  };
  handleFile('logoUpload', 'logoData'); handleFile('sigUpload', 'sigData'); handleFile('qrUpload', 'qrData');

  document.getElementById('btnAutoNum')?.addEventListener('click', () => {
    if(cache.receiptNumber) cache.receiptNumber.value = generateAutoNumber(historyLogs); updatePreview();
  });

  const updateDropdowns = () => {
    domUpdateDropdowns(savedClients, savedPayments, sanitizeHTML); initClientSelection(savedClients, cache, updatePreview); initPaymentSelection(savedPayments, cache, updatePreview);
  };
  updateDropdowns();

  document.getElementById('btnSaveClient')?.addEventListener('click', () => {
    const name = cache.custName?.value; if(!name) return alert("Customer name required to save.");
    savedClients.push({ custName: name, custCompany: cache.custCompany?.value || '', custEmail: cache.custEmail?.value || '', custPhone: cache.custPhone?.value || '', custAddress: cache.custAddress?.value || '' });
    localStorage.setItem('rgp_clients', JSON.stringify(savedClients)); updateDropdowns(); alert("Client Record Cataloged.");
  });

  document.getElementById('btnSavePaymentProfile')?.addEventListener('click', () => {
    savedPayments.push({
      payArch: cache.paymentArchType?.value || '', bank: cache.bankDetails?.value || '', stripe: cache.payUrl?.value || '', payMethodText: cache.payMethod?.value || '',
      bTitle: document.getElementById('bankAccTitle')?.value || '', bName: document.getElementById('bankName')?.value || '', bAcc: document.getElementById('bankAccNo')?.value || '',
      bIban: document.getElementById('bankIban')?.value || '', bSwift: document.getElementById('bankSwift')?.value || '', bBranch: document.getElementById('bankBranch')?.value || '',
      bCode: document.getElementById('bankCode')?.value || '', bRef: document.getElementById('bankRef')?.value || ''
    });
    localStorage.setItem('rgp_payments', JSON.stringify(savedPayments)); updateDropdowns(); alert("Payment Parameter Gateway Profile Saved!");
  });

  document.getElementById('btnReset')?.addEventListener('click', () => {
    if(confirm("Reset entire active structural composer layout sheet?")) {
      document.querySelectorAll('input:not([type="file"]):not(#themeColorSelect), textarea').forEach(el => el.value = '');
      document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
      document.querySelectorAll('.error-msg').forEach(el => el.style.display = 'none');
      state.items = [{ id: Date.now(), desc: '', qty: '', price: '' }];
      if(cache.receiptNumber) cache.receiptNumber.value = generateAutoNumber(historyLogs);
      if(cache.issueDate) cache.issueDate.valueAsDate = new Date();
      if(cache.invoiceStatus) cache.invoiceStatus.value = 'Draft';
      if(cache.watermarkSelect) cache.watermarkSelect.value = '';
      if(cache.taxLabelInput) cache.taxLabelInput.value = 'Tax';
      localStorage.removeItem('rgp_autosave_draft_cache'); renderItemsEditor(); updatePreview();
    }
  });

  document.getElementById('btnSaveHistory')?.addEventListener('click', () => {
    if(!validateForm()) return alert("Please fill required fields correctly to store.");
    historyLogs.push({
      bizName: cache.bizName?.value || '', bizEmail: cache.bizEmail?.value || '', bizPhone: cache.bizPhone?.value || '', bizAddress: cache.bizAddress?.value || '',
      custName: cache.custName?.value || '', custCompany: cache.custCompany?.value || '', custEmail: cache.custEmail?.value || '', custPhone: cache.custPhone?.value || '', custAddress: cache.custAddress?.value || '',
      currency: cache.currencySelect?.value || '', notes: cache.notes?.value || '', terms: cache.terms?.value || '', number: cache.receiptNumber?.value || '', date: cache.issueDate?.value || '',
      type: cache.receiptType?.value || '', totalVal: cache.prevTotal?.textContent || '', items: JSON.parse(JSON.stringify(state.items)),
      discount: cache.discountVal?.value || '', tax: cache.taxRate?.value || '', shipping: cache.shippingCost?.value || '', themeColor: cache.themeColorSelect?.value || '',
      payArch: cache.paymentArchType?.value || '', bank: cache.bankDetails?.value || '', stripe: cache.payUrl?.value || '', payMethodText: cache.payMethod?.value || '',
      status: cache.invoiceStatus ? cache.invoiceStatus.value : 'Draft', dueDate: cache.dueDate ? cache.dueDate.value : '', watermark: cache.watermarkSelect ? cache.watermarkSelect.value : ''
    });
    localStorage.setItem('rgp_history', JSON.stringify(historyLogs)); localStorage.removeItem('rgp_autosave_draft_cache');
    renderHistoryLogs(); alert("Record Saved To System Vault Ledger.");
  });

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      const key = e.key.toLowerCase();
      if (key === 's') { e.preventDefault(); document.getElementById('btnSaveHistory')?.click(); }
      else if (key === 'p') { e.preventDefault(); document.getElementById('btnPrintView')?.click(); }
      else if (key === 'n') { e.preventDefault(); document.getElementById('btnReset')?.click(); }
      else if (key === 'd') { e.preventDefault(); document.getElementById('btnDuplicate')?.click(); }
      else if (key === 'z') { e.preventDefault(); UndoRedoEngine.undo((s) => applySnapshotToForm(s)); }
      else if (key === 'y') { e.preventDefault(); UndoRedoEngine.redo((s) => applySnapshotToForm(s)); }
    }
  });

  const handlers = {
    loadHistoryItem: (i) => {
      const h = historyLogs[i];
      const mappings = { bizName: h.bizName, bizEmail: h.bizEmail, bizPhone: h.bizPhone, bizAddress: h.bizAddress, custName: h.custName, custCompany: h.custCompany, custEmail: h.custEmail, custPhone: h.custPhone, custAddress: h.custAddress, receiptNumber: h.number, issueDate: h.date };
      Object.entries(mappings).forEach(([id, val]) => { if(document.getElementById(id)) document.getElementById(id).value = val || ''; });
      if(h.currency && cache.currencySelect) cache.currencySelect.value = h.currency;
      if(h.notes !== undefined && cache.notes) cache.notes.value = h.notes;
      if(h.terms !== undefined && cache.terms) cache.terms.value = h.terms;
      if(h.status && cache.invoiceStatus) cache.invoiceStatus.value = h.status;
      if(h.dueDate && cache.dueDate) cache.dueDate.value = h.dueDate;
      if(h.watermark && cache.watermarkSelect) cache.watermarkSelect.value = h.watermark;
      if(cache.receiptType) cache.receiptType.value = h.type || 'Invoice';
      if(cache.discountVal) cache.discountVal.value = h.discount || '';
      if(cache.taxRate) cache.taxRate.value = h.tax || '';
      if(cache.shippingCost) cache.shippingCost.value = h.shipping || '';
      if(h.themeColor && cache.themeColorSelect) { cache.themeColorSelect.value = h.themeColor; document.documentElement.style.setProperty('--receipt-theme-color', h.themeColor); document.documentElement.style.setProperty('--receipt-light-bg', h.themeColor + '15'); }
      if(h.payArch && cache.paymentArchType) cache.paymentArchType.value = h.payArch;
      if(h.bank && cache.bankDetails) {
        cache.bankDetails.value = h.bank;
        h.bank.split('\n').forEach(l => {
          if(l.includes('Account Title:') && document.getElementById('bankAccTitle')) document.getElementById('bankAccTitle').value = l.split(':')[1].trim();
          if(l.includes('Bank Name:') && document.getElementById('bankName')) document.getElementById('bankName').value = l.split(':')[1].trim();
          if(l.includes('Account No:') && document.getElementById('bankAccNo')) document.getElementById('bankAccNo').value = l.split(':')[1].trim();
          if(l.includes('IBAN:') && document.getElementById('bankIban')) document.getElementById('bankIban').value = l.split(':')[1].trim();
        });
      }
      if(h.stripe && cache.payUrl) cache.payUrl.value = h.stripe;
      if(h.payMethodText && cache.payMethod) cache.payMethod.value = h.payMethodText;
      if(cache.paymentArchType) cache.paymentArchType.dispatchEvent(new Event('change'));
      state.items = (h.items || [{ desc: '', qty: '', price: '' }]).map((it, idx) => ({ ...it, id: Date.now() + idx }));
      renderItemsEditor(); updatePreview(); alert("Ledger Item Content Loaded Into Active Document Sandbox.");
    },
    deleteHistoryItem: (i) => {
      if(confirm("Permanently wipe this transaction ledger log?")) {
        historyLogs.splice(i, 1); localStorage.setItem('rgp_history', JSON.stringify(historyLogs)); renderHistoryLogs(cache.searchHistory?.value || '');
      }
    },
    showAuth: (type) => {
      const modal = document.getElementById('authModal'); if (!modal) return;
      if(document.getElementById('authTitle')) document.getElementById('authTitle').innerText = type === 'login' ? 'Login' : 'Create Account';
      if(document.getElementById('btnSubmitAuth')) document.getElementById('btnSubmitAuth').innerText = type === 'login' ? 'Login' : 'Sign Up';
      if(document.getElementById('authSwitchText')) document.getElementById('authSwitchText').innerHTML = type === 'login' ? `Don't have an account? <a class="auth-toggle" data-type="signup">Sign up</a>` : `Already have an account? <a class="auth-toggle" data-type="login">Login</a>`;
      modal.classList.add('active');
    }
  };

  document.getElementById('authModal')?.addEventListener('click', (e) => {
    if(e.target.classList.contains('auth-toggle')) handlers.showAuth(e.target.dataset.type);
  });

  // PROFESSIONAL ENTERPRISE PDF EXPORT ENGINE IMPLEMENTATION
  document.getElementById('btnDownloadPDF')?.addEventListener('click', () => {
    if (typeof html2pdf === 'undefined') {
        alert("PDF Rendering Engine is currently loading. Please wait a moment.");
        return;
    }
    const element = document.getElementById('receiptPaper');
    const filename = `${cache.receiptNumber?.value || 'Document'}.pdf`;
    const opt = {
      margin:       0,
      filename:     filename,
      image:        { type: 'jpeg', quality: 1.0 },
      html2canvas:  { scale: 3, useCORS: true, letterRendering: true, windowWidth: 1024 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  });

  if (state.activeTemplate !== 'default') {
    const tSelector = document.getElementById('templateSelector');
    if (tSelector) tSelector.value = state.activeTemplate;
    if(cache.receiptPaper) cache.receiptPaper.className = `template-${state.activeTemplate}`;
  }

  if(cache.receiptNumber && !cache.receiptNumber.value) cache.receiptNumber.value = generateAutoNumber(historyLogs);
  if(cache.issueDate && !cache.issueDate.value) cache.issueDate.valueAsDate = new Date();
  if(cache.taxLabelInput && !cache.taxLabelInput.value) cache.taxLabelInput.value = 'Tax';

  renderItemsEditor(); renderHistoryLogs(); updatePreview();

  (() => {
    const recoveryTarget = localStorage.getItem('rgp_autosave_draft_cache');
    if (recoveryTarget) {
      try {
        const parsed = JSON.parse(recoveryTarget);
        if (parsed && Object.keys(parsed).length > 0) applySnapshotToForm(parsed);
      } catch (err) { console.warn("Auto-recovery sequence fallback triggered due to data anomalies.", err); }
    }
  })();
});
