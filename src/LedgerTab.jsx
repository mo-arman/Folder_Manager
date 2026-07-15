import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Trash2, Globe } from 'lucide-react';

const translations = {
  hi: {
    ledgerTitle: '📒 ग्राहक Ledger',
    ledgerSubtitle: 'हर व्यक्ति का लेन-देन और बकाया राशि',
    billsTabBtn: '🧾 Bills',
    ledgerTabBtn: '📒 Ledger (खाता)',
    giftsTabBtn: '🎁 Gifts',
    personNameLabel: '👤 व्यक्ति/ग्राहक का नाम:',
    personNamePlaceholder: 'जैसे: रमेश, सीता...',
    amountLabel: '💰 राशि (₹):',
    amountPlaceholder: 'जैसे: 500',
    typeReceived: '✅ लिया',
    typeGiven: '📤 दिया (उधार)',
    addEntryBtn: 'Entry जोड़ें',
    entryAddedToast: '✅ Entry जुड़ गई!',
    entryMissingInfo: '⚠️ कृपया व्यक्ति का नाम और राशि दोनों भरें',
    ledgerTotalReceived: 'कुल लिया',
    ledgerTotalGiven: 'कुल दिया (उधार)',
    ledgerNetLabel: 'बकाया',
    ledgerYouGet: 'आपको मिलने हैं',
    ledgerYouOwe: 'आपको देने हैं',
    ledgerSettled: 'हिसाब बराबर ✅',
    ledgerTxnCount: 'लेन-देन',
    ledgerNoData: 'अभी कोई ledger entry नहीं है',
    ledgerNoDataSub: 'व्यक्ति का नाम और राशि भरकर entry जोड़ें 👆',
    appName: '📋 Bill Manager Pro',
    footerLine1: 'आपके सभी बिल, एक जगह, हमेशा सुरक्षित 🔒',
    deleteBtn: 'Delete',
    deleteLedgerEntry: 'क्या आप इस entry को हटाना चाहते हैं?',
    deletePersonBtn: 'व्यक्ति हटाएं',
    deletePersonConfirm: 'क्या आप इस व्यक्ति के सभी लेन-देन हटाना चाहते हैं?',
    noPhotoLabel: 'बिना फोटो',
  },
  en: {
    ledgerTitle: '📒 Customer Ledger',
    ledgerSubtitle: 'Every person\'s transactions and balance',
    billsTabBtn: '🧾 Bills',
    ledgerTabBtn: '📒 Ledger',
    giftsTabBtn: '🎁 Gifts',
    personNameLabel: '👤 Person/Customer Name:',
    personNamePlaceholder: 'e.g. Ramesh, Sita...',
    amountLabel: '💰 Amount (₹):',
    amountPlaceholder: 'e.g. 500',
    typeReceived: '✅ Received',
    typeGiven: '📤 Given (Credit)',
    addEntryBtn: 'Add Entry',
    entryAddedToast: '✅ Entry added!',
    entryMissingInfo: '⚠️ Please fill in both person name and amount',
    ledgerTotalReceived: 'Total Received',
    ledgerTotalGiven: 'Total Given (Credit)',
    ledgerNetLabel: 'Balance',
    ledgerYouGet: 'You will receive',
    ledgerYouOwe: 'You owe',
    ledgerSettled: 'Settled ✅',
    ledgerTxnCount: 'transactions',
    ledgerNoData: 'No ledger entries yet',
    ledgerNoDataSub: 'Add an entry with a person name and amount 👆',
    appName: '📋 Bill Manager Pro',
    footerLine1: 'All your bills, in one place, always secure 🔒',
    deleteBtn: 'Delete',
    deleteLedgerEntry: 'Are you sure you want to delete this entry?',
    deletePersonBtn: 'Delete Person',
    deletePersonConfirm: 'Are you sure you want to delete all transactions for this person?',
    noPhotoLabel: 'No photo',
  }
};

