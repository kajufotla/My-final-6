// ==========================================================================
// MAIN APPLICATION CONTROLLER (App.js) - ENTERPRISE PRODUCTION READY
// ==========================================================================

import { UndoRedoEngine, runSmartFieldValidation, itemActions, debounce } from './invoiceCore.js';
import { initTabSwitching, initDarkMode, updateDropdowns as domUpdateDropdowns, initClientSelection, initPaymentSelection, initModalClosers } from './domHandlers.js';
import { setLanguage } from './language.js';
import { executeStorageBackup, generateAutoNumber, formatMoney } from './calculations.js';
import { sanitizeHTML, safeParseJSON, validateUploadedFile, secureStorage } from './security.js';
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
    invoiceStatus: document.getElementById('invoiceStatus'), watermarkSelect: document.getElementById('watermarkSelect'),
    receiptType: document.getElementById('receiptType'), payUrl: document.getElementById('payUrl'),
    payMethod: document.getElementById('payMethod'), bankAccTitle: document.getElementById('bankAccTitle'),
    bankName: document.getElementById('bankName'), bankAccNo: document.getElementById('bankAccNo'),
    bankIban: document.getElementById('bankIban'), bankSwift: document.getElementById('bankSwift'),
    bankBranch: document.getElementById('bankBranch'), bankCode: document.getElementById('bankCode'),
    bankRef: document.getElementById('bankRef'), notes: document.getElementById('notes'),
    terms: document.getElementById('terms'), currencySelect: document.getElementById('currencySelect'),
    taxLabelInput: document.getElementById('taxLabelInput'), taxRate: document.getElementById('taxRate'),
    discountVal: document.getElementById('discountVal'), shippingCost: document.getElementById('shippingCost'),
    
    // Preview Cache Refs
    receiptPaper: document.getElementById('receiptPaper'),
    prevBizContact: document.getElementById('prevBizContact'), prevCustContact: document.getElementById('prevCustContact'),
    prevTaxLabel: document.getElementById('prevTaxLabel'), prevSubtotal: document.getElementById('prevSubtotal'),
    prevTotal: document.getElementById('prevTotal'), rowDiscount: document.getElementById('rowDiscount'),
    rowTax: document.getElementById('rowTax'), rowShipping: document.getElementById('rowShipping'),
    prevWatermark: document.getElementById('prevWatermark'), prevStatusBadge: document.getElementById('prevStatusBadge'),
    prevLogo: document.getElementById('prevLogo'), prevSignature: document.getElementById('prevSignature'),
    prevQrCode: document.getElementById('prevQrCode'), itemsBody: document.getElementById('itemsBody'),
    
    items: [] // Dynamic items array
  };

  let historyLogs = secureStorage.getItem('rgp_history', []);
  
  // --- Core Functional Logic ---
  const triggerPreview = debounce(() => {
    updatePreview(cache, {}, sanitizeHTML);
    // Autosave Draft silently for Firebase readiness
    secureStorage.setItem('rgp_autosave_draft_cache', getSnapshot());
  }, 250);

  const getSnapshot = () => {
    const snap = { items: [...cache.items] };
    document.querySelectorAll('input:not([type="file"]):not([type="color"]), textarea, select').forEach(el => {
      if (el.id) snap[el.id] = el.value;
    });
    return snap;
  };

  const applySnapshotToForm = (snap) => {
    if (!snap) return;
    document.querySelectorAll('input:not([type="file"]):not([type="color"]), textarea, select').forEach(el => {
      if (el.id && snap[el.id] !== undefined) el.value = snap[el.id];
    });
    if (snap.items) cache.items = [...snap.items];
    renderItemsEditor();
    triggerPreview();
  };

  // --- Dynamic Items Editor ---
  const renderItemsEditor = () => {
    if(!cache.itemsBody) return;
    cache.itemsBody.innerHTML = '';
    cache.items.forEach((item) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><input type="text" class="item-desc" data-id="${item.id}" value="${item.desc}" placeholder="Item Description"></td>
        <td><input type="number" class="item-qty" data-id="${item.id}" value="${item.qty}" min="0" step="1" placeholder="0"></td>
        <td><input type="number" class="item-price" data-id="${item.id}" value="${item.price}" min="0" step="0.01" placeholder="0.00"></td>
        <td><button type="button" class="btn-danger btn-sm remove-item" data-id="${item.id}">X</button></td>
      `;
      cache.itemsBody.appendChild(row);
    });
    attachItemListeners();
  };

  const attachItemListeners = () => {
    document.querySelectorAll('.item-desc, .item-qty, .item-price').forEach(input => {
      input.addEventListener('input', (e) => {
        const id = parseInt(e.target.getAttribute('data-id'));
        const field = e.target.className.split('-')[1];
        const item = cache.items.find(i => i.id === id);
        if (item) {
          item[field] = e.target.value;
          triggerPreview();
        }
      });
    });
    document.querySelectorAll('.remove-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.getAttribute('data-id'));
        cache.items = cache.items.filter(i => i.id !== id);
        renderItemsEditor();
        triggerPreview();
      });
    });
  };

  document.getElementById('btnAddItem')?.addEventListener('click', () => {
    cache.items.push({ id: Date.now(), desc: '', qty: 1, price: 0 });
    renderItemsEditor();
    triggerPreview();
  });

  // --- Input Listeners ---
  document.querySelectorAll('input, textarea, select').forEach(el => {
    el.addEventListener('input', triggerPreview);
    el.addEventListener('change', triggerPreview);
  });

  // --- Image Uploads (Secure) ---
  const bindUpload = (inputId, prevId, clearId) => {
    document.getElementById(inputId)?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (validateUploadedFile(file)) {
        handleImageUpload(file, (dataUrl) => {
          const img = document.getElementById(prevId);
          if (img) { img.src = dataUrl; img.style.display = 'block'; }
        });
      }
    });
    document.getElementById(clearId)?.addEventListener('click', () => {
      const img = document.getElementById(prevId);
      if (img) { img.src = ''; img.style.display = 'none'; }
      const input = document.getElementById(inputId);
      if (input) input.value = '';
    });
  };
  bindUpload('logoUpload', 'prevLogo', 'clearLogo');
  bindUpload('signatureUpload', 'prevSignature', 'clearSignature');
  bindUpload('qrUpload', 'prevQrCode', 'clearQr');

  // ==========================================================================
  // ENTERPRISE FEATURES: RESET, DUPLICATE, PRINT, & MOBILE ZOOM
  // ==========================================================================

  // 1. FLAWLESS RESET FUNCTION
  document.getElementById('actionReset')?.addEventListener('click', () => {
    if(!confirm("Warning: This will clear all fields and start a fresh invoice. Are you sure?")) return;
    
    // Clear textual/number fields
    document.querySelectorAll('input:not([type="color"]):not([type="radio"]):not([type="checkbox"]):not([type="file"]), textarea').forEach(el => el.value = '');
    
    // Clear Selects to default (index 0)
    document.querySelectorAll('select').forEach(el => el.selectedIndex = 0);
    
    // Clear Images completely
    ['prevLogo', 'prevSignature', 'prevQrCode'].forEach(id => {
      const img = document.getElementById(id);
      if(img) {
          img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3C/svg%3E";
          img.style.display = 'none';
      }
    });

    ['logoUpload', 'signatureUpload', 'qrUpload'].forEach(id => {
       const fileInput = document.getElementById(id);
       if(fileInput) fileInput.value = '';
    });
    
    // Empty Lists & Totals
    cache.items = [];
    renderItemsEditor();
    
    // Generate new fresh invoice number
    if (cache.receiptNumber) cache.receiptNumber.value = generateAutoNumber();
    if (cache.issueDate) cache.issueDate.valueAsDate = new Date();
    if (cache.invoiceStatus) cache.invoiceStatus.value = 'Draft';
    
    triggerPreview();
  });

  // 2. DUPLICATE INVOICE
  document.getElementById('actionDuplicate')?.addEventListener('click', () => {
      if(!confirm("Duplicate this invoice to a new draft?")) return;
      if(cache.receiptNumber) cache.receiptNumber.value = generateAutoNumber();
      if(cache.issueDate) cache.issueDate.valueAsDate = new Date();
      if(cache.dueDate) cache.dueDate.value = '';
      if(cache.invoiceStatus) cache.invoiceStatus.value = 'Draft';
      triggerPreview();
      alert("Invoice duplicated successfully as Draft.");
  });

  // 3. FLAWLESS PRINT EXECUTION
  document.getElementById('actionPrint')?.addEventListener('click', () => {
      executePdfPrint(cache);
  });

  // 4. MOBILE PREVIEW ZOOM CONTROLS
  let currentZoom = 1;
  const applyZoom = (zoomLevel) => {
      if (!cache.receiptPaper) return;
      cache.receiptPaper.style.transform = `scale(${zoomLevel})`;
      cache.receiptPaper.style.transformOrigin = 'top center';
  };

  document.getElementById('btnZoomIn')?.addEventListener('click', () => {
      if (currentZoom < 2) { currentZoom += 0.1; applyZoom(currentZoom); }
  });
  
  document.getElementById('btnZoomOut')?.addEventListener('click', () => {
      if (currentZoom > 0.4) { currentZoom -= 0.1; applyZoom(currentZoom); }
  });
  
  document.getElementById('btnZoomReset')?.addEventListener('click', () => {
      currentZoom = 1; applyZoom(currentZoom);
  });
  
  document.getElementById('btnZoomFit')?.addEventListener('click', () => {
      if (!cache.receiptPaper) return;
      const parentWidth = cache.receiptPaper.parentElement.clientWidth;
      const paperWidth = cache.receiptPaper.offsetWidth || 794; 
      currentZoom = (parentWidth < paperWidth) ? (parentWidth - 20) / paperWidth : 1;
      applyZoom(currentZoom);
  });

  // --- Initializers ---
  initTabSwitching(runSmartFieldValidation, triggerPreview);
  initDarkMode(); 
  initModalClosers();
  
  // Set defaults
  if(cache.receiptNumber && !cache.receiptNumber.value) cache.receiptNumber.value = generateAutoNumber();
  if(cache.issueDate && !cache.issueDate.value) cache.issueDate.valueAsDate = new Date();

  // Restore Draft if exists
  const recoveryTarget = secureStorage.getItem('rgp_autosave_draft_cache', null);
  if(recoveryTarget && Object.keys(recoveryTarget).length > 0) {
      applySnapshotToForm(recoveryTarget);
  } else {
      triggerPreview();
  }
});
