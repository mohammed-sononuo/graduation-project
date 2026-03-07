import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isAdmin } from '../utils/permissions';
import { getAdminUsers, getColleges, getCommunities, assignDeanToCollege, assignSupervisorToCommunity } from '../api';

export default function AdminAssignments() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [deans, setDeans] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [busy, setBusy] = useState({});

  useEffect(() => {
    if (loading) return;
    if (!user || !isAdmin(user)) {
      navigate('/login', { replace: true });
      return;
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || !isAdmin(user)) return;
    getAdminUsers('dean').then((list) => setDeans(Array.isArray(list) ? list : [])).catch(() => setDeans([]));
    getAdminUsers('supervisor').then((list) => setSupervisors(Array.isArray(list) ? list : [])).catch(() => setSupervisors([]));
    getColleges().then((list) => setColleges(Array.isArray(list) ? list : [])).catch(() => setColleges([]));
    getCommunities().then((list) => setCommunities(Array.isArray(list) ? list : [])).catch(() => setCommunities([]));
  }, [user]);

  const onAssignDean = (userId, collegeId) => {
    if (collegeId === '' || collegeId == null) return;
    setBusy((b) => ({ ...b, [`dean-${userId}`]: true }));
    assignDeanToCollege(userId, Number(collegeId))
      .then(() => {
        setDeans((prev) => prev.map((d) => (d.id === userId ? { ...d, collegeId: Number(collegeId), collegeName: colleges.find((c) => c.id === Number(collegeId))?.name } : d)));
      })
      .catch(() => {})
      .finally(() => setBusy((b) => ({ ...b, [`dean-${userId}`]: false })));
  };

  const onAssignSupervisor = (userId, communityId) => {
    if (communityId === '' || communityId == null) return;
    setBusy((b) => ({ ...b, [`sup-${userId}`]: true }));
    assignSupervisorToCommunity(userId, Number(communityId))
      .then(() => {
        setSupervisors((prev) => prev.map((s) => (s.id === userId ? { ...s, communityId: Number(communityId), communityName: communities.find((c) => c.id === Number(communityId))?.name } : s)));
      })
      .catch(() => {})
      .finally(() => setBusy((b) => ({ ...b, [`sup-${userId}`]: false })));
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f6f3]">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-slate-900">
      <section className="bg-[#0b2d52] border-b border-[#0b2d52]/80">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6">
          <Link to="/admin" className="text-sm text-white/80 hover:text-white">← Admin Portal</Link>
          <h1 className="mt-2 text-2xl font-semibold text-white" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>
            Dean & Supervisor assignments
          </h1>
          <p className="mt-1 text-sm text-white/80">One dean per college; one supervisor per community.</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 lg:px-10 py-8 space-y-10">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-800">Deans (assign to college)</h2>
            <p className="text-xs text-slate-500 mt-0.5">Each college can have only one dean.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {deans.length === 0 ? (
              <div className="p-6 text-slate-500 text-sm">No users with role Dean.</div>
            ) : (
              deans.map((d) => (
                <div key={d.id} className="p-4 flex flex-wrap items-center gap-3">
                  <span className="font-medium text-slate-900">{d.email}</span>
                  <span className="text-sm text-slate-500">{d.collegeName ? `→ ${d.collegeName}` : 'Not assigned'}</span>
                  <select
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                    value={d.collegeId ?? ''}
                    onChange={(e) => onAssignDean(d.id, e.target.value)}
                    disabled={busy[`dean-${d.id}`]}
                  >
                    <option value="">Select college</option>
                    {colleges.map((c) => (
                      <option key={c.id} value={String(c.id)}>{c.name}</option>
                    ))}
                  </select>
                  {busy[`dean-${d.id}`] && <span className="text-xs text-slate-400">Saving…</span>}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-800">Supervisors (assign to community)</h2>
            <p className="text-xs text-slate-500 mt-0.5">Each community can have only one supervisor.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {supervisors.length === 0 ? (
              <div className="p-6 text-slate-500 text-sm">No users with role Supervisor.</div>
            ) : (
              supervisors.map((s) => (
                <div key={s.id} className="p-4 flex flex-wrap items-center gap-3">
                  <span className="font-medium text-slate-900">{s.email}</span>
                  <span className="text-sm text-slate-500">{s.communityName ? `→ ${s.communityName}` : 'Not assigned'}</span>
                  <select
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
                    value={s.communityId ?? ''}
                    onChange={(e) => onAssignSupervisor(s.id, e.target.value)}
                    disabled={busy[`sup-${s.id}`]}
                  >
                    <option value="">Select community</option>
                    {communities.map((c) => (
                      <option key={c.id} value={String(c.id)}>{c.name}{c.collegeName ? ` (${c.collegeName})` : ''}</option>
                    ))}
                  </select>
                  {busy[`sup-${s.id}`] && <span className="text-xs text-slate-400">Saving…</span>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
