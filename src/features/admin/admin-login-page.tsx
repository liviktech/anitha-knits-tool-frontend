import { useState, type FormEvent, useEffect } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, EyeOff } from 'lucide-react';
import { useAuth, defaultRouteFor } from '../auth/auth-context';
import { requestOtpForLogin } from '../auth/auth-service';
import { useOtpFlow, OTP_LENGTH } from '../auth/use-otp-flow';

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { user, loginPlatformAdmin, loginPlatformAdminWithOtp } = useAuth();

  const [mode, setMode] = useState<'password' | 'otp'>('password');

  // Internal state 'mobile' for auth, but label is 'Email ID' per requirement
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  const otpFlow = useOtpFlow({
    requestOtp: (m) => requestOtpForLogin(m, 'platform-admin'),
    verifyOtp: (m, code) => loginPlatformAdminWithOtp(m, code),
  });

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

    if (!mobile.trim() && !password.trim()) {
      setError('Mobile Number and Password are required.');
      return;
    }
    if (!mobile.trim()) {
      setError('Mobile Number is required.');
      return;
    }
    if (!password.trim()) {
      setError('Password is required.');
      return;
    }

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

  async function handleOtpRequestSubmit(e: FormEvent) {
    e.preventDefault();
    await otpFlow.requestOtp();
  }

  async function handleOtpVerifySubmit(e: FormEvent) {
    e.preventDefault();
    const loggedInUser = await otpFlow.verifyOtp();
    if (loggedInUser) {
      navigate(defaultRouteFor(loggedInUser), { replace: true });
    }
  }

  function switchToOtpMode() {
    setError(null);
    otpFlow.reset();
    setMode('otp');
  }

  function switchToPasswordMode() {
    otpFlow.reset();
    setMode('password');
  }

  // Easing used for animations
  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const bannerMessage = mode === 'otp' ? (otpFlow.error ?? otpFlow.info) : error;
  const bannerIsError = mode === 'otp' ? Boolean(otpFlow.error) : Boolean(error);

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
        className="relative w-[calc(100vw-32px)] max-w-[400px] rounded-[28px] bg-white/10 border border-white/40 flex flex-col items-center px-8 py-6 z-10"
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

        {mode === 'password' ? (
          <form onSubmit={handleSubmit} className="w-full flex flex-col z-20">

            {/* Title */}
            <div className="text-center mb-8">
              <h2 className="text-white text-[32px] font-extrabold tracking-wide">Login</h2>
              <div className="mx-auto mb-4 flex flex-col items-center gap-[3px]">
                <div className="h-0.5 w-16 rounded-full bg-white/80" />
              </div>
            </div>

            {/* Inputs Wrapper */}
            <div className="relative w-full">
              {/* Error Message */}
              <div
                className={`absolute -top-9 left-0 right-0 w-full flex justify-center items-center py-1 overflow-hidden transition-all duration-300 ease-in-out ${error ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'
                  }`}
              >
                <p className="text-[15px] font-bold text-red-500 text-center">
                  {error}
                </p>
              </div>

              {/* Inputs */}
              <div
                className="w-full flex flex-col gap-6 mt-3"
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
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-8 w-full h-13 bg-white text-slate-700 font-bold text-[16px] rounded-full transition-all duration-250 flex items-center justify-center disabled:opacity-70 outline-none hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(0,0,0,0.25)] focus-visible:ring-2 focus-visible:ring-white/70"
              style={{
                opacity: mounted ? 1 : 0,
                transition: `opacity 0.5s ${ease} 0.5s, transform 250ms ease, box-shadow 250ms ease`
              }}
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>

            <div className="w-full flex items-center justify-between mt-5 px-1">
              <button
                type="button"
                onClick={switchToOtpMode}
                className="text-white/80 hover:text-white text-[13px] font-semibold underline underline-offset-2 cursor-pointer"
              >
                Login with OTP
              </button>
              <Link
                to="/admin-forgot-password"
                className="text-white/80 hover:text-white text-[13px] font-semibold underline underline-offset-2"
              >
                Forgot password?
              </Link>
            </div>
          </form>
        ) : (
          <form
            onSubmit={otpFlow.step === 'mobile' ? handleOtpRequestSubmit : handleOtpVerifySubmit}
            className="w-full flex flex-col z-20"
          >
            {/* Title */}
            <div className="text-center mb-8">
              <h2 className="text-white text-[32px] font-extrabold tracking-wide">Login</h2>
              <div className="mx-auto mb-4 flex flex-col items-center gap-[3px]">
                <div className="h-0.5 w-16 rounded-full bg-white/80" />
              </div>
            </div>

            {/* Inputs Wrapper */}
            <div className="relative w-full">
              {/* Banner */}
              <div
                className={`absolute -top-9 left-0 right-0 w-full flex justify-center items-center py-1 overflow-hidden transition-all duration-300 ease-in-out ${bannerMessage ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'
                  }`}
              >
                <p className={`text-[15px] font-bold text-center ${bannerIsError ? 'text-red-500' : 'text-emerald-300'}`}>
                  {bannerMessage}
                </p>
              </div>

              <div
                className="w-full flex flex-col gap-6 mt-3"
                style={{
                  transform: mounted ? 'translateY(0)' : 'translateY(15px)',
                  opacity: mounted ? 1 : 0,
                  transition: `transform 0.6s ${ease} 0.3s, opacity 0.6s ${ease} 0.3s`
                }}
              >
                {otpFlow.step === 'mobile' ? (
                  <div className="relative w-full flex items-center border-b border-white/50 focus-within:border-white pb-2 transition-colors duration-300">
                    <input
                      type="text"
                      placeholder="Mobile Number"
                      value={otpFlow.mobile}
                      onChange={(e) => otpFlow.setMobile(e.target.value)}
                      className="w-full bg-transparent outline-none text-white text-[16px] placeholder:text-white/80 font-medium"
                    />
                    <Mail className="w-4.5 h-4.5 text-white/80 shrink-0" strokeWidth={2} />
                  </div>
                ) : (
                  <>
                    <div className="relative w-full flex items-center border-b border-white/50 focus-within:border-white pb-2 transition-colors duration-300">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={OTP_LENGTH}
                        placeholder="Enter OTP"
                        value={otpFlow.otp}
                        onChange={(e) => otpFlow.setOtp(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-transparent outline-none text-white text-[16px] tracking-[6px] placeholder:text-white/80 placeholder:tracking-normal font-medium"
                      />
                      <Lock className="w-4.5 h-4.5 text-white/80 shrink-0" strokeWidth={2} />
                    </div>
                    <div className="w-full flex items-center justify-between px-0.5 -mt-3">
                      <span className="text-white/80 text-[13px] font-medium">
                        {otpFlow.canResend ? 'Didn’t get the code?' : `Resend in ${formatCountdown(otpFlow.secondsRemaining)}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => otpFlow.resendOtp()}
                        disabled={!otpFlow.canResend || otpFlow.isSubmitting}
                        className="text-white text-[13px] font-bold underline underline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Resend OTP
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={otpFlow.isSubmitting}
              className="mt-8 w-full h-13 bg-white text-slate-700 font-bold text-[16px] rounded-full transition-all duration-250 flex items-center justify-center disabled:opacity-70 outline-none hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(0,0,0,0.25)] focus-visible:ring-2 focus-visible:ring-white/70"
              style={{
                opacity: mounted ? 1 : 0,
                transition: `opacity 0.5s ${ease} 0.5s, transform 250ms ease, box-shadow 250ms ease`
              }}
            >
              {otpFlow.step === 'mobile'
                ? (otpFlow.isSubmitting ? 'Sending OTP...' : 'Send OTP')
                : (otpFlow.isSubmitting ? 'Verifying...' : 'Verify & Login')}
            </button>

            <div className="w-full flex items-center justify-between mt-5 px-1">
              <button
                type="button"
                onClick={switchToPasswordMode}
                className="text-white/80 hover:text-white text-[13px] font-semibold underline underline-offset-2 cursor-pointer"
              >
                Login with Password
              </button>
              {otpFlow.step === 'otp' && (
                <button
                  type="button"
                  onClick={otpFlow.backToMobile}
                  className="text-white/80 hover:text-white text-[13px] font-semibold underline underline-offset-2 cursor-pointer"
                >
                  Change number
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
