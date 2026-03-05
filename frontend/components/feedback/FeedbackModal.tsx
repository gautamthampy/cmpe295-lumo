"use client";

import React, { useEffect, useRef } from "react";

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    content: string;
    hintLevel?: number; // 1, 2, or 3
    isMotivation?: boolean;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
    isOpen,
    onClose,
    title,
    content,
    hintLevel,
    isMotivation = false,
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    // Handle Escape key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    // Handle focus trapping
    useEffect(() => {
        if (isOpen) {
            closeButtonRef.current?.focus();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const bgGradient = isMotivation
        ? "bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-500/30"
        : "bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border-indigo-500/30";

    const accentColor = isMotivation ? "text-emerald-400" : "text-indigo-400";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="feedback-title"
                aria-describedby="feedback-content"
                className={`relative w-full max-w-lg p-6 rounded-2xl border bg-gray-900/90 shadow-2xl ${bgGradient}`}
            >
                <div className="flex items-start justify-between mb-4">
                    <div className="flex flex-col">
                        <h2 id="feedback-title" className="text-xl font-bold text-white">
                            {title}
                        </h2>
                        {hintLevel && (
                            <span className={`text-xs uppercase tracking-wider mt-1 ${accentColor}`}>
                                Hint Level {hintLevel}
                            </span>
                        )}
                    </div>
                    <button
                        ref={closeButtonRef}
                        onClick={onClose}
                        aria-label="Close feedback dialog"
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* aria-live region ensures screen readers announce new feedback content automatically */}
                <div
                    id="feedback-content"
                    aria-live="polite"
                    className="text-gray-200 text-lg leading-relaxed whitespace-pre-wrap"
                >
                    {content}
                </div>

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
};
