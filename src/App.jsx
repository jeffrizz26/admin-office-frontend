import { useState, useEffect } from 'react';

export default function App() {
  // 1. Pangunahing Navigation at Form Control States
  const [view, setView] = useState('form');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  
  // 🚨 Admin Token State para sa Security Session
  const [adminToken, setAdminToken] = useState(''); 
  
  // 2. Data Storage States (Transactions List mula sa Database)
  const [transactions, setTransactions] = useState([]);
  const [generatedTracking, setGeneratedTracking] = useState('');
  
  // 3. Teacher Portal Form Fields Storage
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    purpose: '',
    subPurpose: '',
    otherSpecify: '',
    dateNeeded: '',
    urgency: 'Regular',
    equipmentName: '',
    teacherAttachedFile: '' 
  });

  // 4. Realtime File at Search Monitoring Network States
  const [adminFiles, setAdminFiles] = useState({}); 
  const [teacherUploading, setTeacherUploading] = useState(false); 
  const [searchTrackingInput, setSearchTrackingInput] = useState(''); 
  const [searchedTransaction, setSearchedTransaction] = useState(null); 

  // 5. Bagong Security Configuration para sa Kanila ni Teacher (Eksklusibong Link)
  const [teacherSelectedPin, setTeacherSelectedPin] = useState({}); 
  const [teacherSearchPinInput, setTeacherSearchPinInput] = useState(''); 

  // 6. Ang Iyong Centralized Configuration Environment Settings
  const CLOUDINARY_CLOUD_NAME = 'dqadtybfu'; 
  const CLOUDINARY_UPLOAD_PRESET = 'uiwbyuni'; 
  const BACKEND_URL = 'https://super-bassoon-r4vv9v4vwvwfx7jg-5000.app.github.dev';
  // 1. Awtomatikong Pagkuha ng mga Transaksyon Mula sa Backend (Tuwing 5 Segundo)
  useEffect(() => {
    if (view !== 'dashboard' || !adminToken) return;

    const fetchTransactions = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/transactions`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}` 
          }
        });

        if (response.status === 401) {
          alert('🔒 Access Denied! Mali o Expired ang Admin PIN mo. Ibabalik kita sa Login.');
          setAdminToken(''); 
          setView('login');  
          return;
        }

        const result = await response.json();
        if (result.success) {
          setTransactions(result.data);
        }
      } catch (error) {
        console.error("Dashboard Sync Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
    const interval = setInterval(fetchTransactions, 5000);
    return () => clearInterval(interval);
  }, [view, adminToken]);

  // 2. Event Handlers para sa mga Input Fields ng Form
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePurposeChange = (e) => {
    setFormData({ 
      ...formData, 
      purpose: e.target.value, 
      subPurpose: '', 
      otherSpecify: '', 
      dateNeeded: '', 
      equipmentName: '',
      teacherAttachedFile: '' 
    });
  };

  const resetForm = () => {
    setFormData({ 
      firstName: '', middleName: '', lastName: '', purpose: '', subPurpose: '', otherSpecify: '', dateNeeded: '', urgency: 'Regular', equipmentName: '', teacherAttachedFile: '' 
    });
    setGeneratedTracking('');
    setSearchedTransaction(null);
    setSearchTrackingInput('');
    setTeacherSearchPinInput('');
    setStep(1);
  };
    // 3. Pag-save ng Bagong Request / Transaksyon ni Teacher sa MongoDB
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
      alert("❌ Hindi makakonekta sa server. Pakisuri ang iyong backend terminal.");
    }
  };

  // 4. Pagbabago sa Status ng Request at Pag-attach ng Ligtas na Cloudinary File Details
  // 4. Pagbabago sa Status ng Request at Pag-attach ng Ligtas na Cloudinary File Details
  const handleStatusChange = async (id, newStatus, fileUrl = null, teacherPin = '') => {
    try {
      const updateData = { status: newStatus };
      if (fileUrl) {
        updateData.secureFileId = fileUrl; 
        updateData.fileName = "Released_Document.pdf";
        updateData.teacherPin = teacherPin; 
      }

      // 🚨 INAYOS: Mas pinalawak ang pag-check sa ID para siguradong mag-trigger ang UI update
      setTransactions(prev => 
        prev.map(tx => {
          // I-check kung tumugma sa _id O sa trackingNumber ang pinasa na id
          const isMatch = tx._id === id || tx.trackingNumber === id;
          
          if (isMatch) {
            return {
              ...tx,
              status: newStatus,
              // Kung may bagong file, gamitin ito. Kung wala, panatilihin ang luma.
              secureFileId: fileUrl ? fileUrl : tx.secureFileId,
              teacherPin: teacherPin ? teacherPin : tx.teacherPin
            };
          }
          return tx;
        })
      );

      await fetch(`${BACKEND_URL}/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}` 
        },
        body: JSON.stringify(updateData)
      });
    } catch (error) {
      console.error("Status Update Error:", error);
    }
  };
    return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '20px' }}>
      
      {/* ==================== SECTION 1: NAVIGATION TABS ==================== */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '30px' }}>
        <button onClick={() => setView('form')} style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: view === 'form' ? '#2563eb' : '#fff', color: view === 'form' ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '5px', fontWeight: 'bold' }}>📄 Teacher Portal</button>
        <button onClick={() => setView(view === 'dashboard' ? 'dashboard' : 'login')} style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: view === 'dashboard' || view === 'login' ? '#16a34a' : '#fff', color: view === 'dashboard' || view === 'login' ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '5px', fontWeight: 'bold' }}>📊 Admin Dashboard</button>
      </div>

      {/* ==================== SECTION 2: VIEW: TEACHER PORTAL ==================== */}
      {view === 'form' && (
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '450px', margin: '0 auto' }}>
          
          {/* STEP 1: INPUT BOXES FOR PERSONAL DETAILS */}
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
                <div style={{ backgroundColor: '#eff6ff', padding: '15px', borderRadius: '5px', border: '1px solid #bfdbfe', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <select name="subPurpose" value={formData.subPurpose} onChange={handleInputChange} required style={{ padding: '8px', width: '100%', borderRadius: '5px', border: '1px solid #ccc' }}>
                    <option value="">-- Choose Document --</option>
                    <option value="IPCRF">IPCRF</option>
                    <option value="SALN">SALN</option>
                    <option value="ITR">ITR</option>
                    <option value="SERVICE RECORD">SERVICE RECORD</option>
                    <option value="CERTIFICATE OF EMPLOYMENT (COE)">CERTIFICATE OF EMPLOYMENT (COE)</option>
                    <option value="Others">Others</option>
                  </select>

                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e40af', marginTop: '5px' }}>➕ Attach Requirement File (Optional):</label>
                  <input type="file" onChange={async (e) => {
                    const selectedFile = e.target.files ? e.target.files[0] : null;
                    if (!selectedFile) return;
                    setTeacherUploading(true);
                    try {
                      const dataForm = new FormData();
                      dataForm.append('file', selectedFile);
                      dataForm.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
                      
                      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, { 
                        method: 'POST', body: dataForm 
                      });
                      const resultData = await res.json();
                      if (resultData.secure_url) {
                        setFormData(prev => ({ ...prev, teacherAttachedFile: resultData.secure_url }));
                        alert("🎉 Requirement file uploaded to global internet server!");
                      }
                    } catch (err) { alert("❌ Cloud Network Error."); }
                    setTeacherUploading(false);
                  }} />
                  {teacherUploading && <span style={{ fontSize: '11px', color: '#eab308' }}>⏳ Sending file to cloud server...</span>}
                  {formData.teacherAttachedFile && <span style={{ fontSize: '11px', color: '#16a34a' }}>✅ Connected globally!</span>}
                </div>
              )}

              {formData.purpose === 'Request Supply / Equipment' && (
                <div style={{ backgroundColor: '#fff7ed', padding: '15px', borderRadius: '5px', border: '1px solid #ffedd5', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#c2410c' }}>Equipment Name:</label>
                  <input type="text" name="equipmentName" value={formData.equipmentName} onChange={handleInputChange} required placeholder="What supply/equipment do you need?" style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }} />
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
                {formData.equipmentName && <p><strong>Equipment:</strong> {formData.equipmentName}</p>}
                {formData.subPurpose && <p><strong>Detail:</strong> {formData.subPurpose}</p>}
                {formData.otherSpecify && <p><strong>Specific:</strong> {formData.otherSpecify}</p>}
                {formData.teacherAttachedFile && <p style={{ color: '#16a34a' }}><strong>✓ Requirement Attached</strong></p>}
              </div>
              <button onClick={saveToDatabase} style={{ padding: '12px', backgroundColor: '#166534', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>I confirm that the information I provided is correct.</button>
              <button onClick={() => setStep(1)} style={{ color: '#666', cursor: 'pointer', textDecoration: 'underline', background: 'none', border: 'none' }}>Back to Edit</button>
            </div>
          )}

          {step === 3 && (
            <div style={{ padding: '15px 0', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ backgroundColor: '#dcfce7', padding: '12px', borderRadius: '5px', textAlign: 'center', border: '1px solid #16a34a' }}>
                <span style={{ fontSize: '13px', color: '#14532d', fontWeight: 'bold' }}>🎉 Request Sent Successfully!</span>
                <p style={{ margin: '5px 0 0 0', fontSize: '11px' }}>Gamitin ang Tracking Number sa kahit anong computer:</p>
                <h3 style={{ margin: '5px 0 0 0', color: '#1e293b', fontSize: '22px', letterSpacing: '1px' }}>{generatedTracking}</h3>
              </div>

              <hr style={{ border: '0', borderTop: '1px dashed #ccc', margin: '10px 0' }} />

              <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#334155' }}>🔎 Ligtas na Pag-download ng Dokumento</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input type="text" placeholder="I-type ang Tracking No. dito..." value={searchTrackingInput} onChange={(e) => setSearchTrackingInput(e.target.value)} style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }} />
                  <input type="password" placeholder="I-type ang PIN mo galing kay Admin..." value={teacherSearchPinInput} onChange={(e) => setTeacherSearchPinInput(e.target.value)} style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }} />
                  
                  <button onClick={async () => {
                    try {
                      const res = await fetch(`${BACKEND_URL}/api/transactions/secure-download`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ trackingNumber: searchTrackingInput.trim(), teacherPin: teacherSearchPinInput.trim() })
                      });
                      const data = await res.json();
                      if (data.success) {
                        window.open(data.downloadUrl, '_blank'); 
                        alert("🎉 Matagumpay na nakuha ang file! Valid ang link na ito sa loob ng 5 minuto.");
                      } else {
                        alert("❌ " + data.message);
                      }
                    } catch (err) {
                      alert("❌ Error sa koneksyon ng download link.");
                    }
                  }} style={{ padding: '10px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
                    🔓 KUNIN ANG EXCLUSIVE DOWNLOAD LINK
                  </button>
                </div>
              </div>

              <button onClick={resetForm} style={{ padding: '10px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', margin: '0 auto', width: '180px', fontWeight: 'bold' }}>New Transaction</button>
            </div>
          )}
        </div>
      )}

      {/* ==================== SECTION 3: VIEW: ADMIN LOGIN PORTAL ==================== */}
      {view === 'login' && (
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '350px', margin: '40px auto', textAlign: 'center' }}>
          <h2>🔒 Admin Authorization</h2>
          <form onSubmit={(e) => { 
            e.preventDefault(); 
            const typedPin = e.target.pwd.value;
            setAdminToken(typedPin); 
            setLoading(true);
            setView('dashboard'); 
          }} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
            <input type="password" name="pwd" placeholder="Enter PIN" required style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc', textAlign: 'center' }}/>
            <button type="submit" style={{ padding: '10px', backgroundColor: '#166534', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Unlock Dashboard</button>
          </form>
        </div>
      )}
      
        {/* ==================== SECTION 4: VIEW: ADMIN DASHBOARD ==================== */}
      {view === 'dashboard' && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <h2>Admin Office Transaction Dashboard</h2>
            <button onClick={() => { setView('form'); setAdminToken(''); }} style={{ padding: '8px 15px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>🚪 Lock Dashboard</button>
          </div>
          
          {loading ? (
            <p>Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666' }}>Walang transaksyon.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px' }}>Tracking No.</th>
                  <th style={{ padding: '12px' }}>Pangalan</th>
                  <th style={{ padding: '12px' }}>Priority</th>
                  <th style={{ padding: '12px' }}>Purpose / Detail</th>
                  <th style={{ padding: '12px' }}>Teacher's Requirement</th>
                  <th style={{ padding: '12px' }}>Action / Status</th>
                  <th style={{ padding: '12px' }}>Secure Upload & Lock PIN</th>
                </tr>
              </thead>
              <tbody>
              
              {transactions.map((tx, index) => {
              const txId = tx._id || tx.trackingNumber || `tx-row-${index}`;
                  return (
                    <tr key={txId} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: tx.urgency === 'Urgent' ? '#fef2f2' : 'transparent' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#1e3a8a' }}>{tx.trackingNumber || 'N/A'}</td>
                      <td style={{ padding: '12px' }}>{tx.lastName}, {tx.firstName}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: tx.urgency === 'Urgent' ? '#dc2626' : '#4b5563' }}>{tx.urgency === 'Urgent' ? '⚠️ Urgent' : 'Regular'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ fontWeight: '500' }}>{tx.purpose}</span>
                        {tx.equipmentName && <><br /><span style={{ fontSize: '12px', color: '#c2410c', fontWeight: 'bold' }}>📦 {tx.equipmentName}</span></>}
                        <br />
                        <span style={{ fontSize: '12px', color: '#2563eb' }}>{tx.subPurpose || tx.otherSpecify || '-'}</span>
                      </td>
                      
                      {/* 🚨 INAYOS: Binago para tugma sa MongoDB field names at nilagyan ng Button Interface */}
                      <td style={{ padding: '12px' }}>
                        {tx.teacherAttachmentUrl && tx.teacherAttachmentUrl !== "" ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }} title={tx.teacherAttachmentName}>
                              📁 {tx.teacherAttachmentName || 'Requirement_File'}
                            </span>
                            <a 
                              href={tx.teacherAttachmentUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              style={{ 
                                display: 'inline-block', padding: '4px 8px', backgroundColor: '#2563eb', color: 'white', 
                                borderRadius: '4px', textDecoration: 'none', fontSize: '11px', fontWeight: 'bold', textAlign: 'center' 
                              }}
                            >
                              👁️ View / Download
                            </a>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>Walang file</span>
                        )}
                      </td>

                      <td style={{ padding: '12px' }}>
                        <select 
                          value={tx.secureFileId || adminFiles[txId] ? 'Completed' : (tx.status || 'Pending')} 
                          onChange={(e) => handleStatusChange(txId, e.target.value)}
                          style={{ 
                            padding: '6px 10px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #ccc',
                            backgroundColor: tx.secureFileId || adminFiles[txId] || tx.status === 'Completed' ? '#dcfce7' : tx.status === 'In Progress' ? '#dbeafe' : '#fef9c3',
                            color: tx.secureFileId || adminFiles[txId] || tx.status === 'Completed' ? '#15803d' : tx.status === 'In Progress' ? '#1e40af' : '#854d0e',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="Pending">🕒 Pending</option>
                          <option value="In Progress">⚙️ In Progress</option>
                          <option value="Completed">✅ Completed</option>
                        </select>
                      </td>

                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {!tx.secureFileId && !adminFiles[txId] ? (
                            <>
                              <input 
                                type="text" 
                                placeholder="Magtakda ng PIN..." 
                                value={teacherSelectedPin[txId] || ''}
                                onChange={(e) => setTeacherSelectedPin(prev => ({ ...prev, [txId]: e.target.value }))}
                                style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ccc', width: '160px' }}
                              />
                              
                              <input 
                                type="file" 
                                id={`admin-file-${txId}`} 
                                style={{ display: 'none' }} 
                                onChange={async (e) => {
                                  const adminSelectedFile = e.target.files ? e.target.files[0] : null;
                                  if (!adminSelectedFile) return;

                                  const currentPin = teacherSelectedPin[txId];
                                  if (!currentPin || !currentPin.trim()) {
                                    alert("⚠️ Babala: Mag-type muna ng PIN para kay Teacher bago i-attach ang file!");
                                    e.target.value = ""; 
                                    return;
                                  }

                                  setAdminFiles(prev => ({ ...prev, [txId]: "Uploading... ⏳" }));

                                  try {
                                    const formDataInstance = new FormData();
                                    formDataInstance.append('file', adminSelectedFile);
                                    formDataInstance.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

                                    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
                                      method: 'POST',
                                      body: formDataInstance
                                    });

                                    const data = await res.json();
                                    
                                    if (data.secure_url) {
                                      setAdminFiles(prev => ({ ...prev, [txId]: data.secure_url }));
                                      await handleStatusChange(txId, 'Completed', data.secure_url, currentPin.trim());
                                      alert(`🎉 Naka-upload!\n\nIbigay kay Teacher ang PIN: "${currentPin.trim()}"`);
                                    } else {
                                      alert("❌ Uploading failed.");
                                      setAdminFiles(prev => { const updated = { ...prev }; delete updated[txId]; return updated; });
                                    }
                                  } catch (err) {
                                    console.error("Cloud Error:", err);
                                    setAdminFiles(prev => { const updated = { ...prev }; delete updated[txId]; return updated; });
                                  }
                                }} 
                              />
                              
                              <label htmlFor={`admin-file-${txId}`} style={{ cursor: 'pointer', display: 'inline-block', fontWeight: 'bold', color: '#0369a1', fontSize: '12px', border: '1px solid #0369a1', padding: '5px 10px', borderRadius: '4px', textAlign: 'center', backgroundColor: '#f0f9ff' }}>
                                ➕ ATTACH & ENCRYPT FILE
                              </label>
                            </>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '13px' }}>✅ Global Cloud Saved!</span>
                              <span style={{ fontSize: '11px', color: '#475569', fontStyle: 'italic' }}>PIN Lock: {tx.teacherPin || 'Naka-kandado'}</span>
                            </div>
                          )}

                          {adminFiles[txId] === "Uploading... ⏳" && (
                            <span style={{ color: '#eab308', fontWeight: 'bold', fontSize: '11px' }}>⏳ Savers Connecting...</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}