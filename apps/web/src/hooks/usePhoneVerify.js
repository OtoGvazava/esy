import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Shared phone-verification flow (dev stand-in OTP). The send-code response
// carries { devCode } so the code can be entered without a real SMS; on a
// successful confirm the auth context refreshes and user.phoneVerified flips.
export function usePhoneVerify() {
  const { sendPhoneCode, verifyPhone } = useAuth();
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const request = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await sendPhoneCode();
      setSent(true);
      setDevCode(r?.devCode || '');
    } catch (e) {
      setError(e?.message || 'send_failed');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await verifyPhone(code.trim());
    } catch (e) {
      setError(e?.message || 'verify_failed');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setSent(false);
    setDevCode('');
    setCode('');
    setError('');
  };

  return { sent, devCode, code, setCode, busy, error, request, confirm, reset };
}
