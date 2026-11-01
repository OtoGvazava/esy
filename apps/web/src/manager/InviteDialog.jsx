// Giving someone a role in this store (the design's Y2): the address, which
// role, what that role can and cannot do, and — for an owner — a deliberate
// tick, because an owner can do everything the person granting it can.
//
// The rules are the server's (MembershipService): roles go only to accounts
// that have signed in once, CUSTOMER is not grantable, a store keeps an
// owner. Its refusals carry codes, so each one is said here in the
// merchant's language. Someone already on the team is caught before the
// request: changing a role is the list's "⋯", not this dialog.
//
// A role applies at once and nothing is emailed, so the confirmation says
// so and names the address to sign in with.
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { teamApi } from '../utils/api';
import {
  Alert, Avatar, Chip, G, Glyph, Option, Sheet, SheetHead, btn, fld, fullName, ibtn, initials, input,
  li, list, teamProblem, type, useFocusRing,
} from './officeKit';

const norm = (s) => String(s || '').trim().toLowerCase();

function CanList({ T, t }) {
  const item = (ok, text) => (
    <span key={text} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', font: `400 12.5px/1.35 ${T.font}` }}>
      <span style={{ color: ok ? T.success : T.danger, display: 'inline-flex', marginTop: 1 }}>
        <Glyph size={16}>{ok ? G.check : G.close}</Glyph>
      </span>
      {text}
    </span>
  );
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14, padding: '14px 16px',
      borderRadius: 'var(--k-r-card)', background: T.surface2,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <span style={type.lbl(T)}>{t('invite.can')}</span>
        {item(true, t('invite.canOrders'))}
        {item(true, t('invite.canProducts'))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <span style={type.lbl(T)}>{t('invite.cannot')}</span>
        {item(false, t('invite.noRefunds'))}
        {item(false, t('invite.noSettings'))}
        {item(false, t('invite.noTeam'))}
      </div>
    </div>
  );
}

