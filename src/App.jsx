import { useState, useEffect } from 'react';

export default function App() {
  const [view, setView] = useState('form');
  const [dashboardTab, setDashboardTab] = useState('active'); // 'active' para sa Pending, 'archive' para sa Completed
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [formData, setFormData] = useState({
    firstName: '', middleName: '', lastName: '',
    purpose: '', subPurpose: '', otherSpecify: '', dateNeeded: '',
    urgency: 'Regular'
  });
  const [step, setStep] = useState(1);
  const [generatedTracking, setGeneratedTracking] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const BACKEND_URL = 'https://admin-office-backend.vercel.app';
  const ADMIN_SECRET_PASSWORD = '1234';

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/transactions`);
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
    return () => clearInterval(interval);
  }, []);

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
        headers: { 'Content-Type': 'application/json' },
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

  // Matalinong Pagsasala ng Datos para sa Dashboard Tabs
  const filteredTransactions = transactions.filter(tx => {
    if (dashboardTab === 'active') {
      return tx.status !== 'Completed'; // Ipakita lahat maliban sa Completed
    } else {
      return tx.status === 'Completed'; // Ipakita LANG ang mga Completed
    }
  });

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '20px' }}>
      {/* Top Navigation Navigation */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '30px' }}>
        <button onClick={() => setView('form')} style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: view === 'form' ? '#2563eb' : '#fff', color: view === 'form' ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '5px', fontWeight: 'bold' }}>📄 Transaction Form</button>
        <button onClick={() => setView(view === 'dashboard' ? 'dashboard' : 'login')} style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: view === 'dashboard' || view === 'login' ? '#16a34a' : '#fff', color: view === 'dashboard' || view === 'login' ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '5px', fontWeight: 'bold' }}>📊 Admin Dashboard</button>
      </div>

      {/* 1. TRANSACTION FORM VIEW */}
      {view === 'form' && (
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '450px', margin: '0 auto' }}>
          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h2 style={{ textAlign: 'center', margin: '0 0 10px 0' }}>Admin Office Transaction</h2>
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
                <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#6b7280' }}>Your Tracking Number:</p>
                <h2 style={{ margin: '0', letterSpacing: '1px', color: '#1e293b' }}>{generatedTracking}</h2>
              </div>
              <button onClick={resetForm} style={{ padding: '10px 20px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>New Transaction</button>
            </div>
          )}
        </div>
      )}

      {/* 2. LOGIN VIEW */}
      {view === 'login' && (
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '350px', margin: '0 auto', textAlign: 'center' }}>
          <h2>Admin Login</h2>
          <input type="password" placeholder="Enter Admin Password" value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} style={{ padding: '10px', width: '80%', borderRadius: '5px', border: '1px solid #ccc', marginBottom: '15px', textAlign: 'center' }}/>
          <br/>
          <button onClick={() => { if (adminPasswordInput === ADMIN_SECRET_PASSWORD) { setView('dashboard'); setAdminPasswordInput(''); } else { alert('❌ Wrong Password!'); } }} style={{ padding: '10px 20px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Unlock Dashboard</button>
        </div>
      )}

      {/* 3. ADMIN DASHBOARD VIEW */}
      {view === 'dashboard' && (
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ margin: '0' }}>Admin Office Transaction Dashboard</h2>
            <button onClick={() => setView('form')} style={{ padding: '8px 15px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>🔒 Lock Dashboard</button>
          </div>

          {/* Dito Na Ang Mga Bagong Filtet Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button onClick={() => setDashboardTab('active')} style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: dashboardTab === 'active' ? '#2563eb' : '#f3f4f6', color: dashboardTab === 'active' ? '#white' : '#333', border: '1px solid #ccc', borderRadius: '5px', fontWeight: 'bold' }}>
              📥 Active Transactions ({transactions.filter(t => t.status !== 'Completed').length})
            </button>
            <button onClick={() => setDashboardTab('archive')} style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: dashboardTab === 'archive' ? '#4b5563' : '#f3f4f6', color: dashboardTab === 'archive' ? '#white' : '#333', border: '1px solid #ccc', borderRadius: '5px', fontWeight: 'bold' }}>
              🗄️ History / Archives ({transactions.filter(t => t.status === 'Completed').length})
            </button>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center' }}>Loading log details...</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px' }}>Tracking No.</th>
                    <th style={{ padding: '12px' }}>Pangalan</th>
                    <th style={{ padding: '12px' }}>Priority</th>
                    <th style={{ padding: '12px' }}>Purpose</th>
                    <th style={{ padding: '12px' }}>Detail</th>
                    <th style={{ padding: '12px' }}>Action / Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>No transactions under this tab.</td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr key={tx._id} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: tx.urgency === 'Urgent' && tx.status !== 'Completed' ? '#fef2f2' : 'white' }}>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#1e3a8a' }}>{tx.trackingNumber || 'N/A'}</td>
                        <td style={{ padding: '12px' }}>{tx.lastName}, {tx.firstName}</td>
                        <td style={{ padding: '12px', color: tx.urgency === 'Urgent' ? '#dc2626' : '#333', fontWeight: tx.urgency === 'Urgent' ? 'bold' : 'normal' }}>
                          {tx.urgency === 'Urgent' ? '⚠️ Urgent' : 'Regular'}
                        </td>
                        <td style={{ padding: '12px' }}>{tx.purpose}</td>
                        <td style={{ padding: '12px', color: '#2563eb' }}>{tx.subPurpose || '-'}</td>
                        <td style={{ padding: '12px' }}>
                          <select value={tx.status || 'Pending'} onChange={(e) => handleStatusChange(tx._id, e.target.value)} style={{ padding: '6px', borderRadius: '5px', border: '1px solid #ccc', fontWeight: 'bold', backgroundColor: tx.status === 'Completed' ? '#dcfce7' : tx.status === 'In Progress' ? '#dbeafe' : '#fef9c3', color: tx.status === 'Completed' ? '#16a34a' : tx.status === 'In Progress' ? '#2563eb' : '#ca8a04' }}>
                            <option value="Pending">🕒 Pending</option>
                            <option value="In Progress">⚙️ In Progress</option>
                            <option value="Completed">✅ Completed</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
