// ==========================================================================
// STORAGE & EXPORT MODULE (Print, PDF, CSV, Backup/Restore)
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
      // High-quality rendering retention
      if (width > 1200) { height = Math.round((height * 1200) / width); width = 1200; }
      canvas.width = width; canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/jpeg', 0.90)); // Improved quality for enterprise PDF
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

export const executePdfPrint = (cache) => {
  if (!cache || !cache.receiptPaper) {
      // Fallback if cache structure isn't passed perfectly
      cache = { receiptPaper: document.getElementById('receiptPaper') };
  }
  if (!cache.receiptPaper) return;

  const printStyle = document.createElement('style');
  printStyle.id = 'pdf-runtime-print-css';
  printStyle.innerHTML = `
    @media print {
      @page { 
        size: A4 portrait; 
        margin: 12mm 15mm 15mm 15mm; /* Professional margins */
      }
      body { 
        background: #ffffff !important; 
        color: #000000 !important; 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
      }
      #receiptPaper { 
        box-shadow: none !important; 
        width: 100% !important; 
        max-width: 100% !important;
        margin: 0 !important; 
        padding: 0 !important; 
        border: none !important;
      }
      
      /* Stop Layout Shifting & Clipping */
      .premium-row-three, .premium-row-two, .receipt-table, .notes-terms {
        page-break-inside: avoid;
      }
      table { page-break-inside:auto }
      tr    { page-break-inside:avoid; page-break-after:auto }
      
      /* Hide all UI elements */
      .no-print, .editor-section, header, nav, footer, .action-bar, .modal-overlay, .mobile-tabs, .preview-controls, .zoom-controls { 
        display: none !important; 
      }
      .preview-section { 
        width: 100% !important; 
        padding: 0 !important; 
        overflow: visible !important;
        background: none !important;
      }
      * {
        overflow: visible !important;
      }
    }
  `;
  document.head.appendChild(printStyle);
  window.print();
  
  // Clean up runtime styles after printing dialog closes
  setTimeout(() => document.getElementById('pdf-runtime-print-css')?.remove(), 1000);
};

export const exportToCSV = (historyLogs) => {
  if(!historyLogs || historyLogs.length === 0) return alert("No data to export");
  const headers = ['Invoice Number', 'Issue Date', 'Client Name', 'Total Amount', 'Status'];
  const rows = historyLogs.map(h => [
    h.receiptNumber || 'N/A', 
    h.issueDate || 'N/A', 
    h.custName || 'N/A', 
    h.totalVal || h.amount || '0.00', 
    h.invoiceStatus || 'Draft'
  ]);
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'invoice_history_enterprise.csv'; a.click();
};

export const backupToJSON = (historyLogs) => {
  if(!historyLogs || historyLogs.length === 0) return alert("No data to backup");
  const blob = new Blob([JSON.stringify(historyLogs, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'invoice_backup_secure.json'; a.click();
};

export const restoreFromJSON = (file, callback) => {
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      callback(data);
    } catch(err) {
      alert("Security Alert: Invalid or corrupted backup file.");
    }
  };
  reader.readAsText(file);
};
