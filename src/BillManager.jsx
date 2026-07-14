import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Plus, FileImage, Download, Search, RefreshCw, Camera, X, Globe, RotateCcw, Check } from 'lucide-react';

// Saari UI strings — Hindi aur English dono / All UI strings — both Hindi and English
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
    galleryBtn: 'Gallery से चुनें',
    cameraBtn: 'फोटो लें',
    cameraCaptureBtn: '📸 फोटो खींचें',
    cameraRetakeBtn: '🔄 फिर से लें',
    cameraUseBtn: '✅ इस्तेमाल करें',
    cameraCancelBtn: 'रद्द करें',
    cameraOpeningText: 'कैमरा खुल रहा है...',
    cameraErrorMsg: '❌ Camera access नहीं मिला। Browser settings में camera permission allow करें, या Gallery से photo चुनें।',
    cameraNotSupportedMsg: '❌ आपके browser में camera feature उपलब्ध नहीं है। कृपया Gallery से photo चुनें।',
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
    alertImportSuccess: '✅ Bills successfully import ho gaye!',
    alertImportError: '❌ File format galat hai!',
    alertClearSuccess: '✅ सभी डेटा delete हो गया!',
    photoDownloadBtn: 'Photo Download करें',
    footerLine1: 'आपके सभी बिल, एक जगह, हमेशा सुरक्षित 🔒',
    footerLine2: 'All your bills, in one place, always secure 🔒',
    dateLocale: 'hi-IN'
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
    galleryBtn: 'Choose from Gallery',
    cameraBtn: 'Take Photo',
    cameraCaptureBtn: '📸 Capture',
    cameraRetakeBtn: '🔄 Retake',
    cameraUseBtn: '✅ Use Photo',
    cameraCancelBtn: 'Cancel',
    cameraOpeningText: 'Opening camera...',
    cameraErrorMsg: '❌ Could not access camera. Please allow camera permission in browser settings, or use Gallery instead.',
    cameraNotSupportedMsg: '❌ Camera is not supported in your browser. Please use Gallery instead.',
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
    dateLocale: 'en-IN'
  }
};

