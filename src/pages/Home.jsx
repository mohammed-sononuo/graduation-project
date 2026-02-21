import { Link } from 'react-router-dom';
import EventsCarousel from '../components/EventsCarousel';

const HERO_IMAGE = '/hero-campus.png';

function Home() {
  return (
    <div className="text-gray-900">
      {/* Hero Section — academic, calm */}
      <section className="relative flex h-screen min-h-[400px] w-full items-end">
        <div className="absolute inset-0 z-0">
          <img
            alt="An-Najah National University campus"
            src={HERO_IMAGE}
            className="h-full w-full object-cover"
            style={{ filter: 'brightness(0.97) contrast(1.05)' }}
          />
          {/* Bottom gradient for text area */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(11,45,82,0.08) 0%, rgba(11,45,82,0.25) 40%, rgba(30,50,70,0.6) 100%)',
            }}
            aria-hidden
          />
          {/* Left-to-right dark gradient: stronger on left (text side), transparent on right */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to right, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.18) 45%, transparent 75%)',
            }}
            aria-hidden
          />
        </div>

        <div className="relative z-10 w-full max-w-screen-2xl mx-auto px-6 pb-28 md:pb-36 text-left">
          <div className="max-w-2xl">
            <h1
              className="text-white"
              style={{
                fontFamily: "'EB Garamond', serif",
                fontSize: 'clamp(2.25rem, 5.5vw, 4rem)',
                fontWeight: 500,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                textShadow: '0 1px 2px rgba(0,0,0,0.25), 0 2px 12px rgba(0,0,0,0.2)',
              }}
            >
              <span className="block font-medium">Empowering Your</span>
              <span className="block font-normal tracking-tight">Academic Journey</span>
            </h1>

            <p
              className="mt-6 max-w-xl text-white/95 leading-[1.6]"
              style={{
                fontFamily: "'EB Garamond', serif",
                fontSize: 'clamp(1rem, 1.4vw, 1.15rem)',
                fontWeight: 400,
                fontStyle: 'italic',
                textShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            >
              A tradition of excellence in the heart of academic discovery, fostering
              the leaders of tomorrow through innovation and heritage.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/majors"
                className="inline-block rounded px-8 py-3 text-[#0b2d52] no-underline transition-all duration-200 hover:opacity-95 shadow-sm"
                style={{
                  fontFamily: "'EB Garamond', serif",
                  fontSize: '18px',
                  fontWeight: 500,
                  background: '#fff',
                }}
              >
                Explore Programs
              </Link>
              <Link
                to="/events"
                className="inline-block rounded border border-white/80 bg-white/5 px-8 py-3 text-white no-underline transition-all duration-200 hover:bg-white/15 backdrop-blur-sm"
                style={{
                  fontFamily: "'EB Garamond', serif",
                  fontSize: '18px',
                  fontWeight: 500,
                }}
              >
                Show All Events
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Events Section ── */}
      <section style={{ background: '#f5f3ee' }} className="py-20">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-10">

          {/* Section header — academic serif */}
          <div className="flex items-end justify-between border-b border-slate-200 pb-6 mb-10">
            <div>
              <p
                className="mb-1 text-slate-500"
                style={{ fontFamily: "'EB Garamond', serif", fontSize: '0.875rem', fontWeight: 400 }}
              >
                University Calendar
              </p>
              <h2
                className="text-[#0b2d52]"
                style={{ fontFamily: "'EB Garamond', serif", fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 600, lineHeight: 1.2 }}
              >
                Upcoming Events
              </h2>
            </div>
            <Link
              to="/events"
              className="hidden sm:inline-flex items-center gap-2 text-[#0b2d52] hover:opacity-80 transition-opacity"
              style={{ fontFamily: "'EB Garamond', serif", fontSize: '0.9375rem', fontWeight: 500 }}
            >
              View All Events
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>

          <EventsCarousel />

          {/* Mobile view all */}
          <div className="sm:hidden mt-8 text-center">
            <Link
              to="/events"
              className="inline-block rounded border border-[#0b2d52] px-8 py-3 text-[#0b2d52] no-underline transition-colors hover:bg-[#0b2d52] hover:text-white"
              style={{ fontFamily: "'EB Garamond', serif", fontSize: '0.9375rem', fontWeight: 500 }}
            >
              View All Events
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;