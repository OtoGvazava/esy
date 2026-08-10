// /stores/:sub — one store's record: who runs it, what it has sold, and what it
// owes. This is the page a support conversation is answered from, so it puts
// the membership list and the last handful of orders on the same screen as the
// suspend switch: deciding to pull a storefront down should not require
// remembering what was on the previous page.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi, handleApiError } from '../utils/api';
import { useAdminTokens } from './adminTokens';
import { Btn, Card, Chip, Field, Note, SectionTitle } from '../core/primitives';
import { Mark, RoleChip, StatusPair } from '../core/domain';
import { Icons } from '../core/icons';
import {
  Empty, Failed, Loading, Stat, StoreStatus, SuspendDialog,
  count, dateTime, isSuspended, lari,
} from './AdminUI';

// The ported design's fulfilment tone map keys the "out for delivery" state as
// OUT, while the API sends the entity's own OUT_FOR_DELIVERY (Order.Status).
// Translating it here keeps the chip's colour right without editing the shared
// design module; the label always comes from t(), never from this code.
const TONE_CODE = { OUT_FOR_DELIVERY: 'OUT' };

function Panel({ T, title, children, sub }) {
  return (
    <Card T={T} pad={0} style={{ overflow: 'hidden', alignSelf: 'start' }}>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ font: `700 14px ${T.font}`, color: T.text, letterSpacing: '-0.01em' }}>
          {title}
        </div>
        {sub && (
          <div style={{ font: `500 12px ${T.font}`, color: T.textMute, marginTop: 2 }}>{sub}</div>
        )}
      </div>
      {children}
    </Card>
  );
}

const STAFF_ROLES = ['OWNER', 'MANAGER'];

function MemberRow({ T, t, member, busy, onAssign, onRemove }) {
  const other = STAFF_ROLES.find((r) => r !== member.role);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      padding: '12px 16px', borderTop: `1px solid ${T.border}`,
    }}>
      <span style={{ color: T.textMute, display: 'flex' }}><Icons.mail size={15} /></span>
      <span style={{ flex: 1, minWidth: 160, font: `500 13.5px ${T.font}`, color: T.text }}>
        {member.email}
      </span>
      <RoleChip
        T={T}
        role={member.role}
        label={t(`role.${member.role}`, { defaultValue: member.role })}
        showCode={false}
      />
      {other && (
        <Btn T={T} kind="quiet" size="sm" disabled={busy} onClick={() => onAssign(member.email, other)}>
          {t(`detail.makeRole.${other}`)}
        </Btn>
      )}
      <Btn T={T} kind="danger" size="sm" disabled={busy} onClick={() => onRemove(member)}>
        {t('detail.removeMember')}
      </Btn>
    </div>
  );
}

/**
 * Adding staff is a plain form rather than a dialog: unlike suspending a store
 * it takes nothing away, and it is the action an admin came to this screen to
 * perform. Removing one is confirmed, because it can leave a person unable to
 * reach a shop they were running.
 */
function AddMember({ T, t, busy, onAssign }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MANAGER');

  const submit = async (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    const ok = await onAssign(value, role);
    if (ok) setEmail('');
  };

  return (
    <form onSubmit={submit} style={{ padding: '14px 16px', borderTop: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 190 }}>
          <Field
            T={T}
            label={t('detail.addMemberLabel')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('admins.addPlaceholder')}
            type="email"
            autoComplete="off"
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {STAFF_ROLES.map((r) => (
            <Btn
              key={r}
              T={T}
              kind={role === r ? 'dark' : 'quiet'}
              size="md"
              type="button"
              onClick={() => setRole(r)}
            >
              {t(`role.${r}`, { defaultValue: r })}
            </Btn>
          ))}
        </div>
        <Btn T={T} kind="dark" size="md" type="submit" disabled={busy || !email.trim()}>
          {t('detail.addMember')}
        </Btn>
      </div>
      <div style={{ marginTop: 8, font: `500 11.5px ${T.font}`, color: T.textMute, lineHeight: 1.5 }}>
        {t('detail.addMemberHint')}
      </div>
    </form>
  );
}