export default function BillManager() {
  const [lang, setLang] = useState('hi'); // 'hi' ya 'en' — jisko jo bhasha aati ho
  const t = translations[lang];
  const [bills, setBills] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewImage, setViewImage] = useState(null); // pura photo dekhne ke liye
  const [initialLoadDone, setInitialLoadDone] = useState(false); // purana data load hone ka wait
  const [uploadBillName, setUploadBillName] = useState(''); // upload karne se pehle bill ka custom naam
  const [showCamera, setShowCamera] = useState(false); // live camera modal khula hai ya nahi
  const [capturedPhoto, setCapturedPhoto] = useState(null); // capture ki gayi photo (preview ke liye)
  const [cameraLoading, setCameraLoading] = useState(false); // camera khulne ka wait
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  // Pehli baar load hote hi purane bills fetch karo (localStorage se — real browser me yeh available hai)
  useEffect(() => {
    try {
      const savedBills = localStorage.getItem('bills_storage');
      if (savedBills) {
        setBills(JSON.parse(savedBills));
      }
    } catch (err) {
      console.error('Error loading bills:', err);
    } finally {
      setInitialLoadDone(true);
    }
  }, []);

  // Jab bhi bills badle, unhe localStorage me save karo
  useEffect(() => {
    if (!initialLoadDone) return; // shuru me khaali state ko purane data ke upar overwrite mat karo
    try {
      localStorage.setItem('bills_storage', JSON.stringify(bills));
    } catch (err) {
      console.error('Storage save failed:', err);
      alert(lang === 'hi'
        ? '⚠️ Storage full hai — kuch purane bill delete karein'
        : '⚠️ Storage is full — please delete some old bills');
    }
  }, [bills, initialLoadDone, lang]);

  // Ek photo ko compress + resize karta hai taaki fast upload ho aur storage full na ho
  // Yeh function kabhi hang nahi hota — fail hone par bhi resolve(null) karta hai
  const readAndCompressImage = (file, maxDimension = 1600, quality = 0.72) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onerror = () => {
        console.error('File read error:', file.name);
        resolve(null);
      };
      reader.onload = (event) => {
        const originalDataUrl = event.target.result;
        const img = new Image();
        // Agar image decode fail ho (kuch phones par bade/corrupt photo se aisa ho sakta hai),
        // toh compress nahi karo lekin original photo phir bhi save kar do — upload fail nahi hona chahiye
        img.onerror = () => resolve(originalDataUrl);
        img.onload = () => {
          try {
            let { width, height } = img;
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round(height * (maxDimension / width));
                width = maxDimension;
              } else {
                width = Math.round(width * (maxDimension / height));
                height = maxDimension;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', quality);
            resolve(compressed);
          } catch (err) {
            console.error('Compression failed, using original photo instead:', err);
            resolve(originalDataUrl);
          }
        };
        img.src = originalDataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  // Camera stream ko video element se jodo jab modal khule
  useEffect(() => {
    if (showCamera && videoRef.current && cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
    }
  }, [showCamera]);

  // Component band hote waqt camera ko properly band karo
  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Live camera kholo — yeh phone ke OS camera app par depend nahi karta,
  // isliye har phone brand (Xiaomi/Vivo/Oppo/Samsung/iPhone) par ek jaisa kaam karta hai
  const openCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert(t.cameraNotSupportedMsg);
      return;
    }
    setCameraLoading(true);
    try {
      let stream;
      try {
        // Pehle peeche wala (rear) camera try karo — bill/document ke liye best hota hai
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
      } catch (err) {
        // Kai phones/laptops par 'environment' camera nahi milta — koi bhi available camera try karo
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      cameraStreamRef.current = stream;
      setCapturedPhoto(null);
      setShowCamera(true);
    } catch (err) {
      console.error('Camera access error:', err);
      alert(t.cameraErrorMsg);
    } finally {
      setCameraLoading(false);
    }
  };

  // Camera band karo aur stream properly release karo (warna phone ka camera "busy" dikhega)
  const closeCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    setShowCamera(false);
    setCapturedPhoto(null);
  };

  // Video ke current frame ko photo ke roop me capture karo
  const takeSnapshot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const maxDimension = 1600;
    let width = video.videoWidth;
    let height = video.videoHeight;
    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round(height * (maxDimension / width));
        width = maxDimension;
      } else {
        width = Math.round(width * (maxDimension / height));
        height = maxDimension;
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);
    setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.72));
  };

  // Photo pasand nahi aayi toh dobara try karo
  const retakePhoto = () => setCapturedPhoto(null);

  // Photo confirm karo — bill list me add karo aur camera band karo
  const confirmCapturedPhoto = () => {
    if (!capturedPhoto) return;
    const dateKey = selectedDate;
    const customName = uploadBillName.trim();
    const timeLabel = new Date().toLocaleTimeString(t.dateLocale);
    const billName = customName || (lang === 'hi' ? `कैमरा फोटो ${timeLabel}` : `Camera Photo ${timeLabel}`);

    const newBill = {
      id: Date.now() + Math.random(),
      name: billName,
      data: capturedPhoto,
      uploadedAt: timeLabel,
      size: ((capturedPhoto.length * 0.75) / 1024).toFixed(2) + ' KB',
      timestamp: new Date(dateKey).getTime()
    };

    setBills((prevBills) => {
      const updated = { ...prevBills };
      updated[dateKey] = [...(updated[dateKey] || []), newBill];
      return updated;
    });
    setUploadBillName('');
    closeCamera();
  };

  // Handle file upload — gallery ya camera se ek ya multiple photos
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Input turant reset — isliye agli baar wahi photo bhi dobara select ho sakti hai,
    // aur naya upload turant shuru ho sakta hai
    e.target.value = '';

    setLoading(true);
    const dateKey = selectedDate;
    const customName = uploadBillName.trim();

    try {
      const results = await Promise.all(files.map((file) => readAndCompressImage(file)));

      const newBills = results
        .map((dataUrl, idx) => {
          if (!dataUrl) return null; // yeh file fail hui — isko skip karo, poora upload mat roko
          // Agar user ne bill ka naam type kiya hai toh wahi use karo (multiple photos ho toh number jodo),
          // warna file ka original naam use karo
          const billName = customName
            ? (files.length > 1 ? `${customName} (${idx + 1})` : customName)
            : files[idx].name;
          return {
            id: Date.now() + Math.random(),
            name: billName,
            data: dataUrl,
            uploadedAt: new Date().toLocaleTimeString(t.dateLocale),
            size: ((dataUrl.length * 0.75) / 1024).toFixed(2) + ' KB',
            timestamp: new Date(dateKey).getTime()
          };
        })
        .filter(Boolean);

      if (newBills.length === 0) {
        alert(lang === 'hi' ? '❌ Photo upload nahi ho payi, dobara try karein' : '❌ Upload failed, please try again');
      } else {
        // Immutable update — purane state ko kabhi directly modify nahi karte,
        // isse multiple photos ek saath upload karne par koi photo gayab nahi hoti
        setBills((prevBills) => {
          const updated = { ...prevBills };
          updated[dateKey] = [...(updated[dateKey] || []), ...newBills];
          return updated;
        });
        setUploadBillName(''); // agla upload ke liye field khaali kar do
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert(lang === 'hi' ? '❌ Upload mein samasya aayi' : '❌ Something went wrong while uploading');
    } finally {
      // Yeh hamesha chalega — reading complete hone ke baad hi loading band hoga,
      // isliye spinner kabhi atka nahi rahega aur agli photo turant sahi se upload hogi
      setLoading(false);
    }
  };

  // Delete a bill
  const deleteBill = (dateKey, billId) => {
    setBills((prevBills) => {
      const updated = { ...prevBills };
      updated[dateKey] = updated[dateKey].filter(bill => bill.id !== billId);
      if (updated[dateKey].length === 0) {
        delete updated[dateKey];
      }
      return updated;
    });
  };

  // Delete entire date folder
  const deleteDateFolder = (dateKey) => {
    if (window.confirm(t.confirmDeleteFolder(formatDateHindi(dateKey)))) {
      setBills((prevBills) => {
        const updated = { ...prevBills };
        delete updated[dateKey];
        return updated;
      });
    }
  };

  // Get all bills in flat array
  const getAllBills = () => {
    const allBills = [];
    Object.entries(bills).forEach(([dateKey, billsList]) => {
      billsList.forEach(bill => {
        allBills.push({ ...bill, dateKey });
      });
    });
    return allBills;
  };

  // Filter and sort bills
  const getFilteredBills = () => {
    let allBills = getAllBills();

    // Filter by date
    if (filterDate !== 'all') {
      allBills = allBills.filter(bill => bill.dateKey === filterDate);
    }

    // Filter by search
    if (searchTerm) {
      allBills = allBills.filter(bill =>
        bill.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    if (sortBy === 'newest') {
      allBills.sort((a, b) => b.id - a.id);
    } else if (sortBy === 'oldest') {
      allBills.sort((a, b) => a.id - b.id);
    } else if (sortBy === 'name') {
      allBills.sort((a, b) => a.name.localeCompare(b.name));
    }

    return allBills;
  };

  // Calculate statistics
  const calculateStats = () => {
    const allBills = getAllBills();
    return {
      totalBills: allBills.length,
      totalDates: Object.keys(bills).length,
      todayBills: (bills[selectedDate] || []).length,
      totalSize: (allBills.reduce((sum, bill) => sum + parseFloat(bill.size), 0)).toFixed(2)
    };
  };

  // Export as JSON
  const exportData = () => {
    const dataStr = JSON.stringify(bills, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bills_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  // Import from JSON
  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        setBills(imported);
        alert(t.alertImportSuccess);
      } catch (err) {
        alert(t.alertImportError);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Clear all data
  const clearAllData = () => {
    if (window.confirm(t.confirmClearAll)) {
      setBills({});
      alert(t.alertClearSuccess);
    }
  };

  const stats = calculateStats();
  const sortedDates = Object.keys(bills).sort((a, b) => new Date(b) - new Date(a));
  const filteredBills = getFilteredBills();

  // Format date according to selected language
  const formatDateHindi = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(t.dateLocale, options);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Language Selector */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.4)',
            borderRadius: '8px',
            padding: '4px',
            gap: '4px'
          }}>
            <Globe size={16} style={{ color: 'white', marginLeft: '6px' }} />
            <button
              onClick={() => setLang('hi')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.85em',
                background: lang === 'hi' ? 'white' : 'transparent',
                color: lang === 'hi' ? '#667eea' : 'white',
                transition: 'all 0.2s'
              }}
            >
              हिंदी
            </button>
            <button
              onClick={() => setLang('en')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.85em',
                background: lang === 'en' ? 'white' : 'transparent',
                color: lang === 'en' ? '#667eea' : 'white',
                transition: 'all 0.2s'
              }}
            >
              English
            </button>
          </div>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', color: 'white', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '2.8em', margin: '0 0 10px 0' }}>{t.appName}</h1>
          <p style={{ fontSize: '1.1em', margin: '0', opacity: 0.9 }}>{t.subtitle}</p>
        </div>

        {/* Statistics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginBottom: '25px'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0', color: '#666', fontSize: '0.9em' }}>{t.statTotalBills}</p>
            <h3 style={{ margin: '8px 0 0 0', color: '#667eea', fontSize: '2.2em' }}>{stats.totalBills}</h3>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0', color: '#666', fontSize: '0.9em' }}>{t.statTotalDays}</p>
            <h3 style={{ margin: '8px 0 0 0', color: '#764ba2', fontSize: '2.2em' }}>{stats.totalDates}</h3>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0', color: '#666', fontSize: '0.9em' }}>{t.statToday}</p>
            <h3 style={{ margin: '8px 0 0 0', color: '#ff4757', fontSize: '2.2em' }}>{stats.todayBills}</h3>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0', color: '#666', fontSize: '0.9em' }}>{t.statTotalSize}</p>
            <h3 style={{ margin: '8px 0 0 0', color: '#2ed573', fontSize: '2.2em' }}>{stats.totalSize} KB</h3>
          </div>
        </div>

        {/* Upload Section */}
        <div style={{
          background: 'white',
          borderRadius: '15px',
          padding: '30px',
          marginBottom: '25px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '25px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#333', fontSize: '1em' }}>
                {t.selectDate}
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid #667eea',
                  fontSize: '1em',
                  boxSizing: 'border-box'
                }}
              />
              <p style={{ color: '#666', marginTop: '5px', fontSize: '0.85em' }}>
                {formatDateHindi(selectedDate)}
              </p>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#333', fontSize: '1em' }}>
                {t.billNameLabel}
              </label>
              <input
                type="text"
                placeholder={t.billNamePlaceholder}
                value={uploadBillName}
                onChange={(e) => setUploadBillName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid #667eea',
                  fontSize: '1em',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#333', fontSize: '1em' }}>
                {t.searchBills}
              </label>
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid #667eea',
                  fontSize: '1em',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <label style={{
              display: 'inline-flex',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '12px 25px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1em',
              alignItems: 'center',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Plus size={18} style={{ marginRight: '8px' }} />
              {loading ? t.uploading : t.galleryBtn}
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                disabled={loading}
                style={{ display: 'none' }}
              />
            </label>

            <button
              onClick={openCamera}
              disabled={loading || cameraLoading}
              style={{
                display: 'inline-flex',
                background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5253 100%)',
                color: 'white',
                padding: '12px 25px',
                borderRadius: '8px',
                cursor: (loading || cameraLoading) ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '1em',
                alignItems: 'center',
                border: 'none',
                opacity: (loading || cameraLoading) ? 0.7 : 1,
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Camera size={18} style={{ marginRight: '8px' }} />
              {cameraLoading ? t.cameraOpeningText : t.cameraBtn}
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '12px 15px',
                borderRadius: '8px',
                border: '2px solid #667eea',
                fontSize: '1em',
                cursor: 'pointer'
              }}
            >
              <option value="newest">{t.sortNewest}</option>
              <option value="oldest">{t.sortOldest}</option>
              <option value="name">{t.sortName}</option>
            </select>

            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={{
                padding: '12px 15px',
                borderRadius: '8px',
                border: '2px solid #667eea',
                fontSize: '1em',
                cursor: 'pointer'
              }}
            >
              <option value="all">{t.allDates}</option>
              {sortedDates.map(date => (
                <option key={date} value={date}>{formatDateHindi(date)}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <label style={{
              display: 'inline-flex',
              background: '#2ed573',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.95em',
              alignItems: 'center',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#26de81'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#2ed573'}
            >
              <Download size={16} style={{ marginRight: '6px' }} />
              {t.backupBtn}
              <input
                type="file"
                accept=".json"
                onChange={importData}
                style={{ display: 'none' }}
              />
            </label>

            <button
              onClick={exportData}
              style={{
                display: 'inline-flex',
                background: '#1e90ff',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.95em',
                alignItems: 'center',
                border: 'none',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#1873e8'}
              onMouseLeave={(e) => e.target.style.background = '#1e90ff'}
            >
              <Download size={16} style={{ marginRight: '6px' }} />
              {t.exportBtn}
            </button>

            <button
              onClick={clearAllData}
              style={{
                display: 'inline-flex',
                background: '#ff4757',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.95em',
                alignItems: 'center',
                border: 'none',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#ff3838'}
              onMouseLeave={(e) => e.target.style.background = '#ff4757'}
            >
              <RefreshCw size={16} style={{ marginRight: '6px' }} />
              {t.clearAllBtn}
            </button>
          </div>
        </div>

        {/* Bills Display */}
        <div>
          {Object.keys(bills).length === 0 ? (
            <div style={{
              background: 'white',
              borderRadius: '15px',
              padding: '60px 30px',
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}>
              <FileImage size={80} style={{ color: '#ddd', margin: '0 auto 20px' }} />
              <p style={{ color: '#999', fontSize: '1.3em', margin: '0' }}>{t.noBillsTitle}</p>
              <p style={{ color: '#bbb', fontSize: '1em', margin: '10px 0 0 0' }}>{t.noBillsSubtitle}</p>
            </div>
          ) : filteredBills.length === 0 ? (
            <div style={{
              background: 'white',
              borderRadius: '15px',
              padding: '60px 30px',
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}>
              <Search size={80} style={{ color: '#ddd', margin: '0 auto 20px' }} />
              <p style={{ color: '#999', fontSize: '1.3em', margin: '0' }}>{t.noResultsTitle}</p>
              <p style={{ color: '#bbb', fontSize: '1em', margin: '10px 0 0 0' }}>{t.noResultsSubtitle}</p>
            </div>
          ) : (
            <>
              {filterDate === 'all' ? (
                sortedDates.map((dateKey) => (
                  <div key={dateKey} style={{
                    background: 'white',
                    borderRadius: '15px',
                    padding: '20px',
                    marginBottom: '20px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      padding: '15px',
                      borderRadius: '8px',
                      marginBottom: '20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <h2 style={{ margin: '0', fontSize: '1.4em' }}>📅 {formatDateHindi(dateKey)}</h2>
                        <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>{t.totalWord} {bills[dateKey].length} {t.billsWord}</p>
                      </div>
                      <button
                        onClick={() => deleteDateFolder(dateKey)}
                        style={{
                          background: 'rgba(255,0,0,0.2)',
                          color: 'white',
                          border: '2px solid white',
                          padding: '8px 15px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(255,0,0,0.4)'}
                        onMouseLeave={(e) => e.target.style.background = 'rgba(255,0,0,0.2)'}
                      >
                        <Trash2 size={16} style={{ display: 'inline', marginRight: '5px' }} />
                        {t.deleteFolderBtn}
                      </button>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                      gap: '15px'
                    }}>
                      {bills[dateKey].filter(bill => {
                        if (searchTerm) {
                          return bill.name.toLowerCase().includes(searchTerm.toLowerCase());
                        }
                        return true;
                      }).map((bill) => (
                        <div key={bill.id} style={{
                          border: '2px solid #eee',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          background: '#f9f9f9',
                          transition: 'transform 0.2s, box-shadow 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        >
                          <img
                            src={bill.data}
                            alt={bill.name}
                            onClick={() => setViewImage(bill)}
                            style={{
                              width: '100%',
                              height: '150px',
                              objectFit: 'cover',
                              display: 'block',
                              cursor: 'pointer'
                            }}
                          />
                          <div style={{ padding: '12px' }}>
                            <p style={{
                              margin: '0 0 8px 0',
                              fontSize: '0.8em',
                              color: '#333',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              fontWeight: 'bold'
                            }}>
                              {bill.name}
                            </p>
                            <p style={{
                              margin: '0 0 8px 0',
                              fontSize: '0.7em',
                              color: '#999'
                            }}>
                              ⏰ {bill.uploadedAt}
                            </p>
                            <p style={{
                              margin: '0 0 10px 0',
                              fontSize: '0.7em',
                              color: '#999'
                            }}>
                              💾 {bill.size}
                            </p>
                            <button
                              onClick={() => deleteBill(dateKey, bill.id)}
                              style={{
                                width: '100%',
                                padding: '8px',
                                background: '#ff4757',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.8em',
                                fontWeight: 'bold',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.target.style.background = '#ff3838'}
                              onMouseLeave={(e) => e.target.style.background = '#ff4757'}
                            >
                              <Trash2 size={14} style={{ display: 'inline', marginRight: '5px' }} />
                              {t.deleteBtn}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{
                  background: 'white',
                  borderRadius: '15px',
                  padding: '20px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <h2 style={{ margin: '0', fontSize: '1.4em' }}>📅 {formatDateHindi(filterDate)}</h2>
                      <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>{t.totalWord} {bills[filterDate].length} {t.billsWord}</p>
                    </div>
                    <button
                      onClick={() => deleteDateFolder(filterDate)}
                      style={{
                        background: 'rgba(255,0,0,0.2)',
                        color: 'white',
                        border: '2px solid white',
                        padding: '8px 15px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(255,0,0,0.4)'}
                      onMouseLeave={(e) => e.target.style.background = 'rgba(255,0,0,0.2)'}
                    >
                      <Trash2 size={16} style={{ display: 'inline', marginRight: '5px' }} />
                      {t.deleteFolderBtn}
                    </button>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: '15px'
                  }}>
                    {filteredBills.map((bill) => (
                      <div key={bill.id} style={{
                        border: '2px solid #eee',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        background: '#f9f9f9',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      >
                        <img
                          src={bill.data}
                          alt={bill.name}
                          onClick={() => setViewImage(bill)}
                          style={{
                            width: '100%',
                            height: '150px',
                            objectFit: 'cover',
                            display: 'block',
                            cursor: 'pointer'
                          }}
                        />
                        <div style={{ padding: '12px' }}>
                          <p style={{
                            margin: '0 0 8px 0',
                            fontSize: '0.8em',
                            color: '#333',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontWeight: 'bold'
                          }}>
                            {bill.name}
                          </p>
                          <p style={{
                            margin: '0 0 8px 0',
                            fontSize: '0.7em',
                            color: '#999'
                          }}>
                            ⏰ {bill.uploadedAt}
                          </p>
                          <p style={{
                            margin: '0 0 10px 0',
                            fontSize: '0.7em',
                            color: '#999'
                          }}>
                            💾 {bill.size}
                          </p>
                          <button
                            onClick={() => deleteBill(bill.dateKey, bill.id)}
                            style={{
                              width: '100%',
                              padding: '8px',
                              background: '#ff4757',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.8em',
                              fontWeight: 'bold',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#ff3838'}
                            onMouseLeave={(e) => e.target.style.background = '#ff4757'}
                          >
                            <Trash2 size={14} style={{ display: 'inline', marginRight: '5px' }} />
                            {t.deleteBtn}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Live Camera Modal */}
        {showCamera && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'black',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1100,
              boxSizing: 'border-box'
            }}
          >
            <button
              onClick={closeCamera}
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
                cursor: 'pointer',
                zIndex: 1101
              }}
            >
              <X size={24} />
            </button>

            <div style={{
              width: '100%',
              maxWidth: '600px',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              {capturedPhoto ? (
                <img
                  src={capturedPhoto}
                  alt="captured"
                  style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                />
              )}
            </div>

            <div style={{
              padding: '25px',
              display: 'flex',
              gap: '15px',
              justifyContent: 'center',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              {capturedPhoto ? (
                <>
                  <button
                    onClick={retakePhoto}
                    style={{
                      background: 'rgba(255,255,255,0.15)',
                      border: '2px solid white',
                      color: 'white',
                      padding: '14px 24px',
                      borderRadius: '30px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '1em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <RotateCcw size={18} />
                    {t.cameraRetakeBtn}
                  </button>
                  <button
                    onClick={confirmCapturedPhoto}
                    style={{
                      background: '#2ed573',
                      border: 'none',
                      color: 'white',
                      padding: '14px 28px',
                      borderRadius: '30px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '1em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Check size={18} />
                    {t.cameraUseBtn}
                  </button>
                </>
              ) : (
                <button
                  onClick={takeSnapshot}
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: 'white',
                    border: '5px solid rgba(255,255,255,0.4)',
                    cursor: 'pointer'
                  }}
                  aria-label={t.cameraCaptureBtn}
                />
              )}
            </div>
          </div>
        )}


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
