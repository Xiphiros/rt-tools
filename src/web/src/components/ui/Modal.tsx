import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
}

export const Modal = ({ isOpen, onClose, title, children, className = '' }: ModalProps) => {
    // Prevent scrolling background when modal is open
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Click outside to close */}
            <div className="absolute inset-0" onClick={onClose} />
            
            <div 
                className={`relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${className}`}
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-input/50">
                    <h2 className="text-lg font-bold text-text-header tracking-tight">{title}</h2>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-muted hover:text-white transition-colors"
                        aria-label="Close"
                    >
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );

    // Render to portal root if exists, otherwise fallback (though root usually exists)
    const modalRoot = document.getElementById('modal-root') || document.body;
    return createPortal(modalContent, modalRoot);
};