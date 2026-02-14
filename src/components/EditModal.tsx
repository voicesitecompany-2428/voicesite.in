'use client';

import React from 'react';

interface EditModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    onSave: () => void;
    isSaving?: boolean;
    saveLabel?: string;
}

export default function EditModal({
    isOpen,
    onClose,
    title,
    children,
    onSave,
    isSaving = false,
    saveLabel = 'Save Changes'
}: EditModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 transform scale-100 opacity-100 transition-all duration-300 relative mx-4 max-h-[90vh] overflow-y-auto custom-scrollbar">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-[#111418]">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <span className="material-symbols-outlined text-gray-500">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="mb-6">
                    {children}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-lg transition-colors"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-primary hover:bg-blue-600 text-white font-bold rounded-lg shadow-md transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                Saving...
                            </>
                        ) : (
                            <>
                                {saveLabel}
                                <span className="material-symbols-outlined text-sm">check</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
