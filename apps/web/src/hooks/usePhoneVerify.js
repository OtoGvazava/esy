import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Shared phone-verification flow. The send-code response carries { devCode }
// when no SMS account is configured, so the code can be entered without a real
// message, and { destination } — the masked number it was actually addressed
// to, which is what lets someone notice they mistyped it instead of waiting for
// a message that went elsewhere. On a successful confirm the auth context
// refreshes and user.phoneVerified flips.
export function usePhoneVerify() {
  const { sendPhoneCode, verifyPhone } = useAuth();
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState('');
  const [destination, setDestination] = useState('');
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
      setDestination(r?.destination || '');
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
    setDestination('');
    setCode('');
    setError('');
  };

  return { sent, devCode, destination, code, setCode, busy, error, request, confirm, reset };
}
