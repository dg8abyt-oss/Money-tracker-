'use client';

import React, { useState, useEffect } from 'react';
import { getDashboardData, TimePeriod } from '@/app/dashboard-actions';
import { logout } from '@/app/actions';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { LogOut, DollarSign, Loader2, Info, Hash, ChevronDown, ChevronUp, ArrowRight, Edit2, Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#f97316', '#64748b', '#84cc16'
];

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

const PERIODS: { value: TimePeriod; label: string }[] = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '2w', label: '2 Weeks' },
  { value: '1m', label: '1 Month' },
  { value: '4m', label: '4 Months' },
  { value: '1y', label: '1 Year' },
  { value: 'all', label: 'All Time' },
];

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
};

// Custom tooltips & labels for Recharts
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg text-sm">
        <p className="font-medium text-gray-900">{payload[0].name}</p>
        <p className="text-gray-600">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [period, setPeriod] = useState<TimePeriod>('1m');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [manualBaseline, setManualBaseline] = useState<{ amount: number; date: string } | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [tempAmount, setTempAmount] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('lunchmoney_baseline');
    if (saved) {
      try {
        setManualBaseline(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse baseline', e);
      }
    }
  }, []);

  const handleSetBaseline = () => {
    const amt = parseFloat(tempAmount);
    if (isNaN(amt)) return;

    const newBaseline = {
      amount: amt,
      date: new Date().toISOString()
    };
    setManualBaseline(newBaseline);
    localStorage.setItem('lunchmoney_baseline', JSON.stringify(newBaseline));
    setIsAdjusting(false);
  };

  const handleResetBaseline = () => {
    setManualBaseline(null);
    localStorage.removeItem('lunchmoney_baseline');
  };

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const result = await getDashboardData(period);
        if (mounted) setData(result);
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load dashboard data');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, [period]);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleLogout = async () => {
    await logout();
    router.refresh();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 max-w-md w-full text-center">
          <h2 className="font-semibold text-lg mb-2">Error Loading Data</h2>
          <p className="text-sm">{error}</p>
          <button 
            onClick={() => setPeriod(period)}
            className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-red-800 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { chartData = [], currentBalance = 0, thisWeekSpend = 0, thisWeekTransactions = [] } = data || {};

  // Calculate adjusted balance if manual baseline exists
  let displayedBalance = currentBalance;
  if (manualBaseline) {
    const baselineDateStr = format(new Date(manualBaseline.date), 'yyyy-MM-dd');
    
    // Sum of transactions since baseline (expenses are positive in LM, income is negative)
    // Wait, in my LM logic: expenses are positive, income is negative.
    // So displayedBalance = Baseline - Σ(expenses) + Σ(income)?
    // No, if amount is positive in LM for expense, we SUBTRACT it from balance.
    // Adjusted = Baseline - Σ(transactions after baseline)
    const netChange = (data?.thisWeekTransactions || [])
      .filter(t => t.date >= baselineDateStr)
      .reduce((sum, t) => sum + t.amount, 0);
      
    displayedBalance = manualBaseline.amount - netChange;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg">
              <DollarSign size={20} />
            </div>
            <h1 className="font-semibold text-lg hidden sm:block">Lunch Money Dashboard</h1>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <LogOut size={16} className="mr-2" />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        
        {/* Top KPI Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left w-full sm:w-auto">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                {manualBaseline ? 'Adjusted Balance' : 'Total Cash / Current Balance'}
              </p>
              {manualBaseline && (
                <button 
                  onClick={handleResetBaseline}
                  className="text-[10px] text-red-500 hover:underline"
                >
                  (Reset to API)
                </button>
              )}
            </div>
            
            {isAdjusting ? (
              <div className="flex items-center gap-2 mt-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={tempAmount}
                    onChange={(e) => setTempAmount(e.target.value)}
                    className="pl-7 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-40 text-lg font-semibold"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
                <button 
                  onClick={handleSetBaseline}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Check size={20} />
                </button>
                <button 
                  onClick={() => setIsAdjusting(false)}
                  className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center sm:justify-start gap-4">
                <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
                  {formatCurrency(displayedBalance)}
                </h2>
                <button 
                  onClick={() => {
                    setTempAmount(displayedBalance.toFixed(2));
                    setIsAdjusting(true);
                  }}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                  title="Manual Balance adjustment"
                >
                  <Edit2 size={20} />
                </button>
              </div>
            )}
            
            {manualBaseline && (
              <p className="text-[10px] text-gray-400 mt-2">
                Baseline set as {formatCurrency(manualBaseline.amount)} on {format(new Date(manualBaseline.date), 'MMM d, h:mm a')}
              </p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                period === p.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
          {loading && <Loader2 className="animate-spin text-gray-400 ml-4" size={20} />}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col relative">
            <h3 className="font-semibold text-lg mb-6">Spending Split</h3>
            
            {chartData.length > 0 ? (
              <div className="flex-1 w-full relative min-h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={100}
                      outerRadius={140}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center Stat */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -mt-4">
                  <span className="text-sm font-medium text-gray-500 mb-1">Spent This Week</span>
                  <span className="text-2xl font-bold text-gray-900">{formatCurrency(thisWeekSpend)}</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 min-h-[350px]">
                <p>No expense data for this period.</p>
              </div>
            )}
          </div>

          {/* Transactions Table (This Week) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden max-h-[500px]">
             <div className="p-6 border-b border-gray-100 bg-gray-50/50">
               <h3 className="font-semibold text-lg">This Week&apos;s Transactions</h3>
             </div>
             
             <div className="overflow-y-auto flex-1">
               {thisWeekTransactions.length > 0 ? (
                 <table className="w-full text-sm text-left">
                   <thead className="bg-white text-gray-400 sticky top-0 border-b border-gray-100 text-xs uppercase text-left z-10">
                     <tr>
                       <th className="px-4 py-3 font-medium">Date</th>
                       <th className="px-4 py-3 font-medium">Payee / Category</th>
                       <th className="px-4 py-3 font-medium text-right">Amount</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50 text-wrap">
                     {thisWeekTransactions.map(t => (
                       <React.Fragment key={t.id}>
                       <tr 
                        onClick={() => toggleExpand(t.id)}
                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${expandedId === t.id ? 'bg-blue-50/30' : ''}`}
                       >
                         <td className="px-4 py-3 text-gray-500 whitespace-nowrap align-top">
                           {format(new Date(t.date), 'MMM d')}
                         </td>
                         <td className="px-4 py-3 align-top">
                           <div className="font-medium text-gray-900 line-clamp-1" title={t.payee}>
                             {t.payee}
                           </div>
                           <div className="text-xs text-gray-500 line-clamp-1 mt-0.5 flex items-center gap-1.5 align-middle">
                             <span>{t.category} {t.excluded && '(Excluded)'}</span>
                             {t.status && t.status !== 'cleared' && (
                               <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] uppercase font-bold tracking-wider">
                                 {t.status.replace(/_/g, ' ')}
                               </span>
                             )}
                           </div>
                         </td>
                         <td className="px-4 py-3 text-right font-medium align-top">
                           <div className="flex items-center justify-end gap-2">
                             <span className={t.amount < 0 ? 'text-green-600' : 'text-gray-900'}>
                               {formatCurrency(Math.abs(t.amount))}
                             </span>
                             <div className="text-gray-300">
                               {expandedId === t.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                             </div>
                           </div>
                         </td>
                       </tr>
                       <AnimatePresence>
                         {expandedId === t.id && (
                           <motion.tr
                             initial={{ opacity: 0, height: 0 }}
                             animate={{ opacity: 1, height: 'auto' }}
                             exit={{ opacity: 0, height: 0 }}
                             className="bg-gray-50/50"
                           >
                             <td colSpan={3} className="px-4 pb-4 pt-1">
                               <div className="grid gap-3 text-xs text-gray-600 bg-white p-3 rounded-lg border border-gray-100 shadow-inner">
                                 {t.notes && (
                                   <div className="flex items-start gap-2">
                                     <Info size={14} className="mt-0.5 text-blue-500 shrink-0" />
                                     <div>
                                       <p className="font-semibold text-gray-700 mb-0.5">Notes</p>
                                       <p className="text-gray-600">{t.notes}</p>
                                     </div>
                                   </div>
                                 )}
                                 
                                 {t.originalPayee && t.originalPayee !== t.payee && (
                                   <div className="flex items-start gap-2">
                                     <ArrowRight size={14} className="mt-0.5 text-gray-400 shrink-0" />
                                     <div>
                                       <p className="font-semibold text-gray-700 mb-0.5">Original Payee</p>
                                       <p className="text-gray-600">{t.originalPayee}</p>
                                     </div>
                                   </div>
                                 )}

                                 {t.tags && t.tags.length > 0 && (
                                   <div className="flex items-start gap-2">
                                     <Hash size={14} className="mt-0.5 text-purple-500 shrink-0" />
                                     <div>
                                       <p className="font-semibold text-gray-700 mb-0.5">Tags</p>
                                       <div className="flex flex-wrap gap-1 mt-1">
                                         {t.tags.map(tag => (
                                           <span key={tag.id} className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                                             {tag.name}
                                           </span>
                                         ))}
                                       </div>
                                     </div>
                                   </div>
                                 )}

                                 {t.status && (
                                   <div className="flex items-start gap-2">
                                     <Info size={14} className="mt-0.5 text-gray-400 shrink-0" />
                                     <div>
                                       <p className="font-semibold text-gray-700 mb-0.5">Status</p>
                                       <p className="text-gray-600 capitalize">{t.status.replace(/_/g, ' ')}</p>
                                     </div>
                                   </div>
                                 )}

                                 {!t.notes && (!t.tags || t.tags.length === 0) && (!t.originalPayee || t.originalPayee === t.payee) && !t.status && (
                                   <p className="text-gray-400 italic">No additional details available.</p>
                                 )}
                               </div>
                             </td>
                           </motion.tr>
                         )}
                       </AnimatePresence>
                       </React.Fragment>
                     ))}
                   </tbody>
                 </table>
               ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 p-8 text-center">
                    No transactions recorded this week yet.
                  </div>
               )}
             </div>
          </div>

        </div>
      </main>
    </div>
  );
}
