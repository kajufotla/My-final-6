export const handleImageUpload = (file, callback) => {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let ctx = canvas.getContext('2d');
      let width = img.width, height = img.height;
      if (width > 800) { height = Math.round((height * 800) / width); width = 800; }
      canvas.width = width; canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

// ========== FIXED PERFECT PDF EXPORT ==========
export const executePdfPrint = (cache) => {
  if (!cache || !cache.receiptPaper) return;
  
  // Use html2pdf for pixel-perfect standard if available
  if (typeof window.html2pdf !== 'undefined') {
    const element = cache.receiptPaper;
    const docName = document.getElementById('receiptNumber')?.value || 'Document';
    const opt = {
      margin:       0,
      filename:     `${docName}.pdf`,
      image:        { type: 'jpeg', quality: 1 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    window.html2pdf().set(opt).from(element).save();
  } else {
    // Fallback highly strict print CSS
    const printStyle = document.createElement('style');
    printStyle.id = 'pdf-runtime-print-css';
    printStyle.innerHTML = `
      @media print {
        @page { size: A4 portrait; margin: 0; }
        body * { visibility: hidden !important; }
        body { background: #fff !important; margin:0; padding:0; }
        #previewSection, #previewSection * { visibility: visible !important; }
        #previewSection { position: absolute; left: 0; top: 0; width: 100%; display: block !important; padding: 0 !important; margin: 0 !important; }
        #receiptPaper { width: 100% !important; margin: 0 !important; box-shadow: none !important; border: none !important; padding: 20px !important; }
        .no-print, header, footer, .action-bar, .editor-section { display: none !important; }
      }
    `;
    document.head.appendChild(printStyle);
    window.print();
    setTimeout(() => document.getElementById('pdf-runtime-print-css')?.remove(), 500);
  }
};

export const exportToCSV = (historyLogs) => {
  if(!historyLogs || historyLogs.length === 0) return alert("No data to export");
  const headers = ['Invoice Number', 'Issue Date', 'Client Name', 'Total Amount', 'Status'];
  const rows = historyLogs.map(h => [h.receiptNumber, h.issueDate, h.custName, h.totalVal || h.amount, h.invoiceStatus]);
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
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
  const reader = new FileReader();
  reader.onload = e => {
      try { callback(JSON.parse(e.target.result)); } 
      catch(err) { alert("Invalid JSON backup file."); }
  };
  reader.readAsText(file);
};
