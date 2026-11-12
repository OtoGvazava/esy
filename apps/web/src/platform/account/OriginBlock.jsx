// The block on top of the overview when the account was opened from an app
// (the design's U3): that place, what this account has in it, and the way
// back. A store shows the orders placed there and, for its team, the back
// office; the back office shows the store and the role; admin shows itself.
//
// Everything in it is read from the account's own data. An origin the account
// has nothing to show for (a store that does not exist, a back office it has
// no role in, admin for someone who is not one) draws nothing.
import { useQuery } from '@tanstack/react-query';
import { directoryQuery } from '../../core/query/queries';
import { money } from '../../core/money';
import { ADMIN_BRAND, safeAccent } from '../../core/tokens';
import { adminUrl, managerUrl } from '../../utils/hosts';
import { useAuth } from '../../contexts/AuthContext';
import { Av, Btn, Chip, Glyph, Lbl, List, initialsOf, liStyle } from '../PlatformKit';
import { clearOrigin, originUrl } from './origin';
import { NewChip, OrderRow, Row, isCancelled, officeUrl, roleText, storeName } from './parts';

/** The orders shown in the block: the latest two, so the rest of the overview stays in reach. */
const LATEST = 2;

/** The block's first row: the place, one line about it, and the way back. */
function Place({ T, t, ph, mark, title, sub, href }) {
  return (
    <div style={{ ...liStyle(T, false), flexWrap: ph ? 'wrap' : 'nowrap' }}>
      {mark}
      <div style={{ flex: 1, minWidth: 0 }}>
        <b style={{ display: 'block', fontSize: 12.5, overflowWrap: 'anywhere' }}>{title}</b>
        <div style={{ fontSize: 12, color: T.textDim, overflowWrap: 'anywhere' }}>{sub}</div>
      </div>
      <Btn T={T} kind="s" size="sm" ph={ph} href={href} onClick={clearOrigin} style={ph ? { flex: '1 0 100%' } : undefined}>
        <Glyph name="back" size={16} />{t('hub.back')}
      </Btn>
    </div>
  );
}

function Block({ T, label, children }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Lbl T={T} as="h2">{label}</Lbl>
      <List T={T}>{children}</List>
    </section>
  );
}

export default function OriginBlock({ T, t, ph, origin, orders, stores }) {
  const { isAdmin } = useAuth();
  const kind = origin?.kind;
  const sub = origin?.sub;
  const here = kind === 'store' ? orders.filter((o) => o.store?.subdomain === sub) : [];
  const run = sub ? stores.find((s) => s.subdomain === sub) : null;
  const known = run || here[0]?.store || null;
  // A store this account has neither bought from nor a role in: its name and
  // colour come from the public directory, which only lists stores that exist.
  const directory = useQuery({ ...directoryQuery(), enabled: kind === 'store' && !known });
  const store = known || (directory.data || []).find((s) => s.subdomain === sub) || null;
  const href = originUrl(origin);

  if (kind === 'admin' && isAdmin) {
    return (
      <Block T={T} label={t('hub.hereAdmin')}>
        <Place
          T={T} t={t} ph={ph} href={href}
          mark={<Av T={T} size="sm" color={ADMIN_BRAND}><Glyph name="shield" size={16} /></Av>}
          title={t('hub.adminName')} sub={t('hub.adminSub')}
        />
        <Row T={T} icon="store" label={t('hub.adminStores')} href={adminUrl('/stores')} onClick={clearOrigin} />
        <Row T={T} icon="shield" label={t('hub.adminAdmins')} href={adminUrl('/admins')} onClick={clearOrigin} last />
      </Block>
    );
  }

  if (kind === 'manager' && run) {
    const name = storeName(run);
    const owner = run.myRole !== 'MANAGER';
    const q = `?tenant=${encodeURIComponent(run.subdomain)}`;
    return (
      <Block T={T} label={t('hub.hereManager')}>
        <Place
          T={T} t={t} ph={ph} href={href}
          mark={<Av T={T} size="sm" color={safeAccent(run.primaryColor)}>{initialsOf(name)}</Av>}
          title={t('hub.officeTitle', { store: name })}
          sub={`${t('me.host', { sub: run.subdomain })} · ${roleText(t, run)}`}
        />
        <Row
          T={T} icon="bag" label={t('hub.newOrders')} href={managerUrl(`/orders${q}`)} onClick={clearOrigin}
          chip={<NewChip T={T} t={t} n={Number(run.newOrders) || 0} />}
        />
        {/* The team is the owner's to manage. */}
        {owner && <Row T={T} icon="team" label={t('hub.team')} href={managerUrl(`/team${q}`)} onClick={clearOrigin} />}
        <Row
          T={T} icon="swap" label={t('hub.switchStore')} href={managerUrl('/')} onClick={clearOrigin} last
          meta={t('hub.storesCount', { count: stores.length, n: stores.length })}
        />
      </Block>
    );
  }

  if (kind === 'store' && store) {
    const name = storeName(store);
    // What was spent is what was kept: a cancelled order is not money spent.
    const spent = here.filter((o) => !isCancelled(o)).reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const latest = here.slice(0, LATEST);
    return (
      <Block T={T} label={t('hub.hereStore')}>
        <Place
          T={T} t={t} ph={ph} href={href}
          mark={<Av T={T} size="sm" color={safeAccent(store.primaryColor)}>{initialsOf(name)}</Av>}
          title={name}
          sub={here.length
            ? `${t('hub.ordersCount', { count: here.length, n: here.length })} · ${money(spent)}`
            : t('hub.noOrdersHere')}
        />
        {latest.map((o, i) => (
          <OrderRow key={o.orderNumber || o.id} T={T} t={t} order={o} bare last={!run && i === latest.length - 1} />
        ))}
        {run && (
          <Row
            T={T} icon="store" label={t('hub.officeRow')} href={officeUrl(run)} onClick={clearOrigin} last
            chip={<Chip T={T} tone="conf" nd>{roleText(t, run)}</Chip>}
          />
        )}
      </Block>
    );
  }

  return null;
}
