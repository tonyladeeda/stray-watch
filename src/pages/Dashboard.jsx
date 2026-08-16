import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Activity, MapPin, Bookmark, Bell, CheckCircle2 } from 'lucide-react';

export default function Dashboard() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ reported: 0, rescued: 0, adopted: 0 });
  const [reports, setReports] = useState([]);
  const [saved, setSaved] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchDashboardData(session.user.id);
    });
  }, []);

  const fetchDashboardData = async (userId) => {
    setLoading(true);

    const { data: myReports } = await supabase
      .from('sightings')
      .select('*, animal:animals(status)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const { data: myHandled } = await supabase
      .from('animals')
      .select('status')
      .eq('handler_id', userId);

    const { data: mySaved } = await supabase
      .from('follows')
      .select('animal_id, animals(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const { data: myNotifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (myReports) setReports(myReports);
    if (mySaved) setSaved(mySaved.map(f => f.animals));
    if (myNotifs) setNotifications(myNotifs);

    const reportedCount = myReports ? myReports.length : 0;
    const rescuedCount = myHandled ? myHandled.filter(a => ['Rescued', 'In-care', 'Fostered'].includes(a.status)).length : 0;
    const adoptedCount = myHandled ? myHandled.filter(a => a.status === 'Adopted').length : 0;

    setStats({ reported: reportedCount, rescued: rescuedCount, adopted: adoptedCount });
    setLoading(false);
  };

  const markAsRead = async (notifId) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
    setNotifications(notifications.map(n => n.id === notifId ? { ...n, is_read: true } : n));
  };

  if (!session) return <div className="p-4 text-center mt-10 font-bold text-slate-500">Please sign in to view your dashboard.</div>;
  if (loading) return <div className="p-4 text-center mt-10 font-bold text-slate-500">Loading dashboard...</div>;

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">My Dashboard</h2>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
          <Activity size={24} className="text-blue-600 mb-2" />
          <span className="text-2xl font-black text-slate-800">{stats.reported}</span>
          <span className="text-xs font-bold text-slate-500 uppercase">Reported</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
          <CheckCircle2 size={24} className="text-amber-500 mb-2" />
          <span className="text-2xl font-black text-slate-800">{stats.rescued}</span>
          <span className="text-xs font-bold text-slate-500 uppercase">Rescued</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
          <MapPin size={24} className="text-emerald-500 mb-2" />
          <span className="text-2xl font-black text-slate-800">{stats.adopted}</span>
          <span className="text-xs font-bold text-slate-500 uppercase">Adopted</span>
        </div>
      </div>

      <div>
        <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Bell size={18} /> Notifications</h3>
        {notifications.length === 0 ? (
           <p className="text-sm text-slate-500 italic">No new notifications.</p>
        ) : (
          <div className="space-y-2">
            {notifications.map(notif => (
              <div key={notif.id} onClick={() => !notif.is_read && markAsRead(notif.id)} className={`p-3 rounded-xl border ${notif.is_read ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-blue-50 border-blue-100 cursor-pointer'}`}>
                <h4 className="text-sm font-bold text-slate-800">{notif.title}</h4>
                <p className="text-xs text-slate-600 mt-1">{notif.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Bookmark size={18} /> Saved Animals</h3>
        {saved.length === 0 ? (
           <p className="text-sm text-slate-500 italic">You haven't saved any animals yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {saved.map(animal => (
              <Link key={animal.id} to={`/animal/${animal.id}`} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden block">
                <div className="p-3">
                  <p className="font-bold text-slate-800 text-sm">{animal.type || 'Unknown'}</p>
                  <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold inline-block mt-1">{animal.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><MapPin size={18} /> My Reports</h3>
        {reports.length === 0 ? (
           <p className="text-sm text-slate-500 italic">You haven't reported any animals yet.</p>
        ) : (
          <div className="space-y-3">
            {reports.map(report => (
              <Link key={report.id} to={`/animal/${report.animal_id}`} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex gap-3">
                {report.image_url && <img src={report.image_url} alt="Report" className="w-16 h-16 rounded-lg object-cover" />}
                <div>
                  <p className="font-bold text-slate-800 text-sm">{report.location}</p>
                  <span className="text-xs text-slate-500">{new Date(report.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}