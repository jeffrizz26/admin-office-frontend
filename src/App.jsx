import React, { useState, useEffect } from 'react';

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
  const [showStaffDropdown, setShowStaffDropdown] = useState(false); 
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

  const filteredAssistants = assistants.filter(name => 
    name.toLowerCase().includes(formData.assistedBy.toLowerCase())
  );

  return (
    <div className="font-sans bg-gray-100 min-h-screen p-3">
      
      {/* Navigation Tabs */}
      <div className="flex justify-center gap-2.5 mb-5">
        <button onClick={() => setView('form')} className={`flex-1 max-w-[120px] p-2.5 cursor-pointer rounded border font-bold ${view === 'form' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}>📄 Form</button>
        <button onClick={() => setView(sessionPin ? 'dashboard' : 'login')} className={`flex-1 max-w-[120px] p-2.5 cursor-pointer rounded border font-bold ${view === 'dashboard' || view === 'login' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300'}`}>📊 Dashboard</button>
      </div>

      {/* Transaction Form Component */}
      {view === 'form' && (
        <div className="bg-white p-5 rounded-xl shadow-md max-w-[450px] mx-auto">
          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="flex flex-col gap-4">
              <h2 className="text-center text-xl font-bold text-gray-800 m-0">Admin Office Transaction</h2>
              <input type="text" name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleInputChange} required className="p-2.5 rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <input type="text" name="middleName" placeholder="Middle Name (Optional)" value={formData.middleName} onChange={handleInputChange} className="p-2.5 rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <input type="text" name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleInputChange} required className="p-2.5 rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500" />

              <label className="font-bold text-sm text-gray-700">Urgency / Priority:</label>
              <div className="flex gap-5">
                <label className="inline-flex items-center gap-1"><input type="radio" name="urgency" value="Regular" checked={formData.urgency === 'Regular'} onChange={handleInputChange} /> Regular</label>
                <label className="inline-flex items-center gap-1 text-red-600 font-bold"><input type="radio" name="urgency" value="Urgent" checked={formData.urgency === 'Urgent'} onChange={handleInputChange} /> ⚠️ Urgent</label>
              </div>

              <select name="purpose" value={formData.purpose} onChange={handlePurposeChange} required className="p-2.5 rounded border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
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
                <select name="subPurpose" value={formData.subPurpose} onChange={handleInputChange} required className="p-2.5 rounded border border-gray-300 bg-white">
                  <option value="">-- Choose Document --</option>
                  <option value="Travel Authority (Local)">Travel Authority (Local)</option>
                  <option value="Travel Authority (Abroad)">Travel Authority (Abroad)</option>
                  <option value="Permit to Teach">Permit to Teach</option>
                </select>
              )}

              {formData.purpose === 'Request Document(s)' && (
                <select name="subPurpose" value={formData.subPurpose} onChange={handleInputChange} required className="p-2.5 rounded border border-gray-300 bg-white">
                  <option value="">-- Choose Document --</option>
                  <option value="IPCRF">IPCRF</option>
                  <option value="SALN">SALN</option>
                  <option value="ITR">ITR</option>
                </select>
              )}

              {formData.purpose === "Others" && (
                <input type="text" name="otherSpecify" placeholder="Please specify" value={formData.otherSpecify} onChange={handleInputChange} required className="p-2.5 rounded border border-gray-300" />
              )}

              {/* 100% Tailwind Custom Dropdown */}
              <div className="flex flex-col gap-1 relative">
                <label className="font-bold text-sm text-gray-700">Sino ang nag-assist sa iyo? (Staff Name):</label>
                <input 
                  type="text" name="assistedBy" autoComplete="off" placeholder="I-type o piliin ang pangalan..." value={formData.assistedBy} 
                  onChange={handleInputChange} onFocus={() => setShowStaffDropdown(true)} onBlur={() => setTimeout(() => setShowStaffDropdown(false), 200)} required 
                  className="p-2.5 rounded border border-gray-300 w-full box-border focus:outline-none focus:ring-1 focus:ring-blue-500" 
                />
                
                {showStaffDropdown && filteredAssistants.length > 0 && (
                  <ul className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md max-h-[130px] overflow-y-auto应用 z-50 shadow-lg mt-0.5 p-0 list-none">
                    {filteredAssistants.map((name, i) => (
                      <li key={i} className="p-2.5 cursor-pointer text-sm text-gray-700 border-b border-gray-100 text-left hover:bg-gray-50 hover:text-blue-700"
                        onMouseDown={() => { setFormData({ ...formData, assistedBy: name }); setShowStaffDropdown(false); }}>
                        👤 {name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button type="submit" className="p-3 bg-blue-600 text-white border-none rounded font-bold cursor-pointer hover:bg-blue-700 transition">NEXT STEP ➡️</button>
            </form>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-center text-xl font-bold text-gray-800">Confirm Information</h2>
              <p className="text-gray-700"><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
              <p className="text-gray-700"><strong>Purpose:</strong> {formData.purpose} {formData.subPurpose && `(${formData.subPurpose})`}</p>
              <p className="text-gray-700"><strong>Assisted By:</strong> {formData.assistedBy}</p>
              <div className="flex gap-2.5">
                <button onClick={() => setStep(1)} className="flex-1 p-2.5 bg-gray-300 text-gray-800 rounded font-bold hover:bg-gray-400">Back</button>
                <button onClick={saveToDatabase} className="flex-1 p-2.5 bg-green-600 text-white rounded font-bold hover:bg-green-700">SUBMIT</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-5">
              <h1 className="text-green-600 text-5xl font-bold m-0">✓</h1>
              <h3 className="text-lg font-bold text-gray-800 mt-2">Transaction Submitted!</h3>
              <div className="bg-yellow-100 p-4 rounded-md my-5">
                <h2 className="m-0 text-gray-800 font-mono tracking-wider text-2xl font-bold">{generatedTracking}</h2>
              </div>
              <button onClick={resetForm} className="p-2.5 px-5 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">New Transaction</button>
            </div>
          )}
        </div>
      )}

      {/* Admin Login Component */}
      {view === 'login' && (
        <div className="bg-white p-6 rounded-xl shadow-md max-w-[350px] mx-auto text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Admin Login</h2>
          <form onSubmit={handleAdminLogin}>
            <input type="password" placeholder="Enter PIN" value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} required className="p-2.5 w-4/5 rounded border border-gray-300 mb-4 text-center focus:outline-none focus:ring-1 focus:ring-green-500" />
            <button type="submit" className="p-2.5 px-5 bg-green-600 text-white rounded font-bold hover:bg-green-700">Unlock Dashboard</button>
          </form>
        </div>
      )}

      {/* Dashboard Component (Perfect Spacing on both Desktop and Mobile Devices) */}
      {view === 'dashboard' && (
        <div className="bg-white p-4 rounded-xl shadow-md max-w-[1000px] mx-auto">
          <div className="flex justify-between items-center flex-wrap gap-2.5 mb-5">
            <h2 className="text-xl font-bold text-gray-800 m-0">Office Dashboard</h2>
            <div className="flex gap-1.5">
              <button onClick={() => setShowStaffModal(true)} className="p-2 px-3 bg-blue-50 text-blue-800 border border-blue-200 rounded font-bold text-sm hover:bg-blue-100">👥 Staff</button>
              <button onClick={() => setShowPinModal(true)} className="p-2 px-3 bg-gray-100 text-gray-700 rounded font-bold text-sm hover:bg-gray-200">🔑 PIN</button>
              <button onClick={exportToCSV} className="p-2 px-3 bg-green-600 text-white rounded font-bold text-sm hover:bg-green-700">📥 CSV</button>
              <button onClick={() => { setView('form'); localStorage.removeItem('active_session_pin'); setSessionPin(''); }} className="p-2 px-3 bg-red-600 text-white rounded font-bold text-sm hover:bg-red-700">🔒 Logout</button>
            </div>
          </div>

          <input type="text" placeholder="🔍 Mag-hanap gamit ang Pangalan, Tracking, o Staff..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2.5 box-border rounded-md border border-gray-300 mb-4 focus:outline-none focus:ring-1 focus:ring-blue-500" />

          <div className="flex gap-2.5 mb-5">
            <button onClick={() => setDashboardTab('active')} className={`flex-1 p-2.5 rounded font-bold text-sm border ${dashboardTab === 'active' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 border-gray-300'}`}>Active ({transactions.filter(t => t.status !== 'Completed').length})</button>
            <button onClick={() => setDashboardTab('archive')} className={`flex-1 p-2.5 rounded font-bold text-sm border ${dashboardTab === 'archive' ? 'bg-gray-600 text-white border-gray-600' : 'bg-gray-50 text-gray-700 border-gray-300'}`}>Archives ({transactions.filter(t => t.status === 'Completed').length})</button>
          </div>

          {loading ? (
            <p className="text-center text-gray-600 font-medium py-4">Loading details...</p>
          ) : filteredTransactions.length === 0 ? (
            <p className="text-center text-gray-400 py-4">No transactions found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-3 px-2 md:px-4 font-bold text-gray-700 border-b border-gray-200 align-top w-[95px] min-w-[95px] md:w-[15%] md:min-w-[120px]">Tracking No.</th>
                    <th className="p-3 px-2 md:px-4 font-bold text-gray-700 border-b border-gray-200 align-top w-auto md:w-[50%]">Detalye ng Transaksyon</th>
                    <th className="p-3 px-2 md:px-4 font-bold text-gray-700 border-b border-gray-200 align-top hidden md:table-cell md:w-[20%] md:min-w-[160px]">Oras/Petsa</th>
                    <th className="p-3 px-2 md:px-4 font-bold text-gray-700 border-b border-gray-200 align-top w-[105px] min-w-[105px] md:w-[15%] md:min-w-[120px] text-right md:text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => {
                    const orasFormat = tx.createdAt ? new Date(tx.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '---';
                    const isDone = tx.status === 'Completed';

                    return (
                      <tr key={tx._id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="p-3 px-2 md:px-4 border-b border-gray-200 align-top font-bold text-xs md:text-sm">
                          <span className="bg-gray-100 text-gray-800 px-1.5 py-1 rounded inline-block font-mono">{tx.trackingNumber}</span>
                        </td>
                        <td className="p-3 px-2 md:px-4 border-b border-gray-200 align-top">
                          <div className="font-bold text-gray-900 text-[14px] md:text-[15px]">{tx.lastName}, {tx.firstName}</div>
                          <div className="text-gray-600 mt-0.5 text-xs md:text-sm">📌 {tx.purpose} {tx.subPurpose ? `(${tx.subPurpose})` : ''}</div>
                          <div className="text-[11px] md:text-xs text-blue-600 mt-1">
                            👤 Assisted by: <strong className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{tx.assistedBy || 'None'}</strong>
                          </div>
                          {/* Lalabas lang ito kapag naka-mobile portrait */}
                          <div className="block md:hidden text-[11px] text-gray-500 mt-1">🕒 {orasFormat}</div>
                        </td>
                        <td className="p-3 px-2 md:px-4 border-b border-gray-200 align-top hidden md:table-cell text-gray-600 text-xs md:text-sm whitespace-nowrap">{orasFormat}</td>
                        <td className="p-3 px-2 md:px-4 border-b border-gray-200 align-top text-right md:text-left">
                          <select value={tx.status || 'Pending'} onChange={(e) => handleStatusChange(tx._id, e.target.value)} className={`p-1.5 rounded-md text-[11px] md:text-xs font-bold border border-gray-300 cursor-pointer w-full max-w-[110px] text-center focus:outline-none ${isDone ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
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

          {/* Manage Staff Modal */}
          {showStaffModal && (
            <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1000] p-4">
              <div className="bg-white p-6 rounded-xl w-full max-w-[360px] max-h-[80vh] overflow-y-auto shadow-2xl">
                <h3 className="text-center text-lg font-bold text-gray-800 mb-4">👥 Pamahalaan ang Staff</h3>
                
                <form onSubmit={handleAddStaff} className="flex gap-2 mb-4">
                  <input type="text" placeholder="Pangalan ng bagong staff" required value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} className="flex-1 p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
                  <button type="submit" className="p-2 px-3 bg-green-600 text-white rounded font-bold text-sm hover:bg-green-700">+ Add</button>
                </form>

                <div className="border-t border-gray-100 pt-3">
                  <label className="text-xs font-bold text-gray-500 block mb-2">Kasalukuyang Listahan:</label>
                  {assistants.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-2">Walang nakatalang staff.</p>
                  ) : (
                    <ul className="list-none p-0 m-0">
                      {assistants.map((name, index) => (
                        <li key={index} className="flex justify-between items-center py-2 border-b border-gray-50 text-sm text-gray-700">
                          <span>{name}</span>
                          <button type="button" onClick={() => handleRemoveStaff(name)} className="bg-transparent text-red-600 font-bold border-none cursor-pointer hover:scale-110 transition-transform">❌</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button onClick={() => setShowStaffModal(false)} className="w-full mt-5 p-2 bg-gray-200 text-gray-700 rounded font-bold text-sm hover:bg-gray-300">Isara</button>
              </div>
            </div>
          )}

          {/* Change PIN Modal */}
          {showPinModal && (
            <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1000] p-4">
              <div className="bg-white p-6 rounded-xl w-full max-w-[320px] shadow-2xl">
                <h3 className="text-center text-lg font-bold text-gray-800 mb-4">⚙️ Change Admin PIN</h3>
                <form onSubmit={handleChangePinSubmit} className="flex flex-col gap-3">
                  <input type="password" placeholder="Current PIN" required value={pinForm.currentPin} onChange={(e) => setPinForm({...pinForm, currentPin: e.target.value})} className="p-2 border border-gray-300 rounded text-sm focus:outline-none" />
                  <input type="password" placeholder="New PIN" required value={pinForm.newPin} onChange={(e) => setPinForm({...pinForm, newPin: e.target.value})} className="p-2 border border-gray-300 rounded text-sm focus:outline-none" />
                  <input type="password" placeholder="Confirm New PIN" required value={pinForm.confirmPin} onChange={(e) => setPinForm({...pinForm, confirmPin: e.target.value})} className="p-2 border border-gray-300 rounded text-sm focus:outline-none" />
                  <div className="flex gap-2 mt-2">
                    <button type="button" onClick={() => setShowPinModal(false)} className="flex-1 p-2 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200">Cancel</button>
                    <button type="submit" className="flex-1 p-2 bg-green-600 text-white rounded text-sm font-bold hover:bg-green-700">Save</button>
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
