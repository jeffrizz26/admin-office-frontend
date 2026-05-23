import React, { useState, useEffect } from 'react';

const dashboardStyles = `
  .dash-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; table-layout: fixed; }
  .dash-th, .dash-td { padding: 12px 6px; vertical-align: top; border-bottom: 1px solid #e5e7eb; }
  .col-track { width: 115px; }
  .col-detail { width: auto; }
  .col-time { width: 145px; }
  .col-status { width: 120px; }
  .mobile-time-block { display: none; }

  /* Custom dropdown styling para sa suwabe at kontroladong listahan ng staff */
  .custom-dropdown-list {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background-color: white;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    max-height: 130px; /* Nilimitahan para magkasya kahit naka-mobile landscape */
    overflow-y: auto;
    z-index: 50;
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    margin-top: 2px;
    padding: 0;
    list-style: none;
  }
  .custom-dropdown-item {
    padding: 10px 12px;
    cursor: pointer;
    font-size: 14px;
    color: #334155;
    border-bottom: 1px solid #f1f5f9;
    text-align: left;
  }
  .custom-dropdown-item:hover {
    background-color: #f1f5f9;
    color: #1e40af;
  }

  @media (max-width: 767px) {
    .col-track { width: 100px; }
    .col-time { display: none; }
    .col-status { width: 100px; text-align: right; }
    .mobile-time-block { display: block; font-size: 11px; color: #64748b; margin-top: 3px; }
  }

  @media (min-width: 568px) and (orientation: landscape) {
    .col-time { display: table-cell !important; }
    .mobile-time-block { display: none !important; }
    .col-status { width: 125px !important; text-align: left !important; }
  }
`;

