'use client';

import React from 'react';
import { LegalPage } from '../../components/LegalPage';
import { previousPage } from '../../lib/prev-page';

// Back: the page the visitor came from on this site, otherwise the home page.
const goBack = () => {
    if (previousPage() && window.history.length > 1) window.history.back();
    else window.location.href = '/';
};

export default function TermsPage() {
    return <LegalPage type="terms" onGoBack={goBack} />;
}
