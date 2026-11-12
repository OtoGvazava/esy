// /account/addresses — the address book (the design's U5). One list for every
// store: checkout offers the default first and saves a new one here. The book
// already existed behind /api/addresses; this is its first screen.
//
// The server keeps the default consistent (the first address becomes it, a new
// default takes the flag from the old one, deleting it promotes the newest),
// so the screen only asks and then reads the list again.
import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { addressApi } from '../utils/api';
import { addressesQuery } from '../core/query/queries';
import { Sk, Skeleton } from '../components/skeleton/Skeleton';
import { Btn, Card, Chip, Glyph, LiIc, List, cardStyle, ingrpInput, ingrpStyle, liStyle } from '../platform/PlatformKit';
import { Dialog, Head, phoneText, useAccount } from './parts';

const REQUIRED = ['recipient', 'phone', 'city', 'line'];

function Field({ T, label, value, onChange, error, style, ...rest }) {
  const id = useId();
  const [on, setOn] = useState(false);
  return (
    <label htmlFor={id} style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5, color: T.textDim, minWidth: 0, ...style }}>
      {label}
      <span style={{ ...ingrpStyle(T, on), border: `1.5px solid ${error ? 'var(--k-bad)' : on ? T.accent : 'var(--k-in-bd)'}` }}>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOn(true)}
          onBlur={() => setOn(false)}
          aria-invalid={error ? 'true' : undefined}
          style={{ ...ingrpInput(T), padding: '0 15px' }}
          {...rest}
        />
      </span>
    </label>
  );
}

function Switch({ T, on, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      style={{ minWidth: 46, minHeight: 44, padding: 0, border: 0, background: 'transparent', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', flex: 'none' }}
    >
      <span style={{ width: 46, height: 28, borderRadius: 14, background: on ? T.accent : T.border, position: 'relative', display: 'block' }}>
        <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.3)', transition: 'left 120ms ease' }} />
      </span>
    </button>
  );
}

/** The form for a new address or an existing one; mounted fresh for each, so it starts from that address. */
function AddressForm({ T, t, ph, address, first, user, busy, error, onSave, onCancel, personal }) {
  const [f, setF] = useState(() => ({
    recipient: address?.recipient ?? (user.name && user.name !== user.email ? user.name : ''),
    phone: address?.phone ?? (user.phoneVerified && user.phoneNumber ? phoneText(user.phoneNumber) : ''),
    city: address?.city ?? '',
    line: address?.line ?? '',
    postalCode: address?.postalCode ?? '',
    isDefault: address ? !!address.isDefault : first,
  }));
  const [tried, setTried] = useState(false);
  const set = (k) => (v) => setF((prev) => ({ ...prev, [k]: v }));
  const missing = (k) => tried && !String(f[k]).trim();
  const submit = (e) => {
    e.preventDefault();
    setTried(true);
    if (REQUIRED.some((k) => !String(f[k]).trim())) return;
    onSave(f);
  };
  const incomplete = REQUIRED.some(missing);
  return (
    <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexDirection: ph ? 'column' : 'row' }}>
        <Field T={T} label={t('hub.fRecipient')} value={f.recipient} onChange={set('recipient')} error={missing('recipient')} autoComplete="name" style={{ flex: 1, width: ph ? '100%' : undefined }} />
        <Field T={T} label={t('hub.fPhone')} value={f.phone} onChange={set('phone')} error={missing('phone')} autoComplete="tel" inputMode="tel" style={{ flex: 1, width: ph ? '100%' : undefined }} />
      </div>
      <Field T={T} label={t('hub.fCity')} value={f.city} onChange={set('city')} error={missing('city')} autoComplete="address-level2" />
      <Field T={T} label={t('hub.fLine')} value={f.line} onChange={set('line')} error={missing('line')} autoComplete="street-address" />
      <Field T={T} label={t('hub.fPostal')} value={f.postalCode} onChange={set('postalCode')} autoComplete="postal-code" inputMode="numeric" style={{ maxWidth: 220 }} />
      {/* An address that is the default stays it until another takes its place. */}
      {!address?.isDefault && (
        <List T={T} style={{ boxShadow: 'none', border: `1px solid ${T.border}` }}>
          <div style={liStyle(T, true)}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ display: 'block', fontSize: 12.5 }}>{t('hub.fDefault')}</b>
              <div style={{ fontSize: 12, color: T.textDim }}>{t('hub.fDefaultHint')}</div>
            </div>
            <Switch T={T} on={f.isDefault} onChange={set('isDefault')} label={t('hub.fDefault')} />
          </div>
        </List>
      )}
      {(incomplete || error) && (
        <p role="alert" style={{ margin: 0, fontSize: 12.5, color: 'var(--k-bad)' }}>
          {incomplete ? t('hub.addrRequired') : error === 'phone' ? (
            <>
              {t('hub.phoneNeeded')}{' '}
              <Link to={personal} style={{ color: 'inherit', fontWeight: 600 }}>{t('me.personal')}</Link>
            </>
          ) : error}
        </p>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        {!ph && <Btn T={T} onClick={onCancel} disabled={busy}>{t('hub.cancel')}</Btn>}
        <Btn T={T} kind="p" block={ph} type="submit" disabled={busy} style={busy ? { opacity: 0.6 } : undefined}>{t('hub.save')}</Btn>
      </div>
    </form>
  );
}

