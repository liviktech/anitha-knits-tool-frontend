import { useState, type FormEvent, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useAuth, defaultRouteFor } from './auth-context';
import { requestPasswordResetOtp, verifyPasswordResetOtp, resetPassword } from './auth-service';
import { useOtpFlow, OTP_LENGTH } from './use-otp-flow';

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

type PageStep = 'mobile' | 'otp' | 'newPassword' | 'success';

export function ForgotPasswordPage() {
  const { user } = useAuth();

  const [pageStep, setPageStep] = useState<PageStep>('mobile');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  const otpFlow = useOtpFlow({
    requestOtp: (m) => requestPasswordResetOtp(m, 'company'),
    verifyOtp: (m, code) => verifyPasswordResetOtp(m, code, 'company'),
  });

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (user) {
    return <Navigate to={defaultRouteFor(user)} replace />;
  }

  async function handleMobileSubmit(e: FormEvent) {
    e.preventDefault();
    await otpFlow.requestOtp();
    setPageStep('otp');
  }

  async function handleOtpSubmit(e: FormEvent) {
    e.preventDefault();
    const token = await otpFlow.verifyOtp();
    if (token) {
      setResetToken(token);
      setPageStep('newPassword');
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setPasswordError('Please fill in both password fields.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    if (!resetToken) {
      setPasswordError('Your session expired — please start again.');
      setPageStep('mobile');
      return;
    }

    setIsSubmittingPassword(true);
    try {
      await resetPassword(otpFlow.mobile, resetToken, newPassword, 'company');
      setPageStep('success');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setIsSubmittingPassword(false);
    }
  }

  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

  // Keeps pageStep in sync if the user actively re-triggers otpFlow back to 'mobile' (e.g. via
  // otpFlow.backToMobile from a wrong-number link inside the otp step below).
  const showingOtpStep = pageStep === 'otp' && otpFlow.step === 'otp';

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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_20%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />

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
        <div className="absolute inset-0 overflow-hidden rounded-[22px] pointer-events-none">
          <div className="absolute -top-[60%] -right-[60%] w-[200%] h-[200%] bg-gradient-to-bl from-white/10 via-white/5 to-transparent rotate-[-40deg] blur-[2px]" />
        </div>

        <div
          className="absolute -top-[55px] w-[110px] h-[110px] rounded-full bg-[#071711] border-[2px] border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.4)] flex items-center justify-center z-20 group"
          style={{
            transform: mounted ? 'scale(1)' : 'scale(0.85)',
            opacity: mounted ? 1 : 0,
            transition: `transform 0.7s ${ease} 0.2s, opacity 0.7s ${ease} 0.2s`
          }}
        >
          {pageStep === 'success' ? (
            <CheckCircle2 className="w-12 h-12 text-white stroke-[1.5]" />
          ) : (
            <Lock className="w-12 h-12 text-white stroke-[1.5]" />
          )}
        </div>

        <div className="w-full mt-[90px] flex flex-col z-20">
          <div className="text-center mb-4">
            <h2 className="text-white text-[22px] font-extrabold tracking-wide">Reset Password</h2>
          </div>

          {pageStep === 'mobile' && (
            <form onSubmit={handleMobileSubmit} className="w-full flex flex-col">
              <div className="relative w-full">
                <div
                  className={`absolute -top-9 left-0 right-0 w-full flex justify-center items-center border border-red-500 bg-red-100 py-1 overflow-hidden transition-all duration-300 ease-in-out ${otpFlow.error ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                >
                  <p className="text-[15px] font-bold text-red-500 text-center">{otpFlow.error}</p>
                </div>

                <div className="relative w-full h-[56px] bg-[#F5F5F5] rounded-[8px] flex items-center overflow-hidden focus-within:ring-2 focus-within:ring-white/60 focus-within:shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all duration-300">
                  <div className="h-full w-[54px] bg-[#E5E5E5] flex items-center justify-center shrink-0 border-r border-[#D4D4D4]">
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
              </div>

              <button
                type="submit"
                disabled={otpFlow.isSubmitting}
                className="w-full h-[56px] mt-6 bg-[#053b2a] text-white tracking-[3px] font-bold text-[15px] rounded-[2px] transition-all duration-250 flex items-center justify-center disabled:opacity-70 outline-none hover:bg-[#074733] hover:-translate-y-[2px] hover:shadow-[0_4px_15px_rgba(5,59,42,0.4)] cursor-pointer"
              >
                {otpFlow.isSubmitting ? 'SENDING OTP...' : 'SEND OTP'}
              </button>
            </form>
          )}

          {showingOtpStep && (
            <form onSubmit={handleOtpSubmit} className="w-full flex flex-col">
              <div className="relative w-full">
                <div
                  className={`absolute -top-9 left-0 right-0 w-full flex justify-center items-center border py-1 overflow-hidden transition-all duration-300 ease-in-out ${(otpFlow.error || otpFlow.info) ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'
                    } ${otpFlow.error ? 'border-red-500 bg-red-100' : 'border-emerald-500 bg-emerald-50'}`}
                >
                  <p className={`text-[15px] font-bold text-center ${otpFlow.error ? 'text-red-500' : 'text-emerald-700'}`}>
                    {otpFlow.error ?? otpFlow.info}
                  </p>
                </div>

                <div className="relative w-full h-[56px] bg-[#F5F5F5] rounded-[8px] flex items-center overflow-hidden focus-within:ring-2 focus-within:ring-white/60 focus-within:shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all duration-300">
                  <div className="h-full w-[54px] bg-[#E5E5E5] flex items-center justify-center shrink-0 border-r border-[#D4D4D4]">
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

                <div className="w-full flex items-center justify-between px-0.5 mt-2">
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
              </div>

              <button
                type="submit"
                disabled={otpFlow.isSubmitting}
                className="w-full h-[56px] mt-6 bg-[#053b2a] text-white tracking-[3px] font-bold text-[15px] rounded-[2px] transition-all duration-250 flex items-center justify-center disabled:opacity-70 outline-none hover:bg-[#074733] hover:-translate-y-[2px] hover:shadow-[0_4px_15px_rgba(5,59,42,0.4)] cursor-pointer"
              >
                {otpFlow.isSubmitting ? 'VERIFYING...' : 'VERIFY OTP'}
              </button>

              <button
                type="button"
                onClick={() => {
                  otpFlow.backToMobile();
                  setPageStep('mobile');
                }}
                className="mx-auto mt-4 text-white/80 hover:text-white text-[13px] font-semibold underline underline-offset-2 cursor-pointer"
              >
                Change number
              </button>
            </form>
          )}

          {pageStep === 'newPassword' && (
            <form onSubmit={handlePasswordSubmit} className="w-full flex flex-col">
              <div className="relative w-full">
                <div
                  className={`absolute -top-9 left-0 right-0 w-full flex justify-center items-center border border-red-500 bg-red-100 py-1 overflow-hidden transition-all duration-300 ease-in-out ${passwordError ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                >
                  <p className="text-[15px] font-bold text-red-500 text-center">{passwordError}</p>
                </div>

                <div className="w-full flex flex-col gap-[18px]">
                  <div className="relative w-full h-[56px] bg-[#F5F5F5] rounded-[8px] flex items-center overflow-hidden focus-within:ring-2 focus-within:ring-white/60 focus-within:shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all duration-300">
                    <div className="h-full w-[54px] bg-[#E5E5E5] flex items-center justify-center shrink-0 border-r border-[#D4D4D4]">
                      <Lock className="w-[20px] h-[20px] text-gray-500" strokeWidth={2} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full h-full bg-transparent outline-none pl-4 pr-12 text-gray-700 text-[16px] placeholder:text-gray-400 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-[20px] h-[20px]" strokeWidth={2} /> : <Eye className="w-[20px] h-[20px]" strokeWidth={2} />}
                    </button>
                  </div>

                  <div className="relative w-full h-[56px] bg-[#F5F5F5] rounded-[8px] flex items-center overflow-hidden focus-within:ring-2 focus-within:ring-white/60 focus-within:shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all duration-300">
                    <div className="h-full w-[54px] bg-[#E5E5E5] flex items-center justify-center shrink-0 border-r border-[#D4D4D4]">
                      <Lock className="w-[20px] h-[20px] text-gray-500" strokeWidth={2} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Confirm New Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-full bg-transparent outline-none px-4 text-gray-700 text-[16px] placeholder:text-gray-400 font-medium"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingPassword}
                className="w-full h-[56px] mt-6 bg-[#053b2a] text-white tracking-[3px] font-bold text-[15px] rounded-[2px] transition-all duration-250 flex items-center justify-center disabled:opacity-70 outline-none hover:bg-[#074733] hover:-translate-y-[2px] hover:shadow-[0_4px_15px_rgba(5,59,42,0.4)] cursor-pointer"
              >
                {isSubmittingPassword ? 'SAVING...' : 'RESET PASSWORD'}
              </button>
            </form>
          )}

          {pageStep === 'success' && (
            <div className="w-full flex flex-col items-center text-center">
              <p className="text-white/90 text-[14px] font-medium mb-6">
                Your password has been reset. You can now log in with your new password.
              </p>
              <Link
                to="/login"
                className="w-full h-[56px] bg-[#053b2a] text-white tracking-[3px] font-bold text-[15px] rounded-[2px] flex items-center justify-center hover:bg-[#074733] transition-colors"
              >
                BACK TO LOGIN
              </Link>
            </div>
          )}

          {pageStep === 'mobile' && (
            <Link
              to="/login"
              className="mx-auto mt-5 text-white/80 hover:text-white text-[13px] font-semibold underline underline-offset-2"
            >
              Back to login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
