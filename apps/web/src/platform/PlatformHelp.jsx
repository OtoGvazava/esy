// The help centre (the design's L2): a search over the answers, the topics for
// shoppers and for sellers, the common questions, and a way to reach a person.
//
// The answers live in the locale files (platform.json → helpCenter.a), one per
// article, so a new answer is written in translation alone; which topic an
// article belongs to, and which ones are the common questions, is structure
// and lives here. Every count on the page is counted from that corpus — the
// board's "9 articles" was a sketch, and a number that is not the number of
// answers behind the link would be the first thing a reader catches out.
//
// The search is real: it matches the words of the question, the answer and
// the topic's name, and the query rides the URL (?q=) so a result can be sent
// to someone. A topic opens the same list with that topic's answers (?topic=).
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePlatform, PTopBar, PFooter } from './PlatformShared';
import { Btn, Card, Glyph, IconBtn, Lbl, List, LiIc, ingrpInput, ingrpStyle, liStyle, type, usePDevice } from './PlatformKit';

/** Topics, in the order the page lists them, and the articles under each. */
const TOPICS = [
  { id: 'orders', aud: 'buyers', icon: 'truck', articles: ['where', 'cancel', 'phone', 'oneAccount'] },
  { id: 'pay', aud: 'buyers', icon: 'card', articles: ['howPay', 'cardSafe'] },
  { id: 'refunds', aud: 'buyers', icon: 'undo', articles: ['returnItem', 'refundWhen', 'returnWindow'] },
  { id: 'open', aud: 'sellers', icon: 'store', articles: ['openCost', 'howOpen', 'manage', 'subdomain'] },
  { id: 'payouts', aud: 'sellers', icon: 'bank', articles: ['cards', 'fee'] },
  { id: 'sellerOrders', aud: 'sellers', icon: 'box', articles: ['sellerRefund', 'sellerCancel'] },
];
const AUDIENCES = ['buyers', 'sellers'];
/** The common questions, as the design lists them. */
const FAQ = ['phone', 'oneAccount', 'refundWhen'];

const TOPIC_OF = Object.fromEntries(TOPICS.flatMap((tp) => tp.articles.map((a) => [a, tp])));
const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

/** One answer as a list row: the question, its place, and the answer when open. */
function Article({ T, t, id, open, last, onToggle, place = true }) {
  const tp = TOPIC_OF[id];
  return (
    <div style={{ borderBottom: last ? 0 : `1px solid ${T.border}` }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        style={{ ...liStyle(T, true), cursor: 'pointer', alignItems: place ? 'flex-start' : 'center' }}
      >
        <span style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: 'block', fontSize: 12.5, lineHeight: 1.45 }}>{t(`helpCenter.a.${id}.q`)}</b>
          {place && (
            <span style={{ display: 'block', fontSize: 12, color: T.textDim }}>
              {t('helpCenter.place', { aud: t(`helpCenter.aud.${tp.aud}`), topic: t(`helpCenter.topic.${tp.id}`) })}
            </span>
          )}
        </span>
        <Glyph name={open ? 'chevU' : 'chevD'} size={16} style={{ marginTop: place ? 2 : 0 }} />
      </button>
      {open && (
        <p style={{ margin: 0, padding: '0 16px 14px', marginTop: -5, fontSize: 12.5, lineHeight: 1.55, color: T.textDim, textWrap: 'pretty' }}>
          {t(`helpCenter.a.${id}.a`)}
        </p>
      )}
    </div>
  );
}

/**
 * A list of answers, one open at a time. `first` opens the first one, as the
 * design draws a result list; the common questions start closed. Remounted
 * (by key) when the query or topic changes, so a new list starts afresh.
 */
function Answers({ T, t, ids, first, place }) {
  const [open, setOpen] = useState(first ? ids[0] : null);
  return (
    <List T={T}>
      {ids.map((id, i) => (
        <Article
          key={id}
          T={T}
          t={t}
          id={id}
          place={place}
          open={open === id}
          last={i === ids.length - 1}
          onToggle={() => setOpen(open === id ? null : id)}
        />
      ))}
    </List>
  );
}

