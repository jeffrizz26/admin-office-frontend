import { useState, useEffect } from 'react';

export default function App() {
  const [view, setView] = useState('form');
  const [formData, setFormData] = useState({
    firstName: '', middleName: '', lastName: '',
    purpose: '', subPurpose: '', otherSpecify: '', dateNeeded: '',
    urgency: 'Regular'
  });
  const [step, setStep] = useState(1);
  const [generatedTracking, setGeneratedTracking] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // BASE URL LAMANG PARA SA TAMANG ROUTING NG VERCEL
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
    
    // Automatic na magre-refresh ang dashboard list tuwing 5 segundo nang ligtas
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

  // INAYOS NA: Isang POST request na lang para hindi mag-timeout at mag-crash ang Vercel Free Server
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
        
        // Matalinong UI Update: Idagdag ang bagong gawang transaksyon sa itaas ng listahan nang hindi na nagre-request ulit sa database
        setTransactions(prev => [result.data, ...prev]);
      } else {
        alert('❌ Error: ' + result.message);
      }
    } catch (error) {
      console.error("Submission Error:", error);
      alert('❌ Server Offline!');
    }
  };

  // INAYOS NA: Ina-update ang UI state sa browser nang direkta nang hindi pinapabigat ang server operations sa pag-update ng status
  const handleStatusChange = async (id, newStatus) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const result = await response.json();
      if (result.success) {
        // I-update ang status ng partikular na ID sa local array list
        setTransactions(prev => 
          prev.map(tx => tx._id === id ? { ...tx, status: newStatus } : tx)
        );
      }
    } catch (error) {
      console.error("Status Update Error:", error);
      alert('❌ Error updating status!');
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '30px' }}>
        <button onClick={() => setView('form')} style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: view === 'form' ? '#2563eb' : '#fff', color: view === 'form' ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '5px', fontWeight: 'bold' }}>📄 Transaction Form</button>
        <button onClick={() => setView(view === 'dashboard' ? 'dashboard' : 'login')} style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: view === 'dashboard' || view === 'login' ? '#16a34a' : '#fff', color: view === 'dashboard' || view === 'login' ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '5px', fontWeight: 'bold' }}>📊 Admin Dashboard</button>
      </div>

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
                <option value="Receive Documents">Receive Documents</option>
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

              {formData.purpose === 'Submit Document(s) for Processing' && (
                <div style={{ backgroundColor: '#f0fdf4', padding: '15px', borderRadius: '5px', border: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <select name="subPurpose" value={formData.subPurpose} onChange={handleInputChange} required style={{ padding: '8px', width: '100%', borderRadius: '5px', border: '1px solid #ccc' }}>
                    <option value="">-- Choose Document Type --</option>
                    <option value="Travel Authority(Local)">Travel Authority(Local)</option>
                    <option value="Travel Authority(Abroad)">Travel Authority(Abroad)</option>
                    <option value="Permit to Study">Permit to Study</option>
                    <option value="Permit to Teach">Permit to Teach</option>
                    <option value="Other">Other</option>
                  </select>
                  <input type="date" name="dateNeeded" value={formData.dateNeeded} onChange={handleInputChange} required style={{ padding: '8px', width: '95%', borderRadius: '5px', border: '1px solid #ccc' }}/>
                </div>
              )}

              {formData.purpose === 'Receive Documents' && (
                <div style={{ backgroundColor: '#f3e8ff', padding: '15px', borderRadius: '5px', border: '1px solid #e9d5ff' }}>
                  <select name="subPurpose" value={formData.subPurpose} onChange={handleInputChange} required style={{ padding: '8px', width: '100%', borderRadius: '5px', border: '1px solid #ccc' }}>
                    <option value="">-- Choose Type --</option>
                    <option value="Certificate">Certificate</option>
                    <option value="Research">Research</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
              )}

              {(formData.purpose === 'Others' || formData.subPurpose === 'Others' || formData.subPurpose === 'Other') && (
                <input type="text" name="otherSpecify" value={formData.otherSpecify} onChange={handleInputChange} required placeholder="Specify detail here..." style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}/>
              )}

              <button type="submit" style={{ padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>SUBMIT TRANSACTION</button>
            </form>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h2>Confirmation</h2>
              <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '14px' }}>
                <p><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
                <p><strong>Priority:</strong> {formData.urgency}</p>
                <p><strong>Purpose:</strong> {formData.purpose}</p>
                {formData.subPurpose && <p><strong>Detail:</strong> {formData.subPurpose}</p>}
                {formData.otherSpecify && <p><strong>Specific:</strong> {formData.otherSpecify}</p>}
              </div>
              <button onClick={saveToDatabase} style={{ padding: '12px', backgroundColor: '#166534', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>I confirm that the information I provided is correct.</button>
              <button onClick={() => setStep(1)} style={{ color: '#666', cursor: 'pointer', textDecoration: 'underline', background: 'none', border: 'none' }}>Back to Edit</button>
            </div>
          )}

          {step === 3 && (
            <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ color: '#166534', fontSize: '40px', textAlign: 'center' }}>✓</div>
              <h2 style={{ textAlign: 'center' }}>Thank you for answering.</h2>
              <div style={{ backgroundColor: '#fef08a', padding: '12px', borderRadius: '5px', border: '1px solid #facc15', margin: '10px auto', maxWidth: '300px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#854d0e', fontWeight: 'bold' }}>Your Tracking Number:</p>
                <h3 style={{ margin: 0, fontSize: '20px', color: '#1e293b', letterSpacing: '1px' }}>{generatedTracking}</h3>
              </div>
              <button onClick={resetForm} style={{ padding: '10px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', margin: '10px auto 0 auto', width: '200px', fontWeight: 'bold' }}>New Transaction</button>
            </div>
          )}
        </div>
      )}

      {view === 'login' && (
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '350px', margin: '40px auto', textAlign: 'center' }}>
          <h2>🔒 Admin Authorization</h2>
          <form onSubmit={(e) => { e.preventDefault(); if(e.target.pwd.value === ADMIN_SECRET_PASSWORD) setView('dashboard'); else alert('Maling Password!'); }} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
            <input type="password" name="pwd" placeholder="Enter PIN" required style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc', textAlign: 'center' }}/>
            <button type="submit" style={{ padding: '10px', backgroundColor: '#166534', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>Unlock Dashboard</button>
          </form>
        </div>
      )}

      {view === 'dashboard' && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <h2>Admin Office Transaction Dashboard</h2>
            <button onClick={() => setView('form')} style={{ padding: '8px 15px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>🚪 Lock Dashboard</button>
          </div>
          {loading ? <p>Loading transactions...</p> : transactions.length === 0 ? <p style={{ textAlign: 'center', color: '#666' }}>Walang transaksyon.</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px' }}>Tracking No.</th>
                  <th style={{ padding: '12px' }}>Pangalan</th>
                  <th style={{ padding: '12px' }}>Priority</th>
                  <th style={{ padding: '12px' }}>Purpose</th>
                  <th style={{ padding: '12px' }}>Detail</th>
                  <th style={{ padding: '12px' }}>Action / Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx._id} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: tx.urgency === 'Urgent' ? '#fef2f2' : 'transparent' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#1e3a8a' }}>{tx.trackingNumber || 'N/A'}</td>
                    <td style={{ padding: '12px' }}>{tx.lastName}, {tx.firstName}</td>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: tx.urgency === 'Urgent' ? '#dc2626' : '#4b5563' }}>{tx.urgency === 'Urgent' ? '⚠️ Urgent' : 'Regular'}</td>
                    <td style={{ padding: '12px' }}>{tx.purpose}</td>
                    <td style={{ padding: '12px', color: '#2563eb' }}>{tx.subPurpose || tx.otherSpecify || '-'}</td>
                    <td style={{ padding: '12px' }}>
                      <select 
                        value={tx.status || 'Pending'} 
                        onChange={(e) => handleStatusChange(tx._id, e.target.value)}
                        style={{ 
                          padding: '6px 10px', 
                          borderRadius: '15px', 
                          fontSize: '12px', 
                          fontWeight: 'bold',
                          border: '1px solid #ccc',
                          backgroundColor: tx.status === 'Completed' ? '#dcfce7' : tx.status === 'In Progress' ? '#dbeafe' : '#fef9c3',
                          color: tx.status === 'Completed' ? '#15803d' : tx.status === 'In Progress' ? '#1e40af' : '#854d0e',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="Pending">🕒 Pending</option>
                        <option value="In Progress">⚙️ In Progress</option>
                        <option value="Completed">✅ Completed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
