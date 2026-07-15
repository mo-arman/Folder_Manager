import React, { useState, useEffect } from 'react';
import { Trash2, Plus, FileImage, Download, Search, Camera, Image as ImageIcon, X, Globe, Gift, BookOpen, Receipt, AlertTriangle, RotateCcw, TrendingUp, TrendingDown, Minus } from 'lucide-react';

/* ============================================================
   SAB KUCH EK HI FILE MEIN — Bills / Ledger / Gifts
   Har section ka apna alag data + apna alag function hai,
   lekin app ek hi hai (koi separate imported tab file nahi).

   STORAGE FIX (IMPORTANT):
   - Pehle localStorage use ho raha tha jiski limit sirf ~5-10MB
     hoti hai — isliye 8-10 photo wali bills ke baad hi "storage
     full" aa jaata tha.
   - Ab IndexedDB use ho raha hai, jismein device ke disk space
     ke hisaab se sainkdon MB se GB tak data store ho sakta hai.
     Ab jitna chaho utna bhar sakte ho.
   - Har entry (bill/ledger/gift) individually IndexedDB mein
     save/delete hoti hai — poora data baar-baar rewrite nahi
     hota, isliye fast aur safe bhi hai.

   PHOTO FIX (pehle se):
   - Photo hamesha compress karke base64 (data:image/...) string
     ke roop mein store hoti hai — blob/object URL kabhi use
     nahi hota, isliye refresh ke baad bhi photo waisi hi rehti
     hai aur click bhi hamesha kaam karta hai.
   ============================================================ */

/* ============================================================
   INDEXEDDB HELPER LAYER — poora storage isi se hota hai
   ============================================================ */
const DB_NAME = 'BillManagerDB';
const DB_VERSION = 1;
const STORE_NAMES = ['bills', 'ledger', 'gifts', 'gr'];

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported in this browser'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      STORE_NAMES.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      });
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

async function dbGetAll(storeName) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function dbPut(storeName, record) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(record);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

async function dbDelete(storeName, id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

/* ============================================================
   ONE-TIME MIGRATION: purana localStorage data -> IndexedDB
   Yeh sirf ek baar chalta hai (flag se track hota hai), taaki
   dobara khulne par purana data dobara import na ho.
   ============================================================ */
async function migrateOldLocalStorageData() {
  const MIGRATION_FLAG = 'billManager_migrated_v1';
  if (localStorage.getItem(MIGRATION_FLAG)) return; // already done

  try {
    // Purani "bills" structure date ke hisaab se group thi: { date: [ {id, name, photo, uploadedAt} ] }
    const oldBillsRaw = localStorage.getItem('billManager_bills');
    if (oldBillsRaw) {
      const oldBills = JSON.parse(oldBillsRaw);
      for (const [date, arr] of Object.entries(oldBills || {})) {
        for (const b of (arr || [])) {
          await dbPut('bills', {
            id: b.id ?? (Date.now() + Math.random()),
            name: b.name || 'Bill',
            photo: b.photo,
            date,
            uploadedAt: b.uploadedAt || new Date().toLocaleString(),
          });
        }
      }
    }

    // Ledger aur Gifts pehle se flat array the
    const oldLedgerRaw = localStorage.getItem('billManager_ledger');
    if (oldLedgerRaw) {
      const oldLedger = JSON.parse(oldLedgerRaw);
      for (const entry of (oldLedger || [])) {
        await dbPut('ledger', entry);
      }
    }

    const oldGiftsRaw = localStorage.getItem('billManager_gifts');
    if (oldGiftsRaw) {
      const oldGifts = JSON.parse(oldGiftsRaw);
      for (const entry of (oldGifts || [])) {
        await dbPut('gifts', entry);
      }
    }

    localStorage.setItem(MIGRATION_FLAG, 'true');
  } catch (err) {
    console.error('Migration from localStorage failed', err);
    // Flag jaan-boojh kar set nahi kiya — agli baar phir try hoga
  }
}

/* ---------- storage usage helper (kitna use hua, kitna available hai) ---------- */
async function getStorageEstimate() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const { usage, quota } = await navigator.storage.estimate();
      return { usageMB: usage / (1024 * 1024), quotaMB: quota / (1024 * 1024) };
    }
  } catch (err) {
    console.error('Storage estimate failed', err);
  }
  return null;
}

