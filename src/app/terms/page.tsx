'use client';

import React from 'react';
import { LegalPage } from '../../components/LegalPage';

export default function TermsPage() {
    return <LegalPage type="terms" onGoBack={() => window.location.href = '/'} />;
}
