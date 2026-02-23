import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getManagedEvents } from "../data/managedEvents";

// Mock analytics for dashboard (in a real app this would come from an API)
const MOCK_KPIS = {
  averageRating: 4.8,
  totalReviews: 1240,
  sentimentScore: 88,
  responseRate: 64.5,
  attendeesForRate: 1021,
  ratingChange: "+0.2%",
  reviewsChange: "+12% vs LY",
};

const MOCK_POSITIVE_KEYWORDS = [
  { label: "Well-organized", count: 398 },
  { label: "Insightful", count: 398 },
  { label: "Great Catering", count: 398 },
  { label: "Networking", count: 398 },
  { label: "Expert Speakers", count: 398 },
];

const MOCK_IMPROVEMENT_AREAS = [
  { label: "Long Lines", count: 195 },
  { label: "Audio Quality", count: 99 },
  { label: "Crowded", count: 97 },
  { label: "Parking", count: 76 },
  { label: "Technical Issues", count: 42 },
];

const MOCK_REVIEWS = [
  { id: 1, name: "Ahmed Khan", role: "Computer Science, Senior", text: "One of the best career fairs I've attended. The variety of companies and the quality of discussions were outstanding. Highly recommend for anyone looking for internships or full-time roles.", date: "Oct 24, 2023", rating: 5 },
  { id: 2, name: "Layla Mahmoud", role: "Business Administration, Junior", text: "Great opportunity to network and learn about different industries. The workshops were particularly helpful. Would love to see more tech companies next year.", date: "Oct 24, 2023", rating: 5 },
  { id: 3, name: "Sara Jaber", role: "Engineering, Senior", text: "Very well organized event. The recruiters were approachable and gave valuable feedback. The only downside was the long lines at peak hours.", date: "Oct 24, 2023", rating: 5 },
  { id: 4, name: "Omar Hassan", role: "Medicine, Senior", text: "Excellent speakers and very insightful sessions. Catering was great. Only suggestion is to improve the audio in the main hall.", date: "Oct 23, 2023", rating: 5 },
  { id: 5, name: "Noor Ali", role: "Arts & Sciences, Junior", text: "Loved the diversity of employers. Parking was a bit of a challenge but overall a very positive experience.", date: "Oct 23, 2023", rating: 4 },
];

const REVIEWS_PER_PAGE = 3;

