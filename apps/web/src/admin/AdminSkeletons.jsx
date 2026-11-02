// What each admin screen draws while its data is on the way (the skeleton
// kit, components/skeleton): the screen's own grid, cards, paddings and row
// heights, with grey bars where its names and figures go and its fixed labels
// as they are, so nothing moves when the data lands. Each one mirrors its
// screen box for box; a change to a screen's layout belongs here too.
//
// They live apart from the screens so the shell can draw the two screens that
// are fetched on their own (configuration, SMS and email) in their shape
// while their code is still on its way.
//
// Each picture sits in one <Skeleton>, which says "loading" once to assistive
// tech and shows nothing for the first 150 ms; what is inside is hidden from
// assistive tech.
import { Trans, useTranslation } from 'react-i18next';
import { Sk, Skeleton } from '../components/skeleton/Skeleton';
import { Card, Note } from '../core/primitives';
import { useDevice } from '../contexts/DeviceContext';
import { useAdminTokens } from './adminTokens';
import { Alert, Glyph, List, Mono, RowIcon } from './AdminKit';

// A bar on the grey ground of a figures strip or a total row, where the
// kit's own grey would not show.
const ON_GREY = { background: 'color-mix(in oklab, var(--k-fg) 8%, transparent)' };

/**
 * A line of text in `font`, drawn as a bar. The bar sits in a real line box,
 * so the line is exactly as tall as the text it stands for. In a row, give it
 * a width in pixels: a percentage has nothing to be a percentage of there.
 */
function Line({ font, w = '60%', bar, style }) {
  return (
    <span style={{ display: 'block', font, ...style }}>
      <Sk w={w} h="0.72em" r={6} style={{ display: 'inline-block', verticalAlign: 'middle', ...bar }} />
    </span>
  );
}

/** A control drawn whole: `pad` above and below a line of `font`, as tall as the real one. */
function LineBox({ font, w, pad, r = 999 }) {
  return (
    <span style={{
      position: 'relative', display: 'inline-block', width: w, padding: `${pad}px 0`, font,
      verticalAlign: 'middle', flex: 'none',
    }}>
      {'\u00a0'}
      <Sk w="100%" h="100%" r={r} style={{ position: 'absolute', inset: 0 }} />
    </span>
  );
}

/** The shared Chip (core/primitives): 5px above and below an 11px line. */
function ChipBar({ T, w }) {
  return <LineBox font={`700 11px ${T.font}`} w={w} pad={5} />;
}

/** A switch's 46×28 mark in its 44px-tall control. */
function SwitchBar() {
  return (
    <span style={{ width: 46, height: 44, display: 'grid', placeItems: 'center', flex: 'none' }}>
      <Sk w={46} h={28} r={14} />
    </span>
  );
}

/** A stat as AdminUI's Stat draws it: the label as it is, a bar for the figure. */
function StatBar({ T, label, bar }) {
  return (
    <div style={{ minWidth: 96 }}>
      <div style={{ font: `600 11px ${T.font}`, color: T.textMute, letterSpacing: '0.07em' }}>{label}</div>
      <Line font={`700 16px ${T.mono}`} w={64} bar={bar} style={{ marginTop: 3 }} />
    </div>
  );
}

