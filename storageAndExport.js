// ==========================================================================
// storageAndExport.js - PDF PRINTING, CSV EXPORT & BACKUP MANAGEMENT
// ==========================================================================

export const handleImageUpload = (file, callback) => {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let ctx = canvas.getContext('2d');
      let width = img.width, height = img.height;
      if (width > 800) { height = Math.round((height * 800) / width); width = 800; }\n      canvas.width = width; canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

// FIXED: Strict isolated container print styling so ONLY #receiptPaper prints
export const executePdfPrint = (cache) => {
  if (!cache || !cache.receiptPaper) return;
  
  // پچھلی پرنٹ کیوریز کی صفائی
  document.getElementById('pdf-runtime-print-css')?.remove();

  const printStyle = document.createElement('style');
  printStyle.id = 'pdf-runtime-print-css';
  printStyle.innerHTML = `
    @media print {
      @page { 
        size: A4 portrait; 
        margin: 0mm; 
      }
      body * {
        visibility: hidden !important;
      }
      #receiptPaper, #receiptPaper * {
        visibility: visible !important;
      }
      #receiptPaper {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 210mm !important;
        height: 297mm !important;
        margin: 0 !important;
        padding: 15mm !important;
        box-shadow: none !important;
        border: none !important;
        background: #ffffff !important;
      }
      .no-print, .editor-section, .top-nav, .mobile-tabs, .action-bar, footer, .site-footer, .modal-overlay { 
        display: none !important; 
        visibility: hidden !important;
      }
    }
  `;
  document.head.appendChild(printStyle);
  window.print();
  
  // پرنٹ کے بعد اسٹائل کو صاف کرنا تاکہ فرنٹ اینڈ خراب نہ ہو
  setTimeout(() => {
    document.getElementById('pdf-runtime-print-css')?.remove();
  }, 1000);
};

export const exportToCSV = (historyLogs) => {
  if(!historyLogs || historyLogs.length === 0) return alert("No data to export");
  const headers = ['Invoice Number', 'Issue Date', 'Client Name', 'Total Amount', 'Status'];
  const rows = historyLogs.map(h => [h.receiptNumber, h.issueDate, h.custName, h.totalVal || h.amount, h.invoiceStatus]);
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'invoice_history.csv'; a.click();
};

export const backupToJSON = (historyLogs) => {
  if(!historyLogs || historyLogs.length === 0) return alert("No data to backup");
  const blob = new Blob([JSON.stringify(historyLogs, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'invoice_backup.json'; a.click();
};

export const restoreFromJSON = (file, callback) => {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      callback(data);
    } catch (err) {
      alert("Malformed or corrupt JSON ledger payload detected.");
    }
  };
  reader.readAsText(file);
};