function OrderRow({ T, t, lang, order }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      padding: '12px 16px', borderTop: `1px solid ${T.border}`,
    }}>
      <div style={{ minWidth: 150, flex: 1 }}>
        <div style={{ font: `600 12.5px ${T.mono}`, color: T.text }}>{order.orderNumber}</div>
        <div style={{ font: `500 11.5px ${T.font}`, color: T.textMute, marginTop: 2 }}>
          {dateTime(order.createdAt, lang) || '—'}
        </div>
      </div>
      <StatusPair
        T={T}
        status={TONE_CODE[order.status] || order.status}
        payment={order.paymentStatus || 'NONE'}
        statusLabel={t(`orderStatus.${order.status}`, { defaultValue: order.status })}
        paymentLabel={t(`paymentStatus.${order.paymentStatus || 'NONE'}`, {
          defaultValue: order.paymentStatus || '',
        })}
      />
      <div style={{ font: `700 13.5px ${T.mono}`, color: T.text, minWidth: 90, textAlign: 'right' }}>
        {lari(order.total, lang) || '—'}
      </div>
    </div>
  );
}

export default function AdminStoreDetail() {
  const T = useAdminTokens();
  const { t, i18n } = useTranslation('admin');
  const lang = i18n.language;
  const { sub } = useParams();

  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const abortRef = useRef(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError('');
    setMissing(false);
    try {
      const data = await adminApi.getStore(sub, { signal: ac.signal });
      if (ac.signal.aborted) return;
      setStore(data);
    } catch (e) {
      if (ac.signal.aborted || e?.name === 'AbortError') return;
      setStore(null);
      if (e?.status === 404) setMissing(true);
      else setError(handleApiError(e, t('detail.loadFailed')));
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [sub, t]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  // The API answers with the updated store, but only the list fields — members
  // and recentOrders are kept from the record already on screen. Anything that
  // is not a store means re-reading the record rather than patching a guess.
  const applyWrite = (updated) => {
    if (updated?.subdomain) setStore((prev) => ({ ...prev, ...updated }));
    else load();
  };

  // Both member writes answer with the full refreshed detail — members
  // included — so the list is replaced with the server's version rather than
  // patched locally. A role change can cascade (promoting a second owner
  // changes what is allowed for the first), and a guessed list would diverge.
  const applyDetail = (updated) => {
    if (updated?.subdomain) setStore(updated);
    else load();
  };

  const assignMember = async (email, role) => {
    setBusy(true);
    setActionError('');
    try {
      applyDetail(await adminApi.assignMember(store.subdomain, email, role));
      return true;
    } catch (e) {
      setActionError(handleApiError(e, t('detail.assignFailed')));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (member) => {
    if (!window.confirm(t('detail.removeMemberConfirm', { email: member.email }))) return;
    setBusy(true);
    setActionError('');
    try {
      applyDetail(await adminApi.removeMember(store.subdomain, member.email));
    } catch (e) {
      setActionError(handleApiError(e, t('detail.removeMemberFailed')));
    } finally {
      setBusy(false);
    }
  };

  const reactivate = async () => {
    setBusy(true);
    setActionError('');
    try {
      applyWrite(await adminApi.reactivateStore(store.subdomain));
    } catch (e) {
      setActionError(handleApiError(e, t('stores.reactivateFailed')));
    } finally {
      setBusy(false);
    }
  };

  const back = (
    <Link
      to="/stores"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12,
        font: `600 12.5px ${T.font}`, color: T.textDim, textDecoration: 'none',
      }}
    >
      <Icons.arrowL size={14} />
      {t('detail.back')}
    </Link>
  );

  const wrap = { padding: 20, maxWidth: 1040, margin: '0 auto' };

  if (loading && !store) {
    return <div style={wrap}>{back}<Loading T={T} /></div>;
  }
  if (missing) {
    return (
      <div style={wrap}>
        {back}
        <Empty T={T} title={t('detail.notFound')} body={t('detail.notFoundBody', { sub })} />
      </div>
    );
  }
  if (error || !store) {
    return (
      <div style={wrap}>
        {back}
        <Failed T={T} message={error || t('detail.loadFailed')} onRetry={load} />
      </div>
    );
  }

  const off = isSuspended(store);
  const name = store.displayName || store.name || store.subdomain;
  const members = Array.isArray(store.members) ? store.members : [];
  const orders = Array.isArray(store.recentOrders) ? store.recentOrders : [];

  return (
    <div style={wrap}>
      {back}

      <Card T={T} pad={18} style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <Mark T={T} store={{ name }} size={48} radius={14} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <SectionTitle
              T={T}
              lang={lang}
              title={name}
              sub={store.ownerEmail || t('stores.noOwner')}
              style={{ marginBottom: 8 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ font: `500 12.5px ${T.mono}`, color: T.textMute }}>{store.subdomain}</span>
              <Chip T={T} tone="neutral">{store.category || t('detail.noCategory')}</Chip>
              <StoreStatus T={T} store={store} />
            </div>
          </div>
          <div>
            {off ? (
              <Btn T={T} kind="quiet" size="sm" disabled={busy} onClick={reactivate}>
                {busy ? t('ui.working') : t('stores.reactivate')}
              </Btn>
            ) : (
              <Btn T={T} kind="danger" size="sm" onClick={() => setSuspending(true)}>
                {t('stores.suspend')}
              </Btn>
            )}
          </div>
        </div>

        {off && (
          <Note T={T} tone="danger" style={{ marginTop: 14 }}>
            {t('detail.suspendedOn', {
              at: dateTime(store.suspendedAt, lang) || t('detail.dateUnknown'),
            })}
            {' — '}
            {store.suspendReason || t('stores.noReason')}
          </Note>
        )}

        {actionError && (
          <div style={{ marginTop: 12, font: `500 12.5px ${T.font}`, color: T.dangerFg }}>
            {actionError}
          </div>
        )}

        <div style={{
          display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 16, paddingTop: 16,
          borderTop: `1px solid ${T.border}`,
        }}>
          <Stat T={T} label={t('detail.statProducts')} value={count(store.productCount, lang)} />
          <Stat T={T} label={t('detail.statOrders')} value={count(store.orderCount, lang)} />
          <Stat T={T} label={t('detail.statRevenue')} value={lari(store.revenue, lang)} />
          <Stat T={T} label={t('detail.statFees')} value={lari(store.feesOwed, lang)} tone={T.accentFg} />
        </div>
        <Note T={T} tone="admin" style={{ marginTop: 14 }}>{t('money.excludesRefunds')}</Note>
      </Card>

      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <Panel T={T} title={t('detail.members')} sub={t('detail.membersSub')}>
          {members.length === 0 ? (
            <div style={{ padding: '18px 16px', font: `500 13px ${T.font}`, color: T.textMute }}>
              {t('detail.noMembers')}
            </div>
          ) : (
            members.map((m) => (
              <MemberRow
                key={`${m.email}-${m.role}`}
                T={T}
                t={t}
                member={m}
                busy={busy}
                onAssign={assignMember}
                onRemove={removeMember}
              />
            ))
          )}
          <AddMember T={T} t={t} busy={busy} onAssign={assignMember} />
        </Panel>

        <Panel T={T} title={t('detail.recentOrders')} sub={t('detail.recentOrdersSub')}>
          {orders.length === 0 ? (
            <div style={{ padding: '18px 16px', font: `500 13px ${T.font}`, color: T.textMute }}>
              {t('detail.noOrders')}
            </div>
          ) : (
            orders.map((o) => <OrderRow key={o.orderNumber} T={T} t={t} lang={lang} order={o} />)
          )}
        </Panel>
      </div>

      {suspending && (
        <SuspendDialog
          T={T}
          store={store}
          onCancel={() => setSuspending(false)}
          onSuspended={(updated) => { applyWrite(updated); setSuspending(false); }}
        />
      )}
    </div>
  );
}
