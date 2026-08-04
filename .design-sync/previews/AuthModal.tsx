// AuthModal — sign-in dialog, single Google OAuth CTA (no email/password path).
import React from 'react';
import { AuthModal } from 'esy';

export const Open = () => <AuthModal open onClose={() => {}} />;
