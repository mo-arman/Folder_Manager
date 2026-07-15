import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Plus, FileImage, Download, Search, RefreshCw, Camera, X, Globe, RotateCcw, Check } from 'lucide-react';
import LedgerTab from './LedgerTab';
import GiftsTab from './GiftsTab';

// Saari UI strings — Hindi aur English dono
const translations = {
  hi: {
    appName: '📋 Bill Manager Pro',
    subtitle: 'सभी बिल को आसानी से organize करें',
    statTotalBills: '📊 कुल बिल',
    statTotalDays: '📅 कुल दिन',
    statToday: '⏰ आज',
    statTotalSize: '💾 कुल Size',
    selectDate: '📅 तारीख चुनें:',
    searchBills: '🔍 बिल खोजें:',
    searchPlaceholder: 'बिल का नाम लिखें...',
    billNameLabel: '📝 बिल का नाम (वैकल्पिक):',
    billNamePlaceholder: 'जैसे: बिजली बिल, दूध वाला...',
    personNameLabel: '👤 व्यक्ति/ग्राहक का नाम:',
    personNamePlaceholder: 'जैसे: रमेश, सीता...',
    amountLabel: '💰 राशि (₹):',
    amountPlaceholder: 'जैसे: 500',
    typeReceived: '✅ लिया',
    typeGiven: '📤 दिया (उधार)',
    addEntryBtn: 'बिना फोटो Entry जोड़ें',
    entryAddedToast: '✅ Entry जुड़ गई!',
    entryMissingInfo: '⚠️ कृपया व्यक्ति का नाम और राशि दोनों भरें',
    billsTabBtn: '🧾 Bills',
    ledgerTabBtn: '📒 Ledger (खाता)',
    noPhotoLabel: 'बिना फोटो',
    giftsTabBtn: '🎁 Gifts',
    uploading: 'Upload हो रहा है...',
    sortNewest: '✨ नई पहले',
    sortOldest: '🕐 पुरानी पहले',
    sortName: '🔤 नाम के अनुसार',
    allDates: '📋 सभी तारीखें',
    backupBtn: 'Backup लें',
    exportBtn: 'Export करें',
    clearAllBtn: 'सब मिटाएं',
    noBillsTitle: 'अभी कोई बिल नहीं है',
    noBillsSubtitle: 'अपना पहला बिल add करने के लिए ऊपर क्लिक करें 👆',
    noResultsTitle: 'कोई बिल नहीं मिला',
    noResultsSubtitle: 'अलग search या filter try करें',
    totalWord: 'कुल',
    billsWord: 'बिल',
    deleteFolderBtn: 'Folder हटाएं',
    deleteBtn: 'Delete',
    confirmDeleteFolder: (date) => `क्या आप ${date} के सभी बिल हटाना चाहते हैं?`,
    confirmClearAll: '⚠️ क्या आप सभी बिल हटाना चाहते हैं? यह action undo नहीं हो सकता!',
    alertImportSuccess: '✅ Bills successfully import हो गए!',
    alertImportError: '❌ File format galat hai!',
    alertClearSuccess: '✅ सभी डेटा delete हो गया!',
    photoDownloadBtn: 'Photo Download करें',
    footerLine1: 'आपके सभी बिल, एक जगह, हमेशा सुरक्षित 🔒',
    footerLine2: 'All your bills, in one place, always secure 🔒',
    dateLocale: 'hi-IN',
    galleryBtn: 'Gallery से चुनें',
    cameraBtn: 'फोटो लें',
    uploading: 'Upload हो रहा है...',
    cameraCancelBtn: 'रद्द करें',
    uploadPhotoBtn: '📷 फोटो Upload करें',
  },
  en: {
    appName: '📋 Bill Manager Pro',
    subtitle: 'Organize all your bills, effortlessly',
    statTotalBills: '📊 Total Bills',
    statTotalDays: '📅 Total Days',
    statToday: '⏰ Today',
    statTotalSize: '💾 Total Size',
    selectDate: '📅 Select Date:',
    searchBills: '🔍 Search Bills:',
    searchPlaceholder: 'Type bill name...',
    billNameLabel: '📝 Bill Name (optional):',
    billNamePlaceholder: 'e.g. Electricity bill, Milk...',
    personNameLabel: '👤 Person/Customer Name:',
    personNamePlaceholder: 'e.g. Ramesh, Sita...',
    amountLabel: '💰 Amount (₹):',
    amountPlaceholder: 'e.g. 500',
    typeReceived: '✅ Received',
    typeGiven: '📤 Given (Credit)',
    addEntryBtn: 'Add Entry (No Photo)',
    entryAddedToast: '✅ Entry added!',
    entryMissingInfo: '⚠️ Please fill in both person name and amount',
    billsTabBtn: '🧾 Bills',
    ledgerTabBtn: '📒 Ledger',
    noPhotoLabel: 'No photo',
    giftsTabBtn: '🎁 Gifts',
    uploading: 'Uploading...',
    sortNewest: '✨ Newest First',
    sortOldest: '🕐 Oldest First',
    sortName: '🔤 By Name',
    allDates: '📋 All Dates',
    backupBtn: 'Restore Backup',
    exportBtn: 'Export',
    clearAllBtn: 'Clear All',
    noBillsTitle: 'No bills yet',
    noBillsSubtitle: 'Click above to add your first bill 👆',
    noResultsTitle: 'No bills found',
    noResultsSubtitle: 'Try a different search or filter',
    totalWord: 'Total',
    billsWord: 'bills',
    deleteFolderBtn: 'Delete Folder',
    deleteBtn: 'Delete',
    confirmDeleteFolder: (date) => `Are you sure you want to delete all bills for ${date}?`,
    confirmClearAll: '⚠️ Are you sure you want to delete all bills? This action cannot be undone!',
    alertImportSuccess: '✅ Bills imported successfully!',
    alertImportError: '❌ Invalid file format!',
    alertClearSuccess: '✅ All data deleted!',
    photoDownloadBtn: 'Download Photo',
    footerLine1: 'All your bills, in one place, always secure 🔒',
    footerLine2: 'आपके सभी बिल, एक जगह, हमेशा सुरक्षित 🔒',
    dateLocale: 'en-IN',
    galleryBtn: 'Choose from Gallery',
    cameraBtn: 'Take Photo',
    uploading: 'Uploading...',
    cameraCancelBtn: 'Cancel',
    uploadPhotoBtn: '📷 Upload Photo',
  }
};

