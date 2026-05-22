import React, { useState, useEffect } from 'react';

export default function App() {
  const [view, setView] = useState('form');
  const [dashboardTab, setDashboardTab] = useState('active'); 
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); 
  const [formData, setFormData] = useState({
    firstName: '', middleName: '', lastName: '',
    purpose: '', subPurpose: '', otherSpecify: '', dateNeeded: '',
    urgency: 'Regular'
  });
  const [step, setStep] = useState(1);
  const [generatedTracking, setGeneratedTracking] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Isesave natin ang active session PIN sa localStorage para hindi laging nag-lologin kapag nag-refresh
  const [sessionPin, setSessionPin] = useState(() => {
    return localStorage.getItem('active_session_pin') || '';
  });

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '', confirmPin: '' });
  const [isMobile, setIsMobile] = useState(false);

  const BACKEND_URL = 'https://admin-office-backend.vercel.app'; // <--- PALITAN MO ITO NG TUNAY MONG LINK

  useEffect(() => {
    if (view !== 'dashboard') { 
      setLoading(false); 
      return; 
    } 

    const fetchTransactions = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/transactions`, {
          headers: {
            'Authorization': `Bearer ${sessionPin}` 
          }
        });
        const result = await response.json();
        if (result.success) {
          setTransactions(result.data);
        } else {
          // Kung na-unauthorized (ibig sabihin pinalitan ang pin sa ibang device), ilogout sya
          localStorage.removeItem('active_session_pin');
          setSessionPin('');
          setView('login');
          alert('⚠️ Session expired o nagbago ang Admin PIN. Mangyaring mag-login muli.');
        }
      } catch (error) {
        console.error("Dashboard Sync Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
    const interval = setInterval(fetchTransactions, 5000);

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize(); 
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, [view, sessionPin]);

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
          'Authorization': `Bearer ${sessionPin}`
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
      alert('❌ Error updating status: Unauthorized!');
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesTab = dashboardTab === 'active' ? tx.status !== 'Completed' : tx.status === 'Completed';
    const searchString = `${tx.trackingNumber || ''} ${tx.firstName || ''} ${tx.lastName || ''} ${tx.purpose || ''} ${tx.subPurpose || ''}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: adminPasswordInput })
      });
      const result = await response.json();
      
      if (result.success) {
        localStorage.setItem('active_session_pin', adminPasswordInput);
        setSessionPin(adminPasswordInput);
        setLoading(true); 
        setView('dashboard');
        setAdminPasswordInput('');
      } else {
        alert('❌ Maling Password!');
      }
    } catch (error) {
      alert('❌ Offline ang server!');
    }
  };

  const handleChangePinSubmit = async (e) => {
    e.preventDefault();
    if (pinForm.currentPin !== sessionPin) {
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

    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/change-pin`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionPin}`
        },
        body: JSON.stringify({ newPin: pinForm.newPin })
      });
      const result = await response.json();

      if (result.success) {
        localStorage.setItem('active_session_pin', pinForm.newPin);
        setSessionPin(pinForm.newPin);
        alert("✅ Tagumpay na napalitan ang Admin PIN sa Database at sa lahat ng Devices!");
        setShowPinModal(false);
        setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
      } else {
        alert("❌ Error: " + result.message);
      }
    } catch (error) {
      alert("❌ Bigong ma-update ang PIN sa server.");
    }
  };

  const exportToCSV = () => {
    if (filteredTransactions.length === 0) {
      alert("⚠️ Walang transaksyon na pwedeng i-export.");
      return;
    }
    const headers = ["Tracking Number", "First Name", "Middle Name", "Last Name", "Priority", "Purpose", "Sub-Purpose/Detail", "Date Needed", "Date Submitted", "Status"];
    const rows = filteredTransactions.map(tx => [
      tx.trackingNumber || 'N/A', tx.firstName || '', tx.middleName || '', tx.lastName || '', tx.urgency || 'Regular', tx.purpose || '', tx.subPurpose || tx.otherSpecify || '-', tx.dateNeeded || '-',
      tx.createdAt ? new Date(tx.createdAt).toLocaleString('en-US') : 'N/A', tx.status || 'Pending'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Office_Transactions_${dashboardTab}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh', padding: isMobile ? '10px' : '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setView('form')} style={{ flex: isMobile ? 1 : 'initial', padding: '10px 15px', cursor: 'pointer', backgroundColor: view === 'form' ? '#2563eb' : '#fff', color: view === 'form' ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '5px', fontWeight: 'bold', fontSize: isMobile ? '13px' : '14px' }}>📄 Form</button>
        <button onClick={() => setView(sessionPin ? 'dashboard' : 'login')} style={{ flex: isMobile ? 1 : 'initial', padding: '10px 15px', cursor: 'pointer', backgroundColor: view === 'dashboard' || view === 'login' ? '#16a34a' : '#fff', color: view === 'dashboard' || view === 'login' ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '5px', fontWeight: 'bold', fontSize: isMobile ? '13px' : '14px' }}>📊 Dashboard</button>
      </div>

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
                <option value="Recieve Document(s)">Recieve Document(s)</option>
                <option value="Request Supply / Equipment">Request Supply / Equipment</option>
                <option value="Request for Fund (Canteen)">Request for Fund (Canteen)</option>
                <option value="Others">Others</option>
              </select>

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

              {formData.purpose === "Recieve Document(s)" && (
                <div style={{ backgroundColor: '#fef9c3', padding: '15px', borderRadius: '5px', border: '1px solid #fef08a' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#854d0e' }}>Enter Document Tracking Number to Claim:</label>
                  <input type="text" name="subPurpose" placeholder="e.g., TXN-2026-XXXX" value={formData.subPurpose} onChange={handleInputChange} required style={{ padding: '10px', width: '95%', borderRadius: '5px', border: '1px solid #ca8a04', textTransform: 'uppercase' }}/>
                </div>
              )}

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

              {formData.purpose === "Others" && (
                <input type="text" name="otherSpecify" placeholder="Please specify your purpose" value={formData.otherSpecify} onChange={handleInputChange} required style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
              )}

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
                <h2 style={{ margin: '0', letterSpacing: '1px', color: '#1e293b', fontSize: isMobile ? '20px' : '24px' }}>{generatedTracking}</h2>
              </div>
              <button onClick={resetForm} style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>New Transaction</button>
            </div>
          )}
        </div>
      )}

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

      {view === 'dashboard' && (
        <div style={{ backgroundColor: 'white', padding: isMobile ? '15px' : '25px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '15px', marginBottom: '20px' }}>
            <h2 style={{ margin: '0', fontSize: isMobile ? '18px' : '24px' }}>Office Dashboard</h2>
            <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto', flexDirection: isMobile ? 'column' : 'row' }}>
              <button onClick={() => setShowPinModal(true)} style={{ padding: '8px 15px', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>🔑 Change PIN</button>
              <button onClick={exportToCSV} style={{ padding: '8px 15px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>📥 Export to CSV</button>
              <button onClick={() => { setView('form'); localStorage.removeItem('active_session_pin'); setSessionPin(''); }} style={{ padding: '8px 15px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>🔒 Logout</button>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <input type="text" placeholder="🔍 Mag-hanap..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '11px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #cbd5e1' }}/>
          </div>

          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px', marginBottom: '20px' }}>
            <button onClick={() => setDashboardTab('active')} style={{ flex: 1, padding: '10px', cursor: 'pointer', backgroundColor: dashboardTab === 'active' ? '#2563eb' : '#f3f4f6', color: dashboardTab === 'active' ? 'white' : '#333', border: '1px solid #ccc', borderRadius: '5px', fontWeight: 'bold' }}>
              Active ({transactions.filter(t => t.status !== 'Completed').length})
            </button>
            <button onClick={() => setDashboardTab('archive')} style={{ flex: 1, padding: '10px', cursor: 'pointer', backgroundColor: dashboardTab === 'archive' ? '#4b5563' : '#f3f4f6', color: dashboardTab === 'archive' ? 'white' : '#333', border: '1px solid #ccc', borderRadius: '5px', fontWeight: 'bold' }}>
              Archives ({transactions.filter(t => t.status === 'Completed').length})
            </button>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center' }}>Loading log details...</p>
          ) : filteredTransactions.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>No transactions found.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              {/* Desktop and Mobile viewing modes inside the table component logic remain clean */}
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px' }}>Tracking No.</th>
                    <th style={{ padding: '12px' }}>Pangalan</th>
                    <th style={{ padding: '12px' }}>Purpose</th>
                    <th style={{ padding: '12px' }}>Action / Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => (
                    <tr key={tx._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{tx.trackingNumber}</td>
                      <td style={{ padding: '12px' }}>{tx.lastName}, {tx.firstName}</td>
                      <td style={{ padding: '12px' }}>{tx.purpose}</td>
                      <td style={{ padding: '12px' }}>
                        <select value={tx.status || 'Pending'} onChange={(e) => handleStatusChange(tx._id, e.target.value)} style={{ padding: '6px', borderRadius: '5px' }}>
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

          {showPinModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
              <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', width: '100%', maxWidth: '320px' }}>
                <h3 style={{ margin: '0 0 15px 0', textAlign: 'center' }}>⚙️ Change Admin PIN</h3>
                <form onSubmit={handleChangePinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input type="password" placeholder="Current PIN" required value={pinForm.currentPin} onChange={(e) => setPinForm({...pinForm, currentPin: e.target.value})} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}/>
                  <input type="password" placeholder="New PIN" required value={pinForm.newPin} onChange={(e) => setPinForm({...pinForm, newPin: e.target.value})} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}/>
                  <input type="password" placeholder="Confirm New PIN" required value={pinForm.confirmPin} onChange={(e) => setPinForm({...pinForm, confirmPin: e.target.value})} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}/>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={() => setShowPinModal(false)} style={{ flex: 1, padding: '8px' }}>Cancel</button>
                    <button type="submit" style={{ flex: 1, padding: '8px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '5px' }}>Save</button>
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