// ─── /stores ────────────────────────────────────────────────────────────────
/** AdminStores below its search field: the platform's figures, then the table or the cards. */
export function StoresSkeleton() {
  const T = useAdminTokens();
  const { t } = useTranslation('admin');
  const { isDesktop } = useDevice();
  const th = {
    textAlign: 'left', padding: '10px 14px', font: `500 12px ${T.font}`, color: T.textMute,
    borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap',
  };
  const td = { padding: '12px 14px', borderBottom: `1px solid ${T.border}`, font: `500 13px ${T.font}`, verticalAlign: 'middle' };
  const right = { ...td, textAlign: 'right' };
  const stats = [t('stores.colProducts'), t('stores.colOrders'), t('stores.colRevenue'), t('stores.colFees')];
  return (
    <Skeleton label={t('ui.loading')}>
      <div aria-hidden="true">
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(${isDesktop ? 4 : 2}, minmax(0, 1fr))`,
          gap: 12, marginBottom: 14,
        }}>
          {[t('stores.kpiStores'), t('stores.active'), t('stores.suspended'), t('stores.colRevenue')].map((label, i) => (
            <Card key={i} T={T} pad={16}>
              <div style={{ font: `500 13px ${T.font}`, color: T.textDim }}>{label}</div>
              <Line font={`800 24px ${T.font}`} w="45%" style={{ marginTop: 6 }} />
            </Card>
          ))}
        </div>

        {isDesktop ? (
          <Card T={T} pad={0} style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>{t('stores.colStore')}</th>
                  <th style={th}>{t('stores.colOwner')}</th>
                  <th style={{ ...th, textAlign: 'right' }}>{t('stores.colOrders')}</th>
                  <th style={{ ...th, textAlign: 'right' }}>{t('stores.colRevenue')}</th>
                  <th style={{ ...th, textAlign: 'right' }}>{t('stores.colFees')}</th>
                  <th style={th}>{t('stores.colStatus')}</th>
                  <th style={th} />
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <Sk w={34} h={34} r={12} />
                        <div style={{ width: 132 }}>
                          <Line font={`700 14px ${T.font}`} w="80%" />
                          <Line font={`500 12px ${T.mono}`} w="55%" />
                        </div>
                      </div>
                    </td>
                    <td style={td}><Line font={td.font} w={150} /></td>
                    <td style={right}><Line font={td.font} w={32} /></td>
                    <td style={right}><Line font={td.font} w={64} /></td>
                    <td style={right}><Line font={td.font} w={56} /></td>
                    <td style={td}><ChipBar T={T} w={58} /></td>
                    <td style={right}>
                      <Sk w={84} h={36} r={13} style={{ display: 'inline-block', verticalAlign: 'middle' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <Card key={i} T={T} pad={0} style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, padding: '14px 16px' }}>
                  <Sk w={40} h={40} r={12} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Line font={`700 15px ${T.font}`} w="50%" />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                      <Line font={`500 12px ${T.mono}`} w={84} />
                      <ChipBar T={T} w={72} />
                    </div>
                    <Line font={`500 12.5px ${T.font}`} w="62%" style={{ marginTop: 5 }} />
                  </div>
                  <ChipBar T={T} w={58} />
                </div>
                <div style={{
                  display: 'flex', gap: 22, flexWrap: 'wrap',
                  padding: '12px 16px', borderTop: `1px solid ${T.border}`, background: T.surface2,
                }}>
                  {stats.map((label, j) => <StatBar key={j} T={T} label={label} bar={ON_GREY} />)}
                </div>
                <div style={{ display: 'flex', gap: 8, padding: '12px 16px', justifyContent: 'flex-end' }}>
                  <Sk w={84} h={36} r={13} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Skeleton>
  );
}

// ─── /stores/:sub ───────────────────────────────────────────────────────────
/** AdminStoreDetail: the record's card, the verified row, then members and recent orders. */
export function StoreDetailSkeleton() {
  const T = useAdminTokens();
  const { t } = useTranslation('admin');
  const panel = (title, sub, rows) => (
    <Card T={T} pad={0} style={{ overflow: 'hidden', alignSelf: 'start' }}>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ font: `700 14px ${T.font}`, color: T.text, letterSpacing: '-0.01em' }}>{title}</div>
        <div style={{ font: `500 12px ${T.font}`, color: T.textMute, marginTop: 2 }}>{sub}</div>
      </div>
      {rows}
    </Card>
  );
  const edge = { padding: '12px 16px', borderTop: `1px solid ${T.border}` };
  const stats = [t('detail.statProducts'), t('detail.statOrders'), t('detail.statRevenue'), t('detail.statFees')];
  return (
    <Skeleton label={t('ui.loading')}>
      <div aria-hidden="true">
        <Card T={T} pad={18} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
            <Sk w={48} h={48} r={14} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ marginBottom: 8 }}>
                <Line font={`700 22px ${T.font}`} w="40%" />
                <Line font={`400 13px ${T.font}`} w="32%" style={{ marginTop: 4 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Line font={`500 12.5px ${T.mono}`} w={96} />
                <ChipBar T={T} w={88} />
                <ChipBar T={T} w={58} />
              </div>
            </div>
            <Sk w={84} h={36} r={13} />
          </div>
          <div style={{
            display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 16, paddingTop: 16,
            borderTop: `1px solid ${T.border}`,
          }}>
            {stats.map((label, i) => <StatBar key={i} T={T} label={label} />)}
          </div>
          <Note T={T} tone="admin" style={{ marginTop: 14 }}>{t('money.excludesRefunds')}</Note>
        </Card>

        <List T={T} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', minHeight: 56, boxSizing: 'border-box' }}>
            <Sk w={34} h={34} r={10} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ display: 'block', font: `700 12.5px/1.4 ${T.font}`, color: T.text }}>{t('verify.title')}</b>
              <Line font={`500 12px/1.45 ${T.font}`} w="70%" style={{ marginTop: 2 }} />
            </div>
            <SwitchBar />
          </div>
        </List>

        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {panel(t('detail.members'), t('detail.membersSub'), (
            <>
              {[0, 1].map((i) => (
                <div key={i} style={{ ...edge, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <Sk w={15} h={15} r={4} />
                  <Line font={`500 13.5px ${T.font}`} w="70%" style={{ flex: 1, minWidth: 160 }} />
                  <ChipBar T={T} w={64} />
                  <Sk w={104} h={36} r={13} />
                  <Sk w={78} h={36} r={13} />
                </div>
              ))}
              {/* The add form: a field (its label, then a 55px box) and three 46px buttons. */}
              <div style={{ padding: '14px 16px', borderTop: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, minWidth: 190, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ font: `600 11px ${T.font}`, color: T.textMute, letterSpacing: '0.07em' }}>
                      {t('detail.addMemberLabel')}
                    </span>
                    <Sk h={55} r={14} />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Sk w={76} h={46} r={13} />
                    <Sk w={84} h={46} r={13} />
                  </div>
                  <Sk w={68} h={46} r={13} />
                </div>
                <div style={{ marginTop: 8, font: `500 11.5px ${T.font}`, color: T.textMute, lineHeight: 1.5 }}>
                  {t('detail.addMemberHint')}
                </div>
              </div>
            </>
          ))}
          {panel(t('detail.recentOrders'), t('detail.recentOrdersSub'), [0, 1, 2].map((i) => (
            <div key={i} style={{ ...edge, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 150, flex: 1 }}>
                <Line font={`600 12.5px ${T.mono}`} w={112} />
                <Line font={`500 11.5px ${T.font}`} w={128} style={{ marginTop: 2 }} />
              </div>
              <span style={{ display: 'inline-flex', gap: 6 }}>
                <ChipBar T={T} w={70} />
                <ChipBar T={T} w={56} />
              </span>
              <div style={{ minWidth: 90, textAlign: 'right' }}>
                <Line font={`700 13.5px ${T.mono}`} w={64} />
              </div>
            </div>
          )))}
        </div>
      </div>
    </Skeleton>
  );
}

// ─── /billing ───────────────────────────────────────────────────────────────
/** AdminBilling below its month switch: the three figures, the note, and the table. */
export function BillingSkeleton() {
  const T = useAdminTokens();
  const { t } = useTranslation('admin');
  const { isMobile, isDesktop } = useDevice();
  const th = {
    textAlign: 'left', padding: '12px 16px', font: `600 12px ${T.font}`, color: T.textDim,
    borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap',
  };
  const td = {
    padding: isMobile ? '13px 12px' : '13px 16px', borderBottom: `1px solid ${T.border}`,
    font: `500 13.5px ${T.font}`, verticalAlign: 'middle',
  };
  const num = { ...td, textAlign: 'right' };
  const foot = { background: T.surface2, borderBottom: 'none' };
  const pad = isMobile ? { paddingLeft: 12, paddingRight: 12 } : null;
  const figure = `600 13.5px ${T.font}`;
  return (
    <Skeleton label={t('ui.loading')}>
      <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 16 }}>
        <div style={{
          display: 'grid', gap: isMobile ? 12 : 16,
          gridTemplateColumns: `repeat(${isMobile ? 2 : 3}, minmax(0, 1fr))`,
        }}>
          {[t('billing.kpiSales'), t('billing.kpiFees'), t('billing.kpiOwed')].map((label, i) => (
            <div key={i} style={{
              padding: 16, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0,
              borderRadius: 16, background: T.surface, border: `1px solid ${T.border}`,
              ...(isMobile && i === 2 ? { gridColumn: '1 / -1' } : null),
            }}>
              <span style={{ font: `500 12.5px ${T.font}`, color: T.textDim }}>{label}</span>
              <Line font={`700 ${isDesktop ? 28 : 24}px/1.1 ${T.font}`} w="55%" />
              <Line font={`500 12px/1.4 ${T.font}`} w="70%" />
            </div>
          ))}
        </div>

        <Alert T={T} tone="warn">{t('billing.notInvoiced')}</Alert>

        <List T={T}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...th, ...pad }}>{t('billing.colStore')}</th>
                <th style={{ ...th, ...pad, textAlign: 'right' }}>{t('billing.colSales')}</th>
                <th style={{ ...th, ...pad, textAlign: 'right' }}>{t('billing.colFees')}</th>
                {!isMobile && <th style={th}>{t('billing.colStatus')}</th>}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3, 4].map((i) => (
                <tr key={i}>
                  <td style={td}><Line font={`700 12.5px/1.35 ${T.font}`} w="60%" /></td>
                  <td style={num}><Line font={figure} w={64} /></td>
                  <td style={num}><Line font={figure} w={52} /></td>
                  {!isMobile && (
                    <td style={td}><Sk w={84} h={26} r={999} style={{ display: 'inline-block', verticalAlign: 'middle' }} /></td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ ...td, ...foot }}><Line font={`700 13.5px ${T.font}`} w="45%" bar={ON_GREY} /></td>
                <td style={{ ...num, ...foot }}><Line font={figure} w={72} bar={ON_GREY} /></td>
                <td style={{ ...num, ...foot }}><Line font={figure} w={60} bar={ON_GREY} /></td>
                {!isMobile && <td style={{ ...td, ...foot }} />}
              </tr>
            </tfoot>
          </table>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            padding: '10px 16px', borderTop: `1px solid ${T.border}`, flexWrap: 'wrap',
          }}>
            <Line font={`500 12.5px ${T.font}`} w={96} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Sk w={104} h={isMobile ? 40 : 38} r={12} />
              <Sk w={84} h={isMobile ? 40 : 38} r={12} />
            </div>
          </div>
        </List>
      </div>
    </Skeleton>
  );
}

// ─── /admins ────────────────────────────────────────────────────────────────
/** AdminAdmins' list column: who has access, and the line under the list. */
export function AdminsSkeleton() {
  const T = useAdminTokens();
  const { t } = useTranslation('admin');
  return (
    <Skeleton label={t('ui.loading')}>
      <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <List T={T}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ borderBottom: i === 2 ? 'none' : `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', minHeight: 56, boxSizing: 'border-box' }}>
                <Sk w={34} h={34} r={17} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Line font={`700 12.5px/1.4 ${T.font}`} w="38%" />
                  <Line font={`400 12px/1.4 ${T.font}`} w="62%" />
                </div>
              </div>
            </div>
          ))}
        </List>
        <Line font={`400 12px/1.45 ${T.font}`} w="72%" style={{ padding: '0 4px' }} />
      </div>
    </Skeleton>
  );
}

