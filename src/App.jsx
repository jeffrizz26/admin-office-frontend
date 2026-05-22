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

  // Gagamit ng window width para sa responsive desktop vs mobile detection sa React
  const [isMobile, setIsMobile] = useState(false);

  const BACKEND_URL = 'https://admin-office-backend.vercel.app';
  const ADMIN_SECRET_PASSWORD = '1234';

  useEffect(() => {
    // 🔒 HARANG AT SECURITY: Huwag mag-fetch ng data kung hindi naka-display ang dashboard!
    if (view !== 'dashboard') { 
      setLoading(false); 
      return; 
    } 

    const fetchTransactions = async () => {
      try {
        // 🛡️ Nagpadala tayo ng Secure Authorization Header para harangan ang mga hacker sa Backend
        const response = await fetch(`${BACKEND_URL}/api/transactions`, {
          headers: {
            'Authorization': `Bearer ${ADMIN_SECRET_PASSWORD}`
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
  }, [view]); // 🔄 Re-run ang effect sa tuwing nagpapalit ang view (Form -> Login -> Dashboard)

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
      // 💡 HINDI natin nilagyan ng Authorization header dito para makapag-submit pa rin ang publiko kahit walang PIN
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
      // 🛡️ Nilagyan din ng Secure Header para walang makialam sa status ng mga dokumento ninyo
      const response = await fetch(`${BACKEND_URL}/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_SECRET_PASSWORD}`
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
    if (adminPasswordInput === ADMIN_SECRET_PASSWORD) {
      setLoading(true); // I-set ang loading bago lumipat para malinis tingnan
      setView('dashboard');
      setAdminPasswordInput('');
    } else {
      alert('❌ Wrong Password!');
    }
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
            <button onClick={() => { setView('form'); setTransactions([]); }} style={{ width: isMobile ? '100%' : 'auto', padding: '8px 15px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>🔒 Lock Dashboard</button>
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
                  {tx.dateNeeded && <p style={{ margin: '4px 0', fontSize: '14px', color: '#4b5563' }}><strong>Date Needed:</strong> {tx.dateNeeded}</p>}
                  
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
                    <th style={{ padding: '12px' }}>Date Needed</th>
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
                      <td style={{ padding: '12px', color: '#4b5563' }}>{tx.dateNeeded || '-'}</td>
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
        </div>
      )}
    </div>
  );
}