export default function LedgerTab({ lang, setLang, setViewMode }) {
  const t = translations[lang];
  const [ledger, setLedger] = useState({});
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState('received');
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // localStorage se ledger data load karo
  useEffect(() => {
    const savedLedger = localStorage.getItem('billManagerLedger');
    if (savedLedger) {
      try {
        setLedger(JSON.parse(savedLedger));
      } catch (err) {
        console.error('Error loading ledger:', err);
      }
    }
    setInitialLoadDone(true);
  }, []);

  // jab bhi ledger change ho, localStorage mein save karo
  useEffect(() => {
    if (initialLoadDone) {
      localStorage.setItem('billManagerLedger', JSON.stringify(ledger));
    }
  }, [ledger, initialLoadDone]);

  const handleAddEntry = () => {
    if (!personName.trim() || !amount.trim()) {
      alert(t.entryMissingInfo);
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert(t.entryMissingInfo);
      return;
    }

    setLedger(prev => {
      const newLedger = { ...prev };
      if (!newLedger[personName]) {
        newLedger[personName] = [];
      }
      newLedger[personName].push({
        id: Date.now(),
        amount: parsedAmount,
        type: transactionType,
        date: new Date().toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN')
      });
      return newLedger;
    });

    setPersonName('');
    setAmount('');
    setTransactionType('received');
  };

  const handleDeleteEntry = (personName, entryId) => {
    setLedger(prev => {
      const newLedger = { ...prev };
      newLedger[personName] = newLedger[personName].filter(entry => entry.id !== entryId);
      if (newLedger[personName].length === 0) {
        delete newLedger[personName];
      }
      return newLedger;
    });
  };

  const handleDeletePerson = (personName) => {
    if (window.confirm(t.deletePersonConfirm)) {
      setLedger(prev => {
        const newLedger = { ...prev };
        delete newLedger[personName];
        return newLedger;
      });
    }
  };

  const calculateBalance = (personName) => {
    const transactions = ledger[personName] || [];
    let received = 0;
    let given = 0;

    transactions.forEach(txn => {
      if (txn.type === 'received') {
        received += txn.amount;
      } else {
        given += txn.amount;
      }
    });

    return { received, given, net: received - given };
  };

  const allPeople = Object.keys(ledger).sort();

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
            <p style={{ margin: '0', fontSize: '1em', opacity: 0.9 }}>{t.ledgerSubtitle}</p>
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

        {/* Add Entry Form */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '30px',
          marginBottom: '30px'
        }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>नया लेन-देन जोड़ें / Add New Transaction</h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                {t.personNameLabel}
              </label>
              <input
                type="text"
                placeholder={t.personNamePlaceholder}
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
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
                {t.amountLabel}
              </label>
              <input
                type="number"
                placeholder={t.amountPlaceholder}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
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
                प्रकार / Type
              </label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '2px solid #ddd',
                  fontSize: '1em',
                  boxSizing: 'border-box'
                }}
              >
                <option value="received">{t.typeReceived}</option>
                <option value="given">{t.typeGiven}</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleAddEntry}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1em'
            }}
          >
            {t.addEntryBtn}
          </button>
        </div>

        {/* Ledger Entries */}
        {allPeople.length > 0 ? (
          <div style={{ display: 'grid', gap: '20px' }}>
            {allPeople.map(person => {
              const { received, given, net } = calculateBalance(person);
              const transactions = ledger[person];
              
              return (
                <div
                  key={person}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                >
                  {/* Person Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '20px',
                    borderBottom: '2px solid #eee',
                    paddingBottom: '15px'
                  }}>
                    <div>
                      <h3 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '1.3em' }}>
                        👤 {person}
                      </h3>
                      <p style={{ margin: '0', color: '#666', fontSize: '0.9em' }}>
                        {transactions.length} {t.ledgerTxnCount}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeletePerson(person)}
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
                        gap: '4px'
                      }}
                    >
                      <Trash2 size={14} />
                      {t.deletePersonBtn}
                    </button>
                  </div>

                  {/* Balance Summary */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '15px',
                    marginBottom: '20px',
                    padding: '15px',
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                    borderRadius: '8px'
                  }}>
                    <div>
                      <p style={{ margin: '0 0 5px 0', fontSize: '0.85em', color: '#666' }}>
                        {t.ledgerTotalReceived}
                      </p>
                      <p style={{ margin: '0', fontSize: '1.5em', fontWeight: 'bold', color: '#2ed573' }}>
                        ₹{received.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 5px 0', fontSize: '0.85em', color: '#666' }}>
                        {t.ledgerTotalGiven}
                      </p>
                      <p style={{ margin: '0', fontSize: '1.5em', fontWeight: 'bold', color: '#ff6b6b' }}>
                        ₹{given.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 5px 0', fontSize: '0.85em', color: '#666' }}>
                        {t.ledgerNetLabel}
                      </p>
                      <p style={{
                        margin: '0',
                        fontSize: '1.5em',
                        fontWeight: 'bold',
                        color: net > 0 ? '#2ed573' : net < 0 ? '#ff6b6b' : '#667eea'
                      }}>
                        ₹{Math.abs(net).toFixed(2)}
                      </p>
                      <p style={{ margin: '5px 0 0 0', fontSize: '0.75em', color: '#666' }}>
                        {net > 0 && `${t.ledgerYouGet}`}
                        {net < 0 && `${t.ledgerYouOwe}`}
                        {net === 0 && `${t.ledgerSettled}`}
                      </p>
                    </div>
                  </div>

                  {/* Transactions List */}
                  <div>
                    <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>लेन-देन / Transactions</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {transactions.map((txn, idx) => (
                        <div
                          key={txn.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px',
                            background: '#f5f5f5',
                            borderRadius: '8px',
                            borderLeft: `4px solid ${txn.type === 'received' ? '#2ed573' : '#ff6b6b'}`
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                            {txn.type === 'received' ? (
                              <ArrowRight color="#2ed573" size={20} />
                            ) : (
                              <ArrowLeft color="#ff6b6b" size={20} />
                            )}
                            <div>
                              <p style={{ margin: '0', fontWeight: 'bold', color: '#333' }}>
                                ₹{txn.amount.toFixed(2)}
                              </p>
                              <p style={{ margin: '0', fontSize: '0.8em', color: '#666' }}>
                                {txn.date}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteEntry(person, txn.id)}
                            style={{
                              background: 'transparent',
                              border: '1px solid #ff6b6b',
                              color: '#ff6b6b',
                              padding: '6px 10px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.8em'
                            }}
                          >
                            {t.deleteBtn}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '60px 20px',
            textAlign: 'center',
            color: '#666'
          }}>
            <h3 style={{ margin: '0 0 10px 0' }}>{t.ledgerNoData}</h3>
            <p style={{ margin: '0' }}>{t.ledgerNoDataSub}</p>
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