// ─── /config ────────────────────────────────────────────────────────────────
/** AdminConfig: the store's line, the values, and beside them the reserved names. */
export function ConfigSkeleton() {
  const T = useAdminTokens();
  const { t } = useTranslation('admin');
  const { isMobile, isDesktop } = useDevice();
  // A value row: its name as it is, bars for its source chip and its value;
  // the description as it is where it never changes (the bank's follows the
  // bank), then the Change button or the switch.
  const row = (field, fixedDesc, toggle) => (
    <div key={field} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: 16, minHeight: 56, boxSizing: 'border-box',
      borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{
          display: 'flex', gap: isMobile ? 6 : 8, minWidth: 0,
          flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center',
        }}>
          <b style={{ font: `700 12.5px/1.4 ${T.font}`, color: T.text }}>{t(`config.name.${field}`)}</b>
          <Sk w={124} h={26} r={999} />
        </div>
        <Line font={`600 13px/1.45 ${T.mono}`} w="34%" />
        {fixedDesc
          ? <span style={{ font: `500 12px/1.45 ${T.font}`, color: T.textDim }}>{t(`config.desc.${field}`)}</span>
          : <Line font={`500 12px/1.45 ${T.font}`} w="80%" />}
      </div>
      {toggle ? <SwitchBar /> : <Sk w={78} h={isMobile ? 40 : 38} r={12} />}
    </div>
  );
  return (
    <Skeleton label={t('ui.loading')} style={{ maxWidth: 1180, margin: '0 auto' }}>
      <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 20 }}>
        {/* The store's line: one sentence beside its icon. */}
        <Sk h={48} r={16} />
        <div style={{
          display: 'grid', gap: isMobile ? 14 : 20, alignItems: 'start',
          gridTemplateColumns: isDesktop ? 'minmax(0, 1.6fr) minmax(0, 1fr)' : 'minmax(0, 1fr)',
        }}>
          <List T={T}>
            {row('serviceFeeRate', true)}
            {row('bogEnv', false)}
            {row('publicBaseUrl', true)}
            {row('designEnabled', true, true)}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', minHeight: 56, boxSizing: 'border-box', color: T.text }}>
              <RowIcon T={T} name="sliders" />
              <span style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: 'block', font: `700 12.5px/1.4 ${T.font}` }}>{t('config.advancedTitle')}</b>
                <span style={{ display: 'block', font: `500 12px/1.45 ${T.font}`, color: T.textDim, marginTop: 2 }}>
                  {t('config.advancedSub')}
                </span>
              </span>
              <Glyph name="chevD" />
            </div>
          </List>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              padding: 16, borderRadius: 16, background: T.surface, border: `1px solid ${T.border}`,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <b style={{ font: `600 16px/1.3 ${T.font}`, color: T.text }}>{t('config.reservedTitle')}</b>
                <Sk w={34} h={26} r={999} />
              </div>
              <p style={{ margin: 0, font: `500 12px/1.5 ${T.font}`, color: T.textDim }}>{t('config.reservedSub')}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[52, 64, 44, 70, 58, 48, 66, 54, 60, 46, 62, 50].map((w, i) => (
                  <LineBox key={i} font={`500 12px ${T.mono}`} w={w} pad={3} r={7} />
                ))}
              </div>
            </div>
            <Alert T={T} tone="warn" icon="db">{t('config.volatile')}</Alert>
          </div>
        </div>
      </div>
    </Skeleton>
  );
}

