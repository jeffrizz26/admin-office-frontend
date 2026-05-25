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
  const [purposes, setPurposes] = useState([]); // Dynamic purposes list
  const [showStaffDropdown, setShowStaffDropdown] = useState(false); 
  const [newStaffName, setNewStaffName] = useState(''); 
  const [loading, setLoading] = useState(true);
  const [sessionPin, setSessionPin] = useState(() => localStorage.getItem('active_session_pin') || '');
  const [showPinModal, setShowPinModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false); 
  const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '', confirmPin: '' });

  const BACKEND_URL = 'https://admin-office-backend.vercel.app'; 

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Load Assistants
        const resStaff = await fetch(`${BACKEND_URL}/api/assistants`);
        const resultStaff = await resStaff.json();
        if (resultStaff.success) setAssistants(resultStaff.data);

        // Load Dynamic Purposes
        const resPurp = await fetch(`${BACKEND_URL}/api/purposes`);
        const resultPurp = await resPurp.json();
        if (resultPurp.success) setPurposes(resultPurp.data);
      } catch (err) { console.error("Error loading initial data:", err); }
    };
    fetchData();

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
    const headers = ["Tracking Number", "Date & Time", "First Name", "Last Name", "Priority", "Purpose", "Other Details", "Assisted By", "Status"];
    const rows = filteredTransactions.map(tx => {
      const formattedDate = tx.createdAt ? new Date(tx.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '---';
      return [tx.trackingNumber, formattedDate, tx.firstName, tx.lastName, tx.urgency, tx.purpose, tx.otherSpecify || '', tx.assistedBy || 'None', tx.status];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `Office_Report.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const filteredAssistants = assistants.filter(name => name.toLowerCase().includes(formData.assistedBy.toLowerCase()));
  const getStatusDropdownClass = (status) => {
    switch (status) {
      case 'In Progress': return 'bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-400';
      case 'Completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-emerald-400';
      default: return 'bg-amber-50 text-amber-700 border-amber-200 focus:ring-amber-400';
    }
  };

  return (
    <div className="font-sans bg-slate-50 min-h-screen p-4 md:p-6 antialiased text-slate-800">
      <div className="flex justify-center gap-3 mb-6">
        <button onClick={() => setView('form')} className={`flex-1 max-w-[130px] py-2.5 px-4 cursor-pointer rounded-lg border font-semibold text-sm transition-all duration-200 ${view === 'form' ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>📄 Form</button>
        <button onClick={() => setView(sessionPin ? 'dashboard' : 'login')} className={`flex-1 max-w-[130px] py-2.5 px-4 cursor-pointer rounded-lg border font-semibold text-sm transition-all duration-200 ${view === 'dashboard' || view === 'login' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>📊 Dashboard</button>
      </div>

      {view === 'form' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-[460px] mx-auto">
          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="flex flex-col gap-4">
              <h2 className="text-center text-xl font-bold text-slate-800 mb-1">Admin Office Transaction</h2>
              <input type="text" name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleInputChange} required className="p-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
              <input type="text" name="middleName" placeholder="Middle Name (Optional)" value={formData.middleName} onChange={handleInputChange} className="p-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
              <input type="text" name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleInputChange} required className="p-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
              
              {/* DYNAMIC PURPOSE SELECT */}
              <select name="purpose" value={formData.purpose} onChange={handlePurposeChange} required className="p-3 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all">
                <option value="">-- Select Purpose --</option>
                {purposes.map((p) => <option key={p._id} value={p.name}>{p.name}</option>)}
                <option value="Others">Others</option>
              </select>

              {/* DYNAMIC SUB-PURPOSE SELECT */}
              {purposes.find(p => p.name === formData.purpose)?.subPurposes?.length > 0 && (
                <select name="subPurpose" value={formData.subPurpose} onChange={handleInputChange} required className="p-3 text-sm rounded-lg border border-slate-200 bg-white">
                  <option value="">-- Choose Option --</option>
                  {purposes.find(p => p.name === formData.purpose).subPurposes.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
                </select>
              )}

              {formData.purpose === "Others" && (
                <input type="text" name="otherSpecify" placeholder="Please specify" value={formData.otherSpecify} onChange={handleInputChange} required className="p-3 text-sm rounded-lg border border-slate-200 shadow-xs" />
              )}

              <div className="flex flex-col gap-1.5 relative">
                <label className="font-semibold text-xs uppercase tracking-wider text-slate-500">Sino ang nag-assist sa iyo? (Staff Name):</label>
                <input type="text" name="assistedBy" autoComplete="off" placeholder="I-type o piliin ang pangalan..." value={formData.assistedBy} onChange={handleInputChange} onFocus={() => setShowStaffDropdown(true)} onBlur={() => setTimeout(() => setShowStaffDropdown(false), 200)} required className="p-3 text-sm rounded-lg border border-slate-200 w-full focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-xs" />
                {showStaffDropdown && filteredAssistants.length > 0 && (
                  <ul className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg max-h-[140px] overflow-y-auto z-50 shadow-lg mt-1 p-1">
                    {filteredAssistants.map((name, i) => (
                      <li key={i} className="p-2.5 cursor-pointer text-sm text-slate-700 hover:bg-slate-50" onMouseDown={() => { setFormData({ ...formData, assistedBy: name }); setShowStaffDropdown(false); }}>👤 {name}</li>
                    ))}
                  </ul>
                )}
              </div>
              <button type="submit" className="p-3 mt-2 bg-blue-600 text-white rounded-lg font-bold text-sm shadow-sm hover:bg-blue-700 transition">NEXT STEP ➡️</button>
            </form>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-center text-xl font-bold text-slate-800">Confirm Information</h2>
              <div className="bg-slate-50 p-4 rounded-xl text-sm">
                <p><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
                <p><strong>Purpose:</strong> {formData.purpose} {formData.subPurpose ? `(${formData.subPurpose})` : ''}</p>
                <p><strong>Assisted By:</strong> {formData.assistedBy}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 p-2.5 bg-slate-100 rounded-lg font-semibold text-sm">Back</button>
                <button onClick={saveToDatabase} className="flex-1 p-2.5 bg-emerald-600 text-white rounded-lg font-bold text-sm">SUBMIT</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-6">
              <h3 className="text-lg font-bold text-slate-800">Transaction Submitted!</h3>
              <div className="bg-amber-50 p-4 rounded-xl my-5 text-2xl font-bold">{generatedTracking}</div>
              <button onClick={resetForm} className="p-2.5 px-6 bg-blue-600 text-white rounded-lg font-bold text-sm">New Transaction</button>
            </div>
          )}
        </div>
      )}

      {view === 'login' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-[360px] mx-auto text-center">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Admin Login</h2>
          <form onSubmit={handleAdminLogin}>
            <input type="password" placeholder="Enter PIN" value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} required className="p-3 w-full rounded-lg border border-slate-200 mb-4 text-center" />
            <button type="submit" className="w-full p-2.5 bg-emerald-600 text-white rounded-lg font-bold">Unlock Dashboard</button>
          </form>
        </div>
      )}

      {view === 'dashboard' && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 max-w-[1060px] mx-auto">
           {/* ... (Dito pumapasok yung code ng dashboard na na-send mo sa Part 1/2) ... */}
           {/* Siguraduhin na i-paste mo yung rest ng dashboard table dito */}
        </div>
      )}

      {showStaffModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-[1000] p-4">
           {/* Staff Modal Code */}
        </div>
      )}

      {showPinModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-[1000] p-4 animate-fadeIn">
          <div className="bg-white p-6 rounded-2xl w-full max-w-[320px] shadow-xl border border-slate-100">
            <h3 className="text-center text-lg font-bold text-slate-800 mb-4">⚙️ Change Admin PIN</h3>
            <form onSubmit={handleChangePinSubmit} className="flex flex-col gap-3">
              <input type="password" placeholder="Current PIN" required value={pinForm.currentPin} onChange={(e) => setPinForm({...pinForm, currentPin: e.target.value})} className="p-2.5 border border-slate-200 rounded-lg text-sm" />
              <input type="password" placeholder="New PIN" required value={pinForm.newPin} onChange={(e) => setPinForm({...pinForm, newPin: e.target.value})} className="p-2.5 border border-slate-200 rounded-lg text-sm" />
              <input type="password" placeholder="Confirm New PIN" required value={pinForm.confirmPin} onChange={(e) => setPinForm({...pinForm, confirmPin: e.target.value})} className="p-2.5 border border-slate-200 rounded-lg text-sm" />
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setShowPinModal(false)} className="flex-1 p-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold">Cancel</button>
                <button type="submit" className="flex-1 p-2 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-sm">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