export default function PlatformHelp() {
  const { T } = usePlatform();
  const { ph, desk, gut } = usePDevice();
  const { t } = useTranslation('platform');
  const [params, setParams] = useSearchParams();
  const [focus, setFocus] = useState(false);
  const ty = type(T, desk);

  const q = params.get('q') || '';
  const topicId = params.get('topic') || '';
  const topic = TOPICS.find((tp) => tp.id === topicId) || null;
  const query = norm(q);

  // Every word of the query must appear in the question, the answer or the
  // topic's name. Georgian has no case, Latin is folded.
  const hits = useMemo(() => {
    if (!query) return [];
    const words = query.split(' ');
    return TOPICS.flatMap((tp) => tp.articles.map((id) => ({ id, tp }))).filter(({ id, tp }) => {
      const hay = norm(`${t(`helpCenter.a.${id}.q`)} ${t(`helpCenter.a.${id}.a`)} ${t(`helpCenter.topic.${tp.id}`)}`);
      return words.every((w) => hay.includes(w));
    }).map(({ id }) => id);
  }, [query, t]);

  const results = query ? hits : topic ? topic.articles : null;

  const setQuery = (value) => {
    const next = new URLSearchParams(params);
    if (value) next.set('q', value); else next.delete('q');
    next.delete('topic');
    setParams(next, { replace: true, preventScrollReset: true });
  };

  const wrap = desk
    ? { display: 'flex', flexDirection: 'column', gap: 22, padding: '30px 0 0', maxWidth: 1000, margin: '0 auto' }
    : { display: 'flex', flexDirection: 'column', gap: ph ? 18 : 22, padding: ph ? `10px ${gut}px 0` : `30px ${gut}px 0` };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: T.bg, color: T.text, font: `400 14px/1.45 ${T.font}` }}>
      <PTopBar current="help" />
      <main style={{ flex: '1 0 auto', paddingBottom: 40 }}>
        <div style={wrap}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', textAlign: 'center' }}>
            <h1 style={ty.h1}>{t('helpCenter.title')}</h1>
            <form
              role="search"
              onSubmit={(e) => e.preventDefault()}
              style={{ width: '100%', maxWidth: 560 }}
            >
              <label style={ingrpStyle(T, focus || !!q)}>
                <Glyph name="search" style={{ marginLeft: 14 }} />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setFocus(true)}
                  onBlur={() => setFocus(false)}
                  placeholder={t('helpCenter.placeholder')}
                  aria-label={t('helpCenter.searchLabel')}
                  autoComplete="off"
                  style={ingrpInput(T)}
                />
                {q && (
                  <IconBtn
                    T={T}
                    label={t('helpCenter.clear')}
                    onClick={() => setQuery('')}
                    style={{ width: 36, height: 36, marginRight: 7, borderRadius: '50%' }}
                  >
                    <Glyph name="close" size={16} />
                  </IconBtn>
                )}
              </label>
            </form>
          </div>

          {results && (
            <section aria-label={t('helpCenter.resultsLabel')} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p role="status" style={{ margin: 0, fontSize: 12.5 }}>
                <b>{t('helpCenter.count', { count: results.length, n: results.length })}</b>{' '}
                <span style={{ color: T.textDim }}>
                  {query ? t('helpCenter.quoted', { q: q.trim() }) : t(`helpCenter.topic.${topic.id}`)}
                </span>
                {topic && !query && (
                  <>
                    {' · '}
                    <Link to="/help" style={{ color: T.accentFg, fontWeight: 600, textDecoration: 'none' }}>{t('helpCenter.allTopics')}</Link>
                  </>
                )}
              </p>
              {results.length ? (
                <Answers key={`${query}|${topicId}`} T={T} t={t} ids={results} first place />
              ) : (
                <Card T={T} pad={16}>
                  <p style={{ margin: 0, fontSize: 12.5, color: T.textDim }}>{t('helpCenter.none')}</p>
                </Card>
              )}
            </section>
          )}

          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Lbl T={T} as="h2">{t('helpCenter.topicsLabel')}</Lbl>
            <div style={{
              display: 'grid', gap: ph ? 16 : desk ? 20 : 14,
              gridTemplateColumns: ph ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
            }}>
              {AUDIENCES.map((aud) => (
                <div key={aud} style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                  <b style={{ fontSize: 12.5 }}>{t(`helpCenter.aud.${aud}`)}</b>
                  <List T={T}>
                    {TOPICS.filter((tp) => tp.aud === aud).map((tp, i, arr) => (
                      <Link
                        key={tp.id}
                        to={`/help?topic=${tp.id}`}
                        aria-current={topicId === tp.id && !query ? 'true' : undefined}
                        style={{
                          ...liStyle(T, i === arr.length - 1),
                          background: topicId === tp.id && !query ? `color-mix(in oklab, ${T.accent} 7%, ${T.surface})` : 'transparent',
                        }}
                      >
                        <LiIc T={T} name={tp.icon} />
                        <b style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>{t(`helpCenter.topic.${tp.id}`)}</b>
                        <span style={{ fontSize: 12, color: T.textDim, whiteSpace: 'nowrap' }}>
                          {t('helpCenter.count', { count: tp.articles.length, n: tp.articles.length })}
                        </span>
                        <Glyph name="chevR" size={16} style={{ color: T.textDim }} />
                      </Link>
                    ))}
                  </List>
                </div>
              ))}
            </div>
          </section>

          {!results && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Lbl T={T} as="h2">{t('helpCenter.faqLabel')}</Lbl>
              <Answers T={T} t={t} ids={FAQ} place={false} />
            </section>
          )}

          <Card T={T} pad={22} id="contact" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 14, scrollMarginTop: 16 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <b style={{ ...ty.h3, display: 'block' }}>{t('helpCenter.talkTitle')}</b>
              <p style={{ margin: 0, fontSize: 12.5, color: T.textDim }}>{t('helpCenter.talkBody')}</p>
            </div>
            <Btn T={T} kind="p" href={`mailto:${t('helpCenter.email')}`}>{t('helpCenter.talkCta')}</Btn>
          </Card>
        </div>
      </main>
      <PFooter />
    </div>
  );
}
