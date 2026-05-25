import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Globe2 } from 'lucide-react';
import { motion } from 'motion/react';
import GlobeGL from 'globe.gl';
import { DESTINATIONS } from '@/data/destinations';
interface GlobePoint {
  lat: number;
  lng: number;
  label: string;
  country: string;
  flag: string;
  unis: number;
}

const GLOBE_POINTS: GlobePoint[] = DESTINATIONS.map(d => ({
  lat: d.globeCoords.lat,
  lng: d.globeCoords.lng,
  label: d.country,
  country: d.country,
  flag: d.flag,
  unis: d.universitiesCount,
}));

// Arc lines from India to each destination
const INDIA = { lat: 20.5937, lng: 78.9629 };
const ARCS = GLOBE_POINTS.map(p => ({
  startLat: INDIA.lat, startLng: INDIA.lng,
  endLat: p.lat, endLng: p.lng,
  color: ['rgba(253,126,20,0.9)', 'rgba(255,193,7,0.6)'],
}));

export function GlobeSection() {
  const globeRef = useRef<HTMLDivElement>(null);
  const [globeLoaded, setGlobeLoaded] = useState(false);
  const [activePoint, setActivePoint] = useState<GlobePoint | null>(null);
  const globeInstanceRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function initGlobe() {
      if (!globeRef.current) return;
      try {
        if (cancelled || !globeRef.current) return;

        const width  = globeRef.current.clientWidth  || 600;
        const height = globeRef.current.clientHeight || 600;

        const globe = GlobeGL()(globeRef.current)
          .width(width)
          .height(height)
          .backgroundColor('rgba(0,0,0,0)')
          .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
          .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
          // Points
          .pointsData(GLOBE_POINTS)
          .pointLat('lat')
          .pointLng('lng')
          .pointColor(() => '#FD7E14')
          .pointAltitude(0.02)
          .pointRadius(0.5)
          .pointLabel((d: any) => `<div style="background:rgba(26,26,26,0.95);color:white;padding:8px 12px;border-radius:10px;font-size:13px;font-weight:600;border:1px solid rgba(253,126,20,0.4)">${d.flag} ${d.label}<br/><span style="color:#FD7E14;font-size:11px">${d.unis} universities</span></div>`)
          .onPointClick((point: any) => setActivePoint(point as GlobePoint))
          // Arcs
          .arcsData(ARCS)
          .arcStartLat('startLat').arcStartLng('startLng')
          .arcEndLat('endLat').arcEndLng('endLng')
          .arcColor('color')
          .arcAltitude(0.25)
          .arcStroke(0.5)
          .arcDashLength(0.4)
          .arcDashGap(0.2)
          .arcDashAnimateTime(2500)
          // Auto-rotate
          .enablePointerInteraction(true);

        globe.controls().autoRotate = true;
        globe.controls().autoRotateSpeed = 0.5;
        globe.controls().enableZoom = false;

        // Start at India
        globe.pointOfView({ lat: 20, lng: 78, altitude: 2.2 }, 0);

        globeInstanceRef.current = globe;
        setGlobeLoaded(true);
      } catch (e) {
        console.warn('Globe.GL failed to load:', e);
        setGlobeLoaded(false);
      }
    }

    initGlobe();
    return () => { cancelled = true; };
  }, []);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (globeInstanceRef.current && globeRef.current) {
        globeInstanceRef.current
          .width(globeRef.current.clientWidth)
          .height(globeRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <section className="py-0 bg-[#0A0A0A] relative overflow-hidden min-h-[90vh] flex items-center">
      {/* Background */}
      <div className="absolute inset-0 line-grid opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-transparent to-[#0A0A0A]" />

      {/* Glow orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#FD7E14]/5 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-20">

          {/* Left text panel */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FD7E14]/15 border border-[#FD7E14]/30 mb-6">
              <Globe2 className="w-4 h-4 text-[#FD7E14]" />
              <span className="text-sm text-[#FD7E14] font-semibold">We're Everywhere Your Future Is</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              From New Delhi to London.
              <br />
              <span className="text-gradient-orange">From Mumbai to Toronto.</span>
            </h2>

            <p className="text-lg text-white/60 mb-8 leading-relaxed">
              Global Avenues connects students from South Asia to the world's top universities across 40+ countries and 6 continents. Click any glowing dot to explore.
            </p>

            {/* Live counter */}
            <div className="flex items-center gap-6 mb-8">
              {[
                { value: '40+', label: 'Countries' },
                { value: '6',   label: 'Continents' },
                { value: '100+', label: 'Universities' },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <div className="text-3xl font-black text-[#FD7E14]">{item.value}</div>
                  <div className="text-xs text-white/50 mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>

            <Link
              to="/destinations"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#FD7E14] to-[#C94D1B] text-white rounded-xl font-bold shadow-[0_8px_32px_rgba(253,126,20,0.4)] hover:shadow-[0_12px_48px_rgba(253,126,20,0.6)] hover:scale-105 transition-all"
            >
              Explore All Destinations <ArrowRight className="w-5 h-5" />
            </Link>

            {/* Active point info */}
            {activePoint && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-white/8 rounded-2xl border border-[#FD7E14]/20 backdrop-blur-md"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{activePoint.flag}</span>
                  <div>
                    <div className="font-bold text-white">{activePoint.country}</div>
                    <div className="text-sm text-[#FD7E14]">{activePoint.unis} partner universities</div>
                  </div>
                  <Link
                    to={`/destinations/${activePoint.country.toLowerCase().replace(/ /g, '-')}`}
                    className="ml-auto flex items-center gap-1 text-xs text-[#FD7E14] font-semibold hover:underline"
                  >
                    Explore <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Globe */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="relative flex items-center justify-center"
          >
            {/* Glow ring behind globe */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[500px] h-[500px] rounded-full bg-[#FD7E14]/8 blur-3xl animate-pulse" />
            </div>

            <div
              ref={globeRef}
              className="w-full aspect-square max-w-[600px] relative z-10"
              style={{ minHeight: '400px' }}
            />

            {/* Fallback if globe doesn't load */}
            {!globeLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 rounded-full border-2 border-[#FD7E14]/30 flex items-center justify-center animate-spin-slow">
                  <Globe2 className="w-24 h-24 text-[#FD7E14]/40" />
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
