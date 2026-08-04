// StoreMark — store avatar: uploaded logo when set, else a gradient tile of
// generated initials. `logoUrl` uses an inline data-URI (no network in the
// capture harness) just to exercise the image branch.
import React from 'react';
import { StoreMark } from 'esy';

const studioForm = { name: 'Studio Form', displayName: 'Studio Form', primaryColor: '#6366f1', secondaryColor: '#a855f7', subdomain: 'studio-form' };
const keramika = { name: 'Keramika Tbilisi', displayName: 'Keramika Tbilisi', primaryColor: '#d97706', secondaryColor: '#f59e0b', subdomain: 'keramika-tbilisi' };
const noorRugs = { name: 'Noor Rugs', displayName: 'Noor Rugs', primaryColor: '#0891b2', secondaryColor: '#0891b2', subdomain: 'noor-rugs' };

const logoDataUri = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">'
  + '<rect width="64" height="64" rx="16" fill="#1f2937"/>'
  + '<circle cx="32" cy="25" r="11" fill="#f5f5f0"/>'
  + '<rect x="13" y="41" width="38" height="15" rx="7.5" fill="#f5f5f0"/>'
  + '</svg>'
);

export const Initials = () => (
  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
    <StoreMark store={studioForm} size={48} radius={14} />
    <StoreMark store={keramika} size={48} radius={14} />
    <StoreMark store={noorRugs} size={48} radius={14} />
  </div>
);

export const WithRing = () => <StoreMark store={studioForm} size={64} radius={18} ring />;

export const WithLogo = () => <StoreMark store={{ ...keramika, logoUrl: logoDataUri }} size={56} radius={16} ring />;

export const Small = () => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
    <StoreMark store={studioForm} size={26} radius={8} />
    <StoreMark store={keramika} size={26} radius={8} />
    <StoreMark store={noorRugs} size={26} radius={8} />
  </div>
);
