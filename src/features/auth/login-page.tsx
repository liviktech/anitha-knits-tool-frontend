import { useState, type FormEvent, useEffect } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth, defaultRouteFor } from './auth-context';
import { requestOtpForLogin } from './auth-service';
import { useOtpFlow, OTP_LENGTH } from './use-otp-flow';

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { user, loginCompanyUser, loginCompanyUserWithOtp } = useAuth();

  const [mode, setMode] = useState<'password' | 'otp'>('password');

  // Internal state 'mobile' for auth, but label is 'Email ID' per requirement
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  const otpFlow = useOtpFlow({
    requestOtp: (m) => requestOtpForLogin(m, 'company'),
    verifyOtp: (m, code) => loginCompanyUserWithOtp(m, code),
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
      const loggedInUser = await loginCompanyUser(mobile, password);
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
        backgroundImage: "url('/login.png')",
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
        className="relative w-[calc(100vw-32px)] max-w-[420px] pb-5 rounded-[24px] bg-white/10 border-[2px] border-white/75 flex flex-col items-center px-6 z-10"
        style={{
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
          transform: mounted ? 'translateY(0)' : 'translateY(25px)',
          opacity: mounted ? 1 : 0,
          transition: `transform 0.8s ${ease} 0.1s, opacity 0.8s ${ease} 0.1s`
        }}
      >
        {/* Diagonal Glass Reflection */}
        <div className="absolute inset-0 overflow-hidden rounded-[22px] pointer-events-none">
          <div className="absolute -top-[60%] -right-[60%] w-[200%] h-[200%] bg-gradient-to-bl from-white/10 via-white/5 to-transparent rotate-[-40deg] blur-[2px]" />
        </div>

        {/* User Icon Top */}
        <div
          className="absolute -top-[55px] w-[110px] h-[110px] rounded-full bg-[#071711] border-[2px] border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.4)] flex items-center justify-center z-20 group"
          style={{
            transform: mounted ? 'scale(1)' : 'scale(0.85)',
            opacity: mounted ? 1 : 0,
            transition: `transform 0.7s ${ease} 0.2s, opacity 0.7s ${ease} 0.2s`
          }}
        >
          <User className="w-12 h-12 text-white stroke-[1.5] transition-transform duration-300 group-hover:scale-105" />
        </div>

        {mode === 'password' ? (
          <form onSubmit={handleSubmit} className="w-full mt-[90px] flex flex-col z-20">

            {/* Inputs Wrapper */}
            <div className="relative w-full mt-2.5">
              {/* Error Message */}
              <div
                className={`absolute -top-9 left-0 right-0 w-full flex justify-center items-center border border-red-500 bg-red-100 py-1 overflow-hidden transition-all duration-300 ease-in-out ${error ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'
                  }`}
              >
                <p className="text-[15px] font-bold text-red-500 text-center">
                  {error}
                </p>
              </div>

              {/* Inputs */}
              <div
                className="w-full flex flex-col gap-[18px] mt-2.5"
                style={{
                  transform: mounted ? 'translateY(0)' : 'translateY(15px)',
                  opacity: mounted ? 1 : 0,
                  transition: `transform 0.6s ${ease} 0.3s, opacity 0.6s ${ease} 0.3s`
                }}
              >
                {/* Email Field */}
                <div className="relative w-full h-[56px] bg-[#F5F5F5] rounded-[8px] flex items-center overflow-hidden focus-within:ring-2 focus-within:ring-white/60 focus-within:shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all duration-300">
                  <div className="h-full w-[54px] bg-[#E5E5E5] flex items-center justify-center shrink-0 border-r border-[#D4D4D4] transition-colors duration-300">
                    <User className="w-[20px] h-[20px] text-gray-500" strokeWidth={2} />
                  </div>
                  <input
                    type="text"
                    placeholder="Mobile Number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full h-full bg-transparent outline-none px-4 text-gray-700 text-[16px] placeholder:text-gray-400 font-medium"
                  />
                </div>

                {/* Password Field */}
                <div className="relative w-full h-[56px] bg-[#F5F5F5] rounded-[8px] flex items-center overflow-hidden focus-within:ring-2 focus-within:ring-white/60 focus-within:shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all duration-300">
                  <div className="h-full w-[54px] bg-[#E5E5E5] flex items-center justify-center shrink-0 border-r border-[#D4D4D4] transition-colors duration-300">
                    <Lock className="w-[20px] h-[20px] text-gray-500" strokeWidth={2} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-full bg-transparent outline-none pl-4 pr-12 text-gray-700 text-[16px] placeholder:text-gray-400 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-[20px] h-[20px]" strokeWidth={2} />
                    ) : (
                      <Eye className="w-[20px] h-[20px]" strokeWidth={2} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-[56px] mt-3 bg-[#053b2a] text-white tracking-[3px] font-bold text-[15px] rounded-[2px] transition-all duration-250 flex items-center justify-center disabled:opacity-70 outline-none hover:bg-[#074733] hover:-translate-y-[2px] hover:shadow-[0_4px_15px_rgba(5,59,42,0.4)] focus-visible:ring-2 focus-visible:ring-white/50 cursor-pointer"
              style={{
                opacity: mounted ? 1 : 0,
                transition: `opacity 0.5s ${ease} 0.5s, transform 250ms ease, background-color 250ms ease, box-shadow 250ms ease`
              }}
            >
              {isSubmitting ? 'LOGGING IN...' : 'LOGIN'}
            </button>

            <div className="w-full flex items-center justify-between mt-4 px-0.5">
              <button
                type="button"
                onClick={switchToOtpMode}
                className="text-white/80 hover:text-white text-[13px] font-semibold underline underline-offset-2 cursor-pointer"
              >
                Login with OTP
              </button>
              <Link
                to="/forgot-password"
                className="text-white/80 hover:text-white text-[13px] font-semibold underline underline-offset-2"
              >
                Forgot password?
              </Link>
            </div>
          </form>
        ) : (
          <form
            onSubmit={otpFlow.step === 'mobile' ? handleOtpRequestSubmit : handleOtpVerifySubmit}
            className="w-full mt-[90px] flex flex-col z-20"
          >
            {/* Inputs Wrapper */}
            <div className="relative w-full mt-2.5">
              {/* Banner */}
              <div
                className={`absolute -top-9 left-0 right-0 w-full flex justify-center items-center border py-1 overflow-hidden transition-all duration-300 ease-in-out ${bannerMessage ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'
                  } ${bannerIsError ? 'border-red-500 bg-red-100' : 'border-emerald-500 bg-emerald-50'}`}
              >
                <p className={`text-[15px] font-bold text-center ${bannerIsError ? 'text-red-500' : 'text-emerald-700'}`}>
                  {bannerMessage}
                </p>
              </div>

              <div
                className="w-full flex flex-col gap-[18px] mt-2.5"
                style={{
                  transform: mounted ? 'translateY(0)' : 'translateY(15px)',
                  opacity: mounted ? 1 : 0,
                  transition: `transform 0.6s ${ease} 0.3s, opacity 0.6s ${ease} 0.3s`
                }}
              >
                {otpFlow.step === 'mobile' ? (
                  <div className="relative w-full h-[56px] bg-[#F5F5F5] rounded-[8px] flex items-center overflow-hidden focus-within:ring-2 focus-within:ring-white/60 focus-within:shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all duration-300">
                    <div className="h-full w-[54px] bg-[#E5E5E5] flex items-center justify-center shrink-0 border-r border-[#D4D4D4] transition-colors duration-300">
                      <User className="w-[20px] h-[20px] text-gray-500" strokeWidth={2} />
                    </div>
                    <input
                      type="text"
                      placeholder="Mobile Number"
                      value={otpFlow.mobile}
                      onChange={(e) => otpFlow.setMobile(e.target.value)}
                      className="w-full h-full bg-transparent outline-none px-4 text-gray-700 text-[16px] placeholder:text-gray-400 font-medium"
                    />
                  </div>
                ) : (
                  <>
                    <div className="relative w-full h-[56px] bg-[#F5F5F5] rounded-[8px] flex items-center overflow-hidden focus-within:ring-2 focus-within:ring-white/60 focus-within:shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all duration-300">
                      <div className="h-full w-[54px] bg-[#E5E5E5] flex items-center justify-center shrink-0 border-r border-[#D4D4D4] transition-colors duration-300">
                        <Lock className="w-[20px] h-[20px] text-gray-500" strokeWidth={2} />
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={OTP_LENGTH}
                        placeholder="Enter OTP"
                        value={otpFlow.otp}
                        onChange={(e) => otpFlow.setOtp(e.target.value.replace(/\D/g, ''))}
                        className="w-full h-full bg-transparent outline-none px-4 text-gray-700 text-[16px] tracking-[6px] placeholder:text-gray-400 placeholder:tracking-normal font-medium"
                      />
                    </div>
                    <div className="w-full flex items-center justify-between px-0.5 -mt-1">
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

            <button
              type="submit"
              disabled={otpFlow.isSubmitting}
              className="w-full h-[56px] mt-3 bg-[#053b2a] text-white tracking-[3px] font-bold text-[15px] rounded-[2px] transition-all duration-250 flex items-center justify-center disabled:opacity-70 outline-none hover:bg-[#074733] hover:-translate-y-[2px] hover:shadow-[0_4px_15px_rgba(5,59,42,0.4)] focus-visible:ring-2 focus-visible:ring-white/50 cursor-pointer"
              style={{
                opacity: mounted ? 1 : 0,
                transition: `opacity 0.5s ${ease} 0.5s, transform 250ms ease, background-color 250ms ease, box-shadow 250ms ease`
              }}
            >
              {otpFlow.step === 'mobile'
                ? (otpFlow.isSubmitting ? 'SENDING OTP...' : 'SEND OTP')
                : (otpFlow.isSubmitting ? 'VERIFYING...' : 'VERIFY & LOGIN')}
            </button>

            <div className="w-full flex items-center justify-between mt-4 px-0.5">
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
