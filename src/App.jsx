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

  const [sessionPin, setSessionPin] = useState(() => {
    return localStorage.getItem('active_session_pin') || '';
  });

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '', confirmPin: '' });
  const [isMobile, setIsMobile] = useState(false);

  const BACKEND_URL = 'https://admin-office-backend.vercel.app'; 

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

