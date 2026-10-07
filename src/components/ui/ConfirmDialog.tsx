'use client';

import React, { useCallback, useRef, useState } from 'react';

interface ConfirmOptions {
    title: string;
    body?: string;
    icon?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Red confirm button for destructive actions. */
    danger?: boolean;
}

/**
 * Promise-based replacement for window.confirm, styled like the site's other notice dialogs.
 *   const { confirm, dialog } = useConfirm();
 *   if (!(await confirm({ title: '삭제할까요?' }))) return;
 *   ... render {dialog} once in the component.
 */
export function useConfirm() {
    const [opts, setOpts] = useState<ConfirmOptions | null>(null);
    const resolver = useRef<((v: boolean) => void) | null>(null);

    const confirm = useCallback(
        (o: ConfirmOptions) =>
            new Promise<boolean>((resolve) => {
                resolver.current = resolve;
                setOpts(o);
            }),
        [],
    );

    const close = (v: boolean) => {
        resolver.current?.(v);
        resolver.current = null;
        setOpts(null);
    };

    const dialog = opts ? (
        <div className="oc-notice" role="alertdialog" aria-modal="true" onClick={() => close(false)}>
            <div className="oc-notice__card" onClick={(e) => e.stopPropagation()}>
                <span className="oc-notice__icon" aria-hidden="true">
                    {opts.icon ?? '🌾'}
                </span>
                <strong>{opts.title}</strong>
                {opts.body ? <p>{opts.body}</p> : null}
                <div className="oc-notice__actions">
                    <button type="button" className="is-ghost" onClick={() => close(false)}>
                        {opts.cancelLabel ?? '취소'}
                    </button>
                    <button type="button" className={opts.danger ? 'is-danger' : ''} autoFocus onClick={() => close(true)}>
                        {opts.confirmLabel ?? '확인'}
                    </button>
                </div>
            </div>
        </div>
    ) : null;

    return { confirm, dialog };
}