export default function App() {
  const [view, setView] = useState('form');
  const [dashboardTab, setDashboardTab] = useState('active'); 
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); 
  const [formData, setFormData] = useState({
    firstName: '', middleName: '', lastName: '',
    purpose: '', subPurpose: '', otherSpecify: '', dateNeeded: '', urgency: 'Regular',
    assistedBy: '' 
  });
  const [step, setStep] = useState(1);
  const [generatedTracking, setGeneratedTracking] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [assistants, setAssistants] = useState([]); 
  const [showStaffDropdown, setShowStaffDropdown] = useState(false); // 👈 Taga-kontrol kung bukas ang listahan ng staff
  const [newStaffName, setNewStaffName] = useState(''); 
  const [loading, setLoading] = useState(true);
  const [sessionPin, setSessionPin] = useState(() => localStorage.getItem('active_session_pin') || '');
  const [showPinModal, setShowPinModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false); 
  const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '', confirmPin: '' });

  const BACKEND_URL = 'https://admin-office-backend.vercel.app'; 

  useEffect(() => {
    const fetchAssistants = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/assistants`);
        const result = await res.json();
        if (result.success) setAssistants(result.data);
      } catch (err) { console.error("Error loading staff list:", err); }
    };
    fetchAssistants();

    if (view !== 'dashboard') { setLoading(false); return; } 

    const fetchTransactions = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/transactions`, {
          headers: { 'Authorization': `Bearer ${sessionPin}` }
        });
        const result = await response.json();
        if (result.success) {
          setTransactions(result.data);
        } else {
          localStorage.removeItem('active_session_pin'); setSessionPin(''); setView('login');
          alert('⚠️ Session expired. Mangyaring mag-login muli.');
        }
      } catch (error) { console.error("Dashboard Sync Error:", error); } 
      finally { setLoading(false); }
    };

    fetchTransactions();
    const interval = setInterval(fetchTransactions, 5000);
    return () => clearInterval(interval);
  }, [view, sessionPin]);

  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handlePurposeChange = (e) => setFormData({ ...formData, purpose: e.target.value, subPurpose: '', otherSpecify: '', dateNeeded: '' });
  
  const resetForm = () => {
    setFormData({ firstName: '', middleName: '', lastName: '', purpose: '', subPurpose: '', otherSpecify: '', dateNeeded: '', urgency: 'Regular', assistedBy: '' });
    setGeneratedTracking(''); setStep(1);
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
        setGeneratedTracking(result.data.trackingNumber); setStep(3);
        setTransactions(prev => [result.data, ...prev]);
      } else { alert('❌ Error: ' + result.message); }
    } catch (error) { alert('❌ Server Offline!'); }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/assistants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionPin}` },
        body: JSON.stringify({ name: newStaffName.trim() })
      });
      const result = await res.json();
      if (result.success) {
        setAssistants(result.data); setNewStaffName('');
      }
    } catch (err) { alert("❌ Error adding staff."); }
  };

  const handleRemoveStaff = async (name) => {
    if (!window.confirm(`Sigurado ka bang tatanggalin si ${name} sa listahan?`)) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/assistants/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionPin}` },
        body: JSON.stringify({ name })
      });
      const result = await res.json();
      if (result.success) setAssistants(result.data);
    } catch (err) { alert("❌ Error removing staff."); }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionPin}` },
        body: JSON.stringify({ status: newStatus })
      });
      const result = await response.json();
      if (result.success) {
        setTransactions(prev => prev.map(tx => tx._id === id ? { ...tx, status: newStatus } : tx));
      }
    } catch (error) { alert('❌ Error updating status!'); }
  };

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
        setSessionPin(adminPasswordInput); setLoading(true); setView('dashboard'); setAdminPasswordInput('');
      } else { alert('❌ Maling Password!'); }
    } catch (error) { alert('❌ Offline ang server!'); }
  };

  const handleChangePinSubmit = async (e) => {
    e.preventDefault();
    if (pinForm.currentPin !== sessionPin) return alert("❌ Maling kasalukuyang PIN!");
    if (pinForm.newPin.length < 4) return alert("⚠️ Ang bagong PIN ay dapat hindi bababa sa 4 na karakter.");
    if (pinForm.newPin !== pinForm.confirmPin) return alert("❌ Hindi magkatugma ang PIN!");

    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/change-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionPin}` },
        body: JSON.stringify({ newPin: pinForm.newPin })
      });
      const result = await response.json();
      if (result.success) {
        localStorage.setItem('active_session_pin', pinForm.newPin); setSessionPin(pinForm.newPin);
        alert("✅ Kasado na ang bagong PIN!"); setShowPinModal(false); setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
      }
    } catch (error) { alert("❌ Bigong ma-update ang PIN."); }
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesTab = dashboardTab === 'active' ? tx.status !== 'Completed' : tx.status === 'Completed';
    const searchString = `${tx.trackingNumber || ''} ${tx.firstName || ''} ${tx.lastName || ''} ${tx.purpose || ''} ${tx.assistedBy || ''}`.toLowerCase();
    return matchesTab && searchString.includes(searchTerm.toLowerCase());
  });

  const exportToCSV = () => {
    if (filteredTransactions.length === 0) return alert("⚠️ Walang data.");
    const headers = ["Tracking Number", "First Name", "Last Name", "Priority", "Purpose", "Assisted By", "Status"];
    const rows = filteredTransactions.map(tx => [tx.trackingNumber, tx.firstName, tx.lastName, tx.urgency, tx.purpose, tx.assistedBy || 'None', tx.status]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `Office_Report.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // Filter para sa auto-suggest ng staff base sa tinatype ni teacher
  const filteredAssistants = assistants.filter(name => 
    name.toLowerCase().includes(formData.assistedBy.toLowerCase())
  );

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '12px' }}>
      <style>{dashboardStyles}</style>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setView('form')} style={{ flex: 1, maxWidth: '120px', padding: '10px', cursor: 'pointer', backgroundColor: view === 'form' ? '#2563eb' : '#fff', color: view === 'form' ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '5px', fontWeight: 'bold' }}>📄 Form</button>
        <button onClick={() => setView(sessionPin ? 'dashboard' : 'login')} style={{ flex: 1, maxWidth: '120px', padding: '10px', cursor: 'pointer', backgroundColor: view === 'dashboard' || view === 'login' ? '#16a34a' : '#fff', color: view === 'dashboard' || view === 'login' ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '5px', fontWeight: 'bold' }}>📊 Dashboard</button>
      </div>

      {view === 'form' && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '450px', margin: '0 auto' }}>
          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h2 style={{ textAlign: 'center', margin: '0' }}>Admin Office Transaction</h2>
              <input type="text" name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleInputChange} required style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}/>
              <input type="text" name="middleName" placeholder="Middle Name (Optional)" value={formData.middleName} onChange={handleInputChange} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}/>
              <input type="text" name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleInputChange} required style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}/>

              <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Urgency / Priority:</label>
              <div style={{ display: 'flex', gap: '20px' }}>
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
                <option value="Others">Others</option>
              </select>

              {formData.purpose === "Submit Document(s) for Processing" && (
                <select name="subPurpose" value={formData.subPurpose} onChange={handleInputChange} required style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}>
                  <option value="">-- Choose Document --</option>
                  <option value="Travel Authority (Local)">Travel Authority (Local)</option>
                  <option value="Travel Authority (Abroad)">Travel Authority (Abroad)</option>
                  <option value="Permit to Teach">Permit to Teach</option>
                </select>
              )}

              {formData.purpose === 'Request Document(s)' && (
                <select name="subPurpose" value={formData.subPurpose} onChange={handleInputChange} required style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}>
                  <option value="">-- Choose Document --</option>
                  <option value="IPCRF">IPCRF</option>
                  <option value="SALN">SALN</option>
                  <option value="ITR">ITR</option>
                </select>
              )}

              {formData.purpose === "Others" && (
                <input type="text" name="otherSpecify" placeholder="Please specify" value={formData.otherSpecify} onChange={handleInputChange} required style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
              )}

              {/* 🛠️ BAGONG RE-BUILT CUSTOM TYPEBOX DROPDOWN (100% Mobile Landscape Friendly) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', position: 'relative' }}>
                <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Sino ang nag-assist sa iyo? (Staff Name):</label>
                <input 
                  type="text" 
                  name="assistedBy" 
                  autoComplete="off"
                  placeholder="I-type o piliin ang pangalan..." 
                  value={formData.assistedBy} 
                  onChange={handleInputChange} 
                  onFocus={() => setShowStaffDropdown(true)}
                  onBlur={() => setTimeout(() => setShowStaffDropdown(false), 200)} // 200ms para umabot ang click sa item bago magsara
                  required 
                  style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' }} 
                />
                
                {showStaffDropdown && filteredAssistants.length > 0 && (
                  <ul className="custom-dropdown-list">
                    {filteredAssistants.map((name, i) => (
                      <li 
                        key={i} 
                        className="custom-dropdown-item"
                        onMouseDown={() => {
                          setFormData({ ...formData, assistedBy: name });
                          setShowStaffDropdown(false);
                        }}
                      >
                        👤 {name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button type="submit" style={{ padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>NEXT STEP ➡️</button>
            </form>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h2 style={{ textAlign: 'center' }}>Confirm Information</h2>
              <p><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
              <p><strong>Purpose:</strong> {formData.purpose} {formData.subPurpose && `(${formData.subPurpose})`}</p>
              <p><strong>Assisted By:</strong> {formData.assistedBy}</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, padding: '10px', backgroundColor: '#ccc', borderRadius: '5px', border: 'none' }}>Back</button>
                <button onClick={saveToDatabase} style={{ flex: 1, padding: '10px', backgroundColor: '#16a34a', color: 'white', borderRadius: '5px', fontWeight: 'bold', border: 'none' }}>SUBMIT</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <h1 style={{ color: '#16a34a', fontSize: '48px', margin: '0' }}>✓</h1>
              <h3>Transaction Submitted!</h3>
              <div style={{ backgroundColor: '#fef08a', padding: '15px', borderRadius: '5px', margin: '20px 0' }}>
                <h2 style={{ margin: '0', color: '#1e293b' }}>{generatedTracking}</h2>
              </div>
              <button onClick={resetForm} style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', borderRadius: '5px', border: 'none', fontWeight: 'bold' }}>New Transaction</button>
            </div>
          )}
        </div>
      )}

      {view === 'login' && (
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '350px', margin: '0 auto', textAlign: 'center' }}>
          <h2>Admin Login</h2>
          <form onSubmit={handleAdminLogin}>
            <input type="password" placeholder="Enter PIN" value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} required style={{ padding: '10px', width: '80%', borderRadius: '5px', border: '1px solid #ccc', marginBottom: '15px', textAlign: 'center' }}/>
            <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>Unlock Dashboard</button>
          </form>
        </div>
      )}

      {view === 'dashboard' && (
        <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
            <h2 style={{ margin: '0' }}>Office Dashboard</h2>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setShowStaffModal(true)} style={{ padding: '8px 12px', backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>👥 Staff</button>
              <button onClick={() => setShowPinModal(true)} style={{ padding: '8px 12px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>🔑 PIN</button>
              <button onClick={exportToCSV} style={{ padding: '8px 12px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>📥 CSV</button>
              <button onClick={() => { setView('form'); localStorage.removeItem('active_session_pin'); setSessionPin(''); }} style={{ padding: '8px 12px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>🔒 Logout</button>
            </div>
          </div>

          <input type="text" placeholder="🔍 Mag-hanap gamit ang Pangalan, Tracking, o Staff..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '11px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '15px' }}/>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button onClick={() => setDashboardTab('active')} style={{ flex: 1, padding: '10px', backgroundColor: dashboardTab === 'active' ? '#2563eb' : '#f3f4f6', color: dashboardTab === 'active' ? 'white' : '#333', border: '1px solid #ccc', borderRadius: '5px', fontWeight: 'bold' }}>Active ({transactions.filter(t => t.status !== 'Completed').length})</button>
            <button onClick={() => setDashboardTab('archive')} style={{ flex: 1, padding: '10px', backgroundColor: dashboardTab === 'archive' ? '#4b5563' : '#f3f4f6', color: dashboardTab === 'archive' ? 'white' : '#333', border: '1px solid #ccc', borderRadius: '5px', fontWeight: 'bold' }}>Archives ({transactions.filter(t => t.status === 'Completed').length})</button>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center' }}>Loading details...</p>
          ) : filteredTransactions.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280' }}>No transactions found.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="dash-table">
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th className="dash-th col-track">Tracking No.</th>
                    <th className="dash-th col-detail">Detalye ng Transaksyon</th>
                    <th className="dash-th col-time">Oras/Petsa</th>
                    <th className="dash-th col-status">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => {
                    const orasFormat = tx.createdAt ? new Date(tx.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '---';
                    const isDone = tx.status === 'Completed';

                    return (
                      <tr key={tx._id}>
                        <td className="dash-td" style={{ fontWeight: 'bold', fontSize: '11px' }}>
                          <span style={{ backgroundColor: '#f1f5f9', padding: '3px 6px', borderRadius: '4px' }}>{tx.trackingNumber}</span>
                        </td>
                        <td className="dash-td">
                          <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{tx.lastName}, {tx.firstName}</div>
                          <div style={{ color: '#475569' }}>📌 {tx.purpose} {tx.subPurpose ? `(${tx.subPurpose})` : ''}</div>
                          <div style={{ fontSize: '12px', color: '#2563eb', marginTop: '2px' }}>👤 Assisted by: <strong>{tx.assistedBy || 'None'}</strong></div>
                          <div className="mobile-time-block">🕒 {orasFormat}</div>
                        </td>
                        <td className="dash-td col-time" style={{ color: '#4b5563', fontSize: '12px', whiteSpace: 'nowrap' }}>{orasFormat}</td>
                        <td className="dash-td">
                          <select value={tx.status || 'Pending'} onChange={(e) => handleStatusChange(tx._id, e.target.value)} style={{ padding: '6px 4px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', backgroundColor: isDone ? '#dcfce7' : '#fef3c7', color: isDone ? '#166534' : '#92400e', border: '1px solid #cbd5e1', cursor: 'pointer', width: '100%', maxWidth: '110px', textAlign: 'center' }}>
                            <option value="Pending">🕒 Pending</option>
                            <option value="In Progress">⚙️ Progress</option>
                            <option value="Completed">✅ Done</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {showStaffModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
              <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', width: '100%', maxWidth: '360px', maxHeight: '80vh', overflowY: 'auto' }}>
                <h3 style={{ margin: '0 0 15px 0', textAlign: 'center' }}>👥 Pamahalaan ang Staff</h3>
                
                <form onSubmit={handleAddStaff} style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                  <input type="text" placeholder="Pangalan ng bagong staff" required value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}/>
                  <button type="submit" style={{ padding: '8px 12px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>+ Add</button>
                </form>

                <div style={{ borderTop: '1px solid #eee', paddingTop: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Kasalukuyang Listahan:</label>
                  {assistants.length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#999', textAlign: 'center' }}>Walang nakatalang staff.</p>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0 0' }}>
                      {assistants.map((name, index) => (
                        <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f9f9f9', fontSize: '14px' }}>
                          <span>{name}</span>
                          <button type="button" onClick={() => handleRemoveStaff(name)} style={{ backgroundColor: 'transparent', color: '#dc2626', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>❌</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button onClick={() => setShowStaffModal(false)} style={{ width: '100%', marginTop: '20px', padding: '10px', backgroundColor: '#cbd5e1', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Isara</button>
              </div>
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
