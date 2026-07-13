import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Calendar, FileImage, Download, Search, BarChart3, RefreshCw, FolderOpen, Camera, X } from 'lucide-react';

export default function BillManager() {
  const [bills, setBills] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewImage, setViewImage] = useState(null); // pura photo dekhne ke liye

  // Load bills from localStorage on mount
  useEffect(() => {
    const savedBills = localStorage.getItem('bills_storage');
    if (savedBills) {
      try {
        setBills(JSON.parse(savedBills));
      } catch (err) {
        console.error('Error loading bills:', err);
      }
    }
  }, []);

  // Save bills to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('bills_storage', JSON.stringify(bills));
  }, [bills]);

  // Handle file upload
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setLoading(true);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBills((prevBills) => {
          const dateKey = selectedDate;
          if (!prevBills[dateKey]) {
            prevBills[dateKey] = [];
          }
          prevBills[dateKey].push({
            id: Date.now() + Math.random(),
            name: file.name,
            data: event.target.result,
            uploadedAt: new Date().toLocaleTimeString('hi-IN'),
            size: (file.size / 1024).toFixed(2) + ' KB',
            timestamp: new Date(dateKey).getTime()
          });
          return { ...prevBills };
        });
      };
      reader.readAsDataURL(file);
    });

    setLoading(false);
    e.target.value = '';
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
    if (window.confirm(`क्या आप ${formatDateHindi(dateKey)} के सभी बिल हटाना चाहते हैं?`)) {
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
        alert('✅ Bills successfully import ho gaye!');
      } catch (err) {
        alert('❌ File format galat hai!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Clear all data
  const clearAllData = () => {
    if (window.confirm('⚠️ क्या आप सभी बिल हटाना चाहते हैं? यह action undo नहीं हो सकता!')) {
      setBills({});
      alert('✅ सभी डेटा delete हो गया!');
    }
  };

  const stats = calculateStats();
  const sortedDates = Object.keys(bills).sort((a, b) => new Date(b) - new Date(a));
  const filteredBills = getFilteredBills();

  // Format date in Hindi
  const formatDateHindi = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('hi-IN', options);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', color: 'white', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '2.8em', margin: '0 0 10px 0' }}>📋 Bill Manager Pro</h1>
          <p style={{ fontSize: '1.1em', margin: '0 0 4px 0', opacity: 0.9 }}>सभी बिल को आसानी से organize करें</p>
          <p style={{ fontSize: '0.9em', margin: '0', opacity: 0.75 }}>Organize all your bills, effortlessly</p>
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
            <p style={{ margin: '0', color: '#666', fontSize: '0.9em' }}>📊 कुल बिल</p>
            <h3 style={{ margin: '8px 0 0 0', color: '#667eea', fontSize: '2.2em' }}>{stats.totalBills}</h3>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0', color: '#666', fontSize: '0.9em' }}>📅 कुल दिन</p>
            <h3 style={{ margin: '8px 0 0 0', color: '#764ba2', fontSize: '2.2em' }}>{stats.totalDates}</h3>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0', color: '#666', fontSize: '0.9em' }}>⏰ आज</p>
            <h3 style={{ margin: '8px 0 0 0', color: '#ff4757', fontSize: '2.2em' }}>{stats.todayBills}</h3>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0', color: '#666', fontSize: '0.9em' }}>💾 कुल Size</p>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#333', fontSize: '1em' }}>
                📅 तारीख चुनें:
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
                🔍 बिल खोजें:
              </label>
              <input
                type="text"
                placeholder="बिल का नाम लिखें..."
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
              {loading ? 'Upload हो रहा है...' : 'Gallery से चुनें'}
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                disabled={loading}
                style={{ display: 'none' }}
              />
            </label>

            <label style={{
              display: 'inline-flex',
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5253 100%)',
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
              <Camera size={18} style={{ marginRight: '8px' }} />
              {loading ? 'Upload हो रहा है...' : 'कैमरा से खींचें'}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                disabled={loading}
                style={{ display: 'none' }}
              />
            </label>

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
              <option value="newest">✨ नई पहले</option>
              <option value="oldest">🕐 पुरानी पहले</option>
              <option value="name">🔤 नाम के अनुसार</option>
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
              <option value="all">📋 सभी तारीखें</option>
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
              Backup लें
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
              Export करें
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
              सब मिटाएं
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
              <p style={{ color: '#999', fontSize: '1.3em', margin: '0' }}>अभी कोई बिल नहीं है</p>
              <p style={{ color: '#bbb', fontSize: '1em', margin: '10px 0 0 0' }}>अपना पहला बिल add करने के लिए ऊपर क्लिक करें 👆</p>
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
              <p style={{ color: '#999', fontSize: '1.3em', margin: '0' }}>कोई बिल नहीं मिला</p>
              <p style={{ color: '#bbb', fontSize: '1em', margin: '10px 0 0 0' }}>अलग search या filter try करें</p>
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
                        <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>कुल {bills[dateKey].length} बिल</p>
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
                        Folder हटाएं
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
                              Delete
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
                      <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>कुल {bills[filterDate].length} बिल</p>
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
                      Folder हटाएं
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
                            Delete
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

        {/* Full Photo Modal */}
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
                Photo Download करें
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
            📋 Bill Manager Pro
          </p>
          <p style={{ margin: '0 0 4px 0', opacity: 0.95 }}>
            आपके सभी बिल, एक जगह, हमेशा सुरक्षित 🔒
          </p>
          <p style={{ margin: '0', opacity: 0.85, fontSize: '0.9em' }}>
            All your bills, in one place, always secure 🔒
          </p>
        </div>
      </div>
    </div>
  );
}
