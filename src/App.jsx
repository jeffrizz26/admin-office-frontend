import React, { useState, useEffect } from 'react';

// Default static lists that will act as a fallback and initial database
const DEFAULT_PURPOSES = [
  "Inquiry",
  "Sign DTR/Summary of Absences",
  "File Form 6",
  "Request Document(s)",
  "Submit Document(s) for Processing",
  "Receive Document(s)",
  "Request Supply / Equipment",
  "Others"
];

const DEFAULT_SUB_PURPOSES: Record<string, string[]> = {
  "Submit Document(s) for Processing": [
    "Travel Authority (Local)",
    "Travel Authority (Abroad)",
    "Permit to Teach",
    "Permit to Study"
  ],
  "Request Document(s)": [
    "IPCRF",
    "SALN",
    "ITR",
    "SERVICE RECORD",
    "CERTIFICATE OF EMPLOYMENT (COE)"
  ]
};

interface Transaction {
  _id: string;
  trackingNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  purpose: string;
  subPurpose?: string;
  otherSpecify?: string;
  urgency: string;
  assistedBy: string;
  status: string;
  createdAt?: string;
}

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assistants, setAssistants] = useState<string[]>([]); 
  const [showStaffDropdown, setShowStaffDropdown] = useState(false); 
  const [newStaffName, setNewStaffName] = useState(''); 
  const [loading, setLoading] = useState(true);
  const [sessionPin, setSessionPin] = useState(() => localStorage.getItem('active_session_pin') || '');
  const [showPinModal, setShowPinModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false); 
  
  // Custom Settings Modal for managing --Select Purpose-- and --Choose Document--
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedPurposeForDocs, setSelectedPurposeForDocs] = useState('');
  const [newPurposeInput, setNewPurposeInput] = useState('');
  const [newSubPurposeInput, setNewSubPurposeInput] = useState('');

  // Dynamic Options States initialized from LocalStorage (with default fallback)
  const [purposes, setPurposes] = useState<string[]>(() => {
    const saved = localStorage.getItem('office_purposes');
    return saved ? JSON.parse(saved) : DEFAULT_PURPOSES;
  });

  const [subPurposes, setSubPurposes] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('office_sub_purposes');
    return saved ? JSON.parse(saved) : DEFAULT_SUB_PURPOSES;
  });

  const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '', confirmPin: '' });

  // Confirmation states to replace unreliable browser window.confirm inside sandboxed preview iframes
  const [confirmDeleteStaff, setConfirmDeleteStaff] = useState<string | null>(null);
  const [confirmDeletePurpose, setConfirmDeletePurpose] = useState<string | null>(null);
  const [confirmDeleteSubPurpose, setConfirmDeleteSubPurpose] = useState<string | null>(null);

  const BACKEND_URL = 'https://admin-office-backend.vercel.app'; 

  // Synchronize purposes lists to localStorage
  useEffect(() => {
    localStorage.setItem('office_purposes', JSON.stringify(purposes));
  }, [purposes]);

  useEffect(() => {
    localStorage.setItem('office_sub_purposes', JSON.stringify(subPurposes));
  }, [subPurposes]);

  // Reset document deletion confirmation whenever selected purpose changes
  useEffect(() => {
    setConfirmDeleteSubPurpose(null);
  }, [selectedPurposeForDocs]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handlePurposeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, purpose: e.target.value, subPurpose: '', otherSpecify: '', dateNeeded: '' });
  };
  
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

  const handleAddStaff = async (e: React.FormEvent) => {
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

  const handleRemoveStaff = async (name: string) => {
    if (confirmDeleteStaff !== name) {
      setConfirmDeleteStaff(name);
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/assistants/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionPin}` },
        body: JSON.stringify({ name })
      });
      const result = await res.json();
      if (result.success) {
        setAssistants(result.data);
        setConfirmDeleteStaff(null);
      }
    } catch (err) { alert("❌ Error removing staff."); }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
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

  const handleAdminLogin = async (e: React.FormEvent) => {
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

  const handleChangePinSubmit = async (e: React.FormEvent) => {
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

  // Manage Dynamic Purposes & Sub-Purposes Custom Functions
  const handleAddPurpose = () => {
    const name = newPurposeInput.trim();
    if (!name) return;
    if (purposes.includes(name)) {
      alert("⚠️ Nakasulat na ang layuning ito.");
      return;
    }
    const updatedPurposes = [...purposes, name];
    setPurposes(updatedPurposes);
    setNewPurposeInput('');
  };

  const handleRemovePurpose = (name: string) => {
    if (confirmDeletePurpose !== name) {
      setConfirmDeletePurpose(name);
      return;
    }
    const updatedPurposes = purposes.filter(p => p !== name);
    setPurposes(updatedPurposes);
    
    const updatedSub = { ...subPurposes };
    delete updatedSub[name];
    setSubPurposes(updatedSub);

    if (selectedPurposeForDocs === name) {
      setSelectedPurposeForDocs('');
    }
    setConfirmDeletePurpose(null);
  };

  const handleAddSubPurpose = () => {
    if (!selectedPurposeForDocs) return;
    const name = newSubPurposeInput.trim();
    if (!name) return;

    const currentList = subPurposes[selectedPurposeForDocs] || [];
    if (currentList.includes(name)) {
      alert("⚠️ Nakatala na ang dokumentong ito.");
      return;
    }

    const updatedList = [...currentList, name];
    setSubPurposes({
      ...subPurposes,
      [selectedPurposeForDocs]: updatedList
    });
    setNewSubPurposeInput('');
  };

  const handleRemoveSubPurpose = (name: string) => {
    if (!selectedPurposeForDocs) return;
    if (confirmDeleteSubPurpose !== name) {
      setConfirmDeleteSubPurpose(name);
      return;
    }

    const currentList = subPurposes[selectedPurposeForDocs] || [];
    const updatedList = currentList.filter(item => item !== name);
    setSubPurposes({
      ...subPurposes,
      [selectedPurposeForDocs]: updatedList
    });
    setConfirmDeleteSubPurpose(null);
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
      const formattedDate = tx.createdAt 
        ? new Date(tx.createdAt).toLocaleString('en-US', { 
            month: 'short', day: 'numeric', year: 'numeric', 
            hour: '2-digit', minute: '2-digit', hour12: true 
          }) 
        : '---';

      return [
        tx.trackingNumber, 
        formattedDate, 
        tx.firstName, 
        tx.lastName, 
        tx.urgency, 
        tx.purpose, 
        tx.otherSpecify || '', 
        tx.assistedBy || 'None', 
        tx.status
      ];
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `Office_Report.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const filteredAssistants = assistants.filter(name => 
    name.toLowerCase().includes(formData.assistedBy.toLowerCase())
  );

  const getStatusDropdownClass = (status: string) => {
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
        <button id="view-form-btn" onClick={() => setView('form')} className={`flex-1 max-w-[130px] py-2.5 px-4 cursor-pointer rounded-lg border font-semibold text-sm transition-all duration-200 ${view === 'form' ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>📄 Form</button>
        <button id="view-dashboard-btn" onClick={() => setView(sessionPin ? 'dashboard' : 'login')} className={`flex-1 max-w-[130px] py-2.5 px-4 cursor-pointer rounded-lg border font-semibold text-sm transition-all duration-200 ${view === 'dashboard' || view === 'login' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>📊 Dashboard</button>
      </div>

      {view === 'form' && (
        <div id="form-container-card" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-[460px] mx-auto">
          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="flex flex-col gap-4">
              <h2 className="text-center text-xl font-bold text-slate-800 mb-1">Admin Office Transaction</h2>
              
              <input id="input-first-name" type="text" name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleInputChange} required className="p-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
              <input id="input-middle-name" type="text" name="middleName" placeholder="Middle Name (Optional)" value={formData.middleName} onChange={handleInputChange} className="p-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
              <input id="input-last-name" type="text" name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleInputChange} required className="p-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />

              <div id="urgency-priority-container" className="flex flex-col gap-1.5">
                <label className="font-semibold text-xs uppercase tracking-wider text-slate-500">Urgency / Priority:</label>
                <div className="flex gap-6 p-1">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer"><input type="radio" name="urgency" value="Regular" checked={formData.urgency === 'Regular'} onChange={handleInputChange} className="w-4 h-4 text-blue-600" /> Regular</label>
                  <label className="inline-flex items-center gap-2 text-sm text-rose-600 font-semibold cursor-pointer"><input type="radio" name="urgency" value="Urgent" checked={formData.urgency === 'Urgent'} onChange={handleInputChange} className="w-4 h-4 text-rose-600" /> ⚠️ Urgent</label>
                </div>
              </div>

              {/* Dynamic Select Purpose option list */}
              <select id="select-purpose-dropdown" name="purpose" value={formData.purpose} onChange={handlePurposeChange} required className="p-3 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none bg-no-repeat bg-[right_11px_center] bg-[length:1.25rem] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%20stroke%3D%22%2364748b%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')]">
                <option value="">-- Select Purpose --</option>
                {purposes.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              {/* Dynamic Sub-Purpose / Choose Document option list if configured for this purpose */}
              {formData.purpose && subPurposes[formData.purpose] && subPurposes[formData.purpose].length > 0 && (
                <select id="select-choose-document-dropdown" name="subPurpose" value={formData.subPurpose} onChange={handleInputChange} required className="p-3 text-sm rounded-lg border border-slate-200 bg-white shadow-xs appearance-none bg-no-repeat bg-[right_11px_center] bg-[length:1.25rem] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%20stroke%3D%22%2364748b%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')]">
                  <option value="">-- Choose Document --</option>
                  {subPurposes[formData.purpose].map((sp) => (
                    <option key={sp} value={sp}>{sp}</option>
                  ))}
                </select>
              )}

              {formData.purpose === "Others" && (
                <input id="input-other-specify" type="text" name="otherSpecify" placeholder="Please specify" value={formData.otherSpecify} onChange={handleInputChange} required className="p-3 text-sm rounded-lg border border-slate-200 shadow-xs" />
              )}

              <div id="assist-by-container" className="flex flex-col gap-1.5 relative">
                <label className="font-semibold text-xs uppercase tracking-wider text-slate-500">Sino ang nag-assist sa iyo? (Staff Name):</label>
                <input 
                  id="input-staff-assisted"
                  type="text" name="assistedBy" autoComplete="off" placeholder="I-type o piliin ang pangalan..." value={formData.assistedBy} 
                  onChange={handleInputChange} onFocus={() => setShowStaffDropdown(true)} onBlur={() => setTimeout(() => setShowStaffDropdown(false), 200)} required 
                  className="p-3 text-sm rounded-lg border border-slate-200 w-full focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-xs" 
                />
                
                {showStaffDropdown && filteredAssistants.length > 0 && (
                  <ul id="staff-assisted-dropdown" className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg max-h-[140px] overflow-y-auto z-50 shadow-lg mt-1 p-1 list-none">
                    {filteredAssistants.map((name, i) => (
                      <li key={i} className="p-2.5 cursor-pointer text-sm text-slate-700 rounded-md text-left hover:bg-slate-50 hover:text-blue-600 transition-colors"
                        onMouseDown={() => { setFormData({ ...formData, assistedBy: name }); setShowStaffDropdown(false); }}>
                        👤 {name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button id="next-step-btn" type="submit" className="p-3 mt-2 bg-blue-600 text-white rounded-lg font-bold text-sm shadow-sm hover:bg-blue-700 transition duration-200 uppercase tracking-wide">NEXT STEP ➡️</button>
            </form>
          )}

          {step === 2 && (
            <div id="confirm-step-container" className="flex flex-col gap-4">
              <h2 className="text-center text-xl font-bold text-slate-800">Confirm Information</h2>
              <div className="bg-slate-50 p-4 rounded-xl flex flex-col gap-2 border border-slate-100 text-sm">
                <p className="text-slate-600"><strong>Name:</strong> <span className="text-slate-900 font-medium">{formData.firstName} {formData.lastName}</span></p>
                <p className="text-slate-600"><strong>Purpose:</strong> <span className="text-slate-900 font-medium">{formData.purpose} {formData.subPurpose && `(${formData.subPurpose})`} {formData.purpose === 'Others' && formData.otherSpecify && `(${formData.otherSpecify})`}</span></p>
                <p className="text-slate-600"><strong>Assisted By:</strong> <span className="text-slate-900 font-medium">{formData.assistedBy}</span></p>
              </div>
              <div className="flex gap-3 mt-1">
                <button id="confirm-back-btn" onClick={() => setStep(1)} className="flex-1 p-2.5 bg-slate-100 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-200 transition">Back</button>
                <button id="confirm-submit-btn" onClick={saveToDatabase} className="flex-1 p-2.5 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 transition">SUBMIT</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div id="success-step-container" className="text-center py-6">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-3 shadow-inner">✓</div>
              <h3 className="text-lg font-bold text-slate-800">Transaction Submitted!</h3>
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl my-5 shadow-sm">
                <h2 id="generated-tracking-num" className="m-0 text-amber-800 font-mono tracking-widest text-2xl font-bold">{generatedTracking}</h2>
              </div>
              <button id="new-tx-btn" onClick={resetForm} className="p-2.5 px-6 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition shadow-sm">New Transaction</button>
            </div>
          )}
        </div>
      )}

      {view === 'login' && (
        <div id="login-container-card" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-[360px] mx-auto text-center">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Admin Login</h2>
          <form onSubmit={handleAdminLogin}>
            <input id="admin-pin-password" type="password" placeholder="Enter PIN" value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} required className="p-3 w-full rounded-lg border border-slate-200 mb-4 text-center text-lg tracking-widest focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
            <button id="admin-login-submit" type="submit" className="w-full p-2.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition shadow-sm">Unlock Dashboard</button>
          </form>
        </div>
      )}

      {view === 'dashboard' && (
        <div id="dashboard-container-card" className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 max-w-[1060px] mx-auto">
          <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight m-0">Office Dashboard</h2>
            <div className="flex gap-2 flex-wrap">
              {/* Dynamic Purpose Option Configurator modal button added next to existing options */}
              <button id="open-purposes-docs-btn" onClick={() => setShowSettingsModal(true)} className="p-2 px-3.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg font-semibold text-xs hover:bg-blue-100 transition">📋 Purposes & Docs</button>
              <button id="open-staff-btn" onClick={() => setShowStaffModal(true)} className="p-2 px-3.5 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-semibold text-xs hover:bg-slate-100 transition">👥 Staff</button>
              <button id="open-pin-btn" onClick={() => setShowPinModal(true)} className="p-2 px-3.5 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-semibold text-xs hover:bg-slate-100 transition">🔑 PIN</button>
              <button id="export-csv-btn" onClick={exportToCSV} className="p-2 px-3.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg font-semibold text-xs hover:bg-emerald-100 transition">📥 CSV</button>
              <button id="logout-btn" onClick={() => { setView('form'); localStorage.removeItem('active_session_pin'); setSessionPin(''); }} className="p-2 px-3.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg font-bold text-xs hover:bg-rose-100 transition">🔒 Logout</button>
            </div>
          </div>

          <div className="relative mb-5">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none text-sm">🔍</span>
            <input id="search-bar-input" type="text" placeholder="Mag-hanap gamit ang Pangalan, Tracking, o Staff..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2.5 pl-9 box-border rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
          </div>

          <div className="flex gap-2 mb-6 bg-slate-50 p-1 rounded-xl border border-slate-100">
            <button id="tab-active-btn" onClick={() => setDashboardTab('active')} className={`flex-1 py-2 px-3 rounded-lg font-semibold text-xs transition-all ${dashboardTab === 'active' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-800'}`}>Active ({transactions.filter(t => t.status !== 'Completed').length})</button>
            <button id="tab-archive-btn" onClick={() => setDashboardTab('archive')} className={`flex-1 py-2 px-3 rounded-lg font-semibold text-xs transition-all ${dashboardTab === 'archive' ? 'bg-white text-slate-700 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-800'}`}>Archives ({transactions.filter(t => t.status === 'Completed').length})</button>
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
                          <div className="text-slate-600 mt-1.5 text-sm flex items-center gap-1.5">
                            <span className="text-rose-500">📌</span> 
                            <span>
                              {tx.purpose} 
                              {tx.subPurpose ? ` (${tx.subPurpose})` : ''}
                              {tx.purpose === 'Others' && tx.otherSpecify ? ` (${tx.otherSpecify})` : ''}
                            </span>
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
                            className={`p-2 rounded-lg text-xs font-bold border cursor-pointer w-full min-w-[120px] text-center shadow-sm focus:outline-none focus:ring-2 transition-all duration-200 appearance-none bg-no-repeat bg-[right_11px_center] bg-[length:1.25rem] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%20stroke%3D%22%2364748b%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] ${getStatusDropdownClass(tx.status)}`}
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

          {/* EDITABLE DYNAMIC PURPOSES & DOCUMENTS CONFIGURATION MODAL */}
          {showSettingsModal && (
            <div id="dynamic-settings-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-[1000] p-4 animate-fadeIn">
              <div className="bg-white p-6 rounded-2xl w-full max-w-[440px] max-h-[85vh] overflow-y-auto shadow-xl border border-slate-100 flex flex-col gap-4">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-slate-800">📋 Purposes & Documents Manager</h3>
                  <p className="text-xs text-slate-500 mt-1">Add or remove options for drop-down menus easily</p>
                </div>
                
                {/* SECTION 1: Purposes Manager */}
                <div id="settings-purposes-section" className="border border-slate-100 p-3 rounded-xl bg-slate-50">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">1. Main Purposes Option List</h4>
                  
                  {/* Add Purpose Form */}
                  <div className="flex gap-2 mb-3">
                    <input 
                      id="new-purpose-name-input"
                      type="text" 
                      placeholder="e.g. Request Certificate" 
                      value={newPurposeInput} 
                      onChange={(e) => setNewPurposeInput(e.target.value)} 
                      className="flex-1 p-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-blue-500" 
                    />
                    <button 
                      id="save-new-purpose-btn"
                      onClick={handleAddPurpose} 
                      className="p-2 px-3 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 transition"
                    >
                      + Add
                    </button>
                  </div>

                  {/* Purpose Lists Container */}
                  <div className="max-h-[140px] overflow-y-auto divide-y divide-slate-100 border border-slate-200/60 rounded-lg bg-white">
                    {purposes.map((p) => {
                      const isConfirming = confirmDeletePurpose === p;
                      return (
                        <div key={p} className="flex justify-between items-center p-2 text-xs text-slate-700">
                          <span className="font-semibold truncate mr-2" title={p}>📌 {p}</span>
                          <div className="flex gap-1.5 items-center shrink-0">
                            {isConfirming ? (
                              <>
                                <button 
                                  onClick={() => handleRemovePurpose(p)} 
                                  className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-2 py-0.5 rounded-md font-bold text-[10px] transition-colors cursor-pointer"
                                >
                                  Bura?
                                </button>
                                <button 
                                  onClick={() => setConfirmDeletePurpose(null)} 
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md font-bold text-[10px] transition-colors cursor-pointer"
                                >
                                  X
                                </button>
                              </>
                            ) : (
                              <button 
                                onClick={() => handleRemovePurpose(p)} 
                                className="bg-transparent border-none text-slate-400 hover:text-rose-600 font-bold cursor-pointer hover:scale-110 transition-transform p-1"
                              >
                                ❌
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SECTION 2: Sub-purposes / Choose Document Option List */}
                <div id="settings-documents-section" className="border border-slate-100 p-3 rounded-xl bg-slate-50">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">2. Document Option List (Sub-Purpose)</h4>
                  
                  {/* Selector to select mainstream purpose */}
                  <div className="mb-3">
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Select Purpose to Assign Documents:</label>
                    <select 
                      id="select-purpose-for-docs"
                      value={selectedPurposeForDocs} 
                      onChange={(e) => setSelectedPurposeForDocs(e.target.value)} 
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Choose Main Purpose --</option>
                      {purposes.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {selectedPurposeForDocs && (
                    <>
                      {/* Add document / subpurpose form */}
                      <div className="flex gap-2 mb-3">
                        <input 
                          id="new-subpurpose-name-input"
                          type="text" 
                          placeholder="e.g. Diploma or Form 137" 
                          value={newSubPurposeInput} 
                          onChange={(e) => setNewSubPurposeInput(e.target.value)} 
                          className="flex-1 p-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-emerald-500" 
                        />
                        <button 
                          id="save-new-subpurpose-btn"
                          onClick={handleAddSubPurpose} 
                          className="p-2 px-3 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 transition"
                        >
                          + Add
                        </button>
                      </div>

                      {/* Sub purposes / Documents option lists */}
                      <div className="max-h-[140px] overflow-y-auto divide-y divide-slate-100 border border-slate-200/60 rounded-lg bg-white">
                        {(!subPurposes[selectedPurposeForDocs] || subPurposes[selectedPurposeForDocs].length === 0) ? (
                          <p className="text-center py-4 text-xs text-slate-400 font-medium">No documents assigned yet.</p>
                        ) : (
                          subPurposes[selectedPurposeForDocs].map((sp) => {
                            const isConfirming = confirmDeleteSubPurpose === sp;
                            return (
                              <div key={sp} className="flex justify-between items-center p-2 text-xs text-slate-700">
                                <span className="truncate mr-2 font-medium" title={sp}>📄 {sp}</span>
                                <div className="flex gap-1.5 items-center shrink-0">
                                  {isConfirming ? (
                                    <>
                                      <button 
                                        onClick={() => handleRemoveSubPurpose(sp)} 
                                        className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-2 py-0.5 rounded-md font-bold text-[10px] transition-colors cursor-pointer"
                                      >
                                        Bura?
                                      </button>
                                      <button 
                                        onClick={() => setConfirmDeleteSubPurpose(null)} 
                                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md font-bold text-[10px] transition-colors cursor-pointer"
                                      >
                                        X
                                      </button>
                                    </>
                                  ) : (
                                    <button 
                                      onClick={() => handleRemoveSubPurpose(sp)} 
                                      className="bg-transparent border-none text-slate-400 hover:text-rose-600 font-bold cursor-pointer hover:scale-110 transition-transform p-1"
                                    >
                                      ❌
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>

                <button id="close-settings-modal-btn" onClick={() => setShowSettingsModal(false)} className="w-full p-2.5 bg-slate-100 text-slate-700 rounded-lg font-bold text-xs hover:bg-slate-200 transition">Save Changes & Close</button>
              </div>
            </div>
          )}

          {showStaffModal && (
            <div id="staff-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-[1000] p-4 animate-fadeIn">
              <div className="bg-white p-6 rounded-2xl w-full max-w-[360px] max-h-[80vh] overflow-y-auto shadow-xl border border-slate-100">
                <h3 className="text-center text-lg font-bold text-slate-800 mb-4">👥 Pamahalaan ang Staff</h3>
                
                <form onSubmit={handleAddStaff} className="flex gap-2 mb-4">
                  <input id="new-staff-name-input" type="text" placeholder="Pangalan ng bagong staff" required value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} className="flex-1 p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
                  <button id="add-staff-btn" type="submit" className="p-2 px-3.5 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 shadow-sm transition">+</button>
                </form>

                <div className="border-t border-slate-100 pt-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Kasalukuyang Listahan:</label>
                  {assistants.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-3">Walang nakatalang staff.</p>
                  ) : (
                    <ul className="list-none p-0 m-0 divide-y divide-slate-50">
                      {assistants.map((name, index) => {
                        const isConfirming = confirmDeleteStaff === name;
                        return (
                          <li key={index} className="flex justify-between items-center py-2.5 text-sm text-slate-700">
                            <span className="font-medium">👤 {name}</span>
                            <div className="flex gap-1.5 items-center shrink-0">
                              {isConfirming ? (
                                <>
                                  <button 
                                    type="button"
                                    onClick={() => handleRemoveStaff(name)} 
                                    className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-2 py-0.5 rounded-md font-bold text-[10px] transition-colors cursor-pointer"
                                  >
                                    Bura?
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => setConfirmDeleteStaff(null)} 
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md font-bold text-[10px] transition-colors cursor-pointer"
                                  >
                                    X
                                  </button>
                                </>
                              ) : (
                                <button type="button" onClick={() => handleRemoveStaff(name)} className="bg-transparent text-slate-400 hover:text-rose-600 font-bold border-none cursor-pointer hover:scale-110 transition-transform">❌</button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <button id="close-staff-modal-btn" onClick={() => setShowStaffModal(false)} className="w-full mt-5 p-2 bg-slate-100 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-200 transition">Isara</button>
              </div>
            </div>
          )}

          {showPinModal && (
            <div id="pin-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-[1000] p-4 animate-fadeIn">
              <div className="bg-white p-6 rounded-2xl w-full max-w-[320px] shadow-xl border border-slate-100">
                <h3 className="text-center text-lg font-bold text-slate-800 mb-4">⚙️ Change Admin PIN</h3>
                <form onSubmit={handleChangePinSubmit} className="flex flex-col gap-3">
                  <input id="input-current-pin" type="password" placeholder="Current PIN" required value={pinForm.currentPin} onChange={(e) => setPinForm({...pinForm, currentPin: e.target.value})} className="p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none" />
                  <input id="input-new-pin" type="password" placeholder="New PIN" required value={pinForm.newPin} onChange={(e) => setPinForm({...pinForm, newPin: e.target.value})} className="p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none" />
                  <input id="input-confirm-pin" type="password" placeholder="Confirm New PIN" required value={pinForm.confirmPin} onChange={(e) => setPinForm({...pinForm, confirmPin: e.target.value})} className="p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none" />
                  <div className="flex gap-2 mt-2">
                    <button id="close-pin-modal-btn" type="button" onClick={() => setShowPinModal(false)} className="flex-1 p-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200 transition">Cancel</button>
                    <button id="save-pin-btn" type="submit" className="flex-1 p-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition shadow-sm">Save</button>
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
