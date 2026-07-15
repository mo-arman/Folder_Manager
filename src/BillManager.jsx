import React, { useState, useEffect } from 'react';
import { Trash2, Plus, FileImage, Download, Search, Camera, Image as ImageIcon, X, Globe, Gift, BookOpen, Receipt, AlertTriangle } from 'lucide-react';

/* ============================================================
   SAB KUCH EK HI FILE MEIN — Bills / Ledger / Gifts
   Har section ka apna alag data + apna alag function hai,
   lekin app ek hi hai (koi separate imported tab file nahi,
   isliye woh purana glitch nahi aayega).

   PHOTO FIX:
   - Photo hamesha compress karke base64 (data:image/...) string
     ke roop mein store hoti hai — blob/object URL kabhi use
     nahi hota. Blob URL refresh ke baad mar jaata hai, isliye
     purani app mein photo "udd jaati thi". Base64 string
     localStorage mein pakki tarah save rehti hai.
   - Gallery aur Camera dono isi ek hi compressImage() function
     se guzarte hain, to dono jagah same fix apply hota hai.
   - Click-to-view sab jagah same ek Modal se hota hai, list
     re-render hone par bhi photo.data hamesha valid rehti hai.
   ============================================================ */

const translations = {
  hi: {
    appName: '📋 Bill Manager Pro',
    subtitle: 'बिल, हिसाब-किताब और गिफ्ट — सब एक जगह',
    langBtn: 'EN',
    tabBills: '🧾 Bills',
    tabLedger: '📒 Ledger (खाता)',
    tabGifts: '🎁 Gifts',
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
    storageWarnTitle: '⚠️ Storage भर गया है',
    storageWarnBody: 'नई एंट्री सुरक्षित नहीं हो पाई क्योंकि device की storage भर चुकी है। कृपया कुछ पुरानी फोटो वाली एंट्री हटाएं और फिर try करें।',
    balanceGiven: 'कुल दिया',
    balanceReceived: 'कुल लिया',
    netBalance: 'बकाया (Net)',
    dateLocale: 'hi-IN',
    footer: 'आपका सारा डेटा इसी डिवाइस में सुरक्षित रहता है 🔒',
  },
  en: {
    appName: '📋 Bill Manager Pro',
    subtitle: 'Bills, Ledger and Gifts — all in one place',
    langBtn: 'HI',
    tabBills: '🧾 Bills',
    tabLedger: '📒 Ledger',
    tabGifts: '🎁 Gifts',
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
    storageWarnTitle: '⚠️ Storage is full',
    storageWarnBody: 'The new entry could not be saved because device storage is full. Please delete a few old photo entries and try again.',
    balanceGiven: 'Total Given',
    balanceReceived: 'Total Received',
    netBalance: 'Net Balance',
    dateLocale: 'en-IN',
    footer: 'All your data stays safely on this device 🔒',
  }
};

/* ---------- shared styles (ek jagah, sab tabs use karte hain) ---------- */
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

/* ---------- safe localStorage save (quota-proof) ---------- */
function safeSave(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error('Storage save failed for', key, err);
    return false;
  }
}

function safeLoad(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error('Storage load failed for', key, err);
    return fallback;
  }
}

const todayStr = () => new Date().toISOString().split('T')[0];

/* ============================================================
   Reusable photo picker: same component/logic for Bills, Ledger, Gifts
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
   Shared full-screen photo view modal — Bills/Ledger/Gifts sabke liye same
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
   MAIN APP
   ============================================================ */
