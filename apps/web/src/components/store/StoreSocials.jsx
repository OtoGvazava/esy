// The side menu's social buttons (the canvas's StoreNav drawer): one round
// 44 px button per channel the store has published, Instagram and Facebook on
// the theme's well, WhatsApp in its own green. Drawn only while the store's
// design keeps `show.socials` on, and only for channels the store really lists:
// a store that published none gets no row at all.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { contactApi } from '../../utils/api';
import { CHANNELS, channelHref } from '../../core/channels';
import { Icons } from '../../core/icons';
import { useDesign } from '../../core/design/useDesign';
import { useGlow } from '../../styles/glow';

// The canvas's order. A phone number is a call, not a social button; the
// About page lists it with everything else.
const SOCIAL = ['instagram', 'facebook', 'whatsapp'];
const WHATSAPP = { background: '#0e7a40', color: '#fff' };

export default function StoreSocials({ style }) {
  const { T } = useGlow();
  const { t } = useTranslation('design');
  const { show } = useDesign();
  const [channels, setChannels] = useState([]);
  const on = show.socials;

  useEffect(() => {
    if (!on) return undefined;
    const ac = new AbortController();
    contactApi.listPublic(undefined, { signal: ac.signal })
      .then((rows) => { if (!ac.signal.aborted) setChannels(Array.isArray(rows) ? rows : []); })
      // A list that cannot load draws no row; the shop still sells.
      .catch(() => {});
    return () => ac.abort();
  }, [on]);

  if (!on) return null;
  // One button per kind, in the canvas's order.
  const buttons = SOCIAL
    .map((type) => channels.find((c) => c.type === type && channelHref(c.type, c.value)))
    .filter(Boolean);
  if (!buttons.length) return null;

  return (
    <div role="group" aria-label={t('store.follow')} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, ...style }}>
      {buttons.map((c) => {
        const Ic = Icons[CHANNELS[c.type].icon];
        return (
          <a
            key={c.id} href={channelHref(c.type, c.value)} target="_blank" rel="noreferrer"
            aria-label={t(`contacts.type.${c.type}`, { ns: 'owner' })}
            style={{
              width: 44, height: 44, flex: 'none', boxSizing: 'border-box', borderRadius: 'var(--k-r-ibtn)',
              display: 'inline-grid', placeItems: 'center', textDecoration: 'none',
              ...(c.type === 'whatsapp' ? WHATSAPP : { background: T.surface2, color: T.text }),
            }}
          >
            {Ic && <Ic size={20} />}
          </a>
        );
      })}
    </div>
  );
}
