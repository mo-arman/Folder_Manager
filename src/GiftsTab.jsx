import React, { useState, useEffect, useRef } from 'react';
import { Trash2, FileImage, Download, Globe, X, RotateCcw, Check, Camera } from 'lucide-react';

const translations = {
  hi: {
    appName: '📋 Bill Manager Pro',
    billsTabBtn: '🧾 Bills',
    ledgerTabBtn: '📒 Ledger (खाता)',
    giftsTabBtn: '🎁 Gifts',
    giftFormTitle: '🎁 डॉक्टर को दिया गया Gift',
    doctorNameLabel: '👨‍⚕️ डॉक्टर का नाम:',
    doctorNamePlaceholder: 'जैसे: डॉ. शर्मा',
    doctorAddressLabel: '📍 Address / Clinic:',
    doctorAddressPlaceholder: 'जैसे: शर्मा क्लिनिक, MG रोड',
    giftNameLabel: '🎁 Gift का नाम/विवरण:',
    giftNamePlaceholder: 'जैसे: पेन सेट, डायरी...',
    giftPhotoLabel: '📷 Gift की फोटो (वैकल्पिक):',
    addGiftBtn: 'Gift जोड़ें',
    removeGiftPhoto: 'फोटो हटाएं',
    doctorMissingInfo: '⚠️ कृपया डॉक्टर का नाम भरें',
    giftAddedToast: '✅ Gift entry जुड़ गई!',
    noGiftsTitle: 'अभी कोई gift record नहीं है',
    noGiftsSubtitle: 'डॉक्टर का नाम भरकर पहला gift जोड़ें 👆',
    deleteGiftFolderBtn: 'सब हटाएं',
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
    photoDownloadBtn: 'Photo Download करें',
    footerLine1: 'आपके सभी बिल, एक जगह, हमेशा सुरक्षित 🔒',
    deleteBtn: 'Delete',
    deleteGift: 'क्या आप इस gift को हटाना चाहते हैं?',
    noPhotoLabel: 'बिना फोटो',
  },
  en: {
    appName: '📋 Bill Manager Pro',
    billsTabBtn: '🧾 Bills',
    ledgerTabBtn: '📒 Ledger',
    giftsTabBtn: '🎁 Gifts',
    giftFormTitle: '🎁 Gift Given to Doctor',
    doctorNameLabel: '👨‍⚕️ Doctor Name:',
    doctorNamePlaceholder: 'e.g. Dr. Sharma',
    doctorAddressLabel: '📍 Address / Clinic:',
    doctorAddressPlaceholder: 'e.g. Sharma Clinic, MG Road',
    giftNameLabel: '🎁 Gift Name/Description:',
    giftNamePlaceholder: 'e.g. Pen set, Diary...',
    giftPhotoLabel: '📷 Gift Photo (optional):',
    addGiftBtn: 'Add Gift',
    removeGiftPhoto: 'Remove photo',
    doctorMissingInfo: '⚠️ Please enter the doctor\'s name',
    giftAddedToast: '✅ Gift entry added!',
    noGiftsTitle: 'No gift records yet',
    noGiftsSubtitle: 'Add your first gift with a doctor name 👆',
    deleteGiftFolderBtn: 'Delete All',
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
    photoDownloadBtn: 'Download Photo',
    footerLine1: 'All your bills, in one place, always secure 🔒',
    deleteBtn: 'Delete',
    deleteGift: 'Are you sure you want to delete this gift?',
    noPhotoLabel: 'No photo',
  }
};

