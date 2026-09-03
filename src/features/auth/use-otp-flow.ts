import { useEffect, useState } from 'react';

export const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 120;

export type OtpFlowStep = 'mobile' | 'otp';

interface UseOtpFlowOptions<TVerifyResult> {
  /** Sends the OTP. Called for both the initial request and every resend. */
  requestOtp: (mobile: string) => Promise<void>;
  /** Verifies the entered OTP and returns whatever the caller's flow needs next
   * (a logged-in AuthUser for OTP-login, a resetToken for forgot-password). */
  verifyOtp: (mobile: string, otp: string) => Promise<TVerifyResult>;
}

/**
 * Shared state machine behind both "Login with OTP" and "Forgot password": mobile entry ->
 * request OTP -> 2-minute resend countdown -> verify OTP. Pure state/behavior, no JSX — the
 * two calling pages own their own markup and (for forgot-password) the steps that follow a
 * successful verify.
 */
export function useOtpFlow<TVerifyResult>({ requestOtp, verifyOtp }: UseOtpFlowOptions<TVerifyResult>) {
  const [step, setStep] = useState<OtpFlowStep>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  // Ticks once a second for as long as we're on the OTP step — started once on entering the
  // step rather than re-created every second, so a resend (which just resets the counter) never
  // has to worry about restarting it.
  useEffect(() => {
    if (step !== 'otp') return;
    const id = setInterval(() => {
      setSecondsRemaining((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  const canResend = step === 'otp' && secondsRemaining <= 0;

  async function requestOtpAction() {
    setError(null);
    setInfo(null);
    if (!mobile.trim()) {
      setError('Mobile number is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await requestOtp(mobile.trim());
      setOtp('');
      setStep('otp');
      setSecondsRemaining(RESEND_COOLDOWN_SECONDS);
      setInfo('OTP sent to your mobile number.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resendOtpAction() {
    if (!canResend || isSubmitting) return;
    setError(null);
    setInfo(null);
    setOtp('');

    setIsSubmitting(true);
    try {
      await requestOtp(mobile.trim());
      setSecondsRemaining(RESEND_COOLDOWN_SECONDS);
      setInfo('OTP sent to your mobile number.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP.');
    } finally {
      setIsSubmitting(false);
    }
  }

  /** Returns the verify result on success, or undefined on validation/API failure (error is set). */
  async function verifyOtpAction(): Promise<TVerifyResult | undefined> {
    setError(null);
    if (!otp.trim()) {
      setError('OTP is required.');
      return undefined;
    }

    setIsSubmitting(true);
    try {
      const result = await verifyOtp(mobile.trim(), otp.trim());
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP.');
      return undefined;
    } finally {
      setIsSubmitting(false);
    }
  }

  /** Back to mobile entry (e.g. "wrong number?" link) — keeps the mobile value cleared for a fresh start. */
  function backToMobile() {
    setStep('mobile');
    setOtp('');
    setError(null);
    setInfo(null);
    setSecondsRemaining(0);
  }

  /** Full reset — used when a caller switches away from the OTP flow entirely (e.g. back to password login). */
  function reset() {
    setStep('mobile');
    setMobile('');
    setOtp('');
    setError(null);
    setInfo(null);
    setSecondsRemaining(0);
  }

  return {
    step,
    mobile,
    setMobile,
    otp,
    setOtp,
    error,
    setError,
    info,
    isSubmitting,
    secondsRemaining,
    canResend,
    requestOtp: requestOtpAction,
    resendOtp: resendOtpAction,
    verifyOtp: verifyOtpAction,
    backToMobile,
    reset,
  };
}
