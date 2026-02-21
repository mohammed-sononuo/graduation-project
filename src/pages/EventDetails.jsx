import { Link, useParams } from 'react-router-dom';
import { EVENTS } from '../data/events';

function EventDetails() {
  const { id } = useParams();
  const event = EVENTS.find((e) => e.id === id);

  if (!event) {
    return (
      <div className="min-h-[60vh] bg-[#f7f6f3] flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h1 className="font-serif text-2xl font-semibold text-slate-900">
            Event not found
          </h1>
          <p className="mt-2 text-slate-600">
            The event you are looking for may have been moved or removed.
          </p>
          <Link
            to="/events"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-[#00356b] px-6 py-3 text-white font-semibold hover:bg-[#002a54] transition-colors"
          >
            ← Back to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-slate-900">
      <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
        <nav className="text-sm text-slate-600 mb-6" aria-label="Breadcrumb">
          <Link to="/events" className="hover:text-[#00356b] hover:underline">
            Events
          </Link>
          <span className="mx-2 text-slate-300" aria-hidden>
            ›
          </span>
          <span className="text-slate-800 font-semibold">{event.title}</span>
        </nav>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="relative aspect-[16/6] bg-slate-100">
            <img
              src={event.image}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0b2d52]/75 via-[#0b2d52]/35 to-transparent" aria-hidden />
            <div className="absolute left-6 bottom-6 right-6">
              <span className="inline-flex rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-[#00356b] backdrop-blur">
                {event.category}
              </span>
              <h1 className="mt-3 font-serif text-3xl md:text-4xl font-semibold text-white leading-tight">
                {event.title}
              </h1>
              <p className="mt-2 text-white/85 max-w-2xl">
                {event.description}
              </p>
            </div>
          </div>

          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <h2 className="font-serif text-xl font-semibold text-slate-900">
                About this event
              </h2>
              <p className="mt-3 text-slate-600 leading-relaxed">
                {event.description}
              </p>

              <div className="mt-6 rounded-xl border border-slate-200 bg-[#fbfbfa] p-5">
                <h3 className="text-sm font-semibold text-slate-800">
                  What you’ll gain
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600 list-disc pl-5">
                  <li>Academic insights from faculty and guest speakers</li>
                  <li>Networking with students, researchers, and partners</li>
                  <li>Practical takeaways and resources</li>
                </ul>
              </div>
            </div>

            <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800">
                Event details
              </h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-slate-500">Date</dt>
                  <dd className="font-semibold text-slate-800">{event.date}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Time</dt>
                  <dd className="font-semibold text-slate-800">{event.time}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Location</dt>
                  <dd className="font-semibold text-slate-800">{event.location}</dd>
                </div>
              </dl>

              <Link
                to="/events"
                className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#00356b] hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00356b]/30"
              >
                Back to all events
              </Link>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventDetails;
