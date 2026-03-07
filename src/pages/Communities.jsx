import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isAdmin, isDean, isSupervisor, isCommunityLeader } from '../utils/permissions';
import { getCommunities, getColleges } from '../api';

export default function Communities() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [communities, setCommunities] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [collegeFilter, setCollegeFilter] = useState('');
  const admin = isAdmin(user);
  const dean = isDean(user);
  const supervisor = isSupervisor(user);
  const communityLeader = isCommunityLeader(user);
  const canAccess = admin || dean || supervisor || communityLeader;

  useEffect(() => {
    if (loading) return;
    if (!canAccess) {
      navigate('/login', { replace: true });
      return;
    }
  }, [user, loading, canAccess, navigate]);

  useEffect(() => {
    if (!canAccess) return;
    const collegeId = admin && collegeFilter ? collegeFilter : null;
    getCommunities(collegeId)
      .then((list) => setCommunities(Array.isArray(list) ? list : []))
      .catch(() => setCommunities([]));
  }, [canAccess, admin, collegeFilter]);

  useEffect(() => {
    if (!admin) return;
    getColleges()
      .then((list) => setColleges(Array.isArray(list) ? list : []))
      .catch(() => setColleges([]));
  }, [admin]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f6f3]">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  if (!canAccess) return null;

  const title = supervisor || communityLeader
    ? 'Your community'
    : dean
      ? "Communities in your college"
      : 'Communities';

  const subTitle = dean && user.collegeName
    ? user.collegeName
    : (supervisor || communityLeader) && user.communityName
      ? user.communityName
      : admin
        ? 'All communities by college'
        : null;

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-slate-900">
      <section className="bg-[#0b2d52] border-b border-[#0b2d52]/80">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-white/60" style={{ fontFamily: "'EB Garamond', serif" }}>
            An-Najah National University
          </p>
          <h1 className="mt-2 text-2xl md:text-[1.75rem] font-semibold text-white tracking-tight" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>
            {title}
          </h1>
          {subTitle && <p className="mt-1 text-sm text-white/80">{subTitle}</p>}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
        {admin && (
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <label className="text-sm font-medium text-slate-700">Filter by college</label>
            <select
              value={collegeFilter}
              onChange={(e) => setCollegeFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-[#00356b]/30 focus:border-[#00356b]"
            >
              <option value="">All colleges</option>
              {colleges.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {communities.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            {supervisor ? 'You are not assigned to a community yet. Contact an administrator.' : dean ? 'No communities in your college.' : 'No communities found.'}
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {communities.map((c) => (
              <li key={c.id}>
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-slate-900" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>
                    {c.name}
                  </h3>
                  {c.collegeName && <p className="mt-1 text-sm text-slate-500">{c.collegeName}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
