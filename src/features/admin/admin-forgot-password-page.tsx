import { useState, type FormEvent, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Mail, Lock, EyeOff, CheckCircle2 } from 'lucide-react';
import { useAuth, defaultRouteFor } from '../auth/auth-context';
import { requestPasswordResetOtp, verifyPasswordResetOtp, resetPassword } from '../auth/auth-service';
import { useOtpFlow, OTP_LENGTH } from '../auth/use-otp-flow';

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

type PageStep = 'mobile' | 'otp' | 'newPassword' | 'success';

export function AdminForgotPasswordPage() {
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
    requestOtp: (m) => requestPasswordResetOtp(m, 'platform-admin'),
    verifyOtp: (m, code) => verifyPasswordResetOtp(m, code, 'platform-admin'),
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
      await resetPassword(otpFlow.mobile, resetToken, newPassword, 'platform-admin');
      setPageStep('success');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setIsSubmittingPassword(false);
    }
  }

  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const showingOtpStep = pageStep === 'otp' && otpFlow.step === 'otp';

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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_20%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />

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
        <div className="absolute inset-0 overflow-hidden rounded-[28px] pointer-events-none">
          <div className="absolute -top-[35%] left-1/2 -translate-x-1/2 w-[140%] h-[70%] rounded-[50%] bg-gradient-to-b from-white/25 via-white/5 to-transparent" />
          <div className="absolute -bottom-[35%] left-1/2 -translate-x-1/2 w-[140%] h-[70%] rounded-[50%] bg-gradient-to-t from-white/25 via-white/5 to-transparent" />
        </div>

        <div className="w-full flex flex-col z-20">
          <div className="text-center mb-8">
            {pageStep === 'success' ? (
              <CheckCircle2 className="w-10 h-10 text-white mx-auto mb-2" strokeWidth={1.5} />
            ) : null}
            <h2 className="text-white text-[32px] font-extrabold tracking-wide">Reset Password</h2>
            <div className="mx-auto mb-4 flex flex-col items-center gap-[3px]">
              <div className="h-0.5 w-16 rounded-full bg-white/80" />
            </div>
          </div>

          {pageStep === 'mobile' && (
            <form onSubmit={handleMobileSubmit} className="w-full flex flex-col">
              <div className="relative w-full">
                <div
                  className={`absolute -top-9 left-0 right-0 w-full flex justify-center items-center py-1 overflow-hidden transition-all duration-300 ease-in-out ${otpFlow.error ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                >
                  <p className="text-[15px] font-bold text-red-500 text-center">{otpFlow.error}</p>
                </div>

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
              </div>

              <button
                type="submit"
                disabled={otpFlow.isSubmitting}
                className="mt-8 w-full h-13 bg-white text-slate-700 font-bold text-[16px] rounded-full transition-all duration-250 flex items-center justify-center disabled:opacity-70 outline-none hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(0,0,0,0.25)]"
              >
                {otpFlow.isSubmitting ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          )}

          {showingOtpStep && (
            <form onSubmit={handleOtpSubmit} className="w-full flex flex-col">
              <div className="relative w-full">
                <div
                  className={`absolute -top-9 left-0 right-0 w-full flex justify-center items-center py-1 overflow-hidden transition-all duration-300 ease-in-out ${(otpFlow.error || otpFlow.info) ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                >
                  <p className={`text-[15px] font-bold text-center ${otpFlow.error ? 'text-red-500' : 'text-emerald-300'}`}>
                    {otpFlow.error ?? otpFlow.info}
                  </p>
                </div>

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

                <div className="w-full flex items-center justify-between px-0.5 mt-3">
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
                className="mt-8 w-full h-13 bg-white text-slate-700 font-bold text-[16px] rounded-full transition-all duration-250 flex items-center justify-center disabled:opacity-70 outline-none hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(0,0,0,0.25)]"
              >
                {otpFlow.isSubmitting ? 'Verifying...' : 'Verify OTP'}
              </button>

              <button
                type="button"
                onClick={() => {
                  otpFlow.backToMobile();
                  setPageStep('mobile');
                }}
                className="mx-auto mt-5 text-white/80 hover:text-white text-[13px] font-semibold underline underline-offset-2 cursor-pointer"
              >
                Change number
              </button>
            </form>
          )}

          {pageStep === 'newPassword' && (
            <form onSubmit={handlePasswordSubmit} className="w-full flex flex-col">
              <div className="relative w-full">
                <div
                  className={`absolute -top-9 left-0 right-0 w-full flex justify-center items-center py-1 overflow-hidden transition-all duration-300 ease-in-out ${passwordError ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                >
                  <p className="text-[15px] font-bold text-red-500 text-center">{passwordError}</p>
                </div>

                <div className="w-full flex flex-col gap-6">
                  <div className="relative w-full flex items-center border-b border-white/50 focus-within:border-white pb-2 transition-colors duration-300">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-transparent outline-none pr-2 text-white text-[16px] placeholder:text-white/80 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-white/80 hover:text-white shrink-0"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" strokeWidth={2} /> : <Lock className="w-4.5 h-4.5" strokeWidth={2} />}
                    </button>
                  </div>

                  <div className="relative w-full flex items-center border-b border-white/50 focus-within:border-white pb-2 transition-colors duration-300">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Confirm New Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-transparent outline-none text-white text-[16px] placeholder:text-white/80 font-medium"
                    />
                    <Lock className="w-4.5 h-4.5 text-white/80 shrink-0" strokeWidth={2} />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingPassword}
                className="mt-8 w-full h-13 bg-white text-slate-700 font-bold text-[16px] rounded-full transition-all duration-250 flex items-center justify-center disabled:opacity-70 outline-none hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(0,0,0,0.25)]"
              >
                {isSubmittingPassword ? 'Saving...' : 'Reset Password'}
              </button>
            </form>
          )}

          {pageStep === 'success' && (
            <div className="w-full flex flex-col items-center text-center">
              <p className="text-white/90 text-[14px] font-medium mb-6">
                Your password has been reset. You can now log in with your new password.
              </p>
              <Link
                to="/admin-login"
                className="w-full h-13 bg-white text-slate-700 font-bold text-[16px] rounded-full flex items-center justify-center hover:-translate-y-0.5 transition-all duration-250"
              >
                Back to Login
              </Link>
            </div>
          )}

          {pageStep === 'mobile' && (
            <Link
              to="/admin-login"
              className="mx-auto mt-6 text-white/80 hover:text-white text-[13px] font-semibold underline underline-offset-2"
            >
              Back to login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
