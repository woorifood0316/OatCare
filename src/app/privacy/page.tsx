'use client';

import React from 'react';
import { LegalPage } from '../../components/LegalPage';
import { leaveLegalPage } from '../../lib/legal-back';

export default function PrivacyPage() {
    return <LegalPage type="privacy" onGoBack={leaveLegalPage} />;
}