// ─── /integrations ──────────────────────────────────────────────────────────
// The matrix's rows, as AdminIntegrations lists them.
const MESSAGE_ROWS = ['otp', 'orderPlaced', 'orderShipped', 'orderOut', 'orderDelivered', 'orderCancelled', 'orderRefunded'];

/** AdminIntegrations: the two channel cards and the editor, beside the matrix of messages. */
export function IntegrationsSkeleton() {
  const T = useAdminTokens();
  const { t } = useTranslation('admin');
  const { isMobile, isDesktop } = useDevice();
  const label = { font: `500 12.5px ${T.font}`, color: T.textDim };
  const small = `500 12px/1.5 ${T.font}`;
  // A channel card: its name and line as they are; bars for the key, the
  // sender and where it comes from.
  const channel = (title, sub, note) => (
    <div style={{
      padding: 16, borderRadius: 16, background: T.surface, border: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Sk w={34} h={34} r={10} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: 'block', font: `700 15px/1.3 ${T.font}`, color: T.text }}>{title}</b>
          <div style={{ font: `500 12px/1.4 ${T.font}`, color: T.textDim }}>{sub}</div>
        </div>
        <SwitchBar />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '5px 0' }}>
          <span style={label}>{t('integrations.apiKey')}</span>
          <Line font={`600 12.5px ${T.font}`} w={32} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '5px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={label}>{t('integrations.sender')}</span>
            <Line
              font={`600 12.5px ${T.font}`}
              w={48}
              style={{ padding: isMobile ? '12px 0' : '4px 0', margin: isMobile ? '-12px 0' : 0 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Line font={`500 12px ${T.mono}`} w={96} />
            <Sk w={128} h={26} r={999} />
          </div>
        </div>
      </div>
      {note && <p style={{ margin: 0, font: small, color: T.textDim }}>{note}</p>}
    </div>
  );
  // The editor as it opens: the order-received text message, which has both
  // channels and so the channel switch.
  const editor = (
    <div style={{ padding: 16, borderRadius: 16, background: T.surface, border: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Line font={`600 16px/1.3 ${T.font}`} w={180} />
          <Sk w={64} h={26} r={999} />
        </div>
        <Sk h={46} r={12} />
        <Sk h={84} r={12} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Sk h={6} r={3} style={{ flex: 1 }} />
          <Line font={`500 12px ${T.font}`} w={120} />
        </div>
        <div>
          <Line font={`500 12px/1.55 ${T.font}`} w="100%" />
          <Line font={`500 12px/1.55 ${T.font}`} w="64%" />
        </div>
        <Line font={small} w="50%" />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Sk w={136} h={38} r={12} />
          <Sk w={84} h={38} r={12} />
        </div>
      </div>
    </div>
  );
  const col = {
    width: isMobile ? 46 : 72, flex: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center',
    whiteSpace: 'nowrap',
  };
  const lbl = { font: '600 11.5px/1.2 var(--k-font-m)', letterSpacing: '0.06em', color: T.textDim };
  const matrix = (
    <List T={T}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', minHeight: 48,
        borderBottom: `1px solid ${T.border}`,
      }}>
        <b style={{ flex: 1, minWidth: 0, font: `600 16px/1.3 ${T.font}`, color: T.text }}>{t('integrations.templatesTitle')}</b>
        <span style={{ ...col, ...lbl }}>{isMobile ? <Glyph name="sms" size={16} /> : 'SMS'}</span>
        <span style={{ ...col, ...lbl }}>{isMobile ? <Glyph name="mail" size={16} /> : t('integrations.email')}</span>
        {isMobile && <span style={{ width: 16, flex: 'none' }} />}
      </div>
      {MESSAGE_ROWS.map((key) => (
        <div key={key} style={{ borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', minHeight: 56 }}>
            <div style={{ flex: 1, minWidth: 0, padding: '11px 0' }}>
              <b style={{ display: 'block', font: `700 12.5px/1.4 ${T.font}`, color: T.text }}>{t(`integrations.row.${key}`)}</b>
              <Line font={`500 12px/1.4 ${T.font}`} w="55%" />
            </div>
            <span style={col}><Sk w={46} h={28} r={14} /></span>
            <span style={col}><Sk w={46} h={28} r={14} /></span>
            {isMobile && <span style={{ width: 16, flex: 'none' }} />}
          </div>
        </div>
      ))}
      <div style={{ padding: 16, font: small, color: T.textDim }}>{t('integrations.cancelNote')}</div>
    </List>
  );
  return (
    <Skeleton label={t('ui.loading')} style={{ maxWidth: 1180, margin: '0 auto' }}>
      <div aria-hidden="true" style={{
        display: 'grid', gap: isMobile ? 14 : 20, alignItems: 'start',
        gridTemplateColumns: isDesktop ? 'minmax(0, 1.6fr) minmax(0, 1fr)' : 'minmax(0, 1fr)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div style={{
            display: 'grid', gap: 16, alignItems: 'start',
            gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
          }}>
            {channel('SMS', t('integrations.smsSub'), (
              <Trans t={t} i18nKey="integrations.senderEnvNote" components={{ mono: <Mono T={T} /> }} />
            ))}
            {channel(t('integrations.email'), t('integrations.emailSub'), null)}
          </div>
          {!isMobile && editor}
          <p style={{ margin: 0, font: small, color: T.textDim }}>{t('integrations.keysNote')}</p>
        </div>
        {matrix}
      </div>
    </Skeleton>
  );
}

/** The shell's fallback while a screen fetched on its own (router/admin.jsx) arrives. */
export function LazyScreenSkeleton({ pathname }) {
  if (pathname.startsWith('/config')) return <ConfigSkeleton />;
  if (pathname.startsWith('/integrations')) return <IntegrationsSkeleton />;
  return null;
}