export default function InviteDialog({ T, isMobile, rows, devTenant, onDone, onClose }) {
  const { t, i18n } = useTranslation('manager');
  const titleId = useId();
  const fieldId = useId();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MANAGER');
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [sent, setSent] = useState(null);
  const [focus, ring] = useFocusRing();
  const [boxFocus, boxRing] = useFocusRing();

  const value = norm(email);
  const owner = role === 'OWNER';
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const blocked = !valid || busy || !!problem || (owner && !sure);

  const shut = () => { if (!busy) onClose(); };

  const submit = async (e) => {
    e?.preventDefault();
    if (blocked) return;
    const known = rows.find((r) => norm(r.email) === value);
    if (known) {
      setProblem(teamProblem(t, { code: 'TEAM_ALREADY', details: { email: value, role: known.role } }));
      return;
    }
    setBusy(true);
    try {
      const next = await teamApi.assign(value, role, devTenant);
      const staff = Array.isArray(next) ? next : [];
      onDone(staff);
      setSent(staff.find((r) => norm(r.email) === value) || { email: value, role });
    } catch (err) {
      setProblem(teamProblem(t, err, 'team.assignFailed'));
    } finally {
      setBusy(false);
    }
  };

  const again = () => {
    setSent(null);
    setEmail('');
    setRole('MANAGER');
    setSure(false);
    setProblem('');
  };

  if (sent) {
    const name = fullName(sent);
    const isOwner = sent.role === 'OWNER';
    return (
      <Sheet T={T} isMobile={isMobile} label={t('invite.title')} onClose={shut}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={shut} aria-label={t('invite.close')} style={ibtn(T)}>
            <Glyph size={18}>{G.close}</Glyph>
          </button>
        </div>
        <div role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, padding: '0 0 4px' }}>
          <span aria-hidden="true" style={{
            width: 72, height: 72, borderRadius: '50%', display: 'grid', placeItems: 'center',
            background: T.successBg, color: T.success,
          }}><Glyph size={34}>{G.check}</Glyph></span>
          <h2 style={type.h2(T, i18n.language)}>
            {t(isOwner ? 'invite.sentOwner' : 'invite.sentManager', { name: sent.firstName || name || sent.email })}
          </h2>
          <p style={{ margin: 0, maxWidth: 400, font: `400 12.5px/1.5 ${T.font}`, color: T.textDim }}>
            {t('invite.sentBody', { host: window.location.host, email: sent.email })}
          </p>
        </div>
        <div style={list(T)}>
          <div style={li(T, true)}>
            <Avatar T={T} text={initials(name, sent.email)} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ display: 'block', font: `600 12.5px/1.4 ${T.font}`, overflowWrap: 'anywhere' }}>{name || sent.email}</b>
              {name && <div style={{ font: `400 12px/1.4 ${T.font}`, color: T.textDim, overflowWrap: 'anywhere' }}>{sent.email}</div>}
            </div>
            <Chip T={T} name={isOwner ? 'conf' : 'proc'} dot={false}>{t(`role.${sent.role}`)}</Chip>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={again} style={btn(T, 'g')}>{t('invite.another')}</button>
          <button type="button" onClick={shut} data-autofocus="" style={btn(T, 'p', { block: true })}>{t('invite.done')}</button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet T={T} isMobile={isMobile} titleId={titleId} onClose={shut}>
      <form onSubmit={submit} noValidate style={{ display: 'contents' }}>
        <SheetHead T={T} titleId={titleId} title={t('invite.title')} closeLabel={t('invite.close')} onClose={shut} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <label htmlFor={fieldId} style={fld(T)}>{t('invite.email')}</label>
          <input
            id={fieldId} type="email" value={email} autoComplete="off" spellCheck={false} disabled={busy}
            data-autofocus={isMobile ? undefined : ''} inputMode="email"
            aria-invalid={problem ? 'true' : 'false'} aria-describedby={`${fieldId}-msg`}
            onChange={(e) => { setEmail(e.target.value); setProblem(''); setSure(false); }}
            {...ring}
            style={input(T, { focus, error: !!problem })}
          />
          {problem && (
            <p id={`${fieldId}-msg`} role="alert" style={{
              margin: 0, display: 'flex', gap: 8, alignItems: 'flex-start', font: `400 12.5px/1.35 ${T.font}`, color: T.danger,
            }}>
              <span style={{ display: 'inline-flex', marginTop: 1 }}><Glyph size={16}>{G.warn}</Glyph></span>
              <span>{problem}</span>
            </p>
          )}
        </div>
        {!problem && (
          <p id={`${fieldId}-msg`} style={{ margin: 0, font: `400 12px/1.45 ${T.font}`, color: T.textDim }}>{t('invite.hint')}</p>
        )}

        <div role="radiogroup" aria-labelledby={titleId} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Option T={T} name={`${titleId}-role`} on={!owner} disabled={busy}
            onSelect={() => { setRole('MANAGER'); setSure(false); }}
            title={t('role.MANAGER')} sub={t('invite.managerSub')} />
          <Option T={T} name={`${titleId}-role`} on={owner} disabled={busy}
            onSelect={() => setRole('OWNER')}
            title={t('role.OWNER')} sub={t('invite.ownerSub')} />
        </div>

        {!owner && !problem && <CanList T={T} t={t} />}
        {owner && (
          <>
            <Alert T={T} tone="warn">
              <b>{t('invite.ownerLead')}</b> {t('invite.ownerBody')}
            </Alert>
            <label style={{
              position: 'relative', display: 'flex', gap: 10, alignItems: 'flex-start', minHeight: 24,
              cursor: valid ? 'pointer' : 'default', font: `400 12.5px/1.45 ${T.font}`, color: T.text,
            }}>
              <input
                type="checkbox" checked={sure} disabled={busy || !valid} onChange={(e) => setSure(e.target.checked)}
                {...boxRing}
                style={{ position: 'absolute', opacity: 0, width: 1, height: 1, margin: 0, pointerEvents: 'none' }}
              />
              <span aria-hidden="true" style={{
                width: 22, height: 22, borderRadius: 6, flex: 'none', boxSizing: 'border-box', display: 'grid', placeItems: 'center',
                color: T.onAccent, border: `2px solid ${sure ? T.accent : T.border}`, background: sure ? T.accent : 'transparent',
                outline: boxFocus ? `2px solid ${T.accent}` : 'none', outlineOffset: 2,
              }}>{sure && <Glyph size={14} style={{ strokeWidth: 3 }}>{G.check}</Glyph>}</span>
              <span>{t('invite.ownerSure', { email: value || '…' })}</span>
            </label>
          </>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={shut} disabled={busy} style={btn(T, 'g')}>{t('invite.cancel')}</button>
          <button type="submit" disabled={blocked} aria-disabled={blocked || undefined}
            style={{ ...btn(T, 'p', { block: true, off: blocked && !busy }), opacity: busy ? 0.6 : 1 }}>
            {busy ? t('invite.working') : t(owner ? 'invite.makeOwner' : 'invite.makeManager')}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
