import React, { useState, useEffect } from 'react';

export default function App() {
  const [view, setView] = useState('form');
  const [dashboardTab, setDashboardTab] = useState('active'); // 'active' para sa Pending, 'archive' para sa Completed
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); // Estado para sa Admin Live Search
  const [formData, setFormData] = useState({
    firstName: '', middleName: '', lastName: '',
    purpose: '', subPurpose: '', otherSpecify: '', dateNeeded: '',
    urgency: 'Regular'
  });
  const [step, setStep] = useState(1);
  const [generatedTracking, setGeneratedTracking] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔐 FEATURE 3: Dynamic Admin PIN na naka-save sa LocalStorage (Fallback sa '1234')
  const [adminPin, setAdminPin] = useState(() => {
    return localStorage.getItem('admin_secret_pin') || '1234';
  });
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '', confirmPin: '' });

  // Gagamit ng window width para sa responsive desktop vs mobile detection sa React
  const [isMobile, setIsMobile] = useState(false);

  const BACKEND_URL = 'https://admin-office-backend.vercel.app';

  useEffect(() => {
    // 🔒 HARANG AT SECURITY: Huwag mag-fetch ng data kung hindi naka-display ang dashboard!
    if (view !== 'dashboard') { 
      setLoading(false); 
      return; 
    } 

    const fetchTransactions = async () => {
      try {
        // 🛡️ Gagamitin na ang dynamic adminPin sa Authorization Header
        const response = await fetch(`${BACKEND_URL}/api/transactions`, {
          headers: {
            'Authorization': `Bearer ${adminPin}`
          }
        });
        const result = await response.json();
        if (result.success) setTransactions(result.data);
      } catch (error) {
        console.error("Dashboard Sync Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
    const interval = setInterval(fetchTransactions, 5000);

    // Subaybayan ang sukat ng screen ng user
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize(); // Run sa simula
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, [view, adminPin]); // 🔄 Re-run kapag nagbago ang view o PIN

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePurposeChange = (e) => {
    setFormData({ ...formData, purpose: e.target.value, subPurpose: '', otherSpecify: '', dateNeeded: '' });
  };

  const resetForm = () => {
    setFormData({ firstName: '', middleName: '', lastName: '', purpose: '', subPurpose: '', otherSpecify: '', dateNeeded: '', urgency: 'Regular' });
    setGeneratedTracking('');
    setStep(1);
  };

  const saveToDatabase = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      if (result.success) {
        setGeneratedTracking(result.data.trackingNumber);
        setStep(3);
        setTransactions(prev => [result.data, ...prev]);
      } else {
        alert('❌ Error: ' + result.message);
      }
    } catch (error) {
      console.error("Submission Error:", error);
      alert('❌ Server Offline!');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminPin}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const result = await response.json();
      if (result.success) {
        setTransactions(prev => 
          prev.map(tx => tx._id === id ? { ...tx, status: newStatus } : tx)
        );
      }
    } catch (error) {
      console.error("Status Update Error:", error);
      alert('❌ Error updating status!');
    }
  };

  // Live filtering base sa Tab (Active/Archive) at sa Search Bar input
  const filteredTransactions = transactions.filter(tx => {
    const matchesTab = dashboardTab === 'active' ? tx.status !== 'Completed' : tx.status === 'Completed';
    
    const searchString = `${tx.trackingNumber || ''} ${tx.firstName || ''} ${tx.lastName || ''} ${tx.purpose || ''} ${tx.subPurpose || ''}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    
    return matchesTab && matchesSearch;
  });

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPasswordInput === adminPin) {
      setLoading(true); 
      setView('dashboard');
      setAdminPasswordInput('');
    } else {
      alert('❌ Wrong Password!');
    }
  };

  // 📊 FEATURE 1: Function para sa Export to CSV/Excel
  const exportToCSV = () => {
    if (filteredTransactions.length === 0) {
      alert("⚠️ Walang transaksyon na pwedeng i-export.");
      return;
    }

    // Headers ng Excel/CSV
    const headers = ["Tracking Number", "First Name", "Middle Name", "Last Name", "Priority", "Purpose", "Sub-Purpose/Detail", "Date Needed", "Date Submitted", "Status"];
    
    // Pag-format ng mga hilera ng data
    const rows = filteredTransactions.map(tx => [
      tx.trackingNumber || 'N/A',
      tx.firstName || '',
      tx.middleName || '',
      tx.lastName || '',
      tx.urgency || 'Regular',
      tx.purpose || '',
      tx.subPurpose || tx.otherSpecify || '-',
      tx.dateNeeded || '-',
      tx.createdAt ? new Date(tx.createdAt).toLocaleString('en-US') : 'N/A',
      tx.status || 'Pending'
    ]);

    // Pagsasama ng headers at rows na may tamang escaping para sa mga kuwit (commas)
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Office_Transactions_${dashboardTab}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 🔐 FEATURE 3: Function para sa pagpapalit ng Admin PIN
  const handleChangePinSubmit = (e) => {
    e.preventDefault();
    if (pinForm.currentPin !== adminPin) {
      alert("❌ Maling kasalukuyang PIN!");
      return;
    }
    if (pinForm.newPin.length < 4) {
      alert("⚠️ Ang bagong PIN ay dapat hindi bababa sa 4 na karakter.");
      return;
    }
    if (pinForm.newPin !== pinForm.confirmPin) {
      alert("❌ Hindi magkatugma ang Bagong PIN at Confirm PIN!");
      return;
    }

    localStorage.setItem('admin_secret_pin', pinForm.newPin);
    setAdminPin(pinForm.newPin);
    alert("✅ Tagumpay na napalitan ang Admin PIN!");
    setShowPinModal(false);
    setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
  };

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh', padding: isMobile ? '10px' : '20px' }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setView('form')} style={{ flex: isMobile ? 1 : 'initial', padding: '10px 15px', cursor: 'pointer', backgroundColor: view === 'form' ? '#2563eb' : '#fff', color: view === 'form' ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '5px', fontWeight: 'bold', fontSize: isMobile ? '13px' : '14px' }}>📄 Form</button>
        <button onClick={() => setView(view === 'dashboard' ? 'dashboard' : 'login')} style={{ flex: isMobile ? 1 : 'initial', padding: '10px 15px', cursor: 'pointer', backgroundColor: view === 'dashboard' || view === 'login' ? '#16a34a' : '#fff', color: view === 'dashboard' || view === 'login' ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '5px', fontWeight: 'bold', fontSize: isMobile ? '13px' : '14px' }}>📊 Dashboard</button>
      </div>

      {/* 1. TRANSACTION FORM VIEW */}
      {view === 'form' && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '450px', margin: '0 auto' }}>
          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h2 style={{ textAlign: 'center', margin: '0 0 5px 0', fontSize: isMobile ? '20px' : '24px' }}>Admin Office Transaction</h2>
              <input type="text" name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleInputChange} required style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}/>
              <input type="text" name="middleName" placeholder="Middle Name (Optional)" value={formData.middleName} onChange={handleInputChange} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}/>
              <input type="text" name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleInputChange} required style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}/>

              <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Urgency / Priority:</label>
              <div style={{ display: 'flex', gap: '20px', fontSize: '14px' }}>
                <label><input type="radio" name="urgency" value="Regular" checked={formData.urgency === 'Regular'} onChange={handleInputChange} /> Regular</label>
                <label style={{ color: '#dc2626', fontWeight: 'bold' }}><input type="radio" name="urgency" value="Urgent" checked={formData.urgency === 'Urgent'} onChange={handleInputChange} /> ⚠️ Urgent</label>
              </div>

              <select name="purpose" value={formData.purpose} onChange={handlePurposeChange} required style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}>
                <option value="">-- Select Purpose --</option>
                <option value="Inquiry">Inquiry</option>
                <option value="Sign DTR/Summary of Absences">Sign DTR/Summary of Absences</option>
                <option value="File Form 6">File Form 6</option>
                <option value="Request Document(s)">Request Document(s)</option>
                <option value="Submit Document(s) for Processing">Submit Document(s) for Processing</option>
                <option value="Recieve Documents">Recieve Documents</option>
                <option value="Request Supply / Equipment">Request Supply / Equipment</option>
                <option value="Request for Fund (Canteen)">Request for Fund (Canteen)</option>
                <option value="Others">Others</option>
              </select>

              {/* A. Para sa Submit Document(s) for Processing */}
              {formData.purpose === "Submit Document(s) for Processing" && (
                <div style={{ backgroundColor: '#eff6ff', padding: '15px', borderRadius: '5px', border: '1px solid #bfdbfe' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#1e40af' }}>Select Document to Process:</label>
                  <select name="subPurpose" value={formData.subPurpose} onChange={handleInputChange} required style={{ padding: '8px', width: '100%', borderRadius: '5px', border: '1px solid #ccc' }}>
                    <option value="">-- Choose Document --</option>
                    <option value="Travel Authority (Local)">Travel Authority (Local)</option>
                    <option value="Travel Authority (Abroad)">Travel Authority (Abroad)</option>
                    <option value="Permit to Teach">Permit to Teach</option>
                    <option value="Permit to Study">Permit to Study</option>
                  </select>
                </div>
              )}

              {/* B. Para sa Recieve Documents (Automated Tracking Field) */}
              {formData.purpose === "Recieve Documents" && (
                <div style={{ backgroundColor: '#fef9c3', padding: '15px', borderRadius: '5px', border: '1px solid #fef08a' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#854d0e' }}>Enter Document Tracking Number to Claim:</label>
                  <input 
                    type="text" 
                    name="subPurpose" 
                    placeholder="e.g., TXN-2026-XXXX" 
                    value={formData.subPurpose} 
                    onChange={handleInputChange} 
                    required 
                    style={{ padding: '10px', width: '95%', borderRadius: '5px', border: '1px solid #ca8a04', textTransform: 'uppercase' }}
                  />
                  <small style={{ color: '#854d0e', display: 'block', marginTop: '5px', fontSize: '11px' }}>
                    💡 I-type ang tracking number na nakuha noong ikaw ay nag-submit.
                  </small>
                </div>
              )}

              {/* C. Para sa Request Document(s) */}
              {formData.purpose === 'Request Document(s)' && (
                <div style={{ backgroundColor: '#eff6ff', padding: '15px', borderRadius: '5px', border: '1px solid #bfdbfe' }}>
                  <select name="subPurpose" value={formData.subPurpose} onChange={handleInputChange} required style={{ padding: '8px', width: '100%', borderRadius: '5px', border: '1px solid #ccc' }}>
                    <option value="">-- Choose Document --</option>
                    <option value="IPCRF">IPCRF</option>
                    <option value="SALN">SALN</option>
                    <option value="ITR">ITR</option>
                    <option value="SERVICE RECORD">SERVICE RECORD</option>
                    <option value="CERTIFICATE OF EMPLOYMENT (COE)">CERTIFICATE OF EMPLOYMENT (COE)</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
              )}

              {/* D. Para sa Others */}
              {formData.purpose === "Others" && (
                <input type="text" name="otherSpecify" placeholder="Please specify your purpose" value={formData.otherSpecify} onChange={handleInputChange} required style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
              )}

              {/* E. Date Needed Field - Nakatago kapag URGENT */}
              {formData.urgency !== "Urgent" && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Date Needed (Optional):</label>
                  <input type="date" name="dateNeeded" value={formData.dateNeeded} onChange={handleInputChange} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
                </div>
              )}

              <button type="submit" style={{ padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>NEXT STEP ➡️</button>
            </form>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h2 style={{ textAlign: 'center' }}>Confirm Information</h2>
              <p><strong>Name:</strong> {formData.firstName} {formData.middleName} {formData.lastName}</p>
              <p><strong>Priority:</strong> {formData.urgency}</p>
              <p><strong>Purpose:</strong> {formData.purpose} {formData.subPurpose && `(${formData.subPurpose})`}</p>
              {formData.dateNeeded && <p><strong>Date Needed:</strong> {formData.dateNeeded}</p>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, padding: '10px', backgroundColor: '#ccc', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Back</button>
                <button onClick={saveToDatabase} style={{ flex: 1, padding: '10px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>SUBMIT TRANSACTION</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <h1 style={{ color: '#16a34a', fontSize: '48px', margin: '0' }}>✓</h1>
              <h3>Thank you for answering.</h3>
              <div style={{ backgroundColor: '#fef08a', padding: '15px', borderRadius: '5px', margin: '20px 0', border: '1px solid #fef08a' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#6b7280' }}>Your Tracking Number:</p>
                <h2 style={{ margin: '0', letterSpacing: '1px', color: '#1e293b', fontSize: isMobile ? '20px' : '24px' }}>{generatedTracking}</h2>
              </div>
              <button onClick={resetForm} style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>New Transaction</button>
            </div>
          )}
        </div>
      )}

      {/* 2. ADMIN LOGIN VIEW */}
      {view === 'login' && (
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '350px', margin: '0 auto', textAlign: 'center' }}>
          <h2>Admin Login</h2>
          <form onSubmit={handleAdminLogin}>
            <input type="password" placeholder="Enter Admin Password" value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} required style={{ padding: '10px', width: '80%', borderRadius: '5px', border: '1px solid #ccc', marginBottom: '15px', textAlign: 'center' }}/>
            <br/>
            <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Unlock Dashboard</button>
          </form>
        </div>
      )}

      {/* 3. ADMIN DASHBOARD VIEW */}
      {view === 'dashboard' && (
        <div style={{ backgroundColor: 'white', padding: isMobile ? '15px' : '25px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '15px', marginBottom: '20px' }}>
            <h2 style={{ margin: '0', fontSize: isMobile ? '18px' : '24px' }}>Office Dashboard</h2>
            <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto', flexDirection: isMobile ? 'column' : 'row' }}>
              {/* FEATURE 3: Button para buksan ang Change PIN Form */}
              <button onClick={() => setShowPinModal(true)} style={{ padding: '8px 15px', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>🔑 Change PIN</button>
              {/* FEATURE 1: Export to Excel/CSV Button */}
              <button onClick={exportToCSV} style={{ padding: '8px 15px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>📥 Export to CSV (Excel)</button>
              <button onClick={() => { setView('form'); setTransactions([]); }} style={{ padding: '8px 15px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>🔒 Lock Dashboard</button>
            </div>
          </div>

          {/* NEW LIVE SEARCH FILTER BAR FOR ADMIN */}
          <div style={{ marginBottom: '20px' }}>
            <input 
              type="text" 
              placeholder="🔍 Mag-hanap gamit ang Pangalan, Tracking No, o Pakay..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '11px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}
            />
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px', marginBottom: '20px' }}>
            <button onClick={() => setDashboardTab('active')} style={{ flex: 1, padding: '10px', cursor: 'pointer', backgroundColor: dashboardTab === 'active' ? '#2563eb' : '#f3f4f6', color: dashboardTab === 'active' ? 'white' : '#333', border: '1px solid #ccc', borderRadius: '5px', fontWeight: 'bold', fontSize: '13px' }}>
              📥 Active ({transactions.filter(t => t.status !== 'Completed').length})
            </button>
            <button onClick={() => setDashboardTab('archive')} style={{ flex: 1, padding: '10px', cursor: 'pointer', backgroundColor: dashboardTab === 'archive' ? '#4b5563' : '#f3f4f6', color: dashboardTab === 'archive' ? 'white' : '#333', border: '1px solid #ccc', borderRadius: '5px', fontWeight: 'bold', fontSize: '13px' }}>
              🗄️ Archives ({transactions.filter(t => t.status === 'Completed').length})
            </button>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center' }}>Loading log details...</p>
          ) : filteredTransactions.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>No matching transactions found.</p>
          ) : isMobile ? (
            /* A. MOBILE CARDS VIEW */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {filteredTransactions.map((tx) => (
                <div key={tx._id} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb', borderLeft: `6px solid ${tx.urgency === 'Urgent' && tx.status !== 'Completed' ? '#dc2626' : '#2563eb'}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 'bold', color: '#1e3a8a', fontSize: '15px' }}>{tx.trackingNumber || 'N/A'}</span>
                    <span style={{ fontSize: '12px', padding: '2px 6px', borderRadius: '4px', backgroundColor: tx.urgency === 'Urgent' ? '#fef2f2' : '#f3f4f6', color: tx.urgency === 'Urgent' ? '#dc2626' : '#6b7280', fontWeight: 'bold' }}>
                      {tx.urgency === 'Urgent' ? '⚠️ Urgent' : 'Regular'}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>Pangalan:</strong> {tx.lastName}, {tx.firstName}</p>
                  <p style={{ margin: '4px 0', fontSize: '14px' }}><strong>Purpose:</strong> {tx.purpose}</p>
                  {tx.subPurpose && <p style={{ margin: '4px 0', fontSize: '14px', color: '#2563eb' }}><strong>Detail:</strong> {tx.subPurpose}</p>}
                  
                  {/* FEATURE 2: Mobile Format ng Petsa at Oras */}
                  <div style={{ margin: '6px 0', fontSize: '13px', backgroundColor: '#f8fafc', padding: '6px', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
                    <div>📅 <strong>Needed:</strong> {tx.dateNeeded || '-'}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      📥 <strong>Submitted:</strong> {tx.createdAt ? new Date(tx.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#4b5563' }}>Status:</span>
                    <select value={tx.status || 'Pending'} onChange={(e) => handleStatusChange(tx._id, e.target.value)} style={{ padding: '6px', borderRadius: '5px', border: '1px solid #ccc', fontWeight: 'bold', backgroundColor: tx.status === 'Completed' ? '#dcfce7' : tx.status === 'In Progress' ? '#dbeafe' : '#fef9c3', color: tx.status === 'Completed' ? '#16a34a' : tx.status === 'In Progress' ? '#2563eb' : '#ca8a04', fontSize: '13px' }}>
                      <option value="Pending">🕒 Pending</option>
                      <option value="In Progress">⚙️ In Progress</option>
                      <option value="Completed">✅ Completed</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* B. DESKTOP TABLE VIEW */
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px' }}>Tracking No.</th>
                    <th style={{ padding: '12px' }}>Pangalan</th>
                    <th style={{ padding: '12px' }}>Priority</th>
                    <th style={{ padding: '12px' }}>Purpose</th>
                    <th style={{ padding: '12px' }}>Detail</th>
                    <th style={{ padding: '12px' }}>Date Log Details</th>
                    <th style={{ padding: '12px' }}>Action / Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => (
                    <tr key={tx._id} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: tx.urgency === 'Urgent' && tx.status !== 'Completed' ? '#fef2f2' : 'white' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#1e3a8a' }}>{tx.trackingNumber || 'N/A'}</td>
                      <td style={{ padding: '12px' }}>{tx.lastName}, {tx.firstName}</td>
                      <td style={{ padding: '12px', color: tx.urgency === 'Urgent' ? '#dc2626' : '#333', fontWeight: tx.urgency === 'Urgent' ? 'bold' : 'normal' }}>
                        {tx.urgency === 'Urgent' ? '⚠️ Urgent' : 'Regular'}
                      </td>
                      <td style={{ padding: '12px' }}>{tx.purpose}</td>
                      <td style={{ padding: '12px', color: '#2563eb' }}>{tx.subPurpose || '-'}</td>
                      
                      {/* FEATURE 2: AUTOMATED SUBMISSION DATE & TIME DISPLAY */}
                      <td style={{ padding: '12px', fontSize: '13px' }}>
                        <div>📅 <strong>Needed:</strong> {tx.dateNeeded || '-'}</div>
                        <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', lineHeight: '1.3' }}>
                          📥 <strong>Submitted:</strong>
                          <br/>
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'} 
                          {tx.createdAt ? ' | ' : ''}
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>
                      
                      <td style={{ padding: '12px' }}>
                        <select value={tx.status || 'Pending'} onChange={(e) => handleStatusChange(tx._id, e.target.value)} style={{ padding: '6px', borderRadius: '5px', border: '1px solid #ccc', fontWeight: 'bold', backgroundColor: tx.status === 'Completed' ? '#dcfce7' : tx.status === 'In Progress' ? '#dbeafe' : '#fef9c3', color: tx.status === 'Completed' ? '#16a34a' : tx.status === 'In Progress' ? '#2563eb' : '#ca8a04' }}>
                          <option value="Pending">🕒 Pending</option>
                          <option value="In Progress">⚙️ In Progress</option>
                          <option value="Completed">✅ Completed</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* FEATURE 3: POPUP MODAL PARA SA CHANGE ADMIN PIN FORM */}
          {showPinModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
              <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', width: '100%', maxWidth: '320px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                <h3 style={{ margin: '0 0 15px 0', textAlign: 'center' }}>⚙️ Change Admin PIN</h3>
                <form onSubmit={handleChangePinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input 
                    type="password" 
                    placeholder="Current PIN" 
                    required 
                    value={pinForm.currentPin}
                    onChange={(e) => setPinForm({...pinForm, currentPin: e.target.value})}
                    style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                  />
                  <input 
                    type="password" 
                    placeholder="New PIN (min 4 characters)" 
                    required 
                    value={pinForm.newPin}
                    onChange={(e) => setPinForm({...pinForm, newPin: e.target.value})}
                    style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                  />
                  <input 
                    type="password" 
                    placeholder="Confirm New PIN" 
                    required 
                    value={pinForm.confirmPin}
                    onChange={(e) => setPinForm({...pinForm, confirmPin: e.target.value})}
                    style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                  />
                  <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                    <button type="button" onClick={() => setShowPinModal(false)} style={{ flex: 1, padding: '8px', backgroundColor: '#ccc', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                    <button type="submit" style={{ flex: 1, padding: '8px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Save</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