export default function GiftsTab({ lang, setLang, setViewMode }) {
  const t = translations[lang];
  const [gifts, setGifts] = useState([]);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [doctorAddress, setDoctorAddress] = useState('');
  const [giftName, setGiftName] = useState('');
  const [giftPhoto, setGiftPhoto] = useState(null);
  const [viewImage, setViewImage] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // localStorage se gifts data load karo
  useEffect(() => {
    const savedGifts = localStorage.getItem('billManagerGifts');
    if (savedGifts) {
      try {
        setGifts(JSON.parse(savedGifts));
      } catch (err) {
        console.error('Error loading gifts:', err);
      }
    }
    setInitialLoadDone(true);
  }, []);

  // jab bhi gifts change ho, localStorage mein save karo
  useEffect(() => {
    if (initialLoadDone) {
      localStorage.setItem('billManagerGifts', JSON.stringify(gifts));
    }
  }, [gifts, initialLoadDone]);

  // Camera setup
  useEffect(() => {
    if (showCamera && !capturedPhoto) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.error('Camera error:', err);
          alert(t.cameraErrorMsg);
          setShowCamera(false);
        });
    }

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [showCamera, capturedPhoto, t]);

  const takeSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      setCapturedPhoto(canvas.toDataURL('image/jpeg'));
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
  };

  const confirmCapturedPhoto = () => {
    setGiftPhoto(capturedPhoto);
    setCapturedPhoto(null);
    setShowCamera(false);
  };

  const handleGalleryUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setGiftPhoto(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddGift = () => {
    if (!doctorName.trim()) {
      alert(t.doctorMissingInfo);
      return;
    }

    const newGift = {
      id: Date.now(),
      doctorName: doctorName.trim(),
      doctorAddress: doctorAddress.trim(),
      giftName: giftName.trim(),
      photo: giftPhoto,
      date: new Date().toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN')
    };

    setGifts(prev => [...prev, newGift]);

    // Reset form
    setDoctorName('');
    setDoctorAddress('');
    setGiftName('');
    setGiftPhoto(null);
  };

  const handleDeleteGift = (giftId) => {
    setGifts(prev => prev.filter(gift => gift.id !== giftId));
  };

  const handleDeleteAll = () => {
    if (window.confirm('सभी gifts हटा देंगे? / Delete all gifts?')) {
      setGifts([]);
    }
  };

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
            <p style={{ margin: '0', fontSize: '1em', opacity: 0.9 }}>🎁 {t.giftFormTitle}</p>
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
            {t.giftsTabBtn}
          </button>
        </div>

        {/* Gift Form */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '30px'
        }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>{t.giftFormTitle}</h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                {t.doctorNameLabel}
              </label>
              <input
                type="text"
                placeholder={t.doctorNamePlaceholder}
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
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
                {t.doctorAddressLabel}
              </label>
              <input
                type="text"
                placeholder={t.doctorAddressPlaceholder}
                value={doctorAddress}
                onChange={(e) => setDoctorAddress(e.target.value)}
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
                {t.giftNameLabel}
              </label>
              <input
                type="text"
                placeholder={t.giftNamePlaceholder}
                value={giftName}
                onChange={(e) => setGiftName(e.target.value)}
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
          </div>

          {/* Photo Section */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <label style={{ display: 'block', marginBottom: '15px', fontWeight: 'bold', color: '#333' }}>
              {t.giftPhotoLabel}
            </label>

            {giftPhoto ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '15px'
              }}>
                <img
                  src={giftPhoto}
                  alt="Gift"
                  style={{
                    maxWidth: '300px',
                    maxHeight: '300px',
                    borderRadius: '8px',
                    objectFit: 'cover'
                  }}
                />
                <button
                  onClick={() => setGiftPhoto(null)}
                  style={{
                    background: '#ff6b6b',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {t.removeGiftPhoto}
                </button>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                gap: '15px',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '1em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <FileImage size={18} />
                  {t.galleryBtn}
                </button>
                <button
                  onClick={() => setShowCamera(true)}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '1em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Camera size={18} />
                  {t.cameraBtn}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleGalleryUpload}
                  style={{ display: 'none' }}
                />
              </div>
            )}
          </div>

          <button
            onClick={handleAddGift}
            style={{
              background: 'linear-gradient(135deg, #2ed573 0%, #1fb85c 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1em'
            }}
          >
            ✅ {t.addGiftBtn}
          </button>
        </div>

        {/* Camera Modal */}
        {showCamera && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.95)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            zIndex: 999,
            padding: '20px',
            boxSizing: 'border-box'
          }}>
            <button
              onClick={() => {
                setShowCamera(false);
                setCapturedPhoto(null);
              }}
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
                zIndex: 10
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
              position: 'relative',
              margin: '0 auto'
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
                />
              )}
            </div>
          </div>
        )}

        {/* Gifts List */}
        {gifts.length > 0 ? (
          <>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              color: 'white'
            }}>
              <h2 style={{ margin: '0', fontSize: '1.5em' }}>
                🎁 {gifts.length} Gifts
              </h2>
              <button
                onClick={handleDeleteAll}
                style={{
                  background: 'rgba(255,107,107,0.3)',
                  color: 'white',
                  border: '2px solid #ff6b6b',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {t.deleteGiftFolderBtn}
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px'
            }}>
              {gifts.map((gift) => (
                <div
                  key={gift.id}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {gift.photo ? (
                    <img
                      src={gift.photo}
                      alt={gift.giftName}
                      onClick={() => setViewImage(gift)}
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover',
                        cursor: 'pointer',
                        display: 'block'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '200px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      <FileImage size={48} opacity={0.5} />
                    </div>
                  )}

                  <div style={{
                    padding: '15px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <p style={{
                      margin: '0 0 8px 0',
                      fontWeight: 'bold',
                      color: '#333',
                      fontSize: '1em'
                    }}>
                      👨‍⚕️ {gift.doctorName}
                    </p>

                    {gift.doctorAddress && (
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '0.85em',
                        color: '#666'
                      }}>
                        📍 {gift.doctorAddress}
                      </p>
                    )}

                    {gift.giftName && (
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '0.9em',
                        color: '#667eea',
                        fontWeight: 'bold'
                      }}>
                        🎁 {gift.giftName}
                      </p>
                    )}

                    <p style={{
                      margin: '8px 0 12px 0',
                      fontSize: '0.8em',
                      color: '#999'
                    }}>
                      ⏰ {gift.date}
                    </p>

                    <button
                      onClick={() => handleDeleteGift(gift.id)}
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
          </>
        ) : (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '60px 20px',
            textAlign: 'center',
            color: '#666'
          }}>
            <FileImage size={64} color="#ccc" style={{ marginBottom: '15px' }} />
            <h3 style={{ margin: '0 0 10px 0' }}>{t.noGiftsTitle}</h3>
            <p style={{ margin: '0' }}>{t.noGiftsSubtitle}</p>
          </div>
        )}

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
              src={viewImage.photo}
              alt={viewImage.giftName}
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
              <p style={{ margin: '0 0 5px 0', fontSize: '1.1em', fontWeight: 'bold' }}>
                👨‍⚕️ {viewImage.doctorName}
              </p>
              {viewImage.giftName && (
                <p style={{ margin: '0 0 5px 0', fontSize: '0.95em' }}>
                  🎁 {viewImage.giftName}
                </p>
              )}
              <p style={{ margin: '0', fontSize: '0.85em', opacity: 0.8 }}>
                ⏰ {viewImage.date}
              </p>
              <a
                href={viewImage.photo}
                download={`${viewImage.doctorName}-${viewImage.giftName}.jpg`}
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
