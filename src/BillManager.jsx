import React, { useState, useEffect } from 'react';
import { Trash2, Plus, FileImage, Download, Search, Camera, Image as ImageIcon, X, Globe, Gift, BookOpen, Receipt, AlertTriangle, RotateCcw, Hash, Pencil, Save, XCircle, Sun, Moon, Palette, ChevronRight, ChevronLeft, HardDrive } from 'lucide-react';

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
const DB_VERSION = 2; // bumped so existing users also get the new 'gr' (Goods Return) store created
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
    storageHide: 'साइड में छिपाएं',
    storageShow: 'Storage जानकारी दिखाएं',
    // ---- GR (Goods Return) ----
    grNumberLabel: '🔢 GR नंबर (वैकल्पिक):',
    grNumberPh: 'जैसे: GR-001',
    grPartyLabel: '🏬 पार्टी / दुकान का नाम:',
    grPartyPh: 'जैसे: शर्मा ट्रेडर्स',
    grAmountLabel: '💰 वापसी राशि (₹, वैकल्पिक):',
    reasonLabel: '❓ वापसी का कारण (वैकल्पिक):',
    reasonPh: 'जैसे: खराब माल, गलत आइटम, एक्सपायरी...',
    emptyGR: 'अभी कोई GR एंट्री नहीं है',
    grTotalAmount: 'कुल वापसी राशि',
    // ---- counts ----
    billsToday: '📅 आज के बिल',
    billsTotal: '📦 कुल बिल',
    grToday: '📅 आज के GR',
    grTotal: '📦 कुल GR',
    // ---- edit feature ----
    editBtn: '✏️ Edit',
    updateBtn: '💾 Update करें',
    cancelEditBtn: '✖️ रद्द करें',
    editingNotice: '✏️ Edit mode चालू है — बदलाव करके "Update करें" दबाएं',
  },
  en: {
    appName: '📋 Bill Manager Pro',
    subtitle: 'Bills, Ledger and Gifts — all in one place',
    langBtn: 'HI',
    tabBills: '🧾 Bills',
    tabLedger: '📒 Ledger',
    tabGifts: '🎁 Gifts',
    tabGR: '↩️ GR (Returns)',
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
    storageHide: 'Hide to side',
    storageShow: 'Show storage info',
    // ---- GR (Goods Return) ----
    grNumberLabel: '🔢 GR Number (optional):',
    grNumberPh: 'e.g. GR-001',
    grPartyLabel: '🏬 Party / Shop Name:',
    grPartyPh: 'e.g. Sharma Traders',
    grAmountLabel: '💰 Return Amount (₹, optional):',
    reasonLabel: '❓ Return Reason (optional):',
    reasonPh: 'e.g. Damaged goods, wrong item, expired...',
    emptyGR: 'No GR entries yet',
    grTotalAmount: 'Total Return Amount',
    // ---- counts ----
    billsToday: "📅 Today's Bills",
    billsTotal: '📦 Total Bills',
    grToday: "📅 Today's GR",
    grTotal: '📦 Total GR',
    // ---- edit feature ----
    editBtn: '✏️ Edit',
    updateBtn: '💾 Update',
    cancelEditBtn: '✖️ Cancel',
    editingNotice: '✏️ Editing mode — make your changes then hit "Update"',
  }
};

