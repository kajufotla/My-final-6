const translations = {
  en: { nav_home: "Home", tab_editor: "📝 Editor", tab_preview: "👁️ Preview", act_save: "💾 Save To History", doc_title: "Document Settings", item_title: "Tax, Discount & Items List" },
  ur: { nav_home: "ہوم", tab_editor: "📝 ایڈیٹر", tab_preview: "👁️ پیش نظارہ", act_save: "💾 محفوظ کریں", doc_title: "دستاویز کی ترتیبات", item_title: "ٹیکس، ڈسکاؤنٹ اور آئٹمز" },
  ar: { nav_home: "الرئيسية", tab_editor: "📝 محرر", tab_preview: "👁️ معاينة", act_save: "💾 حفظ", doc_title: "إعدادات المستند", item_title: "الضرائب والخصم والعناصر" },
  fr: { nav_home: "Accueil", tab_editor: "📝 Éditeur", tab_preview: "👁️ Aperçu", act_save: "💾 Sauvegarder", doc_title: "Paramètres du document", item_title: "Taxes, Remises & Articles" },
  de: { nav_home: "Startseite", tab_editor: "📝 Editor", tab_preview: "👁️ Vorschau", act_save: "💾 Speichern", doc_title: "Dokumenteinstellungen", item_title: "Steuern, Rabatt & Artikel" },
  es: { nav_home: "Inicio", tab_editor: "📝 Editor", tab_preview: "👁️ Vista Previa", act_save: "💾 Guardar", doc_title: "Configuración del documento", item_title: "Impuestos, Descuentos y Artículos" },
  hi: { nav_home: "होम", tab_editor: "📝 संपादक", tab_preview: "👁️ पूर्वावलोकन", act_save: "💾 सहेजें", doc_title: "दस्तावेज़ सेटिंग्स", item_title: "टैक्स, छूट और आइटम" }
};

export function setLanguage(lang) {
  localStorage.setItem('rgp_lang', lang);
  const isRtl = ['ur', 'ar'].includes(lang);
  document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', lang);

  const dict = translations[lang] || translations['en']; 
  document.querySelectorAll('[data-i18n]').forEach(el => { 
    const key = el.getAttribute('data-i18n'); 
    if(dict[key]) { 
      if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = dict[key]; 
      else el.innerHTML = el.innerHTML.replace(/^[^<]+/, dict[key] + ' '); 
    } 
  }); 
}
