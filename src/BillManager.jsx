import React, { useState, useEffect, useRef } from 'react';
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
    todayReceived: 'आज लिया',
    todayGiven: 'आज दिया',
    todayNet: 'आज का बकाया',
    selectedTotalsNote: '📅 नीचे चुनी गई तारीख के हिसाब से',
    dateLocale: 'hi-IN',
    footer: 'आपका सारा डेटा इसी डिवाइस में सुरक्षित रहता है 🔒 (IndexedDB — जितना चाहें उतना डेटा)',
    loadError: '⚠️ डेटा लोड करने में समस्या आई। कृपया page reload करें।',
    storageUsed: 'Storage उपयोग',
    storageOf: 'में से',
    storageAvailable: 'उपलब्ध — रोज़ाना डेटा डिलीट करने की ज़रूरत नहीं',
    storageHide: 'साइड में छिपाएं',
    storageShow: 'Storage जानकारी दिखाएं',
    voiceLabel: 'बोलकर भरें',
    voiceListening: 'सुन रहा हूं...',
    voiceCancel: '✖️ रोकें',
    voiceAutoSaveIn: 'अपने आप Save हो रहा है...',
    voiceHint: 'माइक दबाएं और बोलें, जैसे: "रमेश को 500 दिया शादी के लिए"',
    voiceNoAmount: '⚠️ राशि समझ नहीं आई, कृपया चेक करके खुद Save करें',
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
    todayReceived: 'Received Today',
    todayGiven: 'Given Today',
    todayNet: "Today's Net",
    selectedTotalsNote: '📅 Based on the date selected below',
    dateLocale: 'en-IN',
    footer: 'All your data stays safely on this device 🔒 (IndexedDB — store as much as you need)',
    loadError: '⚠️ There was a problem loading your data. Please reload the page.',
    storageUsed: 'Storage used',
    storageOf: 'of',
    storageAvailable: 'available — no need to delete data daily',
    storageHide: 'Hide to side',
    storageShow: 'Show storage info',
    voiceLabel: 'Speak to fill',
    voiceListening: 'Listening...',
    voiceCancel: '✖️ Stop',
    voiceAutoSaveIn: 'Auto-saving...',
    voiceHint: 'Tap the mic and say something like: "Give Ramesh 500 for wedding"',
    voiceNoAmount: "⚠️ Couldn't catch the amount, please check and save manually",
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

/* ------------------------------------------------------------
   PERFORMANCE FIX: pehle list mein har entry ka photo full
   1000px-wide image ke roop mein hi dikhta tha, chahe woh
   screen par sirf 80x80px ke chhote box mein ho — matlab
   browser ko har card ke liye poori badi image decode karni
   padti thi. Jyada entries hone par yehi mobile par "hang" aur
   glitch ka sabse bada karan tha.

   Ab photo add karte waqt EK hi baar mein do versions banate
   hain: ek chhota sa "thumb" (list mein dikhane ke liye) aur
   ek full-size photo (sirf tab load hota/dikhta hai jab user
   photo par tap karke bada dekhta hai). List humesha thumb use
   karti hai, isliye scroll aur render bahut halka ho jaata hai.
   ------------------------------------------------------------ */
function compressImageVariants(file, opts = {}) {
  const {
    fullWidth = 1000, fullQuality = 0.7,
    thumbWidth = 220, thumbQuality = 0.6,
  } = opts;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const makeVariant = (maxWidth, quality) => {
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
          return canvas.toDataURL('image/jpeg', quality);
        };
        try {
          const full = makeVariant(fullWidth, fullQuality);
          const thumb = makeVariant(thumbWidth, thumbQuality);
          resolve({ full, thumb });
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
   DATE-WISE GROUPING HELPER
   Har list (bills/ledger/gifts/gr) ko date ke hisaab se alag-alag
   "din" ke groups mein todta hai — taaki aaj ka data hamesha
   apne alag box/section mein rahe, aur purane dino ke data ke
   saath kabhi merge/mix na ho. Naye din pehle (sabse upar) aate
   hain.
   ============================================================ */
function groupEntriesByDate(list, dateKey = 'date') {
  const map = new Map();
  for (const item of list) {
    const d = item[dateKey] || 'unknown';
    if (!map.has(d)) map.set(d, []);
    map.get(d).push(item);
  }
  // dates ko newest-first order mein sort karo (group ke andar item order jaisa filtered list mein tha waisa hi rehta hai)
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0));
}

