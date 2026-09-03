import { useState, type FormEvent, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Mail, Lock, EyeOff } from 'lucide-react';
import { useAuth, defaultRouteFor } from '../auth/auth-context';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { user, loginPlatformAdmin } = useAuth();

  // Internal state 'mobile' for auth, but label is 'Email ID' per requirement
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger animations on mount
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (user) {
    return <Navigate to={defaultRouteFor(user)} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const loggedInUser = await loginPlatformAdmin(mobile, password);
      navigate(defaultRouteFor(loggedInUser), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Easing used for animations
  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans"
      style={{
        backgroundImage: "url('/admin-login.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: mounted ? 1 : 0,
        transition: `opacity 1.2s ${ease}`
      }}
    >
      {/* Subtle vignette overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_20%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />

      {/* Login Card */}
      <div
        className="relative w-[calc(100vw-32px)] md:w-100 rounded-[28px] bg-white/10 border border-white/40 flex flex-col items-center px-8 py-9 z-10"
        style={{
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.3)',
          transform: mounted ? 'translateY(0)' : 'translateY(25px)',
          opacity: mounted ? 1 : 0,
          transition: `transform 0.8s ${ease} 0.1s, opacity 0.8s ${ease} 0.1s`
        }}
      >
        {/* Symmetric top/bottom glass highlight bulges */}
        <div className="absolute inset-0 overflow-hidden rounded-[28px] pointer-events-none">
          <div className="absolute -top-[35%] left-1/2 -translate-x-1/2 w-[140%] h-[70%] rounded-[50%] bg-gradient-to-b from-white/25 via-white/5 to-transparent" />
          <div className="absolute -bottom-[35%] left-1/2 -translate-x-1/2 w-[140%] h-[70%] rounded-[50%] bg-gradient-to-t from-white/25 via-white/5 to-transparent" />
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col z-20">

          {/* Title */}
          <div className="text-center mb-8">
            <h2 className="text-white text-[32px] font-extrabold tracking-wide">Login</h2>
            <div className="mx-auto mt-2 flex flex-col items-center gap-[3px]">
              <div className="h-0.5 w-16 rounded-full bg-white/80" />
              <div className="h-px w-16 rounded-full bg-black/20" />
            </div>
          </div>

          {/* Inputs */}
          <div
            className="w-full flex flex-col gap-6"
            style={{
              transform: mounted ? 'translateY(0)' : 'translateY(15px)',
              opacity: mounted ? 1 : 0,
              transition: `transform 0.6s ${ease} 0.3s, opacity 0.6s ${ease} 0.3s`
            }}
          >
            {/* Email/Mobile Field */}
            <div className="relative w-full flex items-center border-b border-white/50 focus-within:border-white pb-2 transition-colors duration-300">
              <input
                type="text"
                placeholder="Mobile Number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full bg-transparent outline-none text-white text-[16px] placeholder:text-white/80 font-medium"
                required
              />
              <Mail className="w-4.5 h-4.5 text-white/80 shrink-0" strokeWidth={2} />
            </div>

            {/* Password Field */}
            <div className="relative w-full flex items-center border-b border-white/50 focus-within:border-white pb-2 transition-colors duration-300">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent outline-none pr-2 text-white text-[16px] placeholder:text-white/80 font-medium"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-white/80 hover:text-white focus:outline-none transition-colors shrink-0"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4.5 h-4.5" strokeWidth={2} />
                ) : (
                  <Lock className="w-4.5 h-4.5" strokeWidth={2} />
                )}
              </button>
            </div>
          </div>

          {/* Remember me & Forgot Password */}
          <div
            className="flex items-center justify-between mt-6 mb-7"
            style={{
              opacity: mounted ? 1 : 0,
              transition: `opacity 0.6s ${ease} 0.4s`
            }}
          >
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative flex items-center justify-center w-4 h-4 rounded border border-white/70 bg-white/10 group-hover:bg-white/20 transition-colors">
                <input type="checkbox" defaultChecked className="opacity-0 absolute inset-0 cursor-pointer peer" />
                <svg className="w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7.5L6 10.5L11 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-white/90 text-[13px] font-medium tracking-wide">Remember me</span>
            </label>
            <a href="#" className="text-white/90 text-[13px] font-medium tracking-wide hover:text-white transition-colors">Forgot Password?</a>
          </div>

          {error && (
            <p className="text-[13px] font-medium text-red-100 text-center mb-3 bg-red-900/50 py-1.5 rounded-[6px] backdrop-blur-md">{error}</p>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-13 bg-white text-slate-700 font-bold text-[16px] rounded-full transition-all duration-250 flex items-center justify-center disabled:opacity-70 outline-none hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(0,0,0,0.25)] focus-visible:ring-2 focus-visible:ring-white/70"
            style={{
              opacity: mounted ? 1 : 0,
              transition: `opacity 0.5s ${ease} 0.5s, transform 250ms ease, box-shadow 250ms ease`
            }}
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>

          {/* Register */}
          <p
            className="text-center text-white/80 text-[13px] font-medium tracking-wide mt-6"
            style={{
              opacity: mounted ? 1 : 0,
              transition: `opacity 0.6s ${ease} 0.55s`
            }}
          >
            Don&apos;t have an account? <span className="text-white font-bold">Register</span>
          </p>
        </form>
      </div>
    </div>
  );
}
