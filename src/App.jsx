import React, { useState, useEffect } from 'react';

export default function App() {
  const [view, setView] = useState('form');
  const [dashboardTab, setDashboardTab] = useState('active'); 
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); 
  const [formData, setFormData] = useState({
    firstName: '', middleName: '', lastName: '',
    purpose: '', subPurpose: '', otherSpecify: '', dateNeeded: '', urgencyDetails: '', urgency: 'Regular',
    assistedBy: '', equipmentName: ''
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
  const handlePurposeChange = (e) => setFormData({ ...formData, purpose: e.target.value, subPurpose: '', otherSpecify: '', dateNeeded: '', urgencyDetails: '', equipmentName: '' });
  
  const resetForm = () => {
    setFormData({ firstName: '', middleName: '', lastName: '', purpose: '', subPurpose: '', otherSpecify: '', dateNeeded: '', urgencyDetails: '', urgency: 'Regular', assistedBy: '', equipmentName: '' });
    setGeneratedTracking(''); setStep(1);
  };

  const saveToDatabase = async () => {
    try {
      const isOthersDocument = ["Request Document(s)", "Submit Document(s) for Processing", "Receive Document(s)"].includes(formData.purpose) && formData.subPurpose === "Others";

      const payload = {
        ...formData,
        subPurpose: ["Request Document(s)", "Submit Document(s) for Processing", "Receive Document(s)"].includes(formData.purpose) ? formData.subPurpose : "",
        otherSpecify: (formData.purpose === "Others" || formData.purpose === "Inquiry" || isOthersDocument) ? formData.otherSpecify : "",
        dateNeeded: formData.urgency === "Urgent" ? formData.dateNeeded : "",
        urgencyDetails: formData.urgency === "Urgent" ? formData.urgencyDetails : ""
      };

      const response = await fetch(`${BACKEND_URL}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
    const searchString = `${tx.trackingNumber || ''} ${tx.firstName || ''} ${tx.lastName || ''} ${tx.purpose || ''} ${tx.assistedBy || ''} ${tx.otherSpecify || ''} ${tx.urgencyDetails || ''}`.toLowerCase();
    return matchesTab && searchString.includes(searchTerm.toLowerCase());
  });

  const exportToCSV = () => {
    if (filteredTransactions.length === 0) return alert("⚠️ Walang data.");
    const headers = ["Tracking Number", "First Name", "Last Name", "Priority", "Date Needed", "Urgency Reason", "Purpose", "Specific Details", "Assisted By", "Status"];
    const rows = filteredTransactions.map(tx => [
      tx.trackingNumber, 
      tx.firstName, 
      tx.lastName, 
      tx.urgency, 
      tx.urgency === "Urgent" ? (tx.dateNeeded ? new Date(tx.dateNeeded).toLocaleDateString() : 'ASAP') : 'N/A',
      tx.urgency === "Urgent" ? (tx.urgencyDetails || 'None') : 'N/A',
      tx.purpose, 
      tx.purpose === "Request Supply / Equipment" ? (tx.equipmentName || 'N/A') :
        ["Request Document(s)", "Submit Document(s) for Processing", "Receive Document(s)"].includes(tx.purpose) ? (tx.subPurpose === "Others" ? (tx.otherSpecify || 'Others') : (tx.subPurpose || 'N/A')) :
        (tx.otherSpecify || 'N/A'),
      tx.assistedBy || 'None', 
      tx.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `Office_Report.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const filteredAssistants = assistants.filter(name => 
    name.toLowerCase().includes(formData.assistedBy.toLowerCase())
  );

  const getStatusDropdownClass = (status) => {
    switch (status) {
      case 'In Progress':
        return 'bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-400';
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-emerald-400';
      default: 
        return 'bg-amber-50 text-amber-700 border-amber-200 focus:ring-amber-400';
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

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-xs uppercase tracking-wider text-slate-500">Urgency / Priority:</label>
                <div className="flex gap-6 p-1">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer"><input type="radio" name="urgency" value="Regular" checked={formData.urgency === 'Regular'} onChange={handleInputChange} className="w-4 h-4 text-blue-600" /> Regular</label>
                  <label className="inline-flex items-center gap-2 text-sm text-rose-600 font-semibold cursor-pointer"><input type="radio" name="urgency" value="Urgent" checked={formData.urgency === 'Urgent'} onChange={handleInputChange} className="w-4 h-4 text-rose-600" /> ⚠️ Urgent</label>
                </div>

                {/* 📅 DYNAMIC URGENT FIELDS */}
                {formData.urgency === "Urgent" && (
                  <div className="mt-2 flex flex-col gap-3 text-left bg-rose-50/50 p-3 rounded-xl border border-rose-100 animate-fadeIn">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-rose-600 uppercase tracking-wide">📅 Date Needed / Kailan Kailangan?:</label>
                      <input type="date" name="dateNeeded" value={formData.dateNeeded || ""} onChange={handleInputChange} required className="p-2 text-sm rounded-lg border border-rose-300 bg-white text-slate-700 focus:outline-none focus:border-rose-500" />
                    </div>
                    {/* 🔥 NAPAKASALONG INPUT: Rason para sa Detalye ng Urgency */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-rose-600 uppercase tracking-wide">💬 Detalye / Dahilan ng Pagka-Urgent:</label>
                      <input type="text" name="urgencyDetails" value={formData.urgencyDetails || ""} onChange={handleInputChange} required placeholder="Hal. Para sa DepEd deadline bukas / Pirma bago umalis" className="p-2 text-sm rounded-lg border border-rose-300 bg-white text-slate-700 focus:outline-none focus:border-rose-500" />
                    </div>
                  </div>
                )}
              </div>

              <select name="purpose" value={formData.purpose} onChange={handlePurposeChange} required className="p-3 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none bg-no-repeat bg-[right_11px_center] bg-[length:1.25rem] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%20stroke%3D%22%2364748b%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')]">
                <option value="" disabled hidden>-- Select Purpose --</option>
                <option value="Inquiry">Inquiry</option>
                <option value="Sign DTR/Summary of Absences">Sign DTR/Summary of Absences</option>
                <option value="File Form 6">File Form 6</option>
                <option value="Request Document(s)">Request Document(s)</option>
                <option value="Submit Document(s) for Processing">Submit Document(s) for Processing</option>
                <option value="Receive Document(s)">Receive Document(s)</option>
                <option value="Request Supply / Equipment">Request Supply / Equipment</option>
                <option value="Others">Others</option>
              </select>

              {formData.purpose === "Submit Document(s) for Processing" && (
                <select name="subPurpose" value={formData.subPurpose} onChange={handleInputChange} required className="p-3 text-sm rounded-lg border border-slate-200 bg-white appearance-none bg-no-repeat bg-[right_11px_center] bg-[length:1.25rem] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%20stroke%3D%22%2364748b%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')]">
                  <option value="" disabled hidden>-- Choose Document --</option>
                  <option value="Travel Authority (Local)">Travel Authority (Local)</option>
                  <option value="Travel Authority (Abroad)">Travel Authority (Abroad)</option>
                  <option value="Permit to Teach">Permit to Teach</option>
                  <option value="Permit to Study">Permit to Study</option>
                  <option value="Others">Others (Please specify...)</option>
                </select>
              )}

              {formData.purpose === 'Request Document(s)' && (
                <select name="subPurpose" value={formData.subPurpose} onChange={handleInputChange} required className="p-3 text-sm rounded-lg border border-slate-200 bg-white appearance-none bg-no-repeat bg-[right_11px_center] bg-[length:1.25rem] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%20stroke%3D%22%2364748b%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')]">
                  <option value="" disabled hidden>-- Choose Document --</option>
                  <option value="IPCRF">IPCRF</option>
                  <option value="SALN">SALN</option>
                  <option value="ITR">ITR</option>
                  <option value="SERVICE RECORD">SERVICE RECORD</option>
                  <option value="CERTIFICATE OF EMPLOYMENT (COE)">CERTIFICATE OF EMPLOYMENT (COE)</option>
                  <option value="Others">Others (Please specify...)</option>
                </select>
              )}

              {formData.purpose === 'Receive Document(s)' && (
                <select name="subPurpose" value={formData.subPurpose} onChange={handleInputChange} required className="p-3 text-sm rounded-lg border border-slate-200 bg-white appearance-none bg-no-repeat bg-[right_11px_center] bg-[length:1.25rem] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%20stroke%3D%22%2364748b%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')]">
                  <option value="" disabled hidden>-- Choose Document to Receive --</option>
                  <option value="IPCRF">IPCRF</option>
                  <option value="SALN">SALN</option>
                  <option value="ITR">ITR</option>
                  <option value="SERVICE RECORD">SERVICE RECORD</option>
                  <option value="CERTIFICATE OF EMPLOYMENT (COE)">CERTIFICATE OF EMPLOYMENT (COE)</option>
                  <option value="Travel Authority">Travel Authority</option>
                  <option value="Permit to Teach / Study">Permit to Teach / Study</option>
                  <option value="Others">Others (Please specify...)</option>
                </select>
              )}

              {["Request Document(s)", "Submit Document(s) for Processing", "Receive Document(s)"].includes(formData.purpose) && formData.subPurpose === "Others" && (
                <input type="text" name="otherSpecify" placeholder="Anong dokumento ito? I-type dito..." value={formData.otherSpecify || ""} onChange={handleInputChange} required className="p-3 text-sm rounded-lg border border-blue-400 bg-white focus:outline-none" />
              )}

              {(formData.purpose === "Others" || formData.purpose === "Inquiry") && (
                <input type="text" name="otherSpecify" placeholder={formData.purpose === "Inquiry" ? "Ano ang iyong itatanong?" : "Please specify"} value={formData.otherSpecify} onChange={handleInputChange} required className="p-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500" />
              )}

              {formData.purpose === "Request Supply / Equipment" && (
                <div className="mt-2 text-left">
                  <label htmlFor="equipmentName" className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Anong supply / kagamitan ang kailangan? (Optional):</label>
                  <input type="text" id="equipmentName" name="equipmentName" value={formData.equipmentName || ""} onChange={handleInputChange} placeholder="Please type Tool or Equipment name..." className="w-full p-3 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:border-blue-500 box-border" />
                </div>
              )}

              <div className="flex flex-col gap-1.5 relative">
                <label className="font-semibold text-xs uppercase tracking-wider text-slate-500">Sino ang nag-assist sa iyo? (Staff Name):</label>
                <input type="text" name="assistedBy" autoComplete="off" placeholder="I-type o piliin ang pangalan..." value={formData.assistedBy} onChange={handleInputChange} onFocus={() => setShowStaffDropdown(true)} onBlur={() => setTimeout(() => setShowStaffDropdown(false), 200)} required className="p-3 text-sm rounded-lg border border-slate-200 w-full focus:outline-none focus:border-blue-500 transition-all" />
                {showStaffDropdown && filteredAssistants.length > 0 && (
                  <ul className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg max-h-[140px] overflow-y-auto z-50 shadow-lg mt-1 p-1 list-none">
                    {filteredAssistants.map((name, i) => (
                      <li key={i} className="p-2.5 cursor-pointer text-sm text-slate-700 rounded-md text-left hover:bg-slate-50 hover:text-blue-600" onMouseDown={() => { setFormData({ ...formData, assistedBy: name }); setShowStaffDropdown(false); }}>👤 {name}</li>
                    ))}
                  </ul>
                )}
              </div>

              <button type="submit" className="p-3 mt-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition uppercase tracking-wide">NEXT STEP ➡️</button>
            </form>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-center text-xl font-bold text-slate-800">Confirm Information</h2>
              <div className="bg-slate-50 p-4 rounded-xl flex flex-col gap-2 border border-slate-100 text-sm">
                <p className="text-slate-600"><strong>Name:</strong> <span className="text-slate-900 font-medium">{formData.firstName} {formData.lastName}</span></p>
                <p className="text-slate-600"><strong>Priority:</strong> <span className={`font-bold ${formData.urgency === 'Urgent' ? 'text-rose-600' : 'text-slate-900'}`}>{formData.urgency}</span></p>
                {formData.urgency === "Urgent" && formData.dateNeeded && (
                  <p className="text-slate-600"><strong>Date Needed:</strong> <span className="text-rose-600 font-bold">{new Date(formData.dateNeeded).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span></p>
                )}
                {formData.urgency === "Urgent" && formData.urgencyDetails && (
                  <p className="text-slate-600"><strong>Dahilan:</strong> <span className="text-rose-600 font-medium">{formData.urgencyDetails}</span></p>
                )}
                <p className="text-slate-600"><strong>Purpose:</strong> <span className="text-slate-900 font-medium">{formData.purpose} {formData.subPurpose && formData.subPurpose !== "Others" ? `(${formData.subPurpose})` : ''}</span></p>
                {formData.otherSpecify && <p className="text-slate-600"><strong>Details:</strong> <span className="text-blue-600 font-medium">{formData.otherSpecify}</span></p>}
                <p className="text-slate-600"><strong>Assisted By:</strong> <span className="text-slate-900 font-medium">{formData.assistedBy}</span></p>
              </div>
              <div className="flex gap-3 mt-1">
                <button onClick={() => setStep(1)} className="flex-1 p-2.5 bg-slate-100 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-200 transition">Back</button>
                <button onClick={saveToDatabase} className="flex-1 p-2.5 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 transition">SUBMIT</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-3 shadow-inner">✓</div>
              <h3 className="text-lg font-bold text-slate-800">Transaction Submitted!</h3>
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl my-5 shadow-sm">
                <h2 className="m-0 text-amber-800 font-mono tracking-widest text-2xl font-bold">{generatedTracking}</h2>
              </div>
              <button onClick={resetForm} className="p-2.5 px-6 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition">New Transaction</button>
            </div>
          )}
        </div>
      )}

      {view === 'login' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-[360px] mx-auto text-center">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Admin Login</h2>
          <form onSubmit={handleAdminLogin}>
            <input type="password" placeholder="Enter PIN" value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} required className="p-3 w-full rounded-lg border border-slate-200 mb-4 text-center text-lg tracking-widest focus:outline-none focus:border-emerald-500" />
            <button type="submit" className="w-full p-2.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition">Unlock Dashboard</button>
          </form>
        </div>
      )}

      {view === 'dashboard' && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 max-w-[1060px] mx-auto">
          <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight m-0">Office Dashboard</h2>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setShowStaffModal(true)} className="p-2 px-3.5 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-semibold text-xs hover:bg-slate-100 transition">👥 Staff</button>
              <button onClick={() => setShowPinModal(true)} className="p-2 px-3.5 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-semibold text-xs hover:bg-slate-100 transition">🔑 PIN</button>
              <button onClick={exportToCSV} className="p-2 px-3.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg font-semibold text-xs hover:bg-emerald-100 transition">📥 CSV</button>
              <button onClick={() => { setView('form'); localStorage.removeItem('active_session_pin'); setSessionPin(''); }} className="p-2 px-3.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg font-bold text-xs hover:bg-rose-100 transition">🔒 Logout</button>
            </div>
          </div>

          <div className="relative mb-5">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none text-sm">🔍</span>
            <input type="text" placeholder="Mag-hanap gamit ang Pangalan, Tracking, o Staff..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2.5 pl-9 box-border rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-all" />
          </div>

          <div className="flex gap-2 mb-6 bg-slate-50 p-1 rounded-xl border border-slate-100">
            <button onClick={() => setDashboardTab('active')} className={`flex-1 py-2 px-3 rounded-lg font-semibold text-xs transition-all ${dashboardTab === 'active' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-800'}`}>Active ({transactions.filter(t => t.status !== 'Completed').length})</button>
            <button onClick={() => setDashboardTab('archive')} className={`flex-1 py-2 px-3 rounded-lg font-semibold text-xs transition-all ${dashboardTab === 'archive' ? 'bg-white text-slate-700 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-800'}`}>Archives ({transactions.filter(t => t.status === 'Completed').length})</button>
          </div>

          {loading ? (
            <p className="text-center text-slate-500 font-medium py-6 text-sm animate-pulse">Loading dashboard records...</p>
          ) : filteredTransactions.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm border border-dashed border-slate-200 rounded-xl">No transactions found.</p>
          ) : (
            <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm w-full">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-max">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Tracking No.</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Detalye ng Transaksyon</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Oras/Petsa</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Aksyon / Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((tx) => {
                    const orasFormat = tx.createdAt ? new Date(tx.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '---';

                    return (
                      <tr key={tx._id} className="hover:bg-slate-50 transition-colors duration-200">
                        <td className="px-6 py-4 align-middle">
                          <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md font-mono font-bold text-[13px] border border-slate-200 shadow-sm">{tx.trackingNumber}</span>
                        </td>
                        <td className="px-6 py-4 align-middle">
                          <div className="font-bold text-slate-900 text-[15px]">{tx.lastName}, {tx.firstName}</div>
                          <div className="text-slate-600 mt-1.5 text-sm flex flex-col gap-0.5">
                            
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-rose-500">📌</span> 
                              <span className="font-medium text-slate-900">
                                {tx.purpose} {tx.subPurpose && tx.subPurpose !== "Others" ? `(${tx.subPurpose})` : ''}
                              </span>

                              {tx.urgency === "Urgent" && (
                                <span className="ml-1 px-2 py-0.5 text-[11px] font-bold bg-rose-50 text-rose-600 rounded-md border border-rose-200 animate-pulse">
                                  ⚠️ URGENT {tx.dateNeeded ? `[Need: ${new Date(tx.dateNeeded).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}]` : '[ASAP]'}
                                </span>
                              )}
                            </div>

                            {/* 🔥 KASADO: Dito lilitaw ang Detalye/Rason kung bakit Urgent */}
                            {tx.urgency === "Urgent" && tx.urgencyDetails && (
                              <span className="text-rose-600 font-semibold text-xs pl-5 block mt-0.5 animate-fadeIn">
                                ↳ Detalye: {tx.urgencyDetails}
                              </span>
                            )}

                            {/* Custom Standard Document Details ("Others") */}
                            {tx.otherSpecify && (
                              <span className="text-blue-600 font-medium text-xs pl-5 block mt-0.5">
                                ↳ Dokumento: {tx.otherSpecify}
                              </span>
                            )}

                            {/* Supply/Equipment details */}
                            {tx.purpose === "Request Supply / Equipment" && tx.equipmentName && (
                              <span className="text-blue-600 font-semibold text-xs pl-5 block mt-0.5">
                                ↳ Kagamitan: {tx.equipmentName}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                            <span className="font-medium text-slate-400">Assisted by:</span> 
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium border border-slate-200/60">{tx.assistedBy || 'None'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-middle text-slate-500 text-[13.5px] font-medium">
                          {orasFormat}
                        </td>
                        <td className="px-6 py-4 align-middle text-center">
                          <select 
                            value={tx.status || 'Pending'} 
                            onChange={(e) => handleStatusChange(tx._id, e.target.value)} 
                            className={`p-2 rounded-lg text-xs font-bold border cursor-pointer w-full min-w-[120px] text-center shadow-sm focus:outline-none focus:ring-2 appearance-none bg-no-repeat bg-[right_11px_center] bg-[length:1.25rem] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%20stroke%3D%22%2364748b%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] ${getStatusDropdownClass(tx.status)}`}
                          >
                            <option value="Pending" className="bg-white text-slate-800">🕒 Pending</option>
                            <option value="In Progress" className="bg-white text-slate-800">⚙️ Progress</option>
                            <option value="Completed" className="bg-white text-slate-800">✅ Done</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* STAFF MANAGEMENT MODAL */}
          {showStaffModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-[1000] p-4">
              <div className="bg-white p-6 rounded-2xl w-full max-w-[360px] max-h-[80vh] overflow-y-auto shadow-xl">
                <h3 className="text-center text-lg font-bold text-slate-800 mb-4">👥 Pamahalaan ang Staff</h3>
                <form onSubmit={handleAddStaff} className="flex gap-2 mb-4">
                  <input type="text" placeholder="Pangalan ng bagong staff" required value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} className="flex-1 p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
                  <button type="submit" className="p-2 px-3.5 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700">+</button>
                </form>
                <div className="border-t border-slate-100 pt-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Kasalukuyang Listahan:</label>
                  {assistants.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-3">Walang nakatalang staff.</p>
                  ) : (
                    <ul className="list-none p-0 m-0 divide-y divide-slate-50">
                      {assistants.map((name, index) => (
                        <li key={index} className="flex justify-between items-center py-2.5 text-sm text-slate-700">
                          <span className="font-medium">👤 {name}</span>
                          <button type="button" onClick={() => handleRemoveStaff(name)} className="bg-transparent text-slate-400 hover:text-rose-600 font-bold border-none cursor-pointer">❌</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button onClick={() => setShowStaffModal(false)} className="w-full mt-5 p-2 bg-slate-100 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-200 transition">Isara</button>
              </div>
            </div>
          )}

          {/* PIN MANAGEMENT MODAL */}
          {showPinModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-[1000] p-4">
              <div className="bg-white p-6 rounded-2xl w-full max-w-[320px] shadow-xl">
                <h3 className="text-center text-lg font-bold text-slate-800 mb-4">⚙️ Change Admin PIN</h3>
                <form onSubmit={handleChangePinSubmit} className="flex flex-col gap-3">
                  <input type="password" placeholder="Current PIN" required value={pinForm.currentPin} onChange={(e) => setPinForm({...pinForm, currentPin: e.target.value})} className="p-2.5 border border-slate-200 rounded-lg text-sm" />
                  <input type="password" placeholder="New PIN" required value={pinForm.newPin} onChange={(e) => setPinForm({...pinForm, newPin: e.target.value})} className="p-2.5 border border-slate-200 rounded-lg text-sm" />
                  <input type="password" placeholder="Confirm New PIN" required value={pinForm.confirmPin} onChange={(e) => setPinForm({...pinForm, confirmPin: e.target.value})} className="p-2.5 border border-slate-200 rounded-lg text-sm" />
                  <div className="flex gap-2 mt-2">
                    <button type="button" onClick={() => setShowPinModal(false)} className="flex-1 p-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200">Cancel</button>
                    <button type="submit" className="flex-1 p-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700">Save</button>
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
