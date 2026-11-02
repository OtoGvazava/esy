// Settings → Contact (the design's Z6): one field per channel, a prefix on
// each, and beside them a sample of what a shopper sees.
//
// The store's channels are a list (D10), and the board's form is laid over
// it: each field is one entry, a store with a second phone gets a second
// phone field, an emptied field removes its entry and a filled empty one adds
// one. Only fields that changed are written, so an entry hidden from shoppers
// stays hidden (the field says so) until it is edited.
//
// The board also has TikTok and e-mail. The channel list has no such types
// (ContactChannel.TYPES is phone, WhatsApp, Facebook, Instagram), so they are
// not drawn until it does.
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { contactApi, handleApiError } from '../utils/api';
import { contactsQuery } from '../core/query/managerQueries';
import { Sk, Skeleton } from '../components/skeleton/Skeleton';
import { Alert, BxIcon, Fld, SaveBar } from './officeBx';
import { SkField, SkIn } from './officeSk';

// The board's order. Phone numbers carry Georgia's code as a prefix.
const TYPES = ['phone', 'whatsapp', 'instagram', 'facebook'];
const PREFIX = { phone: '+995', whatsapp: '+995', instagram: 'instagram.com/', facebook: 'facebook.com/' };
const TEL = ['phone', 'whatsapp'];

