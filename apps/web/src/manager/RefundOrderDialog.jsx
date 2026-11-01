// Sending money back (the design's M5). Owner-only, and the API enforces it:
// a manager moves orders, the owner returns money (D2).
//
// Everything still refundable, or part of it. What it never claims is that
// the money has arrived: BOG's refund API is asynchronous, so a request the
// bank accepts shows as "refund pending" until it confirms (M6).
//
// The board also asks for a reason. Orders have nowhere to keep one and the
// bank is not told it, so the dialog does not ask for an answer it would
// throw away.
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tenantApi, handleApiError } from '../utils/api';
import { money } from '../core/money';
import { Alert, Chip, Option, Sheet, SheetHead, btn, shortName, useFocusRing } from './officeKit';

// The currency sign after the amount field, the same in both languages.
const LARI = '₾';

/** "12,50" or "12.5" → 12.5; anything else → NaN. */
const parseAmount = (raw) => {
  const s = String(raw || '').trim().replace(/\s/g, '').replace(',', '.');
  return /^\d+(\.\d{1,2})?$/.test(s) ? Number(s) : NaN;
};

export default function RefundOrderDialog({
  T, order, isMobile, sub, buyerName, statusLabel, refundable, refunded, deliveryFee, onDone, onClose,
}) {
  const { t } = useTranslation('manager');
  const titleId = useId();
  const [mode, setMode] = useState('full');
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [focus, ring] = useFocusRing();

  const part = parseAmount(raw);
  const partOk = Number.isFinite(part) && part > 0 && part <= refundable + 1e-9;
  const amount = mode === 'full' ? refundable : part;
  const ready = mode === 'full' ? refundable > 0 : partOk;
  const tooMuch = mode === 'part' && Number.isFinite(part) && part > refundable + 1e-9;

  const shut = () => { if (!busy) onClose(); };

  const send = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError('');
    try {
      // The whole rest is sent with no amount, as the bank documents it.
      const updated = await tenantApi.refundOrder(order.id, mode === 'full' ? '' : part.toFixed(2), sub);
      onDone(updated);
    } catch (e) {
      const why = handleApiError(e, '');
      setError(why ? `${t('refund.failed')} ${why}` : t('refund.failed'));
      setBusy(false);
    }
  };

  const paidLine = [
    shortName(buyerName),
    statusLabel,
    t('refund.paidBy', { amount: money(order.total) }),
  ].filter(Boolean).join(' · ');

  return (
    <Sheet T={T} isMobile={isMobile} titleId={titleId} onClose={shut}>
      <SheetHead T={T} titleId={titleId} title={t('refund.title')} closeLabel={t('refund.close')} onClose={shut} autofocusClose={isMobile}>
        <Chip T={T} name="conf" dot={false} style={{ alignSelf: 'flex-start' }}>
          {t('refund.ownerOnly')}
        </Chip>
      </SheetHead>

      <p style={{ margin: 0, font: `400 12.5px/1.5 ${T.font}`, color: T.textDim }}>
        {t('refund.order')} <span style={{ whiteSpace: 'nowrap' }}>{`#${order.orderNumber || order.id}`}</span> · {paidLine}
      </p>

      <div role="radiogroup" aria-labelledby={titleId} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Option
          T={T} name={`${titleId}-mode`} on={mode === 'full'} onSelect={() => setMode('full')} disabled={busy}
          title={refunded > 0 ? t('refund.rest') : t('refund.full')}
          sub={refunded > 0 ? t('refund.restSub', { amount: money(refunded) })
            : deliveryFee > 0 ? t('refund.fullSub') : t('refund.fullSubItems')}
        >
          <b style={{ font: `600 14px ${T.font}`, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{money(refundable)}</b>
        </Option>
        <Option
          T={T} name={`${titleId}-mode`} on={mode === 'part'} onSelect={() => setMode('part')} disabled={busy}
          title={t('refund.part')} sub={t('refund.partSub', { max: money(refundable) })}
        >
          <span style={{
            display: 'flex', alignItems: 'center', width: 120, height: 40, flex: 'none', boxSizing: 'border-box',
            borderRadius: 'var(--k-r-in)', background: 'var(--k-in-bg)', overflow: 'hidden', color: T.textDim,
            border: `1.5px solid ${tooMuch ? T.danger : focus ? T.accent : 'var(--k-in-bd)'}`,
            boxShadow: focus && !tooMuch ? `0 0 0 4px color-mix(in oklab, ${T.accent} 18%, transparent)` : 'none',
          }}>
            <input
              value={raw} inputMode="decimal" placeholder={t('refund.placeholder')} disabled={busy}
              aria-label={t('refund.amountLabel')} aria-invalid={tooMuch || undefined}
              onChange={(e) => { setRaw(e.target.value); setMode('part'); }}
              onFocus={() => { ring.onFocus(); setMode('part'); }} onBlur={ring.onBlur}
              style={{
                flex: 1, minWidth: 0, height: '100%', border: 0, outline: 'none', background: 'transparent',
                padding: '0 4px 0 10px', textAlign: 'right', color: T.text, font: `400 15px ${T.font}`,
              }}
            />
            <span style={{ padding: '0 12px 0 6px' }}>{LARI}</span>
          </span>
        </Option>
        {tooMuch && (
          <span role="alert" style={{ font: `400 12.5px ${T.font}`, color: T.danger }}>
            {t('refund.tooMuch', { max: money(refundable) })}
          </span>
        )}
      </div>

      <Alert T={T}>{t('refund.note')}</Alert>

      {error && <Alert T={T} tone="bad" role="alert">{error}</Alert>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" onClick={shut} disabled={busy} data-autofocus={isMobile ? undefined : ''} style={btn(T, 'g')}>
          {t('refund.cancel')}
        </button>
        <button
          type="button" onClick={send} disabled={busy || !ready} aria-disabled={!ready || undefined}
          style={{ ...btn(T, 'bad', { block: true, off: !ready }), opacity: busy ? 0.6 : 1 }}
        >
          {busy ? t('refund.working')
            : t('refund.confirm', { amount: money(ready ? amount : refundable) })}
        </button>
      </div>
    </Sheet>
  );
}
