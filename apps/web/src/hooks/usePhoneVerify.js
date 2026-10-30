import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Matches the server's per-account resend cooldown (PhoneVerificationService).
const RESEND_SECONDS = 60;

// Shared phone-verification flow. The send-code response carries { devCode }
// when no SMS account is configured, so the code can be entered without a real
// message, and { destination } — the masked number it was actually addressed
// to, which is what lets someone notice they mistyped it instead of waiting for
// a message that went elsewhere. On a successful confirm the auth context
// refreshes and user.phoneVerified flips.
//
// request(phoneNumber) sends a code for that number; without one, the number
// already on the account. The number is only written by a successful confirm.
// errorCode is the server's stable code (PHONE_TAKEN, CODE_WRONG, …) so the
// screen can translate it; error is the server's English sentence, the
// fallback when there is no translation.
export function usePhoneVerify() {
  const { sendPhoneCode, verifyPhone } = useAuth();
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState('');
  const [destination, setDestination] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [lastNumber, setLastNumber] = useState(undefined);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const fail = (e, fallback) => {
    setError(e?.message || fallback);
    setErrorCode(e?.code || '');
  };

  const request = async (phoneNumber) => {
    setBusy(true);
    setError('');
    setErrorCode('');
    try {
      const r = await sendPhoneCode(phoneNumber);
      setSent(true);
      setCode('');
      setDevCode(r?.devCode || '');
      setDestination(r?.destination || '');
      setLastNumber(phoneNumber);
      setResendIn(RESEND_SECONDS);
    } catch (e) {
      fail(e, 'send_failed');
    } finally {
      setBusy(false);
    }
  };

  // Send again to the same number the last code went to.
  const resend = () => request(lastNumber);

  const confirm = async () => {
    setBusy(true);
    setError('');
    setErrorCode('');
    try {
      await verifyPhone(code.trim());
    } catch (e) {
      fail(e, 'verify_failed');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setSent(false);
    setDevCode('');
    setDestination('');
    setCode('');
    setError('');
    setErrorCode('');
  };

  return {
    sent, devCode, destination, code, setCode, busy, error, errorCode,
    resendIn, request, resend, confirm, reset,
  };
}