function formatDateGroupLabel(dateStr, lang) {
  if (!dateStr || dateStr === 'unknown') return lang === 'hi' ? 'तारीख अज्ञात' : 'Unknown date';
  const today = todayStr();
  const yestDate = new Date();
  yestDate.setDate(yestDate.getDate() - 1);
  const yesterday = yestDate.toISOString().split('T')[0];
  if (dateStr === today) return lang === 'hi' ? `आज · ${dateStr}` : `Today · ${dateStr}`;
  if (dateStr === yesterday) return lang === 'hi' ? `कल · ${dateStr}` : `Yesterday · ${dateStr}`;
  return dateStr;
}

/* Har din ke group ka header — isse visually saaf pata chalta hai ki
   yeh entries kis din ki hain, aur agla din shuru hote hi naya header
   aa jaata hai (isliye data kabhi merge hua nahi dikhta) */
function DateGroupHeader({ dateStr, lang, count }) {
  return (
    <div
      className="bm-date-group-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        margin: '18px 0 10px 0',
        padding: '8px 12px',
        borderRadius: '10px',
        background: 'var(--surface-2, rgba(127,127,127,0.08))',
        borderLeft: '4px solid var(--primary)',
      }}
    >
      <span style={{ fontWeight: 'bold', fontSize: '0.95em' }}>📅 {formatDateGroupLabel(dateStr, lang)}</span>
      <span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>{count}</span>
    </div>
  );
}

/* ============================================================
   VOICE ENTRY — bol kar entry bharo
   Browser ka built-in Speech Recognition (Chrome/Edge) use hota
   hai. Bolne ke baad text ko parse karke naam, raashi, type,
   aur bacha hua note/reason/occasion apne aap nikal liya jaata
   hai — form khud bhar jaata hai aur (agar sab zaroori cheez
   mil gayi) khud hi save bhi ho jaata hai.
   ============================================================ */
function getSpeechRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

const VOICE_GIVE_WORDS = ['diya', 'diye', 'दिया', 'दिये', 'udhaar', 'उधार', 'becha', 'बेचा', 'gave', 'give', 'lent', 'paid', 'pay'];
const VOICE_RECEIVE_WORDS = ['liya', 'लिया', 'mila', 'मिला', 'received', 'receive', 'got', 'take', 'took'];
const VOICE_FILLER_WORDS = [
  'ko', 'के', 'ke', 'से', 'se', 'ने', 'ne', 'ka', 'का', 'ki', 'की', 'ke', 'की', 'rupaye', 'rupees', 'rupya', 'rupye',
  'rupiya', 'रुपए', 'रुपये', 'rs', 'rs.', '₹', 'the', 'a', 'an', 'is', 'hai', 'है', 'liye', 'लिए', 'kyunki', 'क्योंकि',
  'because', 'for', 'amount', 'entry', 'add', 'karo', 'करो', 'bill'
];

/* Raw bola hua text -> {name, amount, type, rest} nikaalta hai */
function parseVoiceText(raw) {
  if (!raw) return { name: '', amount: null, type: null, rest: '' };
  let text = raw.trim();
  const lower = text.toLowerCase();

  // ---- amount: pehla number jo mile ----
  const numMatch = text.match(/(\d+(?:[.,]\d+)?)/);
  const amount = numMatch ? parseFloat(numMatch[1].replace(',', '')) : null;

  // ---- type: diya (given) ya liya (received) ----
  let type = null;
  if (VOICE_GIVE_WORDS.some(w => lower.includes(w.toLowerCase()))) type = 'given';
  else if (VOICE_RECEIVE_WORDS.some(w => lower.includes(w.toLowerCase()))) type = 'received';

  // ---- number aur filler words hata kar bacha hua text nikaalo ----
  let cleaned = text;
  if (numMatch) cleaned = cleaned.replace(numMatch[1], ' ');
  const words = cleaned.split(/\s+/).filter(Boolean).filter(w => {
    const wl = w.toLowerCase().replace(/[.,!?]/g, '');
    return wl && !VOICE_FILLER_WORDS.includes(wl) && !VOICE_GIVE_WORDS.includes(wl) && !VOICE_RECEIVE_WORDS.includes(wl);
  });

  // Pehle shabd (ya do, agar sirf do hi bache hon) naam maana jaata hai, baaki note/occasion/reason
  const name = words.length <= 2 ? words.join(' ') : words.slice(0, 1).join(' ');
  const rest = words.length <= 2 ? '' : words.slice(1).join(' ');

  return { name, amount, type, rest };
}