export default function BillManager() {
  const [lang, setLang] = useState('hi');
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState('bills');
  const [viewImage, setViewImage] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);

  /* ---- alag alag data, alag localStorage key, alag function ---- */
  const [bills, setBills] = useState({});          // { date: [ {..., photo} ] }
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [giftEntries, setGiftEntries] = useState([]);

  /* ---- load once on mount ---- */
  useEffect(() => {
    setBills(safeLoad('billManager_bills', {}));
    setLedgerEntries(safeLoad('billManager_ledger', []));
    setGiftEntries(safeLoad('billManager_gifts', []));
    setLoaded(true);
  }, []);

  /* ---- save each slice independently, only after initial load ---- */
  useEffect(() => {
    if (!loaded) return;
    const ok = safeSave('billManager_bills', bills);
    if (!ok) setStorageWarning(true);
  }, [bills, loaded]);

  useEffect(() => {
    if (!loaded) return;
    const ok = safeSave('billManager_ledger', ledgerEntries);
    if (!ok) setStorageWarning(true);
  }, [ledgerEntries, loaded]);

  useEffect(() => {
    if (!loaded) return;
    const ok = safeSave('billManager_gifts', giftEntries);
    if (!ok) setStorageWarning(true);
  }, [giftEntries, loaded]);

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

        {storageWarning && (
          <div style={S.warnBanner}>
            <AlertTriangle size={22} />
            <div>
              <strong>{t.storageWarnTitle}</strong>
              <p style={{ margin: '4px 0 0 0' }}>{t.storageWarnBody}</p>
            </div>
          </div>
        )}

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
        </div>

        {activeTab === 'bills' && (
          <BillsSection t={t} bills={bills} setBills={setBills} setViewImage={setViewImage} />
        )}
        {activeTab === 'ledger' && (
          <LedgerSection t={t} entries={ledgerEntries} setEntries={setLedgerEntries} setViewImage={setViewImage} />
        )}
        {activeTab === 'gifts' && (
          <GiftsSection t={t} entries={giftEntries} setEntries={setGiftEntries} setViewImage={setViewImage} />
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
   BILLS SECTION — apna alag function: addBillPhoto, deleteBill
   ============================================================ */
function BillsSection({ t, bills, setBills, setViewImage }) {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [billName, setBillName] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
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

  const addBill = () => {
    if (!pendingPhoto) return;
    const entry = {
      id: Date.now() + Math.random(),
      name: billName || 'Bill',
      photo: pendingPhoto,
      uploadedAt: new Date().toLocaleString(t.dateLocale),
    };
    setBills(prev => {
      const next = { ...prev };
      next[selectedDate] = [...(next[selectedDate] || []), entry];
      return next;
    });
    setBillName('');
    setPendingPhoto(null);
  };

  const deleteBill = (date, id) => {
    if (!window.confirm(t.confirmDelete)) return;
    setBills(prev => {
      const next = { ...prev };
      next[date] = (next[date] || []).filter(b => b.id !== id);
      if (next[date].length === 0) delete next[date];
      return next;
    });
  };

  const getFiltered = () => {
    let list = [];
    if (filterDate === 'all') {
      Object.entries(bills).forEach(([date, arr]) => arr.forEach(b => list.push({ ...b, date })));
    } else {
      list = (bills[filterDate] || []).map(b => ({ ...b, date: filterDate }));
    }
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

      <button style={{ ...S.addBtn, marginTop: '16px' }} onClick={addBill} disabled={!pendingPhoto || uploading}>
        <Plus size={18} /> {t.addBtn}
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
            {Object.keys(bills).sort().reverse().map(d => <option key={d} value={d}>{d}</option>)}
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
            <button style={S.deleteBtn} onClick={() => deleteBill(b.date, b.id)}>
              <Trash2 size={14} /> {t.deleteBtn}
            </button>
          </div>
        ))
      )}
    </div>
  );
}

/* ============================================================
   LEDGER SECTION — apna alag function: addLedgerEntry, deleteLedgerEntry
   ============================================================ */
function LedgerSection({ t, entries, setEntries, setViewImage }) {
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState('received');
  const [note, setNote] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
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

  const addEntry = () => {
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
    setEntries(prev => [entry, ...prev]);
    setPersonName('');
    setAmount('');
    setNote('');
    setPendingPhoto(null);
    setTransactionType('received');
  };

  const deleteEntry = (id) => {
    if (!window.confirm(t.confirmDelete)) return;
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const filtered = entries.filter(e => e.personName.toLowerCase().includes(searchTerm.toLowerCase()));

  const totalGiven = entries.filter(e => e.transactionType === 'given').reduce((s, e) => s + e.amount, 0);
  const totalReceived = entries.filter(e => e.transactionType === 'received').reduce((s, e) => s + e.amount, 0);
  const net = totalReceived - totalGiven;

  return (
    <div style={S.card}>
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

      <button style={{ ...S.addBtn, marginTop: '16px' }} onClick={addEntry} disabled={uploading}>
        <Plus size={18} /> {t.addBtn}
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
   GIFTS SECTION — apna alag function: addGiftEntry, deleteGiftEntry
   ============================================================ */
function GiftsSection({ t, entries, setEntries, setViewImage }) {
  const [personName, setPersonName] = useState('');
  const [occasion, setOccasion] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
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

  const addEntry = () => {
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
    setEntries(prev => [entry, ...prev]);
    setPersonName('');
    setOccasion('');
    setAmount('');
    setNote('');
    setPendingPhoto(null);
  };

  const deleteEntry = (id) => {
    if (!window.confirm(t.confirmDelete)) return;
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const filtered = entries.filter(e =>
    e.personName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.occasion || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={S.card}>
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

      <button style={{ ...S.addBtn, marginTop: '16px' }} onClick={addEntry} disabled={uploading}>
        <Plus size={18} /> {t.addBtn}
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
