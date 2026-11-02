// Moving an order one step along its chain (the design's M4, "mark as
// shipped", and the same for out for delivery and delivered).
//
// Before anything happens it shows what the shopper will be told: who the SMS
// and the email go to, and the message itself — read from the server, which
// renders it from the admin's live template, so the preview is the message
// that will go. Each channel can be held back with its switch. A channel that
// would not send anyway (no number, the admin switched that message off, or
// the platform is not sending right now) says so instead of offering a switch
// that would do nothing.
//
// The board also asks for a courier and a tracking code. Orders have no place
// to keep either, so they are not asked for here rather than collected and
// dropped.
import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { tenantApi, handleApiError } from '../utils/api';
import { orderNoticeQuery } from '../core/query/managerQueries';
import { Skeleton } from '../components/skeleton/Skeleton';
import { Alert, Sheet, SheetHead, Switch, btn, li, list, maskPhone, shortName } from './officeKit';
import { SkIn } from './officeSk';

export default function StepOrderDialog({ T, order, next, isMobile, sub, buyerName, routeLabel, onDone, onClose }) {
  const { t } = useTranslation('manager');
  const titleId = useId();
  // Read as the dialog opens, and afresh every time it does (orderNoticeQuery).
  const preview = useQuery(orderNoticeQuery(order.id, next));
  const noticeError = preview.isError;
  const notice = noticeError ? {} : preview.isSuccess ? preview.data || {} : null;
  const [sms, setSms] = useState(true);
  const [email, setEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const shut = () => { if (!busy) onClose(); };
  const smsLive = !!notice?.sms?.sending;
  const emailLive = !!notice?.email?.sending;
  const willTell = (smsLive && sms) || (emailLive && email);

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      // Without a preview the switches showed nothing to choose, so the
      // server's usual messages go out as they always did.
      const choice = noticeError ? {} : { sms: smsLive && sms, email: emailLive && email };
      const updated = await tenantApi.moveOrder(order.id, next, choice, sub);
      onDone(updated);
    } catch (e) {
      setError(handleApiError(e, t('step.failed')));
      setBusy(false);
    }
  };

  const row = (key, label, channel, live, on, setOn) => {
    let line;
    // The address the message goes to is on its way: a bar in its line.
    if (!notice) line = <Skeleton label={t('step.loading')}><SkIn w="55%" /></Skeleton>;
    else if (!channel) line = t(`step.no.${key}`);
    else if (!live) line = t('step.notSending', { to: key === 'sms' ? maskPhone(channel.to) : channel.to });
    else line = key === 'sms' ? maskPhone(channel.to) : channel.to;
    return (
      <div style={li(T, key === 'email')}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: 'block', font: `600 12.5px/1.4 ${T.font}` }}>{label}</b>
          <div style={{ font: `400 12px/1.4 ${T.font}`, color: T.textDim, overflowWrap: 'anywhere' }}>{line}</div>
        </div>
        <Switch T={T} on={live && on} disabled={busy || !live} label={label} onClick={() => setOn((v) => !v)} />
      </div>
    );
  };

  const message = (() => {
    if (!notice) return null;
    if (smsLive && sms) return { label: t('step.message'), text: notice.sms.text };
    if (emailLive && email) return { label: t('step.emailSubject'), text: notice.email.subject };
    return null;
  })();

  const number = `#${order.orderNumber || order.id}`;
  const line = [shortName(buyerName), routeLabel].filter(Boolean).join(' · ');

  return (
    <Sheet T={T} isMobile={isMobile} titleId={titleId} onClose={shut}>
      <SheetHead
        T={T} titleId={titleId} title={t(`order.step.${next}`)}
        closeLabel={t('step.close')} onClose={shut} autofocusClose={isMobile}
      />
      <p style={{ margin: 0, font: `400 12.5px/1.5 ${T.font}`, color: T.textDim }}>
        {t('step.order')} <span style={{ whiteSpace: 'nowrap' }}>{number}</span>{line ? ` · ${line}` : ''}
      </p>

      <div style={list(T)}>
        {row('sms', t('step.sms'), notice?.sms, smsLive, sms, setSms)}
        {row('email', t('step.email'), notice?.email, emailLive, email, setEmail)}
      </div>

      {message && (
        <div style={{ borderRadius: 'var(--k-r-card)', background: T.surface2, padding: 16 }}>
          <span style={{ font: `400 12px ${T.font}`, color: T.textDim }}>{message.label}</span>
          <p style={{ margin: '4px 0 0', font: `400 12.5px/1.5 ${T.font}`, color: T.text, overflowWrap: 'anywhere' }}>{message.text}</p>
        </div>
      )}
      {notice && !willTell && (
        <p style={{ margin: 0, font: `400 12.5px/1.5 ${T.font}`, color: T.textDim }}>
          {noticeError ? t('step.noticeFailed') : t('step.silent')}
        </p>
      )}

      {error && <Alert T={T} tone="bad" role="alert">{error}</Alert>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        {/* A phone closes the sheet with its × or a tap outside it, so the
            board keeps the one button there. */}
        {!isMobile && (
          <button type="button" onClick={shut} disabled={busy} data-autofocus="" style={btn(T, 'g')}>
            {t('step.close')}
          </button>
        )}
        <button type="button" onClick={confirm} disabled={busy || !notice} style={{ ...btn(T, 'p', { block: true }), opacity: busy ? 0.6 : 1 }}>
          {busy ? t('step.working') : willTell ? t('step.confirmNotify') : t('step.confirm')}
        </button>
      </div>
    </Sheet>
  );
}
