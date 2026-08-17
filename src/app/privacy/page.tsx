'use client';

import React from 'react';
import { LegalPage } from '../../components/LegalPage';

export default function PrivacyPage() {
    return <LegalPage type="privacy" onGoBack={() => window.location.href = '/'} />;
}