/** What a field shows for a stored value: the part after the prefix. */
function shown(type, value) {
  const v = String(value || '').trim();
  if (TEL.includes(type)) return v.replace(/^\+?995[\s-]*/, '');
  return v.replace(/^https?:\/\//i, '').replace(/^www\./i, '')
    .replace(/^(?:instagram\.com|facebook\.com|fb\.com)\//i, '').replace(/^@/, '').replace(/\/+$/, '');
}

/** What is stored for a field: a phone number in full, a handle bare. */
function stored(type, input) {
  const v = String(input || '').trim();
  if (!v) return '';
  if (TEL.includes(type)) return v.startsWith('+') ? v : `+995 ${v}`;
  return shown(type, v);
}

export default function ContactTab() {
  const { t } = useTranslation('manager');
  const { t: tOwner } = useTranslation('owner');
  const [params] = useSearchParams();
  const sub = params.get('tenant') || undefined;
  // The channels as the server has them; what the owner types is kept apart
  // (edits), over them, so a read that lands while they type changes nothing
  // they typed.
  const channels = useQuery(contactsQuery());
  const rows = channels.data ?? (channels.isError ? [] : null);
  const [edits, setEdits] = useState({});
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const error = saveError || (channels.isError ? handleApiError(channels.error, tOwner('contacts.loadFailed')) : '');
  const [saved, setSaved] = useState(false);

  // A field for each of the four kinds and the sample beside them, until the
  // channels are in; the save bar is already at the foot.
  if (!rows) {
    return (
      <>
        <Skeleton label={t('settingsTabs.loading')} className="bx-two">
          <div className="bx-card bx-pad bx-stk" style={{ gap: 14 }}>
            <p className="bx-sm"><SkIn w="80%" /></p>
            {[0, 1, 2, 3].map((i) => <SkField key={i} w={i % 2 ? '22%' : '28%'} />)}
          </div>
          <div className="bx-card bx-pad bx-stk" style={{ gap: 12 }}>
            <div className="bx-rowb">
              <span className="bx-lbl bx-grow"><SkIn w="40%" /></span>
              <Sk w={64} h={26} r={13} />
            </div>
            <div className="bx-row" style={{ gap: 10 }}>
              <Sk w={44} h={44} r="var(--k-r-ibtn)" />
              <Sk w={44} h={44} r="var(--k-r-ibtn)" />
              <Sk w={44} h={44} r="var(--k-r-ibtn)" />
            </div>
          </div>
        </Skeleton>
        <SaveBar t={t} dirty={false} busy={false} saved={false} onSave={() => {}} onCancel={() => {}} />
      </>
    );
  }

  // Every entry of a type gets a field; a type with none gets an empty one.
  const fields = TYPES.flatMap((type) => {
    const mine = rows.filter((c) => c.type === type)
      .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    if (!mine.length) return [{ id: `new-${type}`, type, channel: null, n: 0 }];
    return mine.map((c, n) => ({ id: String(c.id), type, channel: c, n }));
  });
  const value = (f) => (f.id in edits ? edits[f.id] : shown(f.type, f.channel?.value));
  const was = (f) => stored(f.type, f.channel?.value);
  const pending = fields.filter((f) => f.id in edits && stored(f.type, edits[f.id]) !== was(f));
  const dirty = pending.length > 0;

  const save = async () => {
    if (busy || !dirty) return;
    setBusy(true);
    setSaveError('');
    setSaved(false);
    let done = false;
    try {
      for (const f of pending) {
        const next = stored(f.type, edits[f.id]);
        if (f.channel && !next) await contactApi.remove(f.channel.id, sub);
        else if (f.channel) await contactApi.update(f.channel.id, { value: next }, sub);
        else await contactApi.create({ type: f.type, value: next, isPublic: true }, sub);
      }
      done = true;
    } catch (e) {
      setSaveError(handleApiError(e, tOwner('contacts.saveFailed')));
    } finally {
      // The list is read again either way. The typed values give way to it
      // only once it is in, so the fields never show the old values between.
      await channels.refetch();
      if (done) {
        setEdits({});
        setSaved(true);
      }
      setBusy(false);
    }
  };

  // The sample: what a shopper's contact row would show with these values.
  const filled = (type) => fields.some((f) => f.type === type && stored(type, value(f)));
  const icons = ['instagram', 'facebook', 'phone'].filter(filled);

  return (
    <>
      {error && <Alert tone="bad" icon="warn"><span className="bx-sm">{error}</span></Alert>}
      <div className="bx-two">
        <div className="bx-card bx-pad bx-stk" style={{ gap: 14 }}>
          <p className="bx-sm bx-dim">{t('settingsTabs.contact.intro')}</p>
          {fields.map((f) => {
            const name = tOwner(`contacts.type.${f.type}`);
            const label = f.n ? `${name} · ${f.n + 1}` : name;
            const hidden = f.channel && f.channel.isPublic === false && !(f.id in edits);
            return (
              <Fld key={f.id} label={hidden ? `${label} · ${tOwner('contacts.hidden')}` : label}>
                <span className="bx-ingrp">
                  <span className="pre">{PREFIX[f.type]}</span>
                  <input
                    value={value(f)} aria-label={label}
                    inputMode={TEL.includes(f.type) ? 'tel' : 'text'} autoComplete="off"
                    placeholder={TEL.includes(f.type) ? '5XX XX XX XX' : t('settingsTabs.contact.handle')}
                    onChange={(e) => { setSaved(false); setEdits((p) => ({ ...p, [f.id]: e.target.value })); }}
                  />
                </span>
              </Fld>
            );
          })}
        </div>

        <div
          className="bx-card bx-pad bx-stk" aria-hidden="true"
          style={{ gap: 12, background: 'var(--k-sf2)', border: '1.5px dashed color-mix(in srgb, var(--k-fg) 20%, transparent)', boxShadow: 'none', pointerEvents: 'none' }}
        >
          <div className="bx-rowb">
            <span className="bx-lbl">{t('settingsTabs.contact.sample')}</span>
            <span className="bx-chip nd c-proc" style={{ background: 'var(--k-sf)' }}>{t('settingsTabs.contact.sampleTag')}</span>
          </div>
          {icons.length > 0 && (
            <div className="bx-row" style={{ gap: 10 }}>
              {icons.map((k) => <span key={k} className="bx-ibtn" style={{ background: 'var(--k-sf)' }}><BxIcon name={k} /></span>)}
            </div>
          )}
          {filled('whatsapp') && (
            <span className="bx-btn bx-btn-b" style={{ background: '#0e7a40', color: '#fff', filter: 'saturate(.5)' }}>
              <BxIcon name="whatsapp" />{t('settingsTabs.contact.whatsapp')}
            </span>
          )}
          {!icons.length && !filled('whatsapp') && <span className="bx-sm bx-dim">{t('settingsTabs.contact.sampleEmpty')}</span>}
        </div>
      </div>
      <SaveBar t={t} dirty={dirty} busy={busy} saved={saved} onSave={save} onCancel={() => { setEdits({}); setSaveError(''); }} />
    </>
  );
}