/* Reusable mic button — press karo, bolo, chhod do */
function VoiceButton({ lang, onResult, label, listeningLabel, compact }) {
  const [listening, setListening] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const recogRef = useRef(null);

  const start = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) { setUnsupported(true); return; }
    const recog = new Ctor();
    recog.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    recog.onstart = () => setListening(true);
    recog.onerror = () => setListening(false);
    recog.onend = () => setListening(false);
    recog.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript || '';
      if (transcript) onResult(transcript);
    };
    recogRef.current = recog;
    try { recog.start(); } catch { setUnsupported(true); }
  };

  const stop = () => {
    try { recogRef.current && recogRef.current.stop(); } catch {}
    setListening(false);
  };

  if (unsupported) {
    return (
      <span className="bm-voice-unsupported">
        🎤 Voice entry is not supported in this browser — try Chrome / Edge.
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      className={`bm-voice-btn ${listening ? 'bm-voice-btn-active' : ''} ${compact ? 'bm-voice-btn-compact' : ''}`}
      title={listening ? listeningLabel : label}
    >
      {listening ? <span className="bm-voice-pulse-dot" /> : null}
      🎤 {listening ? listeningLabel : label}
    </button>
  );
}

/* Chhota banner jo dikhata hai "voice se samjha X, Y sec me save ho raha hai" */
function VoiceAutoSaveBanner({ preview, secondsLabel, cancelLabel, onCancel }) {
  return (
    <div className="bm-voice-banner">
      <span className="bm-voice-banner-dot" />
      <div className="bm-voice-banner-text">
        <strong>🎤 {preview}</strong>
        <span>{secondsLabel}</span>
      </div>
      <button type="button" className="bm-voice-cancel-btn" onClick={onCancel}>{cancelLabel}</button>
    </div>
  );
}

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

   PERFORMANCE FIX: yeh poora <style> block (sainkdon lines ka CSS)
   pehle BillManager ke andar plain function ke roop mein tha,
   isliye jab bhi app mein kuch bhi badalta (tab switch, entry
   add/delete/edit, mode/theme toggle), yeh poora dobara chalta
   aur React ise dobara reconcile karta — mobile par yeh
   "hang/glitch" mehsoos hota tha. React.memo se ab yeh sirf
   ek baar banta hai aur baaki re-renders mein skip ho jaata hai.
   ============================================================ */
