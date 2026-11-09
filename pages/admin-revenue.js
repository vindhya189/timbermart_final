// pages/admin-revenue.js - Admin Revenue Dashboard - Neat & Clear
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function AdminRevenue() {
  const [payments, setPayments] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All Time');
  const [planFilter, setPlanFilter] = useState('All Plans');

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: p } = await supabase.from('payments').select('*').eq('status', 'success').order('created_at', { ascending: false });
    const { data: s } = await supabase.from('subscriptions').select('*').order('created_at', { ascending: false });
    setPayments(p || []);
    setSubs(s || []);
    setLoading(false);
  };

  const filteredPayments = useMemo(() => {
    let out = [...payments];
    const now = new Date();
    if (filter === 'Today') out = out.filter(x => new Date(x.created_at).toDateString() === now.toDateString());
    if (filter === 'This Week') out = out.filter(x => (now - new Date(x.created_at)) / (1000 * 60 * 60 * 24) <= 7);
    if (filter === 'This Month') out = out.filter(x => new Date(x.created_at).getMonth() === now.getMonth() && new Date(x.created_at).getFullYear() === now.getFullYear());
    if (planFilter !== 'All Plans') out = out.filter(x => x.plan === planFilter);
    return out;
  }, [payments, filter, planFilter]);

  const totalRevenue = filteredPayments.reduce((sum, x) => sum + (Number(x.amount) || 0), 0);
  const totalSubs = filter === 'All Time' && planFilter === 'All Plans' ? subs.length : filteredPayments.length;
  const activeSubs = subs.filter(s => s.status === 'active' && new Date(s.end_date) > new Date()).length;
  const expiredSubs = subs.filter(s => new Date(s.end_date) < new Date()).length;

  const todayRevenue = payments.filter(x => new Date(x.created_at).toDateString() === new Date().toDateString()).reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const monthRevenue = payments.filter(x => new Date(x.created_at).getMonth() === new Date().getMonth()).reduce((s, x) => s + (Number(x.amount) || 0), 0);

  const planStats = useMemo(() => {
    const map = {};
    payments.forEach(x => { const k = x.plan || 'Unknown'; if (!map[k]) map[k] = { count: 0, revenue: 0 }; map[k].count++; map[k].revenue += Number(x.amount) || 0; });
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue);
  }, [payments]);

  const monthWise = useMemo(() => {
    const map = {};
    payments.forEach(x => { const d = new Date(x.created_at); const k = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }); if (!map[k]) map[k] = 0; map[k] += Number(x.amount) || 0; });
    return Object.entries(map).slice(-6);
  }, [payments]);

  const maxMonth = Math.max(...monthWise.map(([, v]) => v), 1);

  return (
    <div className="min-h-screen bg-[#f6f6f6] flex justify-center"><div className="w-full max-w-[480px] pb-6 min-h-screen">
      <div className="bg-black text-white px-4 py-3 flex justify-between items-center sticky top-0 z-20">
        <Link href="/admin" className="text-[12px] font-bold">← ADMIN</Link>
        <p className="font-black text-[14px]">💰 REVENUE</p>
        <button onClick={load} className="bg-white text-black px-3 py-1 rounded-full text-[11px] font-bold">Refresh</button>
      </div>

      <div className="px-4 pt-4">
        {loading ? <p className="text-center text-gray-500 text-[13px] mt-10">Loading revenue...</p> : <>

          {/* TOP CARDS - MAIN NUMBERS */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-600 text-white rounded-[18px] p-4">
              <p className="text-[11px] opacity-80">Total Revenue</p>
              <p className="font-black text-[24px] mt-1">₹{totalRevenue.toLocaleString('en-IN')}</p>
              <p className="text-[10px] opacity-80 mt-1">{filter} • {planFilter}</p>
            </div>
            <div className="bg-black text-white rounded-[18px] p-4">
              <p className="text-[11px] opacity-80">Total Subscribers</p>
              <p className="font-black text-[24px] mt-1">{totalSubs}</p>
              <p className="text-[10px] text-green-400 mt-1">● {activeSubs} Active • {expiredSubs} Expired</p>
            </div>
            <div className="bg-white rounded-[18px] p-3 border">
              <p className="text-[11px] text-gray-500">Today Revenue</p>
              <p className="font-black text-[16px]">₹{todayRevenue.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white rounded-[18px] p-3 border">
              <p className="text-[11px] text-gray-500">This Month Revenue</p>
              <p className="font-black text-[16px]">₹{monthRevenue.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* FILTERS */}
          <div className="flex gap-2 mt-4">
            <select value={filter} onChange={e => setFilter(e.target.value)} className="flex-1 border rounded-full px-3 py-2.5 text-[12px] bg-white outline-none">
              <option>All Time</option><option>Today</option><option>This Week</option><option>This Month</option>
            </select>
            <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} className="flex-1 border rounded-full px-3 py-2.5 text-[12px] bg-white outline-none">
              <option>All Plans</option><option>Premium Listing</option><option>Carpenter Pro</option><option>Business - 10 Listings</option>
            </select>
          </div>

          {/* PLAN WISE BREAKDOWN */}
          <p className="font-black text-[13px] mt-5 mb-2">Plan Wise Breakdown</p>
          <div className="bg-white rounded-[18px] border overflow-hidden">
            {planStats.length === 0 && <p className="p-4 text-[12px] text-gray-500 text-center">No payments yet</p>}
            {planStats.map(([name, v]) => (
              <div key={name} className="flex justify-between items-center px-4 py-3 border-b last:border-0">
                <div><p className="font-bold text-[12px]">{name}</p><p className="text-[10px] text-gray-500">{v.count} subscribers</p></div>
                <div className="text-right"><p className="font-black text-[13px]">₹{v.revenue.toLocaleString('en-IN')}</p><div className="w-[80px] bg-[#f2f2f2] rounded-full h-1.5 mt-1 overflow-hidden"><div className="bg-green-500 h-full rounded-full" style={{ width: `${totalRevenue ? (v.revenue / totalRevenue) * 100 : 0}%` }}></div></div></div>
              </div>
            ))}
          </div>

          {/* MONTHLY CHART - SIMPLE BAR */}
          <p className="font-black text-[13px] mt-5 mb-2">Monthly Revenue - Last 6 Months</p>
          <div className="bg-white rounded-[18px] border p-4">
            {monthWise.length === 0 && <p className="text-[12px] text-gray-500 text-center">No data</p>}
            <div className="flex items-end gap-3 h-[100px]">
              {monthWise.map(([m, v]) => (
                <div key={m} className="flex-1 flex flex-col items-center justify-end h-full">
                  <p className="text-[10px] font-bold">₹{v}</p>
                  <div className="w-full bg-green-500 rounded-t-md" style={{ height: `${(v / maxMonth) * 70}px`, minHeight: v > 0 ? '8px' : '0px' }}></div>
                  <p className="text-[9px] text-gray-500 mt-1">{m}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RECENT PAYMENTS - FULL LIST */}
          <p className="font-black text-[13px] mt-5 mb-2">Recent Payments ({filteredPayments.length})</p>
          <div className="space-y-2">
            {filteredPayments.slice(0, 50).map(p => (
              <div key={p.id} className="bg-white rounded-[16px] border p-3 flex justify-between items-center">
                <div>
                  <p className="font-bold text-[12px]">{p.plan}</p>
                  <p className="text-[10px] text-gray-500">📞 {p.phone} • {p.payment_id?.slice(0, 14)}</p>
                  <p className="text-[10px] text-gray-400">{new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} • {new Date(p.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="text-right shrink-0"><p className="font-black text-[13px] text-green-600">+ ₹{Number(p.amount).toLocaleString('en-IN')}</p><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[9px] font-bold">SUCCESS</span></div>
              </div>
            ))}
            {filteredPayments.length === 0 && <p className="text-center text-gray-500 text-[12px] bg-white rounded-[16px] border p-6">No payments for this filter.<br />First payment vasthe ikkada kanipistundi.</p>}
          </div>

          {/* ALL SUBSCRIBERS LIST */}
          <p className="font-black text-[13px] mt-5 mb-2">All Subscribers List</p>
          <div className="bg-white rounded-[18px] border overflow-hidden">
            {subs.slice(0, 50).map(s => (
              <div key={s.id} className="flex justify-between px-4 py-3 border-b last:border-0">
                <div><p className="font-bold text-[12px]">📞 {s.phone}</p><p className="text-[10px] text-gray-500">{s.plan_name} • Till {s.end_date ? new Date(s.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</p></div>
                <span className={`px-2 py-1 rounded-full text-[9px] font-bold h-fit ${new Date(s.end_date) > new Date() ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{new Date(s.end_date) > new Date() ? 'ACTIVE' : 'EXPIRED'}</span>
              </div>
            ))}
            {subs.length === 0 && <p className="p-4 text-[12px] text-gray-500 text-center">No subscribers yet</p>}
          </div>

        </>}
      </div>
    </div></div>
  );
}