/* ---------- shared styles ---------- */
const S = {
  page: { background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary2) 100%)', minHeight: '100vh', padding: '20px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", color: 'var(--text-strong)' },
  container: { maxWidth: '1100px', margin: '0 auto' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', color: 'white', flexWrap: 'wrap', gap: '10px' },
  langBtn: { background: 'rgba(255,255,255,0.2)', border: '2px solid white', color: 'white', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' },
  tabRow: { display: 'flex', gap: '10px', marginBottom: '25px', flexWrap: 'wrap' },
  tabBtn: (active) => ({ background: active ? 'var(--card-bg)' : 'rgba(255,255,255,0.15)', color: active ? 'var(--primary)' : 'white', border: active ? 'none' : '2px solid rgba(255,255,255,0.6)', padding: '12px 22px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1em' }),
  card: { background: 'var(--card-bg)', borderRadius: '16px', padding: '25px', marginBottom: '25px', boxShadow: 'var(--card-shadow)', border: '1px solid var(--card-border)' },
  label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-strong)' },
  input: { width: '100%', padding: '11px 12px', borderRadius: '10px', border: '2px solid var(--border)', fontSize: '1em', boxSizing: 'border-box', background: 'var(--input-bg)', color: 'var(--text-strong)' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '20px' },
  photoBtnRow: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' },
  photoBtn: { background: 'var(--primary)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9em' },
  thumbWrap: { position: 'relative', width: '90px', height: '90px', borderRadius: '8px', overflow: 'hidden', border: '2px solid var(--primary)', marginTop: '10px' },
  removeThumbBtn: { position: 'absolute', top: '2px', right: '2px', background: 'rgba(220,50,50,0.9)', border: 'none', color: 'white', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  addBtn: { background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary2) 100%)', color: 'white', border: 'none', padding: '14px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.05em', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  entryCard: { background: 'var(--surface)', borderRadius: '12px', padding: '16px', marginBottom: '14px', display: 'flex', gap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' },
  entryPhoto: { width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover', cursor: 'pointer', flexShrink: 0 },
  entryNoPhoto: { width: '80px', height: '80px', borderRadius: '10px', background: 'var(--surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint2)', fontSize: '0.75em', textAlign: 'center', flexShrink: 0 },
  deleteBtn: { background: 'var(--danger)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: '4px' },
  emptyState: { textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' },
  warnBanner: { background: 'var(--warn-bg)', border: '2px solid var(--warn-border)', color: 'var(--warn-text)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-start' },
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' },
  statBox: { background: 'var(--surface2)', borderRadius: '10px', padding: '14px', textAlign: 'center' },
  entryBtnCol: { display: 'flex', flexDirection: 'column', gap: '6px' },
  editBtn: { background: 'var(--warn-btn)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' },
  cancelBtn: { background: 'var(--secondary-btn)', color: 'white', border: 'none', padding: '14px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  addBtnRow: { display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' },
  editNotice: { background: 'var(--info-bg)', border: '2px solid var(--primary)', color: 'var(--info-text)', borderRadius: '10px', padding: '12px 16px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9em', fontWeight: 'bold' },
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
      <label className="bm-label" style={S.label}>📷 {t.galleryBtn} / {t.cameraBtn}</label>
      <div className="bm-photo-btn-row" style={S.photoBtnRow}>
        <input
          type="file"
          accept="image/*"
          id={`gallery-${idSuffix}`}
          style={{ display: 'none' }}
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
        <label htmlFor={`gallery-${idSuffix}`} className="bm-btn bm-btn-photo bm-shimmer" style={S.photoBtn}>
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
        <label htmlFor={`camera-${idSuffix}`} className="bm-btn bm-btn-photo bm-shimmer" style={S.photoBtn}>
          <Camera size={16} /> {t.cameraBtn}
        </label>
      </div>

      {uploading && <p style={{ color: 'var(--primary)', fontSize: '0.85em', marginTop: '8px' }}>{t.uploading}</p>}

      {photo && !uploading && (
        <div className="bm-thumb-wrap" style={S.thumbWrap}>
          <img src={photo} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <button type="button" className="bm-remove-thumb" style={S.removeThumbBtn} onClick={() => onChange(null)}>
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
        className="bm-modal-close"
        style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.15)', border: '2px solid white', color: 'white', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
      >
        <X size={24} />
      </button>
      <img
        src={image.data}
        alt={image.title || ''}
        onClick={(e) => e.stopPropagation()}
        className="bm-modal-img"
        style={{ maxWidth: '95%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '10px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
      />
      <div style={{ color: 'white', textAlign: 'center', marginTop: '15px' }}>
        {image.title && <p style={{ margin: '0 0 5px 0', fontSize: '1.1em', fontWeight: 'bold' }}>{image.title}</p>}
        {image.subtitle && <p style={{ margin: '0', fontSize: '0.85em', opacity: 0.8 }}>{image.subtitle}</p>}
        <a
          href={image.data}
          download={(image.title || 'photo') + '.jpg'}
          onClick={(e) => e.stopPropagation()}
          className="bm-btn bm-btn-primary bm-shimmer"
          style={{ display: 'inline-flex', alignItems: 'center', marginTop: '15px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary2) 100%)', color: 'white', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9em' }}
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
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('billManager_storageCollapsed') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    (async () => {
      const est = await getStorageEstimate();
      if (est) setEstimate(est);
    })();
  }, []);

  useEffect(() => {
    try { localStorage.setItem('billManager_storageCollapsed', collapsed ? 'true' : 'false'); } catch {}
  }, [collapsed]);

  if (!estimate) return null;

  const usedMB = estimate.usageMB.toFixed(1);
  const quotaMB = estimate.quotaMB >= 1024
    ? (estimate.quotaMB / 1024).toFixed(1) + ' GB'
    : estimate.quotaMB.toFixed(0) + ' MB';
  const pct = estimate.quotaMB > 0 ? Math.min(100, (estimate.usageMB / estimate.quotaMB) * 100) : 0;

  /* ---- collapsed: sirf ek chhota sa pill, right side mein ---- */
  if (collapsed) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button
          className="bm-storage-collapsed"
          onClick={() => setCollapsed(false)}
          title={t.storageShow}
        >
          <HardDrive size={14} />
          <span>{Math.round(pct)}%</span>
          <ChevronLeft size={14} />
        </button>
      </div>
    );
  }

  /* ---- expanded: full bar, with a button to hide it to the side ---- */
  return (
    <div className="bm-card bm-storage-card" style={{ position: 'relative', background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '10px 40px 10px 14px', marginBottom: '20px', color: 'white', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.25)' }}>
      <button
        className="bm-storage-collapse-btn"
        onClick={() => setCollapsed(true)}
        title={t.storageHide}
      >
        <ChevronRight size={16} />
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
        <span>{t.storageUsed}: {usedMB} MB {t.storageOf} {quotaMB}</span>
        <span>{t.storageAvailable}</span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
        <div className="bm-storage-fill" style={{ background: 'linear-gradient(90deg, #ffffff, #ffe28a, #ffffff)', backgroundSize: '200% 100%', height: '100%', width: `${pct}%`, transition: 'width 0.6s ease', borderRadius: '6px' }} />
      </div>
    </div>
  );
}

/* ============================================================
   GLOBAL STYLES — theme variables (day/night + 5 colour hues),
   shimmer/hover/animation effects for every section
   ============================================================ */
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');

      .bm-page, .bm-page * { font-family: 'Poppins', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }

      /* ---------- base (light / cosmic) variables ---------- */
      .bm-page {
        --primary: #667eea;
        --primary2: #764ba2;
        --danger: #ff6b6b;
        --success: #2ecc71;
        --warn-btn: #f0a500;
        --secondary-btn: #95a5a6;

        --card-bg: #ffffff;
        --card-border: rgba(17, 17, 17, 0.06);
        --card-shadow: 0 10px 30px rgba(31, 20, 90, 0.12);

        --surface: #f7f7fb;
        --surface2: #f0f0fb;
        --surface3: #e6e6f0;

        --text-strong: #2b2b38;
        --text-muted: #666677;
        --text-faint: #888899;
        --text-faint2: #999;

        --border: #dde0ea;
        --border-soft: #ececf3;
        --border-light: #cfd2e0;

        --input-bg: #ffffff;

        --info-bg: #e7f0ff;
        --info-text: #3b4a8a;
        --warn-bg: #fff3cd;
        --warn-border: #ffc107;
        --warn-text: #7a5600;

        background: linear-gradient(135deg, var(--primary) 0%, var(--primary2) 100%);
        transition: background 0.5s ease;
      }

      /* ---------- night mode ---------- */
      .bm-page[data-mode='dark'] {
        --card-bg: #1c1e2e;
        --card-border: rgba(255, 255, 255, 0.08);
        --card-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);

        --surface: #262838;
        --surface2: #232538;
        --surface3: #2c2e42;

        --text-strong: #eef0fb;
        --text-muted: #b3b6cc;
        --text-faint: #9092ab;
        --text-faint2: #8a8ca3;

        --border: #3a3d55;
        --border-soft: #33354a;
        --border-light: #454864;

        --input-bg: #232538;

        --info-bg: #232a4a;
        --info-text: #b9c6ff;
        --warn-bg: #3a2f14;
        --warn-border: #b98a1f;
        --warn-text: #f0cf8a;

        background: linear-gradient(135deg, #14152233 0%, #0c0d1633 100%),
                    linear-gradient(135deg, var(--primary) 0%, var(--primary2) 100%);
      }
      .bm-page[data-mode='dark'] { background-blend-mode: multiply; }

      /* ---------- colour hues ---------- */
      .bm-page[data-hue='ocean']  { --primary: #0ea5e9; --primary2: #0369a1; }
      .bm-page[data-hue='sunset'] { --primary: #fb923c; --primary2: #db2777; }
      .bm-page[data-hue='forest'] { --primary: #22c55e; --primary2: #0d9488; }
      .bm-page[data-hue='berry']  { --primary: #c026d3; --primary2: #7c3aed; }

      /* ================= layout polish ================= */
      .bm-container { animation: bmFadeIn 0.5s ease; }
      @keyframes bmFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

      .bm-title-wrap h1 { text-shadow: 0 2px 12px rgba(0,0,0,0.15); }
      .bm-header-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

      /* ================= theme widget ================= */
      .bm-theme-widget { display: flex; align-items: center; gap: 8px; }

      .bm-mode-toggle {
        width: 52px; height: 28px; border-radius: 999px; border: 2px solid rgba(255,255,255,0.6);
        background: rgba(255,255,255,0.15); cursor: pointer; position: relative; padding: 2px;
        display: flex; align-items: center; transition: background 0.3s ease, border-color 0.3s ease;
      }
      .bm-mode-toggle:hover { background: rgba(255,255,255,0.28); }
      .bm-mode-thumb {
        width: 20px; height: 20px; border-radius: 50%; background: #ffd54a; color: #7a5600;
        display: flex; align-items: center; justify-content: center;
        transform: translateX(0); transition: transform 0.35s cubic-bezier(.68,-0.35,.27,1.35), background 0.3s ease, color 0.3s ease;
        box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      }
      .bm-mode-thumb-dark { transform: translateX(22px); background: #4a4f7a; color: #e8e9ff; }

      .bm-palette-wrap { position: relative; }
      .bm-palette-btn {
        width: 38px; height: 38px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.6);
        background: rgba(255,255,255,0.15); color: white; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: transform 0.25s ease, background 0.25s ease;
      }
      .bm-palette-btn:hover { background: rgba(255,255,255,0.3); transform: rotate(18deg) scale(1.08); }
      .bm-palette-dropdown {
        position: absolute; top: 46px; right: 0; z-index: 50;
        background: var(--card-bg); border-radius: 14px; padding: 10px;
        box-shadow: var(--card-shadow); border: 1px solid var(--card-border);
        display: flex; gap: 8px; animation: bmPopIn 0.18s ease;
      }
      @keyframes bmPopIn { from { opacity: 0; transform: translateY(-6px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      .bm-swatch {
        width: 30px; height: 30px; border-radius: 50%; border: 2px solid transparent; cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease; padding: 0;
      }
      .bm-swatch:hover { transform: scale(1.18) rotate(8deg); }
      .bm-swatch-active { border-color: var(--text-strong); box-shadow: 0 0 0 3px var(--card-bg), 0 0 0 5px var(--primary); }

      .bm-lang-btn { transition: transform 0.2s ease, background 0.25s ease, box-shadow 0.25s ease; }
      .bm-lang-btn:hover { transform: translateY(-2px); background: rgba(255,255,255,0.32) !important; box-shadow: 0 6px 16px rgba(0,0,0,0.18); }
      .bm-lang-btn:active { transform: translateY(0) scale(0.97); }

      /* ================= tabs ================= */
      .bm-tab { transition: transform 0.22s ease, box-shadow 0.25s ease, background 0.25s ease, color 0.25s ease; position: relative; overflow: hidden; }
      .bm-tab:hover { transform: translateY(-3px); box-shadow: 0 8px 18px rgba(0,0,0,0.18); }
      .bm-tab:active { transform: translateY(-1px) scale(0.98); }
      .bm-tab-active { box-shadow: 0 8px 22px rgba(0,0,0,0.22); }
      .bm-tab-active::after {
        content: ''; position: absolute; left: 14%; right: 14%; bottom: 6px; height: 3px; border-radius: 3px;
        background: linear-gradient(90deg, var(--primary), var(--primary2)); animation: bmGrowLine 0.35s ease;
      }
      @keyframes bmGrowLine { from { transform: scaleX(0); } to { transform: scaleX(1); } }

      /* ================= cards ================= */
      .bm-card { transition: box-shadow 0.35s ease, transform 0.35s ease; animation: bmCardIn 0.4s ease; }
      @keyframes bmCardIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      .bm-card:hover { box-shadow: 0 16px 40px rgba(31, 20, 90, 0.18); }
      .bm-page[data-mode='dark'] .bm-card:hover { box-shadow: 0 16px 40px rgba(0,0,0,0.6); }

      /* ================= inputs ================= */
      .bm-input {
        transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.15s ease;
      }
      .bm-input:hover { border-color: var(--border-light); }
      .bm-input:focus {
        outline: none; border-color: var(--primary);
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 18%, transparent);
        transform: translateY(-1px);
      }
      .bm-label { transition: color 0.2s ease; }

      /* ================= buttons (shared) ================= */
      .bm-btn {
        transition: transform 0.2s ease, box-shadow 0.25s ease, filter 0.2s ease, opacity 0.2s ease;
        position: relative; overflow: hidden;
      }
      .bm-btn:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 10px 22px rgba(0,0,0,0.22); filter: brightness(1.06); }
      .bm-btn:active:not(:disabled) { transform: translateY(-1px) scale(0.97); }
      .bm-btn:disabled { opacity: 0.55; cursor: not-allowed; filter: grayscale(0.15); }

      .bm-btn-primary { box-shadow: 0 6px 16px rgba(102, 126, 234, 0.35); }
      .bm-btn-danger:hover:not(:disabled) { box-shadow: 0 10px 22px rgba(255, 107, 107, 0.4); }
      .bm-btn-warn:hover:not(:disabled) { box-shadow: 0 10px 22px rgba(240, 165, 0, 0.4); }
      .bm-btn-secondary:hover:not(:disabled) { box-shadow: 0 10px 22px rgba(149, 165, 166, 0.4); }
      .bm-btn-photo:hover:not(:disabled) { box-shadow: 0 10px 22px rgba(102, 126, 234, 0.4); }

      /* shimmer sweep across primary buttons */
      .bm-shimmer::before {
        content: ''; position: absolute; top: 0; left: -60%; width: 40%; height: 100%;
        background: linear-gradient(120deg, transparent, rgba(255,255,255,0.55), transparent);
        transform: skewX(-20deg);
        transition: left 0.65s ease;
      }
      .bm-shimmer:hover::before { left: 130%; }

      .bm-remove-thumb { transition: transform 0.2s ease, background 0.2s ease; }
      .bm-remove-thumb:hover { transform: scale(1.15) rotate(90deg); background: rgba(200, 30, 30, 1) !important; }

      .bm-thumb-wrap { transition: transform 0.25s ease, box-shadow 0.25s ease; }
      .bm-thumb-wrap:hover { transform: scale(1.04); box-shadow: 0 8px 18px rgba(0,0,0,0.25); }

      /* ================= entry cards / lists ================= */
      .bm-entry-card {
        transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
        animation: bmSlideIn 0.35s ease; border: 1px solid var(--border-soft);
      }
      @keyframes bmSlideIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
      .bm-entry-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 10px 24px rgba(31, 20, 90, 0.15);
        border-color: var(--primary);
      }
      .bm-page[data-mode='dark'] .bm-entry-card:hover { box-shadow: 0 10px 24px rgba(0,0,0,0.5); }

      .bm-entry-photo { transition: transform 0.3s ease, box-shadow 0.3s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
      .bm-entry-photo:hover { transform: scale(1.08) rotate(-1deg); box-shadow: 0 8px 18px rgba(0,0,0,0.3); }

      .bm-entry-no-photo { transition: background 0.25s ease; }

      /* ================= stat boxes ================= */
      .bm-stat-box {
        transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
        border: 1px solid var(--border-soft);
      }
      .bm-stat-box:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 10px 20px rgba(31,20,90,0.15); }

      /* ================= banners / notices ================= */
      .bm-warn-banner, .bm-edit-notice { animation: bmShake 0.5s ease; }
      @keyframes bmShake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-4px); } 40% { transform: translateX(4px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(3px); } }

      /* ================= empty state ================= */
      .bm-empty-state svg { animation: bmFloat 2.6s ease-in-out infinite; }
      @keyframes bmFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

      /* ================= scrollbar ================= */
      .bm-page ::-webkit-scrollbar { width: 10px; height: 10px; }
      .bm-page ::-webkit-scrollbar-track { background: transparent; }
      .bm-page ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.35); border-radius: 10px; }

      /* ================= modal image zoom ================= */
      .bm-page img { -webkit-tap-highlight-color: transparent; }

      .bm-storage-fill { animation: bmShimmerBar 2.2s linear infinite; }
      @keyframes bmShimmerBar { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

      .bm-modal-close { transition: transform 0.25s ease, background 0.25s ease; }
      .bm-modal-close:hover { transform: rotate(90deg) scale(1.1); background: rgba(255,255,255,0.3) !important; }
      .bm-modal-img { animation: bmZoomIn 0.3s ease; }
      @keyframes bmZoomIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }

      /* ================= collapsible storage indicator ================= */
      .bm-storage-card { animation: bmFadeIn 0.3s ease; }
      .bm-storage-collapse-btn {
        position: absolute; top: 8px; right: 8px; width: 26px; height: 26px; border-radius: 50%;
        background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.35); color: white;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: background 0.2s ease, transform 0.2s ease;
      }
      .bm-storage-collapse-btn:hover { background: rgba(255,255,255,0.35); transform: translateX(2px); }

      .bm-storage-collapsed {
        display: inline-flex; align-items: center; gap: 6px; border: 1px solid rgba(255,255,255,0.35);
        background: rgba(255,255,255,0.15); color: white; border-radius: 999px; padding: 6px 12px;
        cursor: pointer; font-size: 0.8em; font-weight: 600; animation: bmFadeIn 0.3s ease;
        transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
      }
      .bm-storage-collapsed:hover { background: rgba(255,255,255,0.28); transform: translateX(-2px); box-shadow: 0 6px 14px rgba(0,0,0,0.18); }
    `}</style>
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

  /* ---- theme: day/night mode + colour hue, remembered on this device ---- */
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem('billManager_mode') || 'light'; } catch { return 'light'; }
  });
  const [hue, setHue] = useState(() => {
    try { return localStorage.getItem('billManager_hue') || 'cosmic'; } catch { return 'cosmic'; }
  });
  const [themePickerOpen, setThemePickerOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('billManager_mode', mode); } catch {}
  }, [mode]);
  useEffect(() => {
    try { localStorage.setItem('billManager_hue', hue); } catch {}
  }, [hue]);

  const HUES = [
    { id: 'cosmic', label: 'Cosmic', swatch: 'linear-gradient(135deg,#667eea,#764ba2)' },
    { id: 'ocean', label: 'Ocean', swatch: 'linear-gradient(135deg,#0ea5e9,#0369a1)' },
    { id: 'sunset', label: 'Sunset', swatch: 'linear-gradient(135deg,#fb923c,#db2777)' },
    { id: 'forest', label: 'Forest', swatch: 'linear-gradient(135deg,#22c55e,#0d9488)' },
    { id: 'berry', label: 'Berry', swatch: 'linear-gradient(135deg,#c026d3,#7c3aed)' },
  ];

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
    <div className="bm-page" data-mode={mode} data-hue={hue} style={S.page}>
      <GlobalStyles />
      <div className="bm-container" style={S.container}>
        <div className="bm-header-row" style={S.headerRow}>
          <div className="bm-title-wrap">
            <h1 className="bm-app-title" style={{ margin: '0 0 5px 0', fontSize: '2em' }}>{t.appName}</h1>
            <p style={{ margin: 0, opacity: 0.9 }}>{t.subtitle}</p>
          </div>

          <div className="bm-header-actions">
            <div className="bm-theme-widget">
              <button
                className="bm-mode-toggle"
                onClick={() => setMode(m => (m === 'light' ? 'dark' : 'light'))}
                title={mode === 'light' ? 'Night mode' : 'Day mode'}
                aria-label="Toggle day and night mode"
              >
                <span className={`bm-mode-thumb ${mode === 'dark' ? 'bm-mode-thumb-dark' : ''}`}>
                  {mode === 'light' ? <Sun size={14} /> : <Moon size={14} />}
                </span>
              </button>

              <div className="bm-palette-wrap">
                <button
                  className="bm-palette-btn"
                  onClick={() => setThemePickerOpen(o => !o)}
                  title="Choose colour theme"
                  aria-label="Choose colour theme"
                >
                  <Palette size={18} />
                </button>
                {themePickerOpen && (
                  <div className="bm-palette-dropdown">
                    {HUES.map(h => (
                      <button
                        key={h.id}
                        className={`bm-swatch ${hue === h.id ? 'bm-swatch-active' : ''}`}
                        style={{ background: h.swatch }}
                        onClick={() => { setHue(h.id); setThemePickerOpen(false); }}
                        title={h.label}
                        aria-label={h.label}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button className="bm-lang-btn" style={S.langBtn} onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')}>
              <Globe size={18} /> {t.langBtn}
            </button>
          </div>
        </div>

        {loadError && (
          <div className="bm-warn-banner" style={S.warnBanner}>
            <AlertTriangle size={22} />
            <div>{t.loadError}</div>
          </div>
        )}

        {loaded && <StorageIndicator t={t} />}

        <div className="bm-tab-row" style={S.tabRow}>
          <button className={`bm-tab ${activeTab === 'bills' ? 'bm-tab-active' : ''}`} style={S.tabBtn(activeTab === 'bills')} onClick={() => setActiveTab('bills')}>
            <Receipt size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{t.tabBills}
          </button>
          <button className={`bm-tab ${activeTab === 'ledger' ? 'bm-tab-active' : ''}`} style={S.tabBtn(activeTab === 'ledger')} onClick={() => setActiveTab('ledger')}>
            <BookOpen size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{t.tabLedger}
          </button>
          <button className={`bm-tab ${activeTab === 'gifts' ? 'bm-tab-active' : ''}`} style={S.tabBtn(activeTab === 'gifts')} onClick={() => setActiveTab('gifts')}>
            <Gift size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{t.tabGifts}
          </button>
          <button className={`bm-tab ${activeTab === 'gr' ? 'bm-tab-active' : ''}`} style={S.tabBtn(activeTab === 'gr')} onClick={() => setActiveTab('gr')}>
            <RotateCcw size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{t.tabGR}
          </button>
        </div>

        {!loaded ? (
          <div className="bm-card" style={{ ...S.card, textAlign: 'center' }}>...</div>
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
  const [editingId, setEditingId] = useState(null); // null = naya add ho raha hai, warna us id ki entry edit ho rahi hai
  const isEditing = editingId !== null;

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
    // Edit mode mein original entry se uploadedAt (creation time) preserve karte hain,
    // sirf naye add hone par fresh timestamp lagti hai.
    const original = isEditing ? bills.find(b => b.id === editingId) : null;
    const entry = {
      id: isEditing ? editingId : Date.now() + Math.random(),
      name: billName || 'Bill',
      photo: pendingPhoto,
      date: selectedDate,
      uploadedAt: original ? original.uploadedAt : new Date().toLocaleString(t.dateLocale),
    };
    setSaving(true);
    setSaveError(false);
    try {
      await dbPut('bills', entry); // dbPut same id ho to update karta hai, warna naya insert
      if (isEditing) {
        setBills(prev => prev.map(b => (b.id === entry.id ? entry : b)));
      } else {
        setBills(prev => [...prev, entry]);
      }
      setBillName('');
      setPendingPhoto(null);
      setEditingId(null);
      setSelectedDate(todayStr());
    } catch (err) {
      console.error('Failed to save bill', err);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (b) => {
    setEditingId(b.id);
    setSelectedDate(b.date);
    setBillName(b.name);
    setPendingPhoto(b.photo);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setBillName('');
    setPendingPhoto(null);
    setSelectedDate(todayStr());
  };

  const deleteBill = async (id) => {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      await dbDelete('bills', id);
      setBills(prev => prev.filter(b => b.id !== id));
      if (editingId === id) cancelEdit(); // jis entry ko edit kar rahe the wahi delete ho gayi to form reset karo
    } catch (err) {
      console.error('Failed to delete bill', err);
    }
  };

  const uniqueDates = [...new Set(bills.map(b => b.date))].sort().reverse();
  const todayCount = bills.filter(b => b.date === todayStr()).length;

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
    <div className="bm-card" style={S.card}>
      {saveError && (
        <div className="bm-warn-banner" style={S.warnBanner}>
          <AlertTriangle size={22} />
          <div>
            <strong>{t.storageWarnTitle}</strong>
            <p style={{ margin: '4px 0 0 0' }}>{t.storageWarnBody}</p>
          </div>
        </div>
      )}

      {isEditing && (
        <div className="bm-edit-notice" style={S.editNotice}>
          <Pencil size={16} /> {t.editingNotice}
        </div>
      )}

      <div className="bm-grid2" style={S.grid2}>
        <div>
          <label className="bm-label" style={S.label}>{t.dateLabel}</label>
          <input type="date" className="bm-input" style={S.input} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>
        <div>
          <label className="bm-label" style={S.label}>📝 Bill Name</label>
          <input className="bm-input" style={S.input} value={billName} onChange={(e) => setBillName(e.target.value)} placeholder="e.g. Electricity bill" />
        </div>
      </div>

      <PhotoPicker t={t} photo={pendingPhoto} onChange={handlePhotoChange} uploading={uploading} idSuffix="bills" />

      <div className="bm-add-btn-row" style={S.addBtnRow}>
        <button className="bm-btn bm-btn-primary bm-shimmer" style={{ ...S.addBtn, width: isEditing ? 'auto' : '100%', flex: 1 }} onClick={addBill} disabled={!pendingPhoto || uploading || saving}>
          {isEditing ? <Save size={18} /> : <Plus size={18} />} {saving ? t.saving : (isEditing ? t.updateBtn : t.addBtn)}
        </button>
        {isEditing && (
          <button className="bm-btn bm-btn-secondary" style={S.cancelBtn} onClick={cancelEdit} disabled={saving}>
            <XCircle size={18} /> {t.cancelEditBtn}
          </button>
        )}
      </div>

      <hr style={{ margin: '25px 0', border: 'none', borderTop: '1px solid var(--border-soft)' }} />

      <div className="bm-stat-row" style={S.statRow}>
        <div className="bm-stat-box" style={S.statBox}><p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)' }}>{t.billsToday}</p><p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2em', color: 'var(--primary)' }}>{todayCount}</p></div>
        <div className="bm-stat-box" style={S.statBox}><p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)' }}>{t.billsTotal}</p><p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2em', color: 'var(--primary2)' }}>{bills.length}</p></div>
      </div>

      <div className="bm-grid2" style={S.grid2}>
        <div>
          <label className="bm-label" style={S.label}><Search size={14} style={{ verticalAlign: 'middle' }} /> {t.searchPh}</label>
          <input className="bm-input" style={S.input} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t.searchPh} />
        </div>
        <div>
          <label className="bm-label" style={S.label}>{t.allDates}</label>
          <select className="bm-input" style={S.input} value={filterDate} onChange={(e) => setFilterDate(e.target.value)}>
            <option value="all">{t.allDates}</option>
            {uniqueDates.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="bm-label" style={S.label}>Sort</label>
          <select className="bm-input" style={S.input} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">{t.sortNewest}</option>
            <option value="oldest">{t.sortOldest}</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bm-empty-state" style={S.emptyState}>
          <FileImage size={56} color="var(--border-light)" />
          <p>{t.emptyBills}</p>
        </div>
      ) : (
        filtered.map(b => (
          <div key={b.id} className="bm-entry-card" style={S.entryCard}>
            <img
              src={b.photo}
              alt={b.name}
              className="bm-entry-photo" style={S.entryPhoto}
              onClick={() => setViewImage({ data: b.photo, title: b.name, subtitle: `📅 ${b.date} · ⏰ ${b.uploadedAt}` })}
            />
            <div style={{ flex: 1, minWidth: '150px' }}>
              <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{b.name}</p>
              <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)' }}>📅 {b.date} · ⏰ {b.uploadedAt}</p>
            </div>
            <div className="bm-entry-btn-col" style={S.entryBtnCol}>
              <button className="bm-btn bm-btn-warn" style={S.editBtn} onClick={() => startEdit(b)}>
                <Pencil size={14} /> {t.editBtn}
              </button>
              <button className="bm-btn bm-btn-danger" style={S.deleteBtn} onClick={() => deleteBill(b.id)}>
                <Trash2 size={14} /> {t.deleteBtn}
              </button>
            </div>
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
  const [editingId, setEditingId] = useState(null);
  const isEditing = editingId !== null;

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
    // Edit mode mein original entry ki date/createdAt preserve karte hain
    // (form mein date change karne ka option nahi hai, ye sahi bhi hai
    // kyunki transaction ki asli tareekh nahi badalni chahiye).
    const original = isEditing ? entries.find(e => e.id === editingId) : null;
    const entry = {
      id: isEditing ? editingId : Date.now() + Math.random(),
      personName: personName.trim(),
      amount: parseFloat(amount) || 0,
      transactionType,
      note: note.trim(),
      photo: pendingPhoto,
      date: original ? original.date : todayStr(),
      createdAt: original ? original.createdAt : new Date().toLocaleString(t.dateLocale),
    };
    setSaving(true);
    setSaveError(false);
    try {
      await dbPut('ledger', entry);
      if (isEditing) {
        setEntries(prev => prev.map(e => (e.id === entry.id ? entry : e)));
      } else {
        setEntries(prev => [entry, ...prev]);
      }
      setPersonName('');
      setAmount('');
      setNote('');
      setPendingPhoto(null);
      setTransactionType('received');
      setEditingId(null);
    } catch (err) {
      console.error('Failed to save ledger entry', err);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (en) => {
    setEditingId(en.id);
    setPersonName(en.personName);
    setAmount(String(en.amount));
    setTransactionType(en.transactionType);
    setNote(en.note || '');
    setPendingPhoto(en.photo || null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setPersonName('');
    setAmount('');
    setNote('');
    setPendingPhoto(null);
    setTransactionType('received');
  };

  const deleteEntry = async (id) => {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      await dbDelete('ledger', id);
      setEntries(prev => prev.filter(e => e.id !== id));
      if (editingId === id) cancelEdit();
    } catch (err) {
      console.error('Failed to delete ledger entry', err);
    }
  };

  const filtered = entries.filter(e => e.personName.toLowerCase().includes(searchTerm.toLowerCase()));

  const totalGiven = entries.filter(e => e.transactionType === 'given').reduce((s, e) => s + e.amount, 0);
  const totalReceived = entries.filter(e => e.transactionType === 'received').reduce((s, e) => s + e.amount, 0);
  const net = totalReceived - totalGiven;

  return (
    <div className="bm-card" style={S.card}>
      {saveError && (
        <div className="bm-warn-banner" style={S.warnBanner}>
          <AlertTriangle size={22} />
          <div>
            <strong>{t.storageWarnTitle}</strong>
            <p style={{ margin: '4px 0 0 0' }}>{t.storageWarnBody}</p>
          </div>
        </div>
      )}

      {isEditing && (
        <div className="bm-edit-notice" style={S.editNotice}>
          <Pencil size={16} /> {t.editingNotice}
        </div>
      )}

      <div className="bm-grid2" style={S.grid2}>
        <div>
          <label className="bm-label" style={S.label}>{t.personLabel}</label>
          <input className="bm-input" style={S.input} value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder={t.personPh} />
        </div>
        <div>
          <label className="bm-label" style={S.label}>{t.amountLabel}</label>
          <input type="number" className="bm-input" style={S.input} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t.amountPh} />
        </div>
      </div>

      <div className="bm-grid2" style={S.grid2}>
        <div>
          <label className="bm-label" style={S.label}>Type</label>
          <select className="bm-input" style={S.input} value={transactionType} onChange={(e) => setTransactionType(e.target.value)}>
            <option value="received">{t.typeReceived}</option>
            <option value="given">{t.typeGiven}</option>
          </select>
        </div>
        <div>
          <label className="bm-label" style={S.label}>{t.noteLabel}</label>
          <input className="bm-input" style={S.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.notePh} />
        </div>
      </div>

      <PhotoPicker t={t} photo={pendingPhoto} onChange={handlePhotoChange} uploading={uploading} idSuffix="ledger" />

      <div className="bm-add-btn-row" style={S.addBtnRow}>
        <button className="bm-btn bm-btn-primary bm-shimmer" style={{ ...S.addBtn, width: isEditing ? 'auto' : '100%', flex: 1 }} onClick={addEntry} disabled={uploading || saving}>
          {isEditing ? <Save size={18} /> : <Plus size={18} />} {saving ? t.saving : (isEditing ? t.updateBtn : t.addBtn)}
        </button>
        {isEditing && (
          <button className="bm-btn bm-btn-secondary" style={S.cancelBtn} onClick={cancelEdit} disabled={saving}>
            <XCircle size={18} /> {t.cancelEditBtn}
          </button>
        )}
      </div>

      <hr style={{ margin: '25px 0', border: 'none', borderTop: '1px solid var(--border-soft)' }} />

      <div className="bm-stat-row" style={S.statRow}>
        <div className="bm-stat-box" style={S.statBox}><p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)' }}>{t.balanceReceived}</p><p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2em', color: 'var(--success)' }}>₹{totalReceived.toFixed(2)}</p></div>
        <div className="bm-stat-box" style={S.statBox}><p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)' }}>{t.balanceGiven}</p><p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2em', color: 'var(--danger)' }}>₹{totalGiven.toFixed(2)}</p></div>
        <div className="bm-stat-box" style={S.statBox}><p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)' }}>{t.netBalance}</p><p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2em', color: net >= 0 ? 'var(--success)' : 'var(--danger)' }}>₹{net.toFixed(2)}</p></div>
      </div>

      <label className="bm-label" style={S.label}><Search size={14} style={{ verticalAlign: 'middle' }} /> {t.searchPh}</label>
      <input className="bm-input" style={{ ...S.input, marginBottom: '20px' }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t.searchPh} />

      {filtered.length === 0 ? (
        <div className="bm-empty-state" style={S.emptyState}>
          <BookOpen size={56} color="var(--border-light)" />
          <p>{t.emptyLedger}</p>
        </div>
      ) : (
        filtered.map(en => (
          <div key={en.id} className="bm-entry-card" style={S.entryCard}>
            {en.photo ? (
              <img
                src={en.photo}
                alt={en.personName}
                className="bm-entry-photo" style={S.entryPhoto}
                onClick={() => setViewImage({ data: en.photo, title: en.personName, subtitle: `📅 ${en.date} · ⏰ ${en.createdAt}` })}
              />
            ) : (
              <div className="bm-entry-no-photo" style={S.entryNoPhoto}>{t.noPhoto}</div>
            )}
            <div style={{ flex: 1, minWidth: '150px' }}>
              <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>
                {en.personName} — <span style={{ color: en.transactionType === 'given' ? 'var(--danger)' : 'var(--success)' }}>₹{en.amount.toFixed(2)}</span>
              </p>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.85em', color: 'var(--text-muted)' }}>
                {en.transactionType === 'given' ? t.typeGiven : t.typeReceived} · 📅 {en.date}
              </p>
              {en.note && <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-faint)' }}>{en.note}</p>}
            </div>
            <div className="bm-entry-btn-col" style={S.entryBtnCol}>
              <button className="bm-btn bm-btn-warn" style={S.editBtn} onClick={() => startEdit(en)}>
                <Pencil size={14} /> {t.editBtn}
              </button>
              <button className="bm-btn bm-btn-danger" style={S.deleteBtn} onClick={() => deleteEntry(en.id)}>
                <Trash2 size={14} /> {t.deleteBtn}
              </button>
            </div>
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
  const [editingId, setEditingId] = useState(null);
  const isEditing = editingId !== null;

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
    const original = isEditing ? entries.find(e => e.id === editingId) : null;
    const entry = {
      id: isEditing ? editingId : Date.now() + Math.random(),
      personName: personName.trim(),
      occasion: occasion.trim(),
      amount: amount ? parseFloat(amount) : null,
      note: note.trim(),
      photo: pendingPhoto,
      date: original ? original.date : todayStr(),
      createdAt: original ? original.createdAt : new Date().toLocaleString(t.dateLocale),
    };
    setSaving(true);
    setSaveError(false);
    try {
      await dbPut('gifts', entry);
      if (isEditing) {
        setEntries(prev => prev.map(e => (e.id === entry.id ? entry : e)));
      } else {
        setEntries(prev => [entry, ...prev]);
      }
      setPersonName('');
      setOccasion('');
      setAmount('');
      setNote('');
      setPendingPhoto(null);
      setEditingId(null);
    } catch (err) {
      console.error('Failed to save gift entry', err);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (en) => {
    setEditingId(en.id);
    setPersonName(en.personName);
    setOccasion(en.occasion || '');
    setAmount(en.amount != null ? String(en.amount) : '');
    setNote(en.note || '');
    setPendingPhoto(en.photo || null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setPersonName('');
    setOccasion('');
    setAmount('');
    setNote('');
    setPendingPhoto(null);
  };

  const deleteEntry = async (id) => {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      await dbDelete('gifts', id);
      setEntries(prev => prev.filter(e => e.id !== id));
      if (editingId === id) cancelEdit();
    } catch (err) {
      console.error('Failed to delete gift entry', err);
    }
  };

  const filtered = entries.filter(e =>
    e.personName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.occasion || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bm-card" style={S.card}>
      {saveError && (
        <div className="bm-warn-banner" style={S.warnBanner}>
          <AlertTriangle size={22} />
          <div>
            <strong>{t.storageWarnTitle}</strong>
            <p style={{ margin: '4px 0 0 0' }}>{t.storageWarnBody}</p>
          </div>
        </div>
      )}

      {isEditing && (
        <div className="bm-edit-notice" style={S.editNotice}>
          <Pencil size={16} /> {t.editingNotice}
        </div>
      )}

      <div className="bm-grid2" style={S.grid2}>
        <div>
          <label className="bm-label" style={S.label}>{t.personLabel}</label>
          <input className="bm-input" style={S.input} value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder={t.personPh} />
        </div>
        <div>
          <label className="bm-label" style={S.label}>{t.occasionLabel}</label>
          <input className="bm-input" style={S.input} value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder={t.occasionPh} />
        </div>
      </div>

      <div className="bm-grid2" style={S.grid2}>
        <div>
          <label className="bm-label" style={S.label}>{t.amountLabel}</label>
          <input type="number" className="bm-input" style={S.input} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t.amountPh} />
        </div>
        <div>
          <label className="bm-label" style={S.label}>{t.noteLabel}</label>
          <input className="bm-input" style={S.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.notePh} />
        </div>
      </div>

      <PhotoPicker t={t} photo={pendingPhoto} onChange={handlePhotoChange} uploading={uploading} idSuffix="gifts" />

      <div className="bm-add-btn-row" style={S.addBtnRow}>
        <button className="bm-btn bm-btn-primary bm-shimmer" style={{ ...S.addBtn, width: isEditing ? 'auto' : '100%', flex: 1 }} onClick={addEntry} disabled={uploading || saving}>
          {isEditing ? <Save size={18} /> : <Plus size={18} />} {saving ? t.saving : (isEditing ? t.updateBtn : t.addBtn)}
        </button>
        {isEditing && (
          <button className="bm-btn bm-btn-secondary" style={S.cancelBtn} onClick={cancelEdit} disabled={saving}>
            <XCircle size={18} /> {t.cancelEditBtn}
          </button>
        )}
      </div>

      <hr style={{ margin: '25px 0', border: 'none', borderTop: '1px solid var(--border-soft)' }} />

      <label className="bm-label" style={S.label}><Search size={14} style={{ verticalAlign: 'middle' }} /> {t.searchPh}</label>
      <input className="bm-input" style={{ ...S.input, marginBottom: '20px' }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t.searchPh} />

      {filtered.length === 0 ? (
        <div className="bm-empty-state" style={S.emptyState}>
          <Gift size={56} color="var(--border-light)" />
          <p>{t.emptyGifts}</p>
        </div>
      ) : (
        filtered.map(en => (
          <div key={en.id} className="bm-entry-card" style={S.entryCard}>
            {en.photo ? (
              <img
                src={en.photo}
                alt={en.personName}
                className="bm-entry-photo" style={S.entryPhoto}
                onClick={() => setViewImage({ data: en.photo, title: en.personName, subtitle: `${en.occasion ? en.occasion + ' · ' : ''}📅 ${en.date}` })}
              />
            ) : (
              <div className="bm-entry-no-photo" style={S.entryNoPhoto}>{t.noPhoto}</div>
            )}
            <div style={{ flex: 1, minWidth: '150px' }}>
              <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>
                {en.personName}{en.amount != null && <span style={{ color: 'var(--primary)' }}> — ₹{en.amount.toFixed(2)}</span>}
              </p>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.85em', color: 'var(--text-muted)' }}>
                {en.occasion && `${en.occasion} · `}📅 {en.date}
              </p>
              {en.note && <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-faint)' }}>{en.note}</p>}
            </div>
            <div className="bm-entry-btn-col" style={S.entryBtnCol}>
              <button className="bm-btn bm-btn-warn" style={S.editBtn} onClick={() => startEdit(en)}>
                <Pencil size={14} /> {t.editBtn}
              </button>
              <button className="bm-btn bm-btn-danger" style={S.deleteBtn} onClick={() => deleteEntry(en.id)}>
                <Trash2 size={14} /> {t.deleteBtn}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ============================================================
   GR SECTION (Goods Return) — apna alag function, IndexedDB
   'gr' store. Bills wale hi pattern par: photo compress karke
   base64 mein IndexedDB mein save hoti hai, isliye refresh ke
   baad bhi data/photo erase nahi hoti aur photo hamesha
   clickable rehti hai (full-screen view + download).
   ============================================================ */
function GRSection({ t, entries, setEntries, setViewImage }) {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [grNumber, setGrNumber] = useState('');
  const [partyName, setPartyName] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [editingId, setEditingId] = useState(null);
  const isEditing = editingId !== null;

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
    if (!partyName.trim()) {
      alert(t.missingInfo);
      return;
    }
    const original = isEditing ? entries.find(e => e.id === editingId) : null;
    const entry = {
      id: isEditing ? editingId : Date.now() + Math.random(),
      grNumber: grNumber.trim(),
      partyName: partyName.trim(),
      amount: amount ? (parseFloat(amount) || 0) : null,
      reason: reason.trim(),
      photo: pendingPhoto,
      date: selectedDate,
      createdAt: original ? original.createdAt : new Date().toLocaleString(t.dateLocale),
    };
    setSaving(true);
    setSaveError(false);
    try {
      await dbPut('gr', entry);
      if (isEditing) {
        setEntries(prev => prev.map(e => (e.id === entry.id ? entry : e)));
      } else {
        setEntries(prev => [entry, ...prev]);
      }
      setGrNumber('');
      setPartyName('');
      setAmount('');
      setReason('');
      setPendingPhoto(null);
      setSelectedDate(todayStr());
      setEditingId(null);
    } catch (err) {
      console.error('Failed to save GR entry', err);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (en) => {
    setEditingId(en.id);
    setSelectedDate(en.date);
    setGrNumber(en.grNumber || '');
    setPartyName(en.partyName);
    setAmount(en.amount != null ? String(en.amount) : '');
    setReason(en.reason || '');
    setPendingPhoto(en.photo || null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setGrNumber('');
    setPartyName('');
    setAmount('');
    setReason('');
    setPendingPhoto(null);
    setSelectedDate(todayStr());
  };

  const deleteEntry = async (id) => {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      await dbDelete('gr', id);
      setEntries(prev => prev.filter(e => e.id !== id));
      if (editingId === id) cancelEdit();
    } catch (err) {
      console.error('Failed to delete GR entry', err);
    }
  };

  const uniqueDates = [...new Set(entries.map(e => e.date))].sort().reverse();
  const todayCount = entries.filter(e => e.date === todayStr()).length;
  const totalAmount = entries.reduce((s, e) => s + (e.amount || 0), 0);

  const getFiltered = () => {
    let list = filterDate === 'all' ? [...entries] : entries.filter(e => e.date === filterDate);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(e =>
        e.partyName.toLowerCase().includes(q) ||
        (e.grNumber || '').toLowerCase().includes(q) ||
        (e.reason || '').toLowerCase().includes(q)
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

  return (
    <div className="bm-card" style={S.card}>
      {saveError && (
        <div className="bm-warn-banner" style={S.warnBanner}>
          <AlertTriangle size={22} />
          <div>
            <strong>{t.storageWarnTitle}</strong>
            <p style={{ margin: '4px 0 0 0' }}>{t.storageWarnBody}</p>
          </div>
        </div>
      )}

      {isEditing && (
        <div className="bm-edit-notice" style={S.editNotice}>
          <Pencil size={16} /> {t.editingNotice}
        </div>
      )}

      <div className="bm-grid2" style={S.grid2}>
        <div>
          <label className="bm-label" style={S.label}>{t.dateLabel}</label>
          <input type="date" className="bm-input" style={S.input} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>
        <div>
          <label className="bm-label" style={S.label}>{t.grPartyLabel}</label>
          <input className="bm-input" style={S.input} value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder={t.grPartyPh} />
        </div>
      </div>

      <div className="bm-grid2" style={S.grid2}>
        <div>
          <label className="bm-label" style={S.label}><Hash size={14} style={{ verticalAlign: 'middle' }} /> {t.grNumberLabel}</label>
          <input className="bm-input" style={S.input} value={grNumber} onChange={(e) => setGrNumber(e.target.value)} placeholder={t.grNumberPh} />
        </div>
        <div>
          <label className="bm-label" style={S.label}>{t.grAmountLabel}</label>
          <input type="number" className="bm-input" style={S.input} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t.amountPh} />
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label className="bm-label" style={S.label}>{t.reasonLabel}</label>
        <input className="bm-input" style={S.input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t.reasonPh} />
      </div>

      <PhotoPicker t={t} photo={pendingPhoto} onChange={handlePhotoChange} uploading={uploading} idSuffix="gr" />

      <div className="bm-add-btn-row" style={S.addBtnRow}>
        <button className="bm-btn bm-btn-primary bm-shimmer" style={{ ...S.addBtn, width: isEditing ? 'auto' : '100%', flex: 1 }} onClick={addEntry} disabled={uploading || saving}>
          {isEditing ? <Save size={18} /> : <Plus size={18} />} {saving ? t.saving : (isEditing ? t.updateBtn : t.addBtn)}
        </button>
        {isEditing && (
          <button className="bm-btn bm-btn-secondary" style={S.cancelBtn} onClick={cancelEdit} disabled={saving}>
            <XCircle size={18} /> {t.cancelEditBtn}
          </button>
        )}
      </div>

      <hr style={{ margin: '25px 0', border: 'none', borderTop: '1px solid var(--border-soft)' }} />

      <div className="bm-stat-row" style={S.statRow}>
        <div className="bm-stat-box" style={S.statBox}><p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)' }}>{t.grToday}</p><p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2em', color: 'var(--primary)' }}>{todayCount}</p></div>
        <div className="bm-stat-box" style={S.statBox}><p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)' }}>{t.grTotal}</p><p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2em', color: 'var(--primary2)' }}>{entries.length}</p></div>
        <div className="bm-stat-box" style={S.statBox}><p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)' }}>{t.grTotalAmount}</p><p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2em', color: 'var(--danger)' }}>₹{totalAmount.toFixed(2)}</p></div>
      </div>

      <div className="bm-grid2" style={S.grid2}>
        <div>
          <label className="bm-label" style={S.label}><Search size={14} style={{ verticalAlign: 'middle' }} /> {t.searchPh}</label>
          <input className="bm-input" style={S.input} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t.searchPh} />
        </div>
        <div>
          <label className="bm-label" style={S.label}>{t.allDates}</label>
          <select className="bm-input" style={S.input} value={filterDate} onChange={(e) => setFilterDate(e.target.value)}>
            <option value="all">{t.allDates}</option>
            {uniqueDates.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="bm-label" style={S.label}>Sort</label>
          <select className="bm-input" style={S.input} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">{t.sortNewest}</option>
            <option value="oldest">{t.sortOldest}</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bm-empty-state" style={S.emptyState}>
          <RotateCcw size={56} color="var(--border-light)" />
          <p>{t.emptyGR}</p>
        </div>
      ) : (
        filtered.map(en => (
          <div key={en.id} className="bm-entry-card" style={S.entryCard}>
            {en.photo ? (
              <img
                src={en.photo}
                alt={en.partyName}
                className="bm-entry-photo" style={S.entryPhoto}
                onClick={() => setViewImage({
                  data: en.photo,
                  title: en.grNumber ? `${en.partyName} · ${en.grNumber}` : en.partyName,
                  subtitle: `📅 ${en.date} · ⏰ ${en.createdAt}`,
                })}
              />
            ) : (
              <div className="bm-entry-no-photo" style={S.entryNoPhoto}>{t.noPhoto}</div>
            )}
            <div style={{ flex: 1, minWidth: '150px' }}>
              <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>
                {en.partyName}
                {en.grNumber && <span style={{ color: 'var(--primary)' }}> · {en.grNumber}</span>}
                {en.amount != null && <span style={{ color: 'var(--danger)' }}> — ₹{en.amount.toFixed(2)}</span>}
              </p>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.85em', color: 'var(--text-muted)' }}>📅 {en.date} · ⏰ {en.createdAt}</p>
              {en.reason && <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-faint)' }}>{en.reason}</p>}
            </div>
            <div className="bm-entry-btn-col" style={S.entryBtnCol}>
              <button className="bm-btn bm-btn-warn" style={S.editBtn} onClick={() => startEdit(en)}>
                <Pencil size={14} /> {t.editBtn}
              </button>
              <button className="bm-btn bm-btn-danger" style={S.deleteBtn} onClick={() => deleteEntry(en.id)}>
                <Trash2 size={14} /> {t.deleteBtn}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