/* ---------- translations ---------- */
const translations = {
  hi: {
    appName: '📋 Bill Manager Pro',
    subtitle: 'बिल, हिसाब-किताब और गिफ्ट — सब एक जगह',
    langBtn: 'EN',
    tabBills: '🧾 Bills',
    tabLedger: '📒 Ledger (खाता)',
    tabGifts: '🎁 Gifts',
    tabGR: '↩️ GR (वापसी)',
    productLabel: '📦 प्रोडक्ट नाम:',
    productPh: 'जैसे: Parle-G 5rs पैकेट',
    quantityLabel: '🔢 मात्रा (Qty):',
    quantityPh: 'जैसे: 10',
    reasonLabel: '❓ वापसी का कारण (वैकल्पिक):',
    reasonPh: 'जैसे: Expired, Damaged, Wrong item...',
    grBillName: '📝 GR Bill नाम',
    grBillNamePh: 'जैसे: कंपनी GR स्लिप',
    emptyGR: 'अभी कोई GR एंट्री नहीं है',
    grTodayTotal: 'आज के कुल GR बिल',
    grTodayAmount: 'आज की कुल GR राशि',
    grDateWiseTitle: '📊 तारीख अनुसार GR बिल गिनती',
    grDateCol: 'तारीख',
    grCountCol: 'कुल बिल',
    grAmountCol: 'कुल राशि (₹)',
    grDiffCol: 'पिछले दिन से बदलाव',
    grNoChange: 'कोई बदलाव नहीं',
    dateLabel: '📅 तारीख:',
    personLabel: '👤 नाम:',
    personPh: 'जैसे: रमेश, सीता...',
    amountLabel: '💰 राशि (₹):',
    amountPh: 'जैसे: 500',
    noteLabel: '📝 नोट (वैकल्पिक):',
    notePh: 'कोई नोट लिखें...',
    occasionLabel: '🎉 मौका (वैकल्पिक):',
    occasionPh: 'जैसे: शादी, जन्मदिन...',
    typeReceived: '✅ लिया',
    typeGiven: '📤 दिया (उधार)',
    addBtn: '➕ Entry जोड़ें',
    saving: 'Save हो रहा है...',
    galleryBtn: 'Gallery से चुनें',
    cameraBtn: 'फोटो लें',
    uploading: 'Photo process हो रही है...',
    removePhotoBtn: 'Photo हटाएं',
    noPhoto: 'फोटो नहीं है',
    deleteBtn: 'Delete',
    searchPh: 'नाम से खोजें...',
    allDates: '📋 सभी तारीखें',
    sortNewest: '✨ नई पहले',
    sortOldest: '🕐 पुरानी पहले',
    emptyBills: 'अभी कोई बिल नहीं है',
    emptyLedger: 'अभी कोई एंट्री नहीं है',
    emptyGifts: 'अभी कोई गिफ्ट एंट्री नहीं है',
    missingInfo: '⚠️ कृपया नाम और राशि दोनों भरें',
    missingProduct: '⚠️ कृपया प्रोडक्ट का नाम भरें',
    confirmDelete: 'क्या आप इसे हटाना चाहते हैं?',
    photoDownloadBtn: 'Download करें',
    storageWarnTitle: '⚠️ Entry सुरक्षित नहीं हो पाई',
    storageWarnBody: 'लगता है device की disk space बहुत कम बची है। कृपया device की storage खाली करें और फिर try करें।',
    balanceGiven: 'कुल दिया',
    balanceReceived: 'कुल लिया',
    netBalance: 'बकाया (Net)',
    dateLocale: 'hi-IN',
    footer: 'आपका सारा डेटा इसी डिवाइस में सुरक्षित रहता है 🔒 (IndexedDB — जितना चाहें उतना डेटा)',
    loadError: '⚠️ डेटा लोड करने में समस्या आई। कृपया page reload करें।',
    storageUsed: 'Storage उपयोग',
    storageOf: 'में से',
    storageAvailable: 'उपलब्ध — रोज़ाना डेटा डिलीट करने की ज़रूरत नहीं',
  },
  en: {
    appName: '📋 Bill Manager Pro',
    subtitle: 'Bills, Ledger and Gifts — all in one place',
    langBtn: 'HI',
    tabBills: '🧾 Bills',
    tabLedger: '📒 Ledger',
    tabGifts: '🎁 Gifts',
    tabGR: '↩️ GR (Return)',
    productLabel: '📦 Product Name:',
    productPh: 'e.g. Parle-G 5rs pack',
    quantityLabel: '🔢 Quantity:',
    quantityPh: 'e.g. 10',
    reasonLabel: '❓ Return Reason (optional):',
    reasonPh: 'e.g. Expired, Damaged, Wrong item...',
    grBillName: '📝 GR Bill Name',
    grBillNamePh: 'e.g. Company GR Slip',
    emptyGR: 'No GR entries yet',
    grTodayTotal: 'Total GR bills today',
    grTodayAmount: 'Total GR amount today',
    grDateWiseTitle: '📊 Date-wise GR bill count',
    grDateCol: 'Date',
    grCountCol: 'Total Bills',
    grAmountCol: 'Total Amount (₹)',
    grDiffCol: 'Change vs previous day',
    grNoChange: 'No change',
    dateLabel: '📅 Date:',
    personLabel: '👤 Name:',
    personPh: 'e.g. Ramesh, Sita...',
    amountLabel: '💰 Amount (₹):',
    amountPh: 'e.g. 500',
    noteLabel: '📝 Note (optional):',
    notePh: 'Add a note...',
    occasionLabel: '🎉 Occasion (optional):',
    occasionPh: 'e.g. Wedding, Birthday...',
    typeReceived: '✅ Received',
    typeGiven: '📤 Given (Credit)',
    addBtn: '➕ Add Entry',
    saving: 'Saving...',
    galleryBtn: 'Choose from Gallery',
    cameraBtn: 'Take Photo',
    uploading: 'Processing photo...',
    removePhotoBtn: 'Remove Photo',
    noPhoto: 'No photo',
    deleteBtn: 'Delete',
    searchPh: 'Search by name...',
    allDates: '📋 All Dates',
    sortNewest: '✨ Newest First',
    sortOldest: '🕐 Oldest First',
    emptyBills: 'No bills yet',
    emptyLedger: 'No entries yet',
    emptyGifts: 'No gift entries yet',
    missingInfo: '⚠️ Please fill in both name and amount',
    missingProduct: '⚠️ Please fill in the product name',
    confirmDelete: 'Are you sure you want to delete this?',
    photoDownloadBtn: 'Download',
    storageWarnTitle: '⚠️ Entry could not be saved',
    storageWarnBody: 'It looks like the device is nearly out of disk space. Please free up some storage on the device and try again.',
    balanceGiven: 'Total Given',
    balanceReceived: 'Total Received',
    netBalance: 'Net Balance',
    dateLocale: 'en-IN',
    footer: 'All your data stays safely on this device 🔒 (IndexedDB — store as much as you need)',
    loadError: '⚠️ There was a problem loading your data. Please reload the page.',
    storageUsed: 'Storage used',
    storageOf: 'of',
    storageAvailable: 'available — no need to delete data daily',
  }
};