export default function BillManager() {
  const [lang, setLang] = useState('hi');
  const t = translations[lang];
  const [bills, setBills] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewImage, setViewImage] = useState(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [uploadBillName, setUploadBillName] = useState('');
  const [viewMode, setViewMode] = useState('bills');

  // localStorage se data load karo
  useEffect(() => {
    const savedBills = localStorage.getItem('billManagerBills');
    if (savedBills) {
      try {
        setBills(JSON.parse(savedBills));
      } catch (err) {
        console.error('Error loading bills:', err);
      }
    }
    setInitialLoadDone(true);
  }, []);

  // jab bhi bills change ho, localStorage mein save karo
  useEffect(() => {
    if (initialLoadDone) {
      localStorage.setItem('billManagerBills', JSON.stringify(bills));
    }
  }, [bills, initialLoadDone]);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const photoData = event.target.result;
        const fileName = uploadBillName || file.name;
        const fileSize = (file.size / 1024).toFixed(2) + ' KB';
        const uploadedAt = new Date().toLocaleString(t.dateLocale);

        setBills(prev => {
          const newBills = { ...prev };
          if (!newBills[selectedDate]) {
            newBills[selectedDate] = [];
          }
          newBills[selectedDate].push({
            id: Date.now() + Math.random(),
            name: fileName,
            data: photoData,
            size: fileSize,
            uploadedAt: uploadedAt,
            personName: '',
            amount: '',
            transactionType: 'received'
          });
          return newBills;
        });
      };
      reader.readAsDataURL(file);
    });

    setUploadBillName('');
    e.target.value = '';
  };

  const handleDeletePhoto = (photoId) => {
    setBills(prev => {
      const newBills = { ...prev };
      if (newBills[selectedDate]) {
        newBills[selectedDate] = newBills[selectedDate].filter(photo => photo.id !== photoId);
        if (newBills[selectedDate].length === 0) {
          delete newBills[selectedDate];
        }
      }
      return newBills;
    });
  };

  const handleDeleteFolder = (date) => {
    if (window.confirm(t.confirmDeleteFolder(date))) {
      setBills(prev => {
        const newBills = { ...prev };
        delete newBills[date];
        return newBills;
      });
    }
  };

  const getFilteredPhotos = () => {
    let photosToShow = [];

    if (filterDate === 'all') {
      Object.values(bills).forEach(photos => {
        photosToShow = photosToShow.concat(photos);
      });
    } else {
      photosToShow = bills[filterDate] || [];
    }

    if (searchTerm) {
      photosToShow = photosToShow.filter(photo =>
        photo.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    photosToShow.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.uploadedAt) - new Date(a.uploadedAt);
      if (sortBy === 'oldest') return new Date(a.uploadedAt) - new Date(b.uploadedAt);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

    return photosToShow;
  };

  const stats = {
    totalBills: Object.values(bills).reduce((sum, photos) => sum + photos.length, 0),
    totalDays: Object.keys(bills).length,
    today: bills[selectedDate]?.length || 0,
    totalSize: Object.values(bills).reduce((sum, photos) => {
      return sum + photos.reduce((photoSum, photo) => {
        const size = parseFloat(photo.size);
        return photoSum + (isNaN(size) ? 0 : size);
      }, 0);
    }, 0)
  };

  if (viewMode === 'ledger') {
    return <LedgerTab lang={lang} setLang={setLang} setViewMode={setViewMode} />;
  }

  if (viewMode === 'gifts') {
    return <GiftsTab lang={lang} setLang={setLang} setViewMode={setViewMode} />;
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      padding: '20px',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      color: '#333'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          color: 'white'
        }}>
          <div>
            <h1 style={{ margin: '0 0 5px 0', fontSize: '2.2em' }}>{t.appName}</h1>
            <p style={{ margin: '0', fontSize: '1em', opacity: 0.9 }}>{t.subtitle}</p>
          </div>
          <button
            onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '2px solid white',
              color: 'white',
              padding: '10px 15px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Globe size={18} />
            {lang === 'hi' ? 'EN' : 'HI'}
          </button>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginBottom: '30px'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            padding: '20px',
            borderRadius: '12px',
            color: 'white',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '0.9em', opacity: 0.8 }}>{t.statTotalBills}</p>
            <p style={{ margin: '0', fontSize: '2em', fontWeight: 'bold' }}>{stats.totalBills}</p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            padding: '20px',
            borderRadius: '12px',
            color: 'white',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '0.9em', opacity: 0.8 }}>{t.statTotalDays}</p>
            <p style={{ margin: '0', fontSize: '2em', fontWeight: 'bold' }}>{stats.totalDays}</p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            padding: '20px',
            borderRadius: '12px',
            color: 'white',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '0.9em', opacity: 0.8 }}>{t.statToday}</p>
            <p style={{ margin: '0', fontSize: '2em', fontWeight: 'bold' }}>{stats.today}</p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            padding: '20px',
            borderRadius: '12px',
            color: 'white',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '0.9em', opacity: 0.8 }}>{t.statTotalSize}</p>
            <p style={{ margin: '0', fontSize: '2em', fontWeight: 'bold' }}>{stats.totalSize.toFixed(2)} KB</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '30px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => setViewMode('bills')}
            style={{
              background: 'white',
              color: '#667eea',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1em'
            }}
          >
            {t.billsTabBtn}
          </button>
          <button
            onClick={() => setViewMode('ledger')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid white',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1em'
            }}
          >
            {t.ledgerTabBtn}
          </button>
          <button
            onClick={() => setViewMode('gifts')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid white',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1em'
            }}
          >
            {t.giftsTabBtn}
          </button>
        </div>

        {/* Main Content */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '30px'
        }}>
          {/* Upload Section */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            border: '2px dashed #667eea',
            borderRadius: '12px',
            padding: '30px',
            textAlign: 'center',
            marginBottom: '30px',
            cursor: 'pointer'
          }}>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              id="fileInput"
              style={{ display: 'none' }}
            />
            <label htmlFor="fileInput" style={{ cursor: 'pointer', display: 'block' }}>
              <FileImage size={48} color="#667eea" style={{ marginBottom: '10px' }} />
              <p style={{ margin: '10px 0', fontSize: '1.1em', fontWeight: 'bold', color: '#667eea' }}>
                {t.uploadPhotoBtn}
              </p>
              <p style={{ margin: '5px 0', color: '#666', fontSize: '0.9em' }}>
                या drag and drop करें
              </p>
            </label>
          </div>

          {/* Date Selector */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
              {t.selectDate}
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '2px solid #667eea',
                fontSize: '1em',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Search and Filter */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                {t.searchBills}
              </label>
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '2px solid #ddd',
                  fontSize: '1em',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                {t.allDates}
              </label>
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '2px solid #ddd',
                  fontSize: '1em',
                  boxSizing: 'border-box'
                }}
              >
                <option value="all">{t.allDates}</option>
                {Object.keys(bills).sort().reverse().map(date => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                Sort
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '2px solid #ddd',
                  fontSize: '1em',
                  boxSizing: 'border-box'
                }}
              >
                <option value="newest">{t.sortNewest}</option>
                <option value="oldest">{t.sortOldest}</option>
                <option value="name">{t.sortName}</option>
              </select>
            </div>
          </div>

          {/* Photos Grid */}
          {getFilteredPhotos().length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '20px'
            }}>
              {getFilteredPhotos().map((photo) => (
                <div
                  key={photo.id}
                  style={{
                    background: '#f5f5f5',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <img
                    src={photo.data}
                    alt={photo.name}
                    onClick={() => setViewImage(photo)}
                    style={{
                      width: '100%',
                      height: '180px',
                      objectFit: 'cover',
                      cursor: 'pointer',
                      display: 'block'
                    }}
                  />
                  <div style={{
                    padding: '12px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <p style={{
                      margin: '0 0 8px 0',
                      fontWeight: 'bold',
                      color: '#333',
                      fontSize: '0.9em',
                      wordBreak: 'break-word'
                    }}>
                      {photo.name}
                    </p>
                    <p style={{
                      margin: '0 0 8px 0',
                      fontSize: '0.8em',
                      color: '#666'
                    }}>
                      {photo.uploadedAt}
                    </p>
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      style={{
                        background: '#ff6b6b',
                        color: 'white',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.85em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <Trash2 size={14} />
                      {t.deleteBtn}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#666'
            }}>
              <FileImage size={64} color="#ccc" style={{ marginBottom: '15px' }} />
              <h3 style={{ margin: '0 0 10px 0' }}>{t.noBillsTitle}</h3>
              <p style={{ margin: '0' }}>{t.noBillsSubtitle}</p>
            </div>
          )}
        </div>

        {/* Full Image View Modal */}
        {viewImage && (
          <div
            onClick={() => setViewImage(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0,0,0,0.9)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              padding: '20px',
              boxSizing: 'border-box'
            }}
          >
            <button
              onClick={() => setViewImage(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255,255,255,0.15)',
                border: '2px solid white',
                color: 'white',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={24} />
            </button>

            <img
              src={viewImage.data}
              alt={viewImage.name}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '95%',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
              }}
            />

            <div style={{ color: 'white', textAlign: 'center', marginTop: '15px' }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '1.1em', fontWeight: 'bold' }}>{viewImage.name}</p>
              <p style={{ margin: '0', fontSize: '0.85em', opacity: 0.8 }}>⏰ {viewImage.uploadedAt} &nbsp;|&nbsp; 💾 {viewImage.size}</p>
              <a
                href={viewImage.data}
                download={viewImage.name}
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  marginTop: '15px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  fontSize: '0.9em'
                }}
              >
                <Download size={16} style={{ marginRight: '6px' }} />
                {t.photoDownloadBtn}
              </a>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          color: 'white',
          marginTop: '40px',
          padding: '20px',
          fontSize: '0.95em',
          lineHeight: '1.8'
        }}>
          <p style={{ fontSize: '1.15em', fontWeight: 'bold', margin: '0 0 6px 0' }}>
            {t.appName}
          </p>
          <p style={{ margin: '0', opacity: 0.9, fontSize: '0.9em' }}>
            {t.footerLine1}
          </p>
        </div>
      </div>
    </div>
  );
}
