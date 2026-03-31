import { LaunchButton } from '@/components/landing/LaunchButton';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { HeroChatDemo } from '@/components/landing/HeroChatDemo';
import { Particles } from '@/components/ui/particles';
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text';
import { BlurFade } from '@/components/ui/blur-fade';
import { BorderBeam } from '@/components/ui/border-beam';

const FEATURES = [
  {
    beamDelay: 0,
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
      </svg>
    ),
    title: 'Intelligent Discovery',
    desc: 'Our neural engine understands your taste profile, finding rare gems and luxury items across the entire decentralized web.',
  },
  {
    beamDelay: 2,
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
      </svg>
    ),
    title: 'Seamless Web3 Checkout',
    desc: 'No more complex transactions. Experience one-click USDC payments with sub-second finality powered by Mantle.',
  },
  {
    beamDelay: 4,
    icon: (
      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
      </svg>
    ),
    title: 'Personalized Curation',
    desc: 'Your assistant learns from your style and history, curating a bespoke digital boutique tailored exclusively for you.',
  },
];

export default function LandingPage() {
  return (
    <div className="antialiased overflow-x-hidden" style={{ backgroundColor: '#050505', color: '#ffffff' }}>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-brand-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg sm:text-xl leading-none">C</span>
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight">Sterio</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <a className="hover:text-white transition-colors" href="#features">Features</a>
            <a className="hover:text-white transition-colors" href="#how-it-works">How it Works</a>
            <a className="hover:text-white transition-colors" href="#footer">Contact</a>
          </div>
          <LaunchButton className="bg-brand-primary hover:bg-brand-primary/90 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-brand-primary/20">
            Launch App
          </LaunchButton>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section
        id="hero"
        className="relative min-h-screen flex items-center pt-14 sm:pt-20 overflow-hidden"
        style={{ background: '#050505' }}
      >
        <Particles quantity={60} color="#a78bfa" ease={80} />

        <div className="absolute top-1/3 -left-32 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(91,77,244,0.18) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full blur-[120px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(91,77,244,0.08) 0%, transparent 70%)' }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-8 lg:gap-16 items-center w-full py-10 lg:py-0">
          <div className="z-10 text-center lg:text-left">

            <BlurFade delay={0}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-primary/30 bg-brand-primary/5 text-brand-primary text-xs font-bold uppercase tracking-wider mb-5 sm:mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary" />
                </span>
                <AnimatedShinyText className="text-brand-primary" shimmerWidth={120}>
                  Next Gen AI Shopping
                </AnimatedShinyText>
              </div>
            </BlurFade>

            <BlurFade delay={0.1}>
              <h1 className="text-[2.5rem] sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] tracking-tight mb-6 sm:mb-8">
                Your AI{' '}
                <span
                  className="purple-glow-text"
                  style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 600 }}
                >
                  Concierge
                </span>
                <br className="hidden lg:block" />
                {' '}for the Decentralized World
              </h1>
            </BlurFade>

            <BlurFade delay={0.2}>
              <p className="text-gray-400 text-[0.9375rem] sm:text-lg lg:text-xl max-w-xl mb-8 sm:mb-10 leading-relaxed mx-auto lg:mx-0">
                Experience the future of luxury commerce. Intelligent discovery meets seamless one-click USDC checkout on the high-performance Mantle network.
              </p>
            </BlurFade>

            <BlurFade delay={0.3}>
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 justify-center lg:justify-start">
                <LaunchButton className="w-full sm:w-auto bg-brand-primary hover:bg-brand-primary/90 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-full text-sm sm:text-base font-bold transition-all transform hover:scale-105">
                  Launch App
                </LaunchButton>
                <a
                  href="#features"
                  className="w-full sm:w-auto border border-white/10 hover:bg-white/5 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-full text-sm sm:text-base font-bold transition-all text-center"
                >
                  Explore Features
                </a>
              </div>
            </BlurFade>
          </div>

          <div className="flex justify-center items-center py-6 lg:py-0">
            <HeroChatDemo />
          </div>
        </div>
      </section>

      {/* Glowing divider */}
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(91,77,244,0.6) 50%, transparent 100%)' }} />

      {/* ─── FEATURES ─── */}
      <section
        id="features"
        className="relative py-16 sm:py-28 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0b0b20 0%, #0d0d1c 40%, #090914 100%)' }}
      >
        <div className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(91,77,244,0.14) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #a78bfa 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-20 px-4 sm:px-6">
            <p className="text-brand-primary text-xs font-bold uppercase tracking-[0.2em] mb-3 sm:mb-4">What We Offer</p>
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-3 sm:mb-4">Elevated Shopping Experience</h2>
            <p className="text-gray-400 text-base sm:text-lg">Curated by AI, secured by the blockchain.</p>
          </div>

          {/* Cards: horizontal scroll on mobile, grid on desktop */}
          <div className="flex sm:grid sm:grid-cols-3 gap-4 sm:gap-8 overflow-x-auto snap-x snap-mandatory pb-4 sm:pb-0 px-4 sm:px-6 landing-feature-scroll">
            {FEATURES.map((card) => (
              <div
                key={card.title}
                className="relative landing-glass-card p-5 sm:p-8 rounded-3xl overflow-hidden group hover:border-brand-primary/50 transition-colors flex-none w-[82vw] sm:w-auto snap-center"
              >
                <BorderBeam size={200} duration={12} delay={card.beamDelay} />
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-primary/10 border border-brand-primary/20 rounded-xl flex items-center justify-center mb-6 sm:mb-8 group-hover:bg-brand-primary/20 transition-all">
                  {card.icon}
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">{card.title}</h3>
                <p className="text-gray-400 leading-relaxed text-sm sm:text-base">{card.desc}</p>
              </div>
            ))}
          </div>

          {/* Scroll indicator dots — mobile only */}
          <div className="flex justify-center gap-1.5 mt-5 sm:hidden">
            {FEATURES.map((card) => (
              <div key={card.title} className="w-1.5 h-1.5 rounded-full bg-white/20 first:bg-brand-primary/60" />
            ))}
          </div>
        </div>
      </section>

      {/* Glowing divider */}
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(91,77,244,0.35) 50%, transparent 100%)' }} />

      {/* ─── HOW IT WORKS ─── */}
      <section
        id="how-it-works"
        className="relative py-16 sm:py-28 overflow-hidden"
        style={{ background: '#000000' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-72 blur-[120px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(91,77,244,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-8 w-64 h-64 rounded-full blur-[90px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(91,77,244,0.07) 0%, transparent 70%)' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-20">
            <p className="text-brand-primary text-xs font-bold uppercase tracking-[0.2em] mb-3 sm:mb-4">The Process</p>
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-3 sm:mb-4">The Sterio Journey</h2>
            <p className="text-gray-400 text-base sm:text-lg">Luxury shopping redefined in three elegant steps.</p>
          </div>

          <HowItWorks />
        </div>
      </section>

      {/* Subtle divider */}
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 50%, transparent 100%)' }} />

      {/* ─── FOOTER ─── */}
      <footer
        id="footer"
        className="pt-16 sm:pt-24 pb-10 sm:pb-12"
        style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12 mb-12 sm:mb-16">
            <div className="col-span-2 sm:col-span-2 lg:col-span-1 space-y-4 sm:space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-brand-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg sm:text-xl leading-none">C</span>
                </div>
                <span className="text-lg sm:text-xl font-bold tracking-tight">Sterio</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                Pioneering the intersection of artificial intelligence and decentralized finance to create the world&apos;s most sophisticated shopping experience.
              </p>
              <div className="flex gap-4">
                <a className="text-gray-400 hover:text-white transition-colors" href="#">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                </a>
                <a className="text-gray-400 hover:text-white transition-colors" href="#">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <h5 className="text-white font-bold mb-4 sm:mb-6 text-sm sm:text-base">Product</h5>
              <ul className="space-y-3 sm:space-y-4 text-sm text-gray-400">
                <li><a className="hover:text-white transition-colors" href="#how-it-works">How it Works</a></li>
                <li><a className="hover:text-white transition-colors" href="#features">Features</a></li>
                <li><a className="hover:text-white transition-colors" href="#">Pricing</a></li>
                <li><a className="hover:text-white transition-colors" href="#">API Docs</a></li>
              </ul>
            </div>

            <div>
              <h5 className="text-white font-bold mb-4 sm:mb-6 text-sm sm:text-base">Company</h5>
              <ul className="space-y-3 sm:space-y-4 text-sm text-gray-400">
                <li><a className="hover:text-white transition-colors" href="#">Security</a></li>
                <li><a className="hover:text-white transition-colors" href="#">Privacy Policy</a></li>
                <li><a className="hover:text-white transition-colors" href="#">Terms of Service</a></li>
                <li><a className="hover:text-white transition-colors" href="#">Contact</a></li>
              </ul>
            </div>

            <div className="col-span-2 sm:col-span-2 lg:col-span-1">
              <h5 className="text-white font-bold mb-4 sm:mb-6 text-sm sm:text-base">Stay Ahead</h5>
              <p className="text-sm text-gray-400 mb-4 sm:mb-6">Join our newsletter for exclusive drops and AI insights.</p>
              <div className="relative">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-full py-3 px-5 text-sm focus:outline-none focus:border-brand-primary/50 transition-colors text-white placeholder-gray-500"
                  placeholder="Enter your email"
                  type="email"
                />
                <button className="absolute right-1 top-1 bottom-1 bg-brand-primary hover:bg-brand-primary/90 text-white px-4 sm:px-5 rounded-full text-sm font-semibold transition-all">
                  Join
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center pt-8 sm:pt-12 border-t border-white/5 text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold gap-3 sm:gap-0">
            <p>© 2026 Sterio LABS. ALL RIGHTS RESERVED.</p>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              MANTLE MAINNET LIVE
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