/* ---------- shared styles ---------- */
const S = {
  page: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh', padding: '20px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", color: '#333' },
  container: { maxWidth: '1100px', margin: '0 auto' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', color: 'white', flexWrap: 'wrap', gap: '10px' },
  langBtn: { background: 'rgba(255,255,255,0.2)', border: '2px solid white', color: 'white', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' },
  tabRow: { display: 'flex', gap: '10px', marginBottom: '25px', flexWrap: 'wrap' },
  tabBtn: (active) => ({ background: active ? 'white' : 'rgba(255,255,255,0.15)', color: active ? '#667eea' : 'white', border: active ? 'none' : '2px solid white', padding: '12px 22px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1em' }),
  card: { background: 'white', borderRadius: '12px', padding: '25px', marginBottom: '25px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' },
  input: { width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #ddd', fontSize: '1em', boxSizing: 'border-box' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '20px' },
  photoBtnRow: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' },
  photoBtn: { background: '#667eea', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9em' },
  thumbWrap: { position: 'relative', width: '90px', height: '90px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #667eea', marginTop: '10px' },
  removeThumbBtn: { position: 'absolute', top: '2px', right: '2px', background: 'rgba(220,50,50,0.9)', border: 'none', color: 'white', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  addBtn: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', padding: '14px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.05em', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  entryCard: { background: '#f7f7fb', borderRadius: '12px', padding: '16px', marginBottom: '14px', display: 'flex', gap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' },
  entryPhoto: { width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover', cursor: 'pointer', flexShrink: 0 },
  entryNoPhoto: { width: '80px', height: '80px', borderRadius: '10px', background: '#e6e6f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '0.75em', textAlign: 'center', flexShrink: 0 },
  deleteBtn: { background: '#ff6b6b', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: '4px' },
  emptyState: { textAlign: 'center', padding: '50px 20px', color: '#666' },
  warnBanner: { background: '#fff3cd', border: '2px solid #ffc107', color: '#7a5600', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start' },
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' },
  statBox: { background: '#f0f0fb', borderRadius: '10px', padding: '14px', textAlign: 'center' },
  tableWrap: { overflowX: 'auto', marginBottom: '10px', borderRadius: '10px', border: '1px solid #eee' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' },
  th: { textAlign: 'left', padding: '10px 12px', background: '#f0f0fb', color: '#444', fontWeight: 'bold', whiteSpace: 'nowrap' },
  td: { padding: '10px 12px', borderTop: '1px solid #eee', whiteSpace: 'nowrap' },
  diffUp: { color: '#2ecc71', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' },
  diffDown: { color: '#ff6b6b', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' },
  diffSame: { color: '#999', display: 'inline-flex', alignItems: 'center', gap: '4px' },
};

/* ---------- image compress helper: File -> compressed base64 dataURL ---------- */
function compressImage(file, maxWidth = 1000, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        try {
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const todayStr = () => new Date().toISOString().split('T')[0];

/* ============================================================
   Reusable photo picker
   ============================================================ */
function PhotoPicker({ t, photo, onChange, uploading, idSuffix }) {
  return (
    <div>
      <label style={S.label}>📷 {t.galleryBtn} / {t.cameraBtn}</label>
      <div style={S.photoBtnRow}>
        <input
          type="file"
          accept="image/*"
          id={`gallery-${idSuffix}`}
          style={{ display: 'none' }}
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
        <label htmlFor={`gallery-${idSuffix}`} style={S.photoBtn}>
          <ImageIcon size={16} /> {t.galleryBtn}
        </label>

        <input
          type="file"
          accept="image/*"
          capture="environment"
          id={`camera-${idSuffix}`}
          style={{ display: 'none' }}
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
        <label htmlFor={`camera-${idSuffix}`} style={S.photoBtn}>
          <Camera size={16} /> {t.cameraBtn}
        </label>
      </div>

      {uploading && <p style={{ color: '#667eea', fontSize: '0.85em', marginTop: '8px' }}>{t.uploading}</p>}

      {photo && !uploading && (
        <div style={S.thumbWrap}>
          <img src={photo} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <button type="button" style={S.removeThumbBtn} onClick={() => onChange(null)}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Shared full-screen photo view modal
   ============================================================ */
function PhotoModal({ image, onClose, t }) {
  if (!image) return null;
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px', boxSizing: 'border-box' }}
    >
      <button
        onClick={onClose}
        style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.15)', border: '2px solid white', color: 'white', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
      >
        <X size={24} />
      </button>
      <img
        src={image.data}
        alt={image.title || ''}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '95%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
      />
      <div style={{ color: 'white', textAlign: 'center', marginTop: '15px' }}>
        {image.title && <p style={{ margin: '0 0 5px 0', fontSize: '1.1em', fontWeight: 'bold' }}>{image.title}</p>}
        {image.subtitle && <p style={{ margin: '0', fontSize: '0.85em', opacity: 0.8 }}>{image.subtitle}</p>}
        <a
          href={image.data}
          download={(image.title || 'photo') + '.jpg'}
          onClick={(e) => e.stopPropagation()}
          style={{ display: 'inline-flex', alignItems: 'center', marginTop: '15px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9em' }}
        >
          <Download size={16} style={{ marginRight: '6px' }} />
          {t.photoDownloadBtn}
        </a>
      </div>
    </div>
  );
}

/* ============================================================
   STORAGE INDICATOR — shows kitna space use hua, kitna bacha
   (isse aap khud dekh sakte ho ki storage kabhi khatam hone
   wali nahi, roz data delete karne ki zaroorat nahi)
   ============================================================ */
function StorageIndicator({ t }) {
  const [estimate, setEstimate] = useState(null);

  useEffect(() => {
    (async () => {
      const est = await getStorageEstimate();
      if (est) setEstimate(est);
    })();
  }, []);

  if (!estimate) return null;

  const usedMB = estimate.usageMB.toFixed(1);
  const quotaMB = estimate.quotaMB >= 1024
    ? (estimate.quotaMB / 1024).toFixed(1) + ' GB'
    : estimate.quotaMB.toFixed(0) + ' MB';
  const pct = estimate.quotaMB > 0 ? Math.min(100, (estimate.usageMB / estimate.quotaMB) * 100) : 0;

  return (
    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '10px 14px', marginBottom: '20px', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
        <span>{t.storageUsed}: {usedMB} MB {t.storageOf} {quotaMB}</span>
        <span>{t.storageAvailable}</span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '6px', height: '6px', overflow: 'hidden' }}>
        <div style={{ background: 'white', height: '100%', width: `${pct}%`, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

/* ============================================================
   MAIN APP
   ============================================================ */
export default function BillManager() {
  const [lang, setLang] = useState('hi');
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState('bills');
  const [viewImage, setViewImage] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [bills, setBills] = useState([]);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [giftEntries, setGiftEntries] = useState([]);
  const [grEntries, setGrEntries] = useState([]);

  /* ---- load once on mount, from IndexedDB (large storage capacity) ---- */
  useEffect(() => {
    (async () => {
      try {
        await migrateOldLocalStorageData();
        const [b, l, g, gr] = await Promise.all([
          dbGetAll('bills'),
          dbGetAll('ledger'),
          dbGetAll('gifts'),
          dbGetAll('gr'),
        ]);
        setBills(b);
        setLedgerEntries(l);
        setGiftEntries(g);
        setGrEntries(gr);
      } catch (err) {
        console.error('Failed to load data from IndexedDB', err);
        setLoadError(true);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  return (
    <div style={S.page}>
      <div style={S.container}>
        <div style={S.headerRow}>
          <div>
            <h1 style={{ margin: '0 0 5px 0', fontSize: '2em' }}>{t.appName}</h1>
            <p style={{ margin: 0, opacity: 0.9 }}>{t.subtitle}</p>
          </div>
          <button style={S.langBtn} onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')}>
            <Globe size={18} /> {t.langBtn}
          </button>
        </div>

        {loadError && (
          <div style={S.warnBanner}>
            <AlertTriangle size={22} />
            <div>{t.loadError}</div>
          </div>
        )}

        {loaded && <StorageIndicator t={t} />}

        <div style={S.tabRow}>
          <button style={S.tabBtn(activeTab === 'bills')} onClick={() => setActiveTab('bills')}>
            <Receipt size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{t.tabBills}
          </button>
          <button style={S.tabBtn(activeTab === 'ledger')} onClick={() => setActiveTab('ledger')}>
            <BookOpen size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{t.tabLedger}
          </button>
          <button style={S.tabBtn(activeTab === 'gifts')} onClick={() => setActiveTab('gifts')}>
            <Gift size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{t.tabGifts}
          </button>
          <button style={S.tabBtn(activeTab === 'gr')} onClick={() => setActiveTab('gr')}>
            <RotateCcw size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{t.tabGR}
          </button>
        </div>

        {!loaded ? (
          <div style={{ ...S.card, textAlign: 'center' }}>...</div>
        ) : (
          <>
            {activeTab === 'bills' && (
              <BillsSection t={t} bills={bills} setBills={setBills} setViewImage={setViewImage} />
            )}
            {activeTab === 'ledger' && (
              <LedgerSection t={t} entries={ledgerEntries} setEntries={setLedgerEntries} setViewImage={setViewImage} />
            )}
            {activeTab === 'gifts' && (
              <GiftsSection t={t} entries={giftEntries} setEntries={setGiftEntries} setViewImage={setViewImage} />
            )}
            {activeTab === 'gr' && (
              <GRSection t={t} entries={grEntries} setEntries={setGrEntries} setViewImage={setViewImage} />
            )}
          </>
        )}

        <PhotoModal image={viewImage} onClose={() => setViewImage(null)} t={t} />

        <div style={{ textAlign: 'center', color: 'white', marginTop: '30px', padding: '15px', opacity: 0.9, fontSize: '0.9em' }}>
          {t.footer}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   BILLS SECTION — apna alag function, IndexedDB 'bills' store
   ============================================================ */
function BillsSection({ t, bills, setBills, setViewImage }) {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [billName, setBillName] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const handlePhotoChange = async (file) => {
    if (!file) { setPendingPhoto(null); return; }
    setUploading(true);
    try {
      const dataUrl = await compressImage(file);
      setPendingPhoto(dataUrl);
    } catch (err) {
      console.error('Photo process error', err);
    } finally {
      setUploading(false);
    }
  };

  const addBill = async () => {
    if (!pendingPhoto) return;
    const entry = {
      id: Date.now() + Math.random(),
      name: billName || 'Bill',
      photo: pendingPhoto,
      date: selectedDate,
      uploadedAt: new Date().toLocaleString(t.dateLocale),
    };
    setSaving(true);
    setSaveError(false);
    try {
      await dbPut('bills', entry);
      setBills(prev => [...prev, entry]);
      setBillName('');
      setPendingPhoto(null);
    } catch (err) {
      console.error('Failed to save bill', err);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const deleteBill = async (id) => {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      await dbDelete('bills', id);
      setBills(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('Failed to delete bill', err);
    }
  };

  const uniqueDates = [...new Set(bills.map(b => b.date))].sort().reverse();

  const getFiltered = () => {
    let list = filterDate === 'all' ? [...bills] : bills.filter(b => b.date === filterDate);
    if (searchTerm) {
      list = list.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    list.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.uploadedAt) - new Date(a.uploadedAt);
      if (sortBy === 'oldest') return new Date(a.uploadedAt) - new Date(b.uploadedAt);
      return 0;
    });
    return list;
  };

  const filtered = getFiltered();

  return (
    <div style={S.card}>
      {saveError && (
        <div style={S.warnBanner}>
          <AlertTriangle size={22} />
          <div>
            <strong>{t.storageWarnTitle}</strong>
            <p style={{ margin: '4px 0 0 0' }}>{t.storageWarnBody}</p>
          </div>
        </div>
      )}

      <div style={S.grid2}>
        <div>
          <label style={S.label}>{t.dateLabel}</label>
          <input type="date" style={S.input} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>
        <div>
          <label style={S.label}>📝 Bill Name</label>
          <input style={S.input} value={billName} onChange={(e) => setBillName(e.target.value)} placeholder="e.g. Electricity bill" />
        </div>
      </div>

      <PhotoPicker t={t} photo={pendingPhoto} onChange={handlePhotoChange} uploading={uploading} idSuffix="bills" />

      <button style={{ ...S.addBtn, marginTop: '16px' }} onClick={addBill} disabled={!pendingPhoto || uploading || saving}>
        <Plus size={18} /> {saving ? t.saving : t.addBtn}
      </button>

      <hr style={{ margin: '25px 0', border: 'none', borderTop: '1px solid #eee' }} />

      <div style={S.grid2}>
        <div>
          <label style={S.label}><Search size={14} style={{ verticalAlign: 'middle' }} /> {t.searchPh}</label>
          <input style={S.input} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t.searchPh} />
        </div>
        <div>
          <label style={S.label}>{t.allDates}</label>
          <select style={S.input} value={filterDate} onChange={(e) => setFilterDate(e.target.value)}>
            <option value="all">{t.allDates}</option>
            {uniqueDates.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label}>Sort</label>
          <select style={S.input} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">{t.sortNewest}</option>
            <option value="oldest">{t.sortOldest}</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={S.emptyState}>
          <FileImage size={56} color="#ccc" />
          <p>{t.emptyBills}</p>
        </div>
      ) : (
        filtered.map(b => (
          <div key={b.id} style={S.entryCard}>
            <img
              src={b.photo}
              alt={b.name}
              style={S.entryPhoto}
              onClick={() => setViewImage({ data: b.photo, title: b.name, subtitle: `📅 ${b.date} · ⏰ ${b.uploadedAt}` })}
            />
            <div style={{ flex: 1, minWidth: '150px' }}>
              <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{b.name}</p>
              <p style={{ margin: 0, fontSize: '0.85em', color: '#666' }}>📅 {b.date} · ⏰ {b.uploadedAt}</p>
            </div>
            <button style={S.deleteBtn} onClick={() => deleteBill(b.id)}>
              <Trash2 size={14} /> {t.deleteBtn}
            </button>
          </div>
        ))
      )}
    </div>
  );
}

/* ============================================================
   LEDGER SECTION — apna alag function, IndexedDB 'ledger' store
   ============================================================ */
function LedgerSection({ t, entries, setEntries, setViewImage }) {
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState('received');
  const [note, setNote] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handlePhotoChange = async (file) => {
    if (!file) { setPendingPhoto(null); return; }
    setUploading(true);
    try {
      const dataUrl = await compressImage(file);
      setPendingPhoto(dataUrl);
    } catch (err) {
      console.error('Photo process error', err);
    } finally {
      setUploading(false);
    }
  };

  const addEntry = async () => {
    if (!personName.trim() || !amount) {
      alert(t.missingInfo);
      return;
    }
    const entry = {
      id: Date.now() + Math.random(),
      personName: personName.trim(),
      amount: parseFloat(amount) || 0,
      transactionType,
      note: note.trim(),
      photo: pendingPhoto,
      date: todayStr(),
      createdAt: new Date().toLocaleString(t.dateLocale),
    };
    setSaving(true);
    setSaveError(false);
    try {
      await dbPut('ledger', entry);
      setEntries(prev => [entry, ...prev]);
      setPersonName('');
      setAmount('');
      setNote('');
      setPendingPhoto(null);
      setTransactionType('received');
    } catch (err) {
      console.error('Failed to save ledger entry', err);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (id) => {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      await dbDelete('ledger', id);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Failed to delete ledger entry', err);
    }
  };

  const filtered = entries.filter(e => e.personName.toLowerCase().includes(searchTerm.toLowerCase()));

  const totalGiven = entries.filter(e => e.transactionType === 'given').reduce((s, e) => s + e.amount, 0);
  const totalReceived = entries.filter(e => e.transactionType === 'received').reduce((s, e) => s + e.amount, 0);
  const net = totalReceived - totalGiven;

  return (
    <div style={S.card}>
      {saveError && (
        <div style={S.warnBanner}>
          <AlertTriangle size={22} />
          <div>
            <strong>{t.storageWarnTitle}</strong>
            <p style={{ margin: '4px 0 0 0' }}>{t.storageWarnBody}</p>
          </div>
        </div>
      )}

      <div style={S.grid2}>
        <div>
          <label style={S.label}>{t.personLabel}</label>
          <input style={S.input} value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder={t.personPh} />
        </div>
        <div>
          <label style={S.label}>{t.amountLabel}</label>
          <input type="number" style={S.input} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t.amountPh} />
        </div>
      </div>

      <div style={S.grid2}>
        <div>
          <label style={S.label}>Type</label>
          <select style={S.input} value={transactionType} onChange={(e) => setTransactionType(e.target.value)}>
            <option value="received">{t.typeReceived}</option>
            <option value="given">{t.typeGiven}</option>
          </select>
        </div>
        <div>
          <label style={S.label}>{t.noteLabel}</label>
          <input style={S.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.notePh} />
        </div>
      </div>

      <PhotoPicker t={t} photo={pendingPhoto} onChange={handlePhotoChange} uploading={uploading} idSuffix="ledger" />

      <button style={{ ...S.addBtn, marginTop: '16px' }} onClick={addEntry} disabled={uploading || saving}>
        <Plus size={18} /> {saving ? t.saving : t.addBtn}
      </button>

      <hr style={{ margin: '25px 0', border: 'none', borderTop: '1px solid #eee' }} />

      <div style={S.statRow}>
        <div style={S.statBox}><p style={{ margin: 0, fontSize: '0.85em', color: '#666' }}>{t.balanceReceived}</p><p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2em', color: '#2ecc71' }}>₹{totalReceived.toFixed(2)}</p></div>
        <div style={S.statBox}><p style={{ margin: 0, fontSize: '0.85em', color: '#666' }}>{t.balanceGiven}</p><p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2em', color: '#ff6b6b' }}>₹{totalGiven.toFixed(2)}</p></div>
        <div style={S.statBox}><p style={{ margin: 0, fontSize: '0.85em', color: '#666' }}>{t.netBalance}</p><p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2em', color: net >= 0 ? '#2ecc71' : '#ff6b6b' }}>₹{net.toFixed(2)}</p></div>
      </div>

      <label style={S.label}><Search size={14} style={{ verticalAlign: 'middle' }} /> {t.searchPh}</label>
      <input style={{ ...S.input, marginBottom: '20px' }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t.searchPh} />

      {filtered.length === 0 ? (
        <div style={S.emptyState}>
          <BookOpen size={56} color="#ccc" />
          <p>{t.emptyLedger}</p>
        </div>
      ) : (
        filtered.map(en => (
          <div key={en.id} style={S.entryCard}>
            {en.photo ? (
              <img
                src={en.photo}
                alt={en.personName}
                style={S.entryPhoto}
                onClick={() => setViewImage({ data: en.photo, title: en.personName, subtitle: `📅 ${en.date} · ⏰ ${en.createdAt}` })}
              />
            ) : (
              <div style={S.entryNoPhoto}>{t.noPhoto}</div>
            )}
            <div style={{ flex: 1, minWidth: '150px' }}>
              <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>
                {en.personName} — <span style={{ color: en.transactionType === 'given' ? '#ff6b6b' : '#2ecc71' }}>₹{en.amount.toFixed(2)}</span>
              </p>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.85em', color: '#666' }}>
                {en.transactionType === 'given' ? t.typeGiven : t.typeReceived} · 📅 {en.date}
              </p>
              {en.note && <p style={{ margin: 0, fontSize: '0.85em', color: '#888' }}>{en.note}</p>}
            </div>
            <button style={S.deleteBtn} onClick={() => deleteEntry(en.id)}>
              <Trash2 size={14} /> {t.deleteBtn}
            </button>
          </div>
        ))
      )}
    </div>
  );
}

/* ============================================================
   GIFTS SECTION — apna alag function, IndexedDB 'gifts' store
   ============================================================ */
function GiftsSection({ t, entries, setEntries, setViewImage }) {
  const [personName, setPersonName] = useState('');
  const [occasion, setOccasion] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handlePhotoChange = async (file) => {
    if (!file) { setPendingPhoto(null); return; }
    setUploading(true);
    try {
      const dataUrl = await compressImage(file);
      setPendingPhoto(dataUrl);
    } catch (err) {
      console.error('Photo process error', err);
    } finally {
      setUploading(false);
    }
  };

  const addEntry = async () => {
    if (!personName.trim()) {
      alert(t.missingInfo);
      return;
    }
    const entry = {
      id: Date.now() + Math.random(),
      personName: personName.trim(),
      occasion: occasion.trim(),
      amount: amount ? parseFloat(amount) : null,
      note: note.trim(),
      photo: pendingPhoto,
      date: todayStr(),
      createdAt: new Date().toLocaleString(t.dateLocale),
    };
    setSaving(true);
    setSaveError(false);
    try {
      await dbPut('gifts', entry);
      setEntries(prev => [entry, ...prev]);
      setPersonName('');
      setOccasion('');
      setAmount('');
      setNote('');
      setPendingPhoto(null);
    } catch (err) {
      console.error('Failed to save gift entry', err);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (id) => {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      await dbDelete('gifts', id);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Failed to delete gift entry', err);
    }
  };

  const filtered = entries.filter(e =>
    e.personName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.occasion || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={S.card}>
      {saveError && (
        <div style={S.warnBanner}>
          <AlertTriangle size={22} />
          <div>
            <strong>{t.storageWarnTitle}</strong>
            <p style={{ margin: '4px 0 0 0' }}>{t.storageWarnBody}</p>
          </div>
        </div>
      )}

      <div style={S.grid2}>
        <div>
          <label style={S.label}>{t.personLabel}</label>
          <input style={S.input} value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder={t.personPh} />
        </div>
        <div>
          <label style={S.label}>{t.occasionLabel}</label>
          <input style={S.input} value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder={t.occasionPh} />
        </div>
      </div>

      <div style={S.grid2}>
        <div>
          <label style={S.label}>{t.amountLabel}</label>
          <input type="number" style={S.input} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t.amountPh} />
        </div>
        <div>
          <label style={S.label}>{t.noteLabel}</label>
          <input style={S.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.notePh} />
        </div>
      </div>

      <PhotoPicker t={t} photo={pendingPhoto} onChange={handlePhotoChange} uploading={uploading} idSuffix="gifts" />

      <button style={{ ...S.addBtn, marginTop: '16px' }} onClick={addEntry} disabled={uploading || saving}>
        <Plus size={18} /> {saving ? t.saving : t.addBtn}
      </button>

      <hr style={{ margin: '25px 0', border: 'none', borderTop: '1px solid #eee' }} />

      <label style={S.label}><Search size={14} style={{ verticalAlign: 'middle' }} /> {t.searchPh}</label>
      <input style={{ ...S.input, marginBottom: '20px' }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t.searchPh} />

      {filtered.length === 0 ? (
        <div style={S.emptyState}>
          <Gift size={56} color="#ccc" />
          <p>{t.emptyGifts}</p>
        </div>
      ) : (
        filtered.map(en => (
          <div key={en.id} style={S.entryCard}>
            {en.photo ? (
              <img
                src={en.photo}
                alt={en.personName}
                style={S.entryPhoto}
                onClick={() => setViewImage({ data: en.photo, title: en.personName, subtitle: `${en.occasion ? en.occasion + ' · ' : ''}📅 ${en.date}` })}
              />
            ) : (
              <div style={S.entryNoPhoto}>{t.noPhoto}</div>
            )}
            <div style={{ flex: 1, minWidth: '150px' }}>
              <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>
                {en.personName}{en.amount != null && <span style={{ color: '#667eea' }}> — ₹{en.amount.toFixed(2)}</span>}
              </p>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.85em', color: '#666' }}>
                {en.occasion && `${en.occasion} · `}📅 {en.date}
              </p>
              {en.note && <p style={{ margin: 0, fontSize: '0.85em', color: '#888' }}>{en.note}</p>}
            </div>
            <button style={S.deleteBtn} onClick={() => deleteEntry(en.id)}>
              <Trash2 size={14} /> {t.deleteBtn}
            </button>
          </div>
        ))
      )}
    </div>
  );
}

/* ============================================================
   GR SECTION — Goods Return (product wapasi), apna alag
   function, IndexedDB 'gr' store.
   - Product name, quantity, amount, reason, photo, date store hote hain.
   - Aaj ke total GR bills + total GR amount dikhta hai.
   - Tarikh-wise table: har din kitne GR bills hue, aur pichle
     din ke mukable badhe/ghate (up/down) — isse trend turant
     pata chal jaata hai (jaise agle din ke bills badhe ya ghate).
   ============================================================ */
function GRSection({ t, entries, setEntries, setViewImage }) {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [billName, setBillName] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const handlePhotoChange = async (file) => {
    if (!file) { setPendingPhoto(null); return; }
    setUploading(true);
    try {
      const dataUrl = await compressImage(file);
      setPendingPhoto(dataUrl);
    } catch (err) {
      console.error('Photo process error', err);
    } finally {
      setUploading(false);
    }
  };

  const addEntry = async () => {
    if (!productName.trim()) {
      alert(t.missingProduct);
      return;
    }
    const entry = {
      id: Date.now() + Math.random(),
      name: billName.trim() || productName.trim(),
      productName: productName.trim(),
      quantity: quantity ? parseFloat(quantity) : null,
      amount: amount ? parseFloat(amount) : 0,
      reason: reason.trim(),
      photo: pendingPhoto,
      date: selectedDate,
      createdAt: new Date().toLocaleString(t.dateLocale),
    };
    setSaving(true);
    setSaveError(false);
    try {
      await dbPut('gr', entry);
      setEntries(prev => [entry, ...prev]);
      setProductName('');
      setQuantity('');
      setAmount('');
      setReason('');
      setBillName('');
      setPendingPhoto(null);
    } catch (err) {
      console.error('Failed to save GR entry', err);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (id) => {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      await dbDelete('gr', id);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Failed to delete GR entry', err);
    }
  };

  const uniqueDates = [...new Set(entries.map(e => e.date))].sort().reverse();

  const getFiltered = () => {
    let list = filterDate === 'all' ? [...entries] : entries.filter(e => e.date === filterDate);
    if (searchTerm) {
      list = list.filter(e =>
        e.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.reason || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    list.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      return 0;
    });
    return list;
  };

  const filtered = getFiltered();

  /* ---- Tarikh-wise stats: har din kitne GR bills + kitni total raashi ---- */
  const dateStatsMap = {};
  entries.forEach(e => {
    if (!dateStatsMap[e.date]) dateStatsMap[e.date] = { count: 0, total: 0 };
    dateStatsMap[e.date].count += 1;
    dateStatsMap[e.date].total += (e.amount || 0);
  });
  const sortedAscDates = Object.keys(dateStatsMap).sort();
  const dateStatsWithDiff = sortedAscDates.map((d, idx) => {
    const prevDateStats = idx > 0 ? dateStatsMap[sortedAscDates[idx - 1]] : null;
    const diff = prevDateStats ? dateStatsMap[d].count - prevDateStats.count : null;
    return { date: d, count: dateStatsMap[d].count, total: dateStatsMap[d].total, diff };
  }).reverse(); // newest date first

  const today = todayStr();
  const todayCount = dateStatsMap[today]?.count || 0;
  const todayAmount = dateStatsMap[today]?.total || 0;

  return (
    <div style={S.card}>
      {saveError && (
        <div style={S.warnBanner}>
          <AlertTriangle size={22} />
          <div>
            <strong>{t.storageWarnTitle}</strong>
            <p style={{ margin: '4px 0 0 0' }}>{t.storageWarnBody}</p>
          </div>
        </div>
      )}

      <div style={S.grid2}>
        <div>
          <label style={S.label}>{t.dateLabel}</label>
          <input type="date" style={S.input} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>
        <div>
          <label style={S.label}>{t.productLabel}</label>
          <input style={S.input} value={productName} onChange={(e) => setProductName(e.target.value)} placeholder={t.productPh} />
        </div>
      </div>

      <div style={S.grid2}>
        <div>
          <label style={S.label}>{t.quantityLabel}</label>
          <input type="number" style={S.input} value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder={t.quantityPh} />
        </div>
        <div>
          <label style={S.label}>{t.amountLabel}</label>
          <input type="number" style={S.input} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t.amountPh} />
        </div>
      </div>

      <div style={S.grid2}>
        <div>
          <label style={S.label}>{t.reasonLabel}</label>
          <input style={S.input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t.reasonPh} />
        </div>
        <div>
          <label style={S.label}>{t.grBillName}</label>
          <input style={S.input} value={billName} onChange={(e) => setBillName(e.target.value)} placeholder={t.grBillNamePh} />
        </div>
      </div>

      <PhotoPicker t={t} photo={pendingPhoto} onChange={handlePhotoChange} uploading={uploading} idSuffix="gr" />

      <button style={{ ...S.addBtn, marginTop: '16px' }} onClick={addEntry} disabled={uploading || saving}>
        <Plus size={18} /> {saving ? t.saving : t.addBtn}
      </button>

      <hr style={{ margin: '25px 0', border: 'none', borderTop: '1px solid #eee' }} />

      {/* Aaj ke GR bills ka total */}
      <div style={S.statRow}>
        <div style={S.statBox}>
          <p style={{ margin: 0, fontSize: '0.85em', color: '#666' }}>{t.grTodayTotal}</p>
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2em', color: '#667eea' }}>{todayCount}</p>
        </div>
        <div style={S.statBox}>
          <p style={{ margin: 0, fontSize: '0.85em', color: '#666' }}>{t.grTodayAmount}</p>
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2em', color: '#667eea' }}>₹{todayAmount.toFixed(2)}</p>
        </div>
      </div>

      {/* Tarikh-wise GR count/amount table with day-over-day change */}
      {dateStatsWithDiff.length > 0 && (
        <>
          <label style={S.label}>{t.grDateWiseTitle}</label>
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>{t.grDateCol}</th>
                  <th style={S.th}>{t.grCountCol}</th>
                  <th style={S.th}>{t.grAmountCol}</th>
                  <th style={S.th}>{t.grDiffCol}</th>
                </tr>
              </thead>
              <tbody>
                {dateStatsWithDiff.map(row => (
                  <tr key={row.date}>
                    <td style={S.td}>{row.date}</td>
                    <td style={S.td}>{row.count}</td>
                    <td style={S.td}>₹{row.total.toFixed(2)}</td>
                    <td style={S.td}>
                      {row.diff === null ? (
                        <span style={S.diffSame}><Minus size={14} /> —</span>
                      ) : row.diff > 0 ? (
                        <span style={S.diffUp}><TrendingUp size={14} /> +{row.diff}</span>
                      ) : row.diff < 0 ? (
                        <span style={S.diffDown}><TrendingDown size={14} /> {row.diff}</span>
                      ) : (
                        <span style={S.diffSame}><Minus size={14} /> {t.grNoChange}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <hr style={{ margin: '25px 0', border: 'none', borderTop: '1px solid #eee' }} />

      <div style={S.grid2}>
        <div>
          <label style={S.label}><Search size={14} style={{ verticalAlign: 'middle' }} /> {t.searchPh}</label>
          <input style={S.input} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t.searchPh} />
        </div>
        <div>
          <label style={S.label}>{t.allDates}</label>
          <select style={S.input} value={filterDate} onChange={(e) => setFilterDate(e.target.value)}>
            <option value="all">{t.allDates}</option>
            {uniqueDates.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label}>Sort</label>
          <select style={S.input} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">{t.sortNewest}</option>
            <option value="oldest">{t.sortOldest}</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={S.emptyState}>
          <RotateCcw size={56} color="#ccc" />
          <p>{t.emptyGR}</p>
        </div>
      ) : (
        filtered.map(en => (
          <div key={en.id} style={S.entryCard}>
            {en.photo ? (
              <img
                src={en.photo}
                alt={en.productName}
                style={S.entryPhoto}
                onClick={() => setViewImage({ data: en.photo, title: en.productName, subtitle: `📅 ${en.date} · ⏰ ${en.createdAt}` })}
              />
            ) : (
              <div style={S.entryNoPhoto}>{t.noPhoto}</div>
            )}
            <div style={{ flex: 1, minWidth: '150px' }}>
              <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>
                {en.productName}
                {en.quantity != null && <span style={{ color: '#667eea' }}> — Qty: {en.quantity}</span>}
                {en.amount > 0 && <span style={{ color: '#ff6b6b' }}> · ₹{en.amount.toFixed(2)}</span>}
              </p>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.85em', color: '#666' }}>
                📅 {en.date} · ⏰ {en.createdAt}
              </p>
              {en.reason && <p style={{ margin: 0, fontSize: '0.85em', color: '#888' }}>❓ {en.reason}</p>}
            </div>
            <button style={S.deleteBtn} onClick={() => deleteEntry(en.id)}>
              <Trash2 size={14} /> {t.deleteBtn}
            </button>
          </div>
        ))
      )}
    </div>
  );
}