function StarRating({ value, max = 5 }) {
  return (
    <div className="flex gap-0.5" aria-label={`Rating: ${value} out of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <svg key={i} className={`w-5 h-5 ${i < value ? "text-amber-400" : "text-slate-200"}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [reviewsShown, setReviewsShown] = useState(REVIEWS_PER_PAGE);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      const u = stored ? JSON.parse(stored) : null;
      if (!u || u.role !== "admin") {
        navigate("/login", { replace: true });
        return;
      }
      setUser(u);
    } catch {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const list = getManagedEvents();
    setEvents(list.filter((e) => e.status === "approved"));
    if (list.filter((e) => e.status === "approved").length > 0 && !selectedEventId) {
      setSelectedEventId(list.filter((e) => e.status === "approved")[0]?.id ?? null);
    }
  }, []);

  const selectedEvent = events.find((e) => e.id === selectedEventId) || events[0];

  const formatEventDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const visibleReviews = MOCK_REVIEWS.slice(0, reviewsShown);
  const hasMoreReviews = reviewsShown < MOCK_REVIEWS.length;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f6f3]">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-slate-900">
      {/* Breadcrumb — same pattern as Event Approval */}
      <section className="bg-[#f7f6f3] pt-6 pb-2">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-10">
          <nav className="text-sm" aria-label="Breadcrumb">
            <Link to="/admin" className="text-slate-500 hover:text-slate-700 transition-colors">
              Admin Portal
            </Link>
            <span className="mx-2 text-slate-400" aria-hidden>&gt;</span>
            <span className="font-semibold text-[#00356b]">Dashboard</span>
          </nav>
        </div>
      </section>

      {/* Title block — Event Approval / Admin Portal pattern: centered */}
      <section className="bg-[#f7f6f3] pt-10 pb-6">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-10">
          <div className="text-center max-w-2xl mx-auto mb-6">
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-[#0b2d52] leading-tight tracking-tight mb-4" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>
              Event Performance Analysis
            </h1>
            <p className="text-slate-600 leading-relaxed">
              Analytical insights based on student feedback.
            </p>
          </div>
          {selectedEvent && (
            <div className="flex justify-center">
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 min-w-0 max-w-md w-full relative inline-block">
                <span className="absolute top-3 right-3 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
                  Completed
                </span>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Event name</p>
                <p className="font-semibold text-slate-800 pr-20">{selectedEvent.title}</p>
                <p className="mt-1 text-sm text-slate-500">Date: {formatEventDate(selectedEvent.startDate)}</p>
                {events.length > 1 && (
                  <select
                    value={selectedEventId || ""}
                    onChange={(e) => setSelectedEventId(e.target.value || null)}
                    className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00356b]/20 focus:border-[#00356b]"
                  >
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>{ev.title}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 py-8">
        {/* KPI cards — project card style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden p-5 hover:border-slate-300 transition-colors">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Average rating</p>
            <p className="text-2xl font-bold text-[#0b2d52]" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>{MOCK_KPIS.averageRating}/5.0</p>
            <div className="mt-2 flex items-center gap-2">
              <StarRating value={Math.round(MOCK_KPIS.averageRating)} />
              <span className="text-xs text-emerald-600 font-medium">{MOCK_KPIS.ratingChange}</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden p-5 hover:border-slate-300 transition-colors">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Total reviews</p>
            <p className="text-2xl font-bold text-[#0b2d52]" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>{MOCK_KPIS.totalReviews.toLocaleString()}</p>
            <span className="text-xs text-emerald-600 font-medium">{MOCK_KPIS.reviewsChange}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden p-5 hover:border-slate-300 transition-colors">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Sentiment score</p>
            <p className="text-2xl font-bold text-[#0b2d52]" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>{MOCK_KPIS.sentimentScore}%</p>
            <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-[#00356b]" style={{ width: `${MOCK_KPIS.sentimentScore}%` }} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden p-5 hover:border-slate-300 transition-colors">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Response rate</p>
            <p className="text-2xl font-bold text-[#0b2d52]" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>{MOCK_KPIS.responseRate}%</p>
            <p className="text-xs text-slate-500 mt-0.5">Based on {MOCK_KPIS.attendeesForRate.toLocaleString()} attendees</p>
          </div>
        </div>

        {/* Keywords & Improvement areas — project card style */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden p-6 hover:border-slate-300 transition-colors">
            <h2 className="font-semibold text-[#0b2d52] flex items-center gap-2 mb-4" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>
              <span className="w-1 h-5 rounded-full bg-emerald-500 shrink-0" aria-hidden />
              Common positive keywords
            </h2>
            <div className="flex flex-wrap gap-2">
              {MOCK_POSITIVE_KEYWORDS.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5 rounded-lg bg-[#00356b]/10 px-3 py-1.5 text-sm font-medium text-[#00356b]">
                  {item.label} <span className="text-[#00356b]/80">{item.count}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden p-6 hover:border-slate-300 transition-colors">
            <h2 className="font-semibold text-[#0b2d52] flex items-center gap-2 mb-4" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>
              <span className="w-1 h-5 rounded-full bg-red-500 shrink-0" aria-hidden />
              Areas for improvement
            </h2>
            <div className="flex flex-wrap gap-2">
              {MOCK_IMPROVEMENT_AREAS.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800">
                  {item.label} <span className="text-red-600">{item.count}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Recent student reviews — project card style */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden p-6 hover:border-slate-300 transition-colors">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 className="font-semibold text-[#0b2d52]" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>
              Recent student reviews
            </h2>
            <p className="text-sm text-slate-500">Showing {visibleReviews.length} of {MOCK_KPIS.totalReviews.toLocaleString()}</p>
          </div>
          <ul className="space-y-4">
            {visibleReviews.map((review) => (
              <li key={review.id} className="flex gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#00356b] text-white flex items-center justify-center text-sm font-semibold">
                  {review.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#0b2d52]">{review.name}</p>
                  <p className="text-sm text-slate-500">{review.role}</p>
                  <p className="mt-2 text-slate-700">"{review.text}"</p>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Posted {review.date}</p>
                </div>
                <div className="flex-shrink-0 self-start">
                  <StarRating value={review.rating} />
                </div>
              </li>
            ))}
          </ul>
          {hasMoreReviews && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setReviewsShown((n) => n + REVIEWS_PER_PAGE)}
                className="rounded-full bg-[#00356b] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#002a54] focus:outline-none focus:ring-2 focus:ring-[#00356b]/40 focus:ring-offset-2 transition-colors"
              >
                Load more reviews
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