const GlobalStyles = React.memo(function GlobalStyles() {
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

      /* Pehle yeh animation hamesha (infinite) chalta rehta tha, chahe screen
         par kuch bhi ho raha ho — mobile par isse continuous repaint hota
         tha aur app janky/heavy feel hota tha. Ab sirf ek baar chalta hai. */
      .bm-storage-fill { animation: bmShimmerBar 1.4s ease-out 1; }
      @keyframes bmShimmerBar { 0% { background-position: 200% 0; } 100% { background-position: 0 0; } }

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

      /* ================= voice entry ================= */
      .bm-voice-row { display: flex; gap: 8px; align-items: stretch; }
      .bm-voice-row .bm-input { flex: 1; }

      .bm-voice-btn {
        display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
        background: linear-gradient(135deg, var(--primary), var(--primary2)); color: white;
        border: none; border-radius: 10px; padding: 0 16px; font-weight: bold; font-size: 0.85em;
        cursor: pointer; transition: transform 0.2s ease, box-shadow 0.25s ease, filter 0.2s ease;
        box-shadow: 0 6px 14px rgba(102,126,234,0.3); position: relative;
      }
      .bm-voice-btn:hover { transform: translateY(-2px); filter: brightness(1.06); box-shadow: 0 10px 20px rgba(102,126,234,0.4); }
      .bm-voice-btn:active { transform: translateY(0) scale(0.97); }
      .bm-voice-btn-compact { padding: 0 14px; font-size: 0.8em; }
      .bm-voice-btn-active {
        background: linear-gradient(135deg, var(--danger), #ff9a6b);
        box-shadow: 0 0 0 0 rgba(255,107,107,0.6);
        animation: bmVoicePulseRing 1.4s ease-out infinite;
      }
      @keyframes bmVoicePulseRing {
        0% { box-shadow: 0 0 0 0 rgba(255,107,107,0.55); }
        70% { box-shadow: 0 0 0 12px rgba(255,107,107,0); }
        100% { box-shadow: 0 0 0 0 rgba(255,107,107,0); }
      }
      .bm-voice-pulse-dot {
        width: 8px; height: 8px; border-radius: 50%; background: white; display: inline-block;
        animation: bmDotBlink 1s ease-in-out infinite;
      }
      @keyframes bmDotBlink { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.7); } }

      .bm-voice-hint { margin: -12px 0 18px 0; font-size: 0.8em; color: var(--text-faint); font-style: italic; }
      .bm-voice-warning {
        margin: -12px 0 18px 0; font-size: 0.82em; color: var(--warn-text); background: var(--warn-bg);
        border: 1px solid var(--warn-border); border-radius: 8px; padding: 8px 12px; animation: bmShake 0.4s ease;
      }
      .bm-voice-unsupported { font-size: 0.78em; color: var(--text-faint); }

      .bm-voice-banner {
        display: flex; align-items: center; gap: 12px; background: var(--info-bg); border: 2px solid var(--primary);
        border-radius: 12px; padding: 12px 16px; margin: -6px 0 18px 0; animation: bmSlideIn 0.3s ease;
      }
      .bm-voice-banner-dot {
        width: 10px; height: 10px; border-radius: 50%; background: var(--primary); flex-shrink: 0;
        animation: bmDotBlink 0.9s ease-in-out infinite;
      }
      .bm-voice-banner-text { display: flex; flex-direction: column; gap: 2px; flex: 1; font-size: 0.85em; color: var(--info-text); }
      .bm-voice-cancel-btn {
        background: rgba(0,0,0,0.06); color: var(--text-strong); border: none; border-radius: 8px;
        padding: 8px 12px; font-weight: bold; font-size: 0.8em; cursor: pointer; white-space: nowrap;
        transition: background 0.2s ease, transform 0.2s ease;
      }
      .bm-voice-cancel-btn:hover { background: rgba(0,0,0,0.12); transform: translateY(-1px); }
    `}</style>
  );
});

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
              <BillsSection t={t} lang={lang} bills={bills} setBills={setBills} setViewImage={setViewImage} />
            )}
            {activeTab === 'ledger' && (
              <LedgerSection t={t} lang={lang} entries={ledgerEntries} setEntries={setLedgerEntries} setViewImage={setViewImage} />
            )}
            {activeTab === 'gifts' && (
              <GiftsSection t={t} lang={lang} entries={giftEntries} setEntries={setGiftEntries} setViewImage={setViewImage} />
            )}
            {activeTab === 'gr' && (
              <GRSection t={t} lang={lang} entries={grEntries} setEntries={setGrEntries} setViewImage={setViewImage} />
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
function BillsSection({ t, lang, bills, setBills, setViewImage }) {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [billName, setBillName] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [pendingPhotoThumb, setPendingPhotoThumb] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [editingId, setEditingId] = useState(null); // null = naya add ho raha hai, warna us id ki entry edit ho rahi hai
  const isEditing = editingId !== null;

  // ---- voice entry: bol kar bill ka naam bharo, photo lagate hi khud save ----
  const [autoSavePending, setAutoSavePending] = useState(false);
  const [autoSavePreview, setAutoSavePreview] = useState('');
  const addBillRef = useRef(() => {});
  const pendingVoiceSaveRef = useRef(false);
  const autoSaveTimerRef = useRef(null);

  const scheduleAutoSave = (preview) => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSavePreview(preview);
    setAutoSavePending(true);
    autoSaveTimerRef.current = setTimeout(() => {
      addBillRef.current();
      setAutoSavePending(false);
    }, 1800);
  };

  const cancelAutoSave = () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSavePending(false);
    pendingVoiceSaveRef.current = false;
  };

  const handleVoiceResult = (transcript) => {
    const name = transcript.trim();
    setBillName(name);
    if (pendingPhoto) {
      scheduleAutoSave(name || 'Bill');
    } else {
      pendingVoiceSaveRef.current = true;
    }
  };

  const handlePhotoChange = async (file) => {
    if (!file) { setPendingPhoto(null); setPendingPhotoThumb(null); cancelAutoSave(); return; }
    setUploading(true);
    try {
      const { full, thumb } = await compressImageVariants(file);
      setPendingPhoto(full);
      setPendingPhotoThumb(thumb);
      if (pendingVoiceSaveRef.current) {
        pendingVoiceSaveRef.current = false;
        scheduleAutoSave(billName || 'Bill');
      }
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
      photoThumb: pendingPhotoThumb,
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
      setPendingPhotoThumb(null);
      setEditingId(null);
      setSelectedDate(todayStr());
    } catch (err) {
      console.error('Failed to save bill', err);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => { addBillRef.current = addBill; });

  const startEdit = (b) => {
    setEditingId(b.id);
    setSelectedDate(b.date);
    setBillName(b.name);
    setPendingPhoto(b.photo);
    setPendingPhotoThumb(b.photoThumb || b.photo || null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setBillName('');
    setPendingPhoto(null);
    setPendingPhotoThumb(null);
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
          <div className="bm-voice-row">
            <input className="bm-input" style={S.input} value={billName} onChange={(e) => { setBillName(e.target.value); cancelAutoSave(); }} placeholder="e.g. Electricity bill" />
            <VoiceButton lang={lang} onResult={handleVoiceResult} label={t.voiceLabel} listeningLabel={t.voiceListening} compact />
          </div>
        </div>
      </div>
      <p className="bm-voice-hint">{t.voiceHint}</p>

      <PhotoPicker t={t} photo={pendingPhoto} onChange={handlePhotoChange} uploading={uploading} idSuffix="bills" />

      {autoSavePending && (
        <VoiceAutoSaveBanner
          preview={autoSavePreview}
          secondsLabel={t.voiceAutoSaveIn}
          cancelLabel={t.voiceCancel}
          onCancel={cancelAutoSave}
        />
      )}

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
        groupEntriesByDate(filtered).map(([dateStr, items]) => (
          <div key={dateStr} className="bm-date-group">
            <DateGroupHeader dateStr={dateStr} lang={lang} count={items.length} />
            {items.map(b => (
              <div key={b.id} className="bm-entry-card" style={S.entryCard}>
                <img
                  src={b.photoThumb || b.photo}
                  alt={b.name}
                  className="bm-entry-photo" style={S.entryPhoto} loading="lazy" decoding="async"
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
            ))}
          </div>
        ))
      )}
    </div>
  );
}

/* ============================================================
   LEDGER SECTION — apna alag function, IndexedDB 'ledger' store
   ============================================================ */
function LedgerSection({ t, lang, entries, setEntries, setViewImage }) {
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState('received');
  const [note, setNote] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [pendingPhotoThumb, setPendingPhotoThumb] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // Date-wise filter: default 'today' rakha hai taaki jo total/balance dikhe
  // woh sirf AAJ ke transactions ka ho — pehle yeh hamesha SAARE dino ki
  // entries jod kar dikhata tha, isliye "aaj ka total" mein kal-parson ka
  // paisa bhi mix ho jaata tha. Ab dropdown se koi bhi din chuno ya
  // "sabhi tareekhein" select karke poora hisaab dekho.
  const [filterDate, setFilterDate] = useState(todayStr());
  const [editingId, setEditingId] = useState(null);
  const isEditing = editingId !== null;

  // ---- voice entry: bol kar naam + raashi bharo, sahi mile to khud save ----
  const [autoSavePending, setAutoSavePending] = useState(false);
  const [autoSavePreview, setAutoSavePreview] = useState('');
  const [voiceWarning, setVoiceWarning] = useState('');
  const addEntryRef = useRef(() => {});
  const autoSaveTimerRef = useRef(null);

  const scheduleAutoSave = (preview) => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSavePreview(preview);
    setAutoSavePending(true);
    autoSaveTimerRef.current = setTimeout(() => {
      addEntryRef.current();
      setAutoSavePending(false);
    }, 1800);
  };

  const cancelAutoSave = () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSavePending(false);
  };

  const handleVoiceResult = (transcript) => {
    setVoiceWarning('');
    const parsed = parseVoiceText(transcript);
    if (parsed.name) setPersonName(parsed.name);
    if (parsed.amount != null) setAmount(String(parsed.amount));
    if (parsed.type) setTransactionType(parsed.type);
    if (parsed.rest) setNote(parsed.rest);

    if (parsed.name && parsed.amount != null) {
      scheduleAutoSave(`${parsed.name} — ₹${parsed.amount}`);
    } else {
      setVoiceWarning(t.voiceNoAmount);
    }
  };

  const handlePhotoChange = async (file) => {
    if (!file) { setPendingPhoto(null); setPendingPhotoThumb(null); return; }
    setUploading(true);
    try {
      const { full, thumb } = await compressImageVariants(file);
      setPendingPhoto(full);
      setPendingPhotoThumb(thumb);
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
      photoThumb: pendingPhotoThumb,
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
      setPendingPhotoThumb(null);
      setTransactionType('received');
      setEditingId(null);
    } catch (err) {
      console.error('Failed to save ledger entry', err);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => { addEntryRef.current = addEntry; });

  const startEdit = (en) => {
    setEditingId(en.id);
    setPersonName(en.personName);
    setAmount(String(en.amount));
    setTransactionType(en.transactionType);
    setNote(en.note || '');
    setPendingPhoto(en.photo || null);
    setPendingPhotoThumb(en.photoThumb || en.photo || null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setPersonName('');
    setAmount('');
    setNote('');
    setPendingPhoto(null);
    setPendingPhotoThumb(null);
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

  const uniqueDates = [...new Set(entries.map(e => e.date))].sort().reverse();

  // Sirf date se filter kiya hua list (dropdown ke hisaab se) — stat totals
  // isi list se nikalte hain, taaki alag-alag din ka hisaab kabhi mix na ho.
  const dateFiltered = filterDate === 'all' ? entries : entries.filter(e => e.date === filterDate);
  const filtered = dateFiltered.filter(e => e.personName.toLowerCase().includes(searchTerm.toLowerCase()));

  const totalGiven = dateFiltered.filter(e => e.transactionType === 'given').reduce((s, e) => s + e.amount, 0);
  const totalReceived = dateFiltered.filter(e => e.transactionType === 'received').reduce((s, e) => s + e.amount, 0);
  const net = totalReceived - totalGiven;

  // "Aaj" ka hisaab hamesha sirf aaj ki entries se nikalta hai, dropdown
  // mein chahe koi bhi date selected ho — isse hamesha pata chalta rahega
  // ki aaj ka number sirf aaj ka hai.
  const todaysEntries = entries.filter(e => e.date === todayStr());
  const todayGivenTotal = todaysEntries.filter(e => e.transactionType === 'given').reduce((s, e) => s + e.amount, 0);
  const todayReceivedTotal = todaysEntries.filter(e => e.transactionType === 'received').reduce((s, e) => s + e.amount, 0);
  const todayNetTotal = todayReceivedTotal - todayGivenTotal;

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
          <div className="bm-voice-row">
            <input className="bm-input" style={S.input} value={personName} onChange={(e) => { setPersonName(e.target.value); cancelAutoSave(); }} placeholder={t.personPh} />
            <VoiceButton lang={lang} onResult={handleVoiceResult} label={t.voiceLabel} listeningLabel={t.voiceListening} compact />
          </div>
        </div>
        <div>
          <label className="bm-label" style={S.label}>{t.amountLabel}</label>
          <input type="number" className="bm-input" style={S.input} value={amount} onChange={(e) => { setAmount(e.target.value); cancelAutoSave(); }} placeholder={t.amountPh} />
        </div>
      </div>
      <p className="bm-voice-hint">{t.voiceHint}</p>
      {voiceWarning && <p className="bm-voice-warning">{voiceWarning}</p>}

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

      {autoSavePending && (
        <VoiceAutoSaveBanner
          preview={autoSavePreview}
          secondsLabel={t.voiceAutoSaveIn}
          cancelLabel={t.voiceCancel}
          onCancel={cancelAutoSave}
        />
      )}

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

      {/* Yeh row hamesha sirf AAJ ka hisaab dikhata hai, dropdown filter se koi farak nahi padta */}
      <div className="bm-stat-row" style={S.statRow}>
        <div className="bm-stat-box" style={S.statBox}><p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)' }}>{t.todayReceived}</p><p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2em', color: 'var(--success)' }}>₹{todayReceivedTotal.toFixed(2)}</p></div>
        <div className="bm-stat-box" style={S.statBox}><p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)' }}>{t.todayGiven}</p><p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2em', color: 'var(--danger)' }}>₹{todayGivenTotal.toFixed(2)}</p></div>
        <div className="bm-stat-box" style={S.statBox}><p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)' }}>{t.todayNet}</p><p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2em', color: todayNetTotal >= 0 ? 'var(--success)' : 'var(--danger)' }}>₹{todayNetTotal.toFixed(2)}</p></div>
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
      </div>

      {/* Yeh row selected date/filter ke hisaab se hai — dropdown badalne par yeh bhi badlega */}
      <p style={{ margin: '0 0 8px 0', fontSize: '0.8em', color: 'var(--text-faint)' }}>{t.selectedTotalsNote}</p>
      <div className="bm-stat-row" style={S.statRow}>
        <div className="bm-stat-box" style={S.statBox}><p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)' }}>{t.balanceReceived}</p><p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2em', color: 'var(--success)' }}>₹{totalReceived.toFixed(2)}</p></div>
        <div className="bm-stat-box" style={S.statBox}><p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)' }}>{t.balanceGiven}</p><p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2em', color: 'var(--danger)' }}>₹{totalGiven.toFixed(2)}</p></div>
        <div className="bm-stat-box" style={S.statBox}><p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)' }}>{t.netBalance}</p><p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2em', color: net >= 0 ? 'var(--success)' : 'var(--danger)' }}>₹{net.toFixed(2)}</p></div>
      </div>

      {filtered.length === 0 ? (
        <div className="bm-empty-state" style={S.emptyState}>
          <BookOpen size={56} color="var(--border-light)" />
          <p>{t.emptyLedger}</p>
        </div>
      ) : (
        groupEntriesByDate(filtered).map(([dateStr, items]) => (
          <div key={dateStr} className="bm-date-group">
            <DateGroupHeader dateStr={dateStr} lang={lang} count={items.length} />
            {items.map(en => (
              <div key={en.id} className="bm-entry-card" style={S.entryCard}>
                {en.photo ? (
                  <img
                    src={en.photoThumb || en.photo}
                    alt={en.personName}
                    className="bm-entry-photo" style={S.entryPhoto} loading="lazy" decoding="async"
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
            ))}
          </div>
        ))
      )}
    </div>
  );
}

/* ============================================================
   GIFTS SECTION — apna alag function, IndexedDB 'gifts' store
   ============================================================ */
function GiftsSection({ t, lang, entries, setEntries, setViewImage }) {
  const [personName, setPersonName] = useState('');
  const [occasion, setOccasion] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [pendingPhotoThumb, setPendingPhotoThumb] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const isEditing = editingId !== null;

  // ---- voice entry: bol kar naam + occasion + raashi bharo, khud save ----
  const [autoSavePending, setAutoSavePending] = useState(false);
  const [autoSavePreview, setAutoSavePreview] = useState('');
  const addEntryRef = useRef(() => {});
  const autoSaveTimerRef = useRef(null);

  const scheduleAutoSave = (preview) => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSavePreview(preview);
    setAutoSavePending(true);
    autoSaveTimerRef.current = setTimeout(() => {
      addEntryRef.current();
      setAutoSavePending(false);
    }, 1800);
  };

  const cancelAutoSave = () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSavePending(false);
  };

  const handleVoiceResult = (transcript) => {
    const parsed = parseVoiceText(transcript);
    if (parsed.name) setPersonName(parsed.name);
    if (parsed.amount != null) setAmount(String(parsed.amount));
    if (parsed.rest) setOccasion(parsed.rest);

    if (parsed.name) {
      scheduleAutoSave(parsed.amount != null ? `${parsed.name} — ₹${parsed.amount}` : parsed.name);
    }
  };

  const handlePhotoChange = async (file) => {
    if (!file) { setPendingPhoto(null); setPendingPhotoThumb(null); return; }
    setUploading(true);
    try {
      const { full, thumb } = await compressImageVariants(file);
      setPendingPhoto(full);
      setPendingPhotoThumb(thumb);
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
      photoThumb: pendingPhotoThumb,
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
      setPendingPhotoThumb(null);
      setEditingId(null);
    } catch (err) {
      console.error('Failed to save gift entry', err);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => { addEntryRef.current = addEntry; });

  const startEdit = (en) => {
    setEditingId(en.id);
    setPersonName(en.personName);
    setOccasion(en.occasion || '');
    setAmount(en.amount != null ? String(en.amount) : '');
    setNote(en.note || '');
    setPendingPhoto(en.photo || null);
    setPendingPhotoThumb(en.photoThumb || en.photo || null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setPersonName('');
    setOccasion('');
    setAmount('');
    setNote('');
    setPendingPhoto(null);
    setPendingPhotoThumb(null);
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
          <div className="bm-voice-row">
            <input className="bm-input" style={S.input} value={personName} onChange={(e) => { setPersonName(e.target.value); cancelAutoSave(); }} placeholder={t.personPh} />
            <VoiceButton lang={lang} onResult={handleVoiceResult} label={t.voiceLabel} listeningLabel={t.voiceListening} compact />
          </div>
        </div>
        <div>
          <label className="bm-label" style={S.label}>{t.occasionLabel}</label>
          <input className="bm-input" style={S.input} value={occasion} onChange={(e) => setOccasion(e.target.value)} placeholder={t.occasionPh} />
        </div>
      </div>
      <p className="bm-voice-hint">{t.voiceHint}</p>

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

      {autoSavePending && (
        <VoiceAutoSaveBanner
          preview={autoSavePreview}
          secondsLabel={t.voiceAutoSaveIn}
          cancelLabel={t.voiceCancel}
          onCancel={cancelAutoSave}
        />
      )}

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
        groupEntriesByDate(filtered).map(([dateStr, items]) => (
          <div key={dateStr} className="bm-date-group">
            <DateGroupHeader dateStr={dateStr} lang={lang} count={items.length} />
            {items.map(en => (
              <div key={en.id} className="bm-entry-card" style={S.entryCard}>
                {en.photo ? (
                  <img
                    src={en.photoThumb || en.photo}
                    alt={en.personName}
                    className="bm-entry-photo" style={S.entryPhoto} loading="lazy" decoding="async"
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
            ))}
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
function GRSection({ t, lang, entries, setEntries, setViewImage }) {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [grNumber, setGrNumber] = useState('');
  const [partyName, setPartyName] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [pendingPhotoThumb, setPendingPhotoThumb] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [editingId, setEditingId] = useState(null);
  const isEditing = editingId !== null;

  // ---- voice entry: bol kar party ka naam + wapasi ki wajah bharo, khud save ----
  const [autoSavePending, setAutoSavePending] = useState(false);
  const [autoSavePreview, setAutoSavePreview] = useState('');
  const addEntryRef = useRef(() => {});
  const autoSaveTimerRef = useRef(null);

  const scheduleAutoSave = (preview) => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSavePreview(preview);
    setAutoSavePending(true);
    autoSaveTimerRef.current = setTimeout(() => {
      addEntryRef.current();
      setAutoSavePending(false);
    }, 1800);
  };

  const cancelAutoSave = () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSavePending(false);
  };

  const handleVoiceResult = (transcript) => {
    const parsed = parseVoiceText(transcript);
    if (parsed.name) setPartyName(parsed.name);
    if (parsed.amount != null) setAmount(String(parsed.amount));
    if (parsed.rest) setReason(parsed.rest);

    if (parsed.name) {
      scheduleAutoSave(parsed.amount != null ? `${parsed.name} — ₹${parsed.amount}` : parsed.name);
    }
  };

  const handlePhotoChange = async (file) => {
    if (!file) { setPendingPhoto(null); setPendingPhotoThumb(null); return; }
    setUploading(true);
    try {
      const { full, thumb } = await compressImageVariants(file);
      setPendingPhoto(full);
      setPendingPhotoThumb(thumb);
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
      photoThumb: pendingPhotoThumb,
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
      setPendingPhotoThumb(null);
      setSelectedDate(todayStr());
      setEditingId(null);
    } catch (err) {
      console.error('Failed to save GR entry', err);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => { addEntryRef.current = addEntry; });

  const startEdit = (en) => {
    setEditingId(en.id);
    setSelectedDate(en.date);
    setGrNumber(en.grNumber || '');
    setPartyName(en.partyName);
    setAmount(en.amount != null ? String(en.amount) : '');
    setReason(en.reason || '');
    setPendingPhoto(en.photo || null);
    setPendingPhotoThumb(en.photoThumb || en.photo || null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setGrNumber('');
    setPartyName('');
    setAmount('');
    setReason('');
    setPendingPhoto(null);
    setPendingPhotoThumb(null);
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
          <div className="bm-voice-row">
            <input className="bm-input" style={S.input} value={partyName} onChange={(e) => { setPartyName(e.target.value); cancelAutoSave(); }} placeholder={t.grPartyPh} />
            <VoiceButton lang={lang} onResult={handleVoiceResult} label={t.voiceLabel} listeningLabel={t.voiceListening} compact />
          </div>
        </div>
      </div>
      <p className="bm-voice-hint">{t.voiceHint}</p>

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

      {autoSavePending && (
        <VoiceAutoSaveBanner
          preview={autoSavePreview}
          secondsLabel={t.voiceAutoSaveIn}
          cancelLabel={t.voiceCancel}
          onCancel={cancelAutoSave}
        />
      )}

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
        groupEntriesByDate(filtered).map(([dateStr, items]) => (
          <div key={dateStr} className="bm-date-group">
            <DateGroupHeader dateStr={dateStr} lang={lang} count={items.length} />
            {items.map(en => (
              <div key={en.id} className="bm-entry-card" style={S.entryCard}>
                {en.photo ? (
                  <img
                    src={en.photoThumb || en.photo}
                    alt={en.partyName}
                    className="bm-entry-photo" style={S.entryPhoto} loading="lazy" decoding="async"
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
            ))}
          </div>
        ))
      )}
    </div>
  );
}
