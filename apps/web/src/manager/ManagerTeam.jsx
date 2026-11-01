// Team and roles — who runs this store (the design's Y1, decision D17).
//
// OWNER-only. Until this screen existed a store role could only be granted
// from admin.esy.ge, so an owner adding their own colleague had to ask the
// platform. The rules are the server's and are shared with the admin screen:
// a store always keeps an owner, a role goes only to an account that already
// exists, and CUSTOMER is not grantable. Its refusals carry codes, so they
// are said here in the merchant's language.
//
// The list, with each person's role and a "⋯" for changing it; the button
// that opens Y2; and beside them what each role may do.
//
// The board also says when each person was last in ("ბოლოს: დღეს"). Nothing
// records that, so it is not shown rather than guessed.
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useDevice } from '../contexts/DeviceContext';
import { useTK } from '../core/useTK';
import { teamApi } from '../utils/api';
import InviteDialog from './InviteDialog';
import {
  Alert, Avatar, Chip, G, Glyph, PageHead, Sheet, SheetHead, btn, card, fullName, ibtn, initials, kv,
  li, list, teamProblem, type,
} from './officeKit';

const norm = (s) => String(s || '').trim().toLowerCase();

/** The "⋯" beside a person: change their role, or take it away. */
function RowMenu({ T, t, member, busy, onRole, onRemove }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const menuId = useId();
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  const other = member.role === 'OWNER' ? 'MANAGER' : 'OWNER';
  const item = (danger) => ({
    display: 'flex', alignItems: 'center', width: '100%', minHeight: 44, padding: '0 14px', boxSizing: 'border-box',
    border: 0, borderRadius: 10, background: 'transparent', cursor: 'pointer', textAlign: 'left',
    font: `500 14px ${T.font}`, color: danger ? T.danger : T.text, whiteSpace: 'nowrap',
  });
  return (
    <div ref={wrap} style={{ position: 'relative', flex: 'none' }}>
      <button
        type="button" aria-label={t('people.actions', { name: fullName(member) || member.email })}
        aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} disabled={busy}
        onClick={() => setOpen((v) => !v)} style={ibtn(T, 'transparent')}
      ><Glyph>{G.more}</Glyph></button>
      {open && (
        <div id={menuId} role="menu" style={{
          position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 20, minWidth: 210, padding: 6,
          borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`,
          boxShadow: '0 18px 44px -18px rgba(0,0,0,.4)', boxSizing: 'border-box',
        }}>
          <button type="button" role="menuitem" style={item(false)} onClick={() => { setOpen(false); onRole(other); }}>
            {t(`people.make.${other}`)}
          </button>
          <button type="button" role="menuitem" style={item(true)} onClick={() => { setOpen(false); onRemove(); }}>
            {t('people.remove')}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ManagerTeam() {
  const { T } = useTK();
  const { t } = useTranslation('manager');
  const { user } = useAuth();
  const { isDesktop, isMobile } = useDevice();
  const [params] = useSearchParams();
  const devTenant = params.get('tenant') || undefined;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState(null);
  const removeTitle = useId();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await teamApi.list(devTenant);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setRows([]);
      setError(teamProblem(t, e, 'team.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [devTenant, t]);

  useEffect(() => { load(); }, [load]);

  // Every write answers with the refreshed list, so the table is the server's
  // answer rather than a local guess — promoting a second owner changes what
  // is allowed for the first.
  const write = async (fn, fallbackKey) => {
    setBusy(true);
    setError('');
    try {
      const next = await fn();
      setRows(Array.isArray(next) ? next : []);
      return true;
    } catch (e) {
      setError(teamProblem(t, e, fallbackKey));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const owners = rows.filter((r) => r.role === 'OWNER').length;
  const me = norm(user?.email);
  // The owner first, then everyone else as the server lists them.
  const sorted = [...rows].sort((a, b) => (a.role === b.role ? 0 : a.role === 'OWNER' ? -1 : 1));

  const rules = [
    ['orders', 'both'],
    ['products', 'both'],
    ['refunds', 'owner'],
    ['settings', 'owner'],
    ['team', 'owner'],
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : isDesktop ? 20 : 18 }}>
      <PageHead T={T} mobile={isMobile} title={t('people.title')} sub={t('people.sub')} />

      {error && <Alert T={T} tone="bad" role="alert">{error}</Alert>}

      <div style={{
        display: 'grid', gap: 20, alignItems: 'start',
        gridTemplateColumns: isDesktop ? 'minmax(0, 1.6fr) minmax(0, 1fr)' : 'minmax(0, 1fr)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          {/* Not clipped, so a row's "⋯" menu can open past the list's edge;
              the rows paint no background, so the corners stay round. */}
          <div style={{ ...list(T), overflow: 'visible' }}>
            {loading ? (
              <div role="status" style={{ ...li(T, true), font: `400 13px ${T.font}`, color: T.textDim }}>{t('team.loading')}</div>
            ) : sorted.length === 0 ? (
              <div style={{ ...li(T, true), font: `400 13px ${T.font}`, color: T.textDim }}>{t('team.empty')}</div>
            ) : sorted.map((m, i) => {
              const name = fullName(m);
              const self = me && norm(m.email) === me;
              // The last owner cannot go or step down — the server refuses
              // both, so offering them would only produce a predictable error.
              const lastOwner = m.role === 'OWNER' && owners <= 1;
              return (
                <div key={m.email} style={li(T, i === sorted.length - 1)}>
                  <Avatar T={T} text={initials(name, m.email)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ display: 'block', font: `600 12.5px/1.4 ${T.font}`, overflowWrap: 'anywhere' }}>
                      {name || m.email}
                      {self && <span style={{ fontWeight: 400, color: T.textDim }}> · {t('people.you')}</span>}
                    </b>
                    {name && <div style={{ font: `400 12px/1.4 ${T.font}`, color: T.textDim, overflowWrap: 'anywhere' }}>{m.email}</div>}
                  </div>
                  <Chip T={T} name={m.role === 'OWNER' ? 'conf' : 'proc'} dot={false}>{t(`role.${m.role}`, { defaultValue: m.role })}</Chip>
                  {lastOwner ? (
                    !isMobile && <span style={{ font: `400 12px ${T.font}`, color: T.textDim, whiteSpace: 'nowrap' }}>{t('people.onlyOwner')}</span>
                  ) : (
                    <RowMenu
                      T={T} t={t} member={m} busy={busy}
                      onRole={(role) => write(() => teamApi.assign(m.email, role, devTenant), 'team.assignFailed')}
                      onRemove={() => setRemoving(m)}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <button type="button" onClick={() => setInviting(true)} disabled={loading} style={{ ...btn(T, 'p'), alignSelf: 'flex-start' }}>
            <Glyph>{G.plus}</Glyph>{t('people.give')}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div style={{ ...card(T, 22), display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 style={type.h3(T)}>{t('people.whoTitle')}</h2>
            <div>
              {rules.map(([k, who]) => (
                <div key={k} style={{ ...kv, font: `400 12.5px/1.45 ${T.font}` }}>
                  <span>{t(`people.who.${k}`)}</span>
                  <span style={{ color: who === 'owner' ? T.accentFg : T.textDim, whiteSpace: 'nowrap' }}>
                    {who === 'owner' ? t('role.OWNER') : t('people.both')}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <Alert T={T}>{t('people.note')}</Alert>
        </div>
      </div>

      {inviting && (
        <InviteDialog
          T={T} isMobile={isMobile} rows={rows} devTenant={devTenant}
          onDone={(next) => setRows(next)}
          onClose={() => setInviting(false)}
        />
      )}

      {removing && (
        <Sheet T={T} isMobile={isMobile} titleId={removeTitle} onClose={() => { if (!busy) setRemoving(null); }}>
          <SheetHead T={T} titleId={removeTitle} title={t('people.removeTitle')} closeLabel={t('invite.close')}
            onClose={() => { if (!busy) setRemoving(null); }} />
          <p style={{ margin: 0, font: `400 13px/1.5 ${T.font}`, color: T.textDim }}>
            {me && norm(removing.email) === me
              ? t('team.removeSelfConfirm')
              : t('team.removeConfirm', { email: removing.email })}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" disabled={busy} data-autofocus="" onClick={() => setRemoving(null)} style={btn(T, 'g')}>
              {t('invite.cancel')}
            </button>
            <button
              type="button" disabled={busy}
              onClick={async () => { if (await write(() => teamApi.remove(removing.email, devTenant), 'team.removeFailed')) setRemoving(null); }}
              style={{ ...btn(T, 'bad', { block: true }), opacity: busy ? 0.6 : 1 }}
            >{t('people.remove')}</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