export default function AccountAddresses() {
  const { T, dev, user, link: section } = useAccount();
  const { ph, desk } = dev;
  const { t } = useTranslation('account');
  const book = useQuery(addressesQuery());
  // What is open: { address } for the form (address null for a new one), { remove } for the confirmation.
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null);

  const list = book.data || [];
  const close = () => { if (!busy) { setOpen(null); setError(''); } };
  const ask = (next) => { setError(''); setOpen(next); };

  // One write at a time; the list is read again before the dialog goes, so it
  // closes on what the server kept.
  const run = async (write, failed) => {
    setBusy(true);
    setError('');
    try {
      await write();
      await book.refetch();
      setOpen(null);
    } catch (e) {
      setError(e?.code === 'PHONE_REQUIRED' ? 'phone' : failed);
    } finally {
      setBusy(false);
    }
  };

  const save = (f) => {
    const body = {
      recipient: f.recipient.trim(), phone: f.phone.trim(), city: f.city.trim(), line: f.line.trim(),
      postalCode: f.postalCode.trim(), isDefault: String(!!f.isDefault),
    };
    const id = open?.address?.id;
    return run(() => (id ? addressApi.update(id, body) : addressApi.create(body)), t('hub.saveError'));
  };
  const remove = () => run(() => addressApi.remove(open.remove.id), t('hub.deleteError'));
  const makeDefault = async (a) => {
    setPending(a.id);
    try {
      await addressApi.update(a.id, { isDefault: 'true' });
      await book.refetch();
    } catch { /* the list keeps what it had */ } finally {
      setPending(null);
    }
  };

  const link = { border: 0, background: 'transparent', padding: 0, minHeight: ph ? 40 : 32, cursor: 'pointer', font: `600 12.5px ${T.font}`, color: T.accentFg };
  const grid = ph
    ? { display: 'grid', gap: 12 }
    : { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: desk ? 20 : 16, alignItems: 'start' };
  const dashed = { ...cardStyle(T), border: `1.5px dashed ${T.dark ? '#66666e' : '#b8b8be'}`, boxShadow: 'none' };

  const head = (
    <Head
      T={T} desk={desk} title={t('hub.addresses')} sub={t('hub.addrSub')}
      action={!ph && (
        <Btn T={T} kind="p" size="sm" onClick={() => ask({ address: null })}><Glyph name="plus" />{t('hub.addrAdd')}</Btn>
      )}
    />
  );

  if (book.isPending) {
    return (
      <>
        {head}
        <Skeleton label={t('hub.addrLoading')} style={grid}>
          <Sk h={152} r="var(--k-r-card)" style={{ ...cardStyle(T), boxShadow: 'none' }} />
          <Sk h={152} r="var(--k-r-card)" style={{ ...cardStyle(T), boxShadow: 'none' }} />
        </Skeleton>
      </>
    );
  }

  if (book.error && !book.data) {
    return (
      <>
        {head}
        <p role="alert" style={{ margin: 0, color: T.danger, font: `500 13px ${T.font}` }}>{t('hub.addrLoadError')}</p>
      </>
    );
  }

  return (
    <>
      {head}
      {!list.length && (
        <Card T={T} pad={16}><p style={{ margin: 0, fontSize: 12.5, color: T.textDim }}>{t('hub.addrEmpty')}</p></Card>
      )}
      <div style={grid}>
        {list.map((a) => (
          <Card key={a.id} T={T} pad={16} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 26 }}>
              <b style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{a.recipient}</b>
              {a.isDefault && <Chip T={T} tone="conf" nd>{t('hub.addrDefault')}</Chip>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12.5 }}>
              <span style={{ overflowWrap: 'anywhere' }}>{a.line}</span>
              <span style={{ color: T.textDim }}>{[a.city, a.postalCode].filter(Boolean).join(', ')}</span>
              <span style={{ color: T.textDim, fontVariantNumeric: 'tabular-nums' }}>{phoneText(a.phone)}</span>
            </div>
            <span aria-hidden="true" style={{ height: 1, background: T.border }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
              <button type="button" style={link} onClick={() => ask({ address: a })}>{t('hub.edit')}</button>
              {!a.isDefault && (
                <button type="button" style={{ ...link, opacity: pending === a.id ? 0.5 : 1 }} disabled={pending === a.id} onClick={() => makeDefault(a)}>
                  {t('hub.makeDefault')}
                </button>
              )}
              <button type="button" style={{ ...link, color: 'var(--k-bad)' }} onClick={() => ask({ remove: a })}>{t('hub.remove')}</button>
            </div>
          </Card>
        ))}
        <button
          type="button"
          onClick={() => ask({ address: null })}
          className="esy-press-soft"
          style={{ ...dashed, display: 'flex', alignItems: 'center', gap: 12, padding: 16, minHeight: 72, color: 'inherit', cursor: 'pointer', font: 'inherit', textAlign: 'left' }}
        >
          <LiIc T={T} name="plus" />
          <b style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>{t('hub.addrAdd')}</b>
        </button>
      </div>

      <Dialog
        T={T} phone={ph} open={!!open && 'address' in open} busy={busy} onClose={close} closeLabel={t('hub.close')}
        title={open?.address ? t('hub.addrEditTitle') : t('hub.addrNewTitle')}
      >
        {open && 'address' in open && (
          <AddressForm
            key={open.address?.id ?? 'new'}
            T={T} t={t} ph={ph} address={open.address} first={!list.length} user={user}
            busy={busy} error={error} onSave={save} onCancel={close} personal={section('/account/personal')}
          />
        )}
      </Dialog>

      <Dialog
        T={T} phone={ph} open={!!open?.remove} busy={busy} onClose={close} closeLabel={t('hub.close')}
        title={t('hub.deleteTitle')}
      >
        {open?.remove && (
          <>
            <div style={{ background: T.surface2, borderRadius: 'var(--k-r-in)', padding: '12px 14px', fontSize: 12.5 }}>
              <b style={{ display: 'block' }}>{open.remove.recipient}</b>
              <span style={{ color: T.textDim }}>{[open.remove.line, open.remove.city].filter(Boolean).join(', ')}</span>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: T.textDim }}>{t('hub.deleteBody')}</p>
            {error && (
              <p role="alert" style={{ margin: 0, fontSize: 12.5, color: 'var(--k-bad)' }}>
                {error === 'phone' ? t('hub.phoneNeeded') : error}
              </p>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              {!ph && <Btn T={T} onClick={close} disabled={busy}>{t('hub.cancel')}</Btn>}
              <Btn T={T} kind="bad" block={ph} onClick={remove} disabled={busy} style={busy ? { opacity: 0.6 } : undefined}>{t('hub.remove')}</Btn>
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}
