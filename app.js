// ==========================================================================
// MAIN APPLICATION CONTROLLER (App.js) - ENTERPRISE PRODUCTION READY
// ==========================================================================

import { UndoRedoEngine, runSmartFieldValidation, itemActions, debounce } from './invoiceCore.js';
import { initTabSwitching, initDarkMode, updateDropdowns as domUpdateDropdowns, initClientSelection, initPaymentSelection, initModalClosers } from './domHandlers.js';
import { setLanguage } from './language.js';
import { executeStorageBackup, generateAutoNumber, formatMoney } from './calculations.js';
import { sanitizeHTML, safeParseJSON, validateUploadedFile } from './security.js';
import { updatePreview, renderList } from './preview.js';
import { handleImageUpload, executePdfPrint, exportToCSV, backupToJSON, restoreFromJSON } from './storageAndExport.js';

document.addEventListener('DOMContentLoaded', () => {

  // --- Centralized DOM Cache Structure ---
  const cache = {
    bizName: document.getElementById('bizName'), bizEmail: document.getElementById('bizEmail'),
    bizPhone: document.getElementById('bizPhone'), bizAddress: document.getElementById('bizAddress'),
    custName: document.getElementById('custName'), custCompany: document.getElementById('custCompany'),
    custEmail: document.getElementById('custEmail'), custPhone: document.getElementById('custPhone'),
    custAddress: document.getElementById('custAddress'), receiptNumber: document.getElementById('receiptNumber'),
    issueDate: document.getElementById('issueDate'), dueDate: document.getElementById('dueDate'),
    currencySelect: document.getElementById('currencySelect'), taxLabelInput: document.getElementById('taxLabelInput'),
    taxRate: document.getElementById('taxRate'), discountVal: document.getElementById('discountVal'),
    shippingCost: document.getElementById('shippingCost'), notes: document.getElementById('notes'),
    terms: document.getElementById('terms'), paymentArchType: document.getElementById('paymentArchType'),
    bankDetails: document.getElementById('bankDetails'), payUrl: document.getElementById('payUrl'),
    payMethod: document.getElementById('payMethod'), invoiceStatus: document.getElementById('invoiceStatus'),
    logoPreview: document.getElementById('logoPreview'), receiptPaper: document.getElementById('receiptPaper'),
    prevSubtotal: document.getElementById('prevSubtotal'), prevTotal: document.getElementById('prevTotal'),
    rowDiscount: document.getElementById('rowDiscount'), rowTax: document.getElementById('rowTax'),
    rowShipping: document.getElementById('rowShipping'), prevTaxLabel: document.getElementById('prevTaxLabel'),
    watermarkSelect: document.getElementById('watermarkSelect'), prevWatermark: document.getElementById('prevWatermark'),
    itemsContainer: document.getElementById('itemsContainer')
  };

  // State Management
  let invoiceItems = [{ id: Date.now(), desc: '', qty: 1, rate: 0 }];
  let historyLogs = safeParseJSON(localStorage.getItem('rgp_history'), []);
  let savedClients = safeParseJSON(localStorage.getItem('rgp_saved_clients'), []);
  let savedPayments = safeParseJSON(localStorage.getItem('rgp_saved_payments'), []);
  let notesLibrary = safeParseJSON(localStorage.getItem('rgp_notes_library'), []);

  const triggerPreview = () => {
    updatePreview(cache, { items: invoiceItems }, sanitizeHTML);
  };

  const validateForm = () => {
    let isValid = true;
    if (cache.bizName) isValid = runSmartFieldValidation(cache.bizName, 'required') && isValid;
    if (cache.custName) isValid = runSmartFieldValidation(cache.custName, 'required') && isValid;
    if (cache.receiptNumber) isValid = runSmartFieldValidation(cache.receiptNumber, 'required') && isValid;
    return isValid;
  };

  // Render Invoice Items Rows
  const renderItemsEditor = () => {
    if (!cache.itemsContainer) return;
    cache.itemsContainer.innerHTML = '';
    invoiceItems.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <input type="text" class="item-desc" placeholder="Item Description" value="${sanitizeHTML(item.desc)}" data-index="${index}">
        <input type="number" class="item-qty" placeholder="1" value="${item.qty}" min="1" step="any" data-index="${index}">
        <input type="number" class="item-rate" placeholder="0.00" value="${item.rate}" min="0" step="any" data-index="${index}">
        <div class="item-row-actions">
          <button class="btn-action-sm btn-duplicate" data-id="${item.id}" title="Duplicate"><i class="fas fa-copy"></i></button>
          <button class="btn-action-sm btn-move-up" data-id="${item.id}" title="Move Up"><i class="fas fa-arrow-up"></i></button>
          <button class="btn-action-sm btn-move-down" data-id="${item.id}" title="Move Down"><i class="fas fa-arrow-down"></i></button>
          <button class="btn-action-sm btn-delete text-danger" data-id="${item.id}" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      `;
      cache.itemsContainer.appendChild(row);
    });
    triggerPreview();
  };

  // FIXED: Comprehensive Reset Engine that wipes values but preserves corporate container layout shell
  const resetInvoiceForm = () => {
    if(!confirm("Are you sure you want to reset the current sandbox sandbox?")) return;

    // Reset Inputs to basic state without destroying DOM elements
    Object.keys(cache).forEach(key => {
      const el = cache[key];
      if (el && el.tagName && ['INPUT', 'TEXTAREA'].includes(el.tagName)) {
        if (el.type === 'number') el.value = '0';
        else el.value = '';
      }
    });

    // Restore required safe fallbacks
    if(cache.taxLabelInput) cache.taxLabelInput.value = 'Tax';
    if(cache.currencySelect) cache.currencySelect.value = 'USD|$';
    if(cache.invoiceStatus) cache.invoiceStatus.value = 'Unpaid';
    if(cache.receiptNumber) cache.receiptNumber.value = generateAutoNumber();
    if(cache.issueDate) cache.issueDate.valueAsDate = new Date();
    if(cache.logoPreview) { cache.logoPreview.src = ''; cache.logoPreview.style.display = 'none'; }
    if(cache.prevWatermark) { cache.prevWatermark.textContent = ''; cache.prevWatermark.style.display = 'none'; }

    // Re-initialize singular item state block
    invoiceItems = [{ id: Date.now(), desc: '', qty: 1, rate: 0 }];
    
    renderItemsEditor();
    triggerPreview();
    localStorage.removeItem('rgp_autosave_draft_cache');
  };

  // --- Attach Dynamic Listeners to Items Inputs ---
  cache.itemsContainer?.addEventListener('input', (e) => {
    const idx = e.target.getAttribute('data-index');
    if (!idx) return;
    if (e.target.classList.contains('item-desc')) invoiceItems[idx].desc = e.target.value;
    if (e.target.classList.contains('item-qty')) invoiceItems[idx].qty = parseFloat(e.target.value) || 0;
    if (e.target.classList.contains('item-rate')) invoiceItems[idx].rate = parseFloat(e.target.value) || 0;
    debounce(triggerPreview, 250)();
  });

  // Action Delegation for Items Mutations
  cache.itemsContainer?.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = parseInt(btn.getAttribute('data-id'), 10);
    if (btn.classList.contains('btn-duplicate')) invoiceItems = itemActions.duplicate(invoiceItems, id);
    if (btn.classList.contains('btn-move-up')) invoiceItems = itemActions.moveUp(invoiceItems, id);
    if (btn.classList.contains('btn-move-down')) invoiceItems = itemActions.moveDown(invoiceItems, id);
    if (btn.classList.contains('btn-delete')) {
      if (invoiceItems.length > 1) invoiceItems = invoiceItems.filter(item => item.id !== id);
      else alert("At least one billing line item is strictly mandated.");
    }
    renderItemsEditor();
  });

  // Bind Standard Input Sync Fields
  document.querySelectorAll('input, textarea, select').forEach(input => {
    if (input.id && cache[input.id] && !input.classList.contains('item-qty') && !input.classList.contains('item-rate') && !input.classList.contains('item-desc')) {
      input.addEventListener('input', () => debounce(triggerPreview, 200)());
    }
  });

  // Action Buttons Listeners Binding
  document.getElementById('addItemBtn')?.addEventListener('click', () => {
    invoiceItems.push({ id: Date.now(), desc: '', qty: 1, rate: 0 });
    renderItemsEditor();
  });

  document.getElementById('btnDownloadPdf')?.addEventListener('click', () => {
    if (validateForm()) executePdfPrint(cache);
  });

  document.getElementById('btnResetInvoice')?.addEventListener('click', resetInvoiceForm);

  document.getElementById('btnSaveHistory')?.addEventListener('click', () => {
    if (!validateForm()) return alert("Form contains validation errors.");
    const snapshot = {
      receiptNumber: cache.receiptNumber.value,
      issueDate: cache.issueDate.value,
      custName: cache.custName.value,
      amount: cache.prevTotal?.textContent || '$0.00',
      invoiceStatus: cache.invoiceStatus.value,
      timestamp: Date.now()
    };
    historyLogs.push(snapshot);
    localStorage.setItem('rgp_history', JSON.stringify(historyLogs));
    renderHistoryLogs();
  });

  // Image upload handling pipeline
  document.getElementById('logoUpload')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && validateUploadedFile(file)) {
      handleImageUpload(file, (base64Data) => {
        if(cache.logoPreview) {
          cache.logoPreview.src = base64Data;
          cache.logoPreview.style.display = 'block';
          triggerPreview();
        }
      });
    }
  });

  // Language Swapper Engine Bindings
  document.getElementById('langSelect')?.addEventListener('change', (e) => {
    setLanguage(e.target.value);
  });

  const renderHistoryLogs = () => {
    const logContainer = document.getElementById('historyLogTarget');
    if (!logContainer) return;
    logContainer.innerHTML = '';
    historyLogs.forEach((log, index) => {
      const item = document.createElement('div');
      item.className = 'history-log-row';
      item.innerHTML = `
        <span><strong>${sanitizeHTML(log.receiptNumber)}</strong></span>
        <span>${sanitizeHTML(log.custName)}</span>
        <span>${sanitizeHTML(log.amount)}</span>
        <span class="badge-${log.invoiceStatus.toLowerCase()}">${log.invoiceStatus}</span>
        <div>
          <button onclick="window.app.loadHistoryItem(${index})" class="btn-action-sm"><i class="fas fa-eye"></i></button>\n          <button onclick="window.app.deleteHistoryItem(${index})" class="btn-action-sm text-danger"><i class="fas fa-trash"></i></button>
        </div>
      `;
      logContainer.appendChild(item);
    });
  };

  window.app = {
    loadHistoryItem: (i) => {
      const log = historyLogs[i];
      if (log && cache.receiptNumber && cache.custName) {
        cache.receiptNumber.value = log.receiptNumber || '';
        cache.custName.value = log.custName || '';
        cache.invoiceStatus.value = log.invoiceStatus || 'Unpaid';
        triggerPreview();
      }
    },
    deleteHistoryItem: (i) => {
      if (confirm("Wipe this record?")) {
        historyLogs.splice(i, 1);
        localStorage.setItem('rgp_history', JSON.stringify(historyLogs));
        renderHistoryLogs();
      }
    }
  };

  // PWA Service Worker Registration Implementation
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('Service Worker running securely', reg.scope))
        .catch(err => console.error('Service Worker registration halted', err));
    });
  }

  // Final component boot execution setup
  const savedLang = localStorage.getItem('rgp_lang') || 'en';
  setLanguage(savedLang);
  if(document.getElementById('langSelect')) document.getElementById('langSelect').value = savedLang;

  if (cache.receiptNumber && !cache.receiptNumber.value) cache.receiptNumber.value = generateAutoNumber();
  if (cache.issueDate && !cache.issueDate.value) cache.issueDate.valueAsDate = new Date();

  renderItemsEditor();
  renderHistoryLogs();
});
