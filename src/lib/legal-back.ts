// Closing 이용약관 / 개인정보처리방침. Client side only.
import { previousPage } from './prev-page';

/**
 * Back to where the visitor came from: the previous page of this site in the same tab; a tab opened just for the
 * document (sign-up forms open it in a new tab so the form keeps what was typed) is closed, which shows the form
 * again; otherwise the home page.
 */
export function leaveLegalPage() {
    if (previousPage() && window.history.length > 1) {
        window.history.back();
        return;
    }
    if (window.history.length <= 1) {
        window.close();
        // the browser refused to close it (it was not opened as a new tab): go home instead
        setTimeout(() => {
            if (!window.closed) window.location.href = '/';
        }, 250);
        return;
    }
    window.location.href = '/';
}
