import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusCircle, Trash2, DollarSign, TrendingUp, TrendingDown, Sparkles, PieChart as PieIcon, Download, Filter, LogOut } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import API from './api/axios';
import Auth from './components/Auth';

ChartJS.register(ArcElement, Tooltip, Legend);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('expense');
  const [loadingAi, setLoadingAi] = useState(false);

  // Filter States
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      fetchTransactions();
    }
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await API.get('/transactions');
      setTransactions(res.data);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    setIsAuthenticated(false);
  };

  // AI Auto-detect
  const handleAiCategorize = async () => {
    if (!title) {
      alert('Please enter a title first!');
      return;
    }
    try {
      setLoadingAi(true);
      const res = await API.post('/ai-categorize', { title });
      if (res.data.category) setCategory(res.data.category);
      if (res.data.type) setType(res.data.type);
    } catch (err) {
      console.error('AI categorization failed:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !amount || !category) return;

    const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();

    try {
      const newTx = { title, amount: Number(amount), category: formattedCategory, type };
      await API.post('/transactions', newTx);
      setTitle('');
      setAmount('');
      setCategory('');
      fetchTransactions();
    } catch (err) {
      console.error('Error adding transaction:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/transactions/${id}`);
      fetchTransactions();
    } catch (err) {
      console.error('Error deleting transaction:', err);
    }
  };

  // Month Filtered Transactions for Summary & Chart
  const monthFilteredTransactions = transactions.filter(t => {
    if (selectedMonth === 'all') return true;
    const tDate = new Date(t.date);
    const tMonth = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
    return tMonth === selectedMonth;
  });

  const totalIncome = monthFilteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = monthFilteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // Chart Data & Category Wise Totals
  const expenseCategories = {};
  monthFilteredTransactions.filter(t => t.type === 'expense').forEach(t => {
    expenseCategories[t.category] = (expenseCategories[t.category] || 0) + t.amount;
  });

  const chartData = {
    labels: Object.keys(expenseCategories),
    datasets: [
      {
        data: Object.values(expenseCategories),
        backgroundColor: ['#38bdf8', '#818cf8', '#f43f5e', '#22c55e', '#eab308', '#a855f7'],
      },
    ],
  };

  // History table & PDF filter (Month + Category)
  const filteredTransactions = monthFilteredTransactions.filter(t => {
    const matchesCategory = filterCategory === 'all' || t.category.toLowerCase() === filterCategory.toLowerCase();
    return matchesCategory;
  });

  // Export to PDF function
  const exportPDF = () => {
    const doc = new jsPDF();

    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, 210, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Finance Tracker', 14, 22);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 196, 22, { align: 'right' });

    doc.setFillColor(241, 245, 249); 
    doc.roundedRect(14, 43, 182, 22, 3, 3, 'F');

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('Net Balance', 24, 50);
    doc.text('Total Income', 85, 50);
    doc.text('Total Expense', 146, 50);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`LKR ${balance.toLocaleString()}`, 24, 58);
    
    doc.setTextColor(34, 197, 94); 
    doc.text(`LKR ${totalIncome.toLocaleString()}`, 85, 58);
    
    doc.setTextColor(239, 68, 68); 
    doc.text(`LKR ${totalExpense.toLocaleString()}`, 146, 58);

    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Category-wise Expense Summary', 14, 75);

    const catSummaryRows = Object.entries(expenseCategories).map(([cat, amt]) => [
      cat,
      `LKR ${amt.toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: 80,
      head: [['Category', 'Total Expense (LKR)']],
      body: catSummaryRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      tableWidth: 100
    });

    const finalY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Transaction Details', 14, finalY);

    const tableColumn = ["Title", "Category", "Type", "Amount (LKR)", "Date"];
    const tableRows = [];

    filteredTransactions.forEach(t => {
      tableRows.push([
        t.title,
        t.category,
        t.type.toUpperCase(),
        `${t.type === 'income' ? '+' : '-'} LKR ${t.amount.toLocaleString()}`,
        new Date(t.date).toLocaleDateString()
      ]);
    });

    autoTable(doc, {
      startY: finalY + 5,
      head: [tableColumn],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: [51, 65, 85], fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 3: { fontStyle: 'bold' } }
    });

    doc.save('finance-report.pdf');
  };

  const uniqueMonths = [...new Set(transactions.map(t => {
    const d = new Date(t.date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }))];

  const uniqueCategories = [...new Set(transactions.map(t => t.category))];

  if (!isAuthenticated) {
    return <Auth onLoginSuccess={() => { setIsAuthenticated(true); fetchTransactions(); }} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', fontFamily: 'Inter, sans-serif', padding: '30px 20px' }}>
      <div style={{ maxWidth: '950px', margin: '0 auto' }}>
        
        {/* Header with Logout */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px', paddingTop: '10px' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 'bold', margin: 0, lineHeight: '1.3', background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              AI Finance Tracker 💡
            </h1>
            <p style={{ color: '#94a3b8', margin: '5px 0 0 0' }}>Logged in as: {localStorage.getItem('email')}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={exportPDF}
              style={{ background: 'linear-gradient(to right, #38bdf8, #6366f1)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}
            >
              <Download size={16} /> Export PDF
            </button>
            <button 
              onClick={handleLogout}
              style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div style={{ background: '#1e293b', padding: '15px 20px', borderRadius: '12px', display: 'flex', gap: '20px', marginBottom: '25px', alignItems: 'center', flexWrap: 'wrap', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: 'bold' }}>
            <Filter size={18} /> Filters:
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8', marginRight: '8px' }}>Month:</label>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', background: '#0f172a', color: '#fff', border: '1px solid #334155' }}
            >
              <option value="all">All Months</option>
              {uniqueMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8', marginRight: '8px' }}>Category:</label>
            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', background: '#0f172a', color: '#fff', border: '1px solid #334155' }}
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #38bdf8' }}>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>Net Balance</p>
            <h3 style={{ fontSize: '1.8rem', margin: '5px 0 0 0' }}>LKR {balance.toLocaleString()}</h3>
          </div>
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #22c55e' }}>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>Total Income</p>
            <h3 style={{ fontSize: '1.8rem', margin: '5px 0 0 0', color: '#22c55e' }}>LKR {totalIncome.toLocaleString()}</h3>
          </div>
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #ef4444' }}>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.9rem' }}>Total Expense</p>
            <h3 style={{ fontSize: '1.8rem', margin: '5px 0 0 0', color: '#ef4444' }}>LKR {totalExpense.toLocaleString()}</h3>
          </div>
        </div>

        {/* Main Grid: Form & Chart */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px', marginBottom: '30px' }}>
          
          {/* Form */}
          <form onSubmit={handleSubmit} style={{ background: '#1e293b', padding: '25px', borderRadius: '16px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PlusCircle color="#38bdf8" /> Add Transaction
            </h3>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '5px' }}>Description / Title</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  placeholder="e.g., Grocery shopping, Salary" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} 
                  required 
                />
                <button 
                  type="button" 
                  onClick={handleAiCategorize} 
                  style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '0 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}
                >
                  <Sparkles size={16} /> {loadingAi ? 'AI...' : 'AI Fill'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '5px' }}>Amount (LKR)</label>
              <input 
                type="number" 
                placeholder="2500" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', boxSizing: 'border-box' }} 
                required 
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '5px' }}>Category</label>
              <input 
                type="text" 
                placeholder="Food, Transport, Salary..." 
                value={category} 
                onChange={(e) => setCategory(e.target.value)} 
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', boxSizing: 'border-box' }} 
                required 
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '5px'}}>Type</label>
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value)} 
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', boxSizing: 'border-box' }}
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <button type="submit" style={{ width: '100%', padding: '14px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
              Save Transaction
            </button>
          </form>

          {/* Chart Section */}
          <div style={{ background: '#1e293b', padding: '25px', borderRadius: '16px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieIcon color="#38bdf8" /> Expense Breakdown
            </h3>
            
            {Object.keys(expenseCategories).length === 0 ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: '50px' }}>No expense data available for filter.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ width: '170px', height: '170px', margin: '0 auto', marginBottom: '5px' }}>
                  <Pie data={chartData} options={{ plugins: { legend: { display: false } } }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.entries(expenseCategories).map(([cat, amt], index) => {
                    const colors = ['#38bdf8', '#818cf8', '#f43f5e', '#22c55e', '#eab308', '#a855f7'];
                    const colorCode = colors[index % colors.length];
                    const percentage = totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0;

                    return (
                      <div key={cat} style={{ background: '#0f172a', padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colorCode }}></span>
                            <span style={{ fontWeight: '500', color: '#f8fafc' }}>{cat}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>({percentage}%)</span>
                            <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>LKR {amt.toLocaleString()}</span>
                          </div>
                        </div>
                        <div style={{ width: '100%', height: '5px', background: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: colorCode, borderRadius: '3px' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Transactions History */}
        <div style={{ background: '#1e293b', padding: '25px', borderRadius: '16px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Transaction History</h3>
          {filteredTransactions.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No transactions found matching filters.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {filteredTransactions.map((t) => (
                <li key={t._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', marginBottom: '10px', background: '#0f172a', borderRadius: '10px', border: '1px solid #334155' }}>
                  <div>
                    <strong style={{ fontSize: '1.05rem' }}>{t.title}</strong>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '3px' }}>
                      <span style={{ background: '#334155', padding: '2px 8px', borderRadius: '4px', marginRight: '8px' }}>{t.category}</span>
                      <span>{new Date(t.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ color: t.type === 'income' ? '#22c55e' : '#ef4444', fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {t.type === 'income' ? '+' : '-'} LKR {t.amount.toLocaleString()}
                    </span>
                    <button onClick={() => handleDelete(t._id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px' }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}

export default App;