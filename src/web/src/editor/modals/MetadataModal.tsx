import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { useEditor } from '../store/EditorContext';
import { MapMetadata } from '../types';

interface MetadataModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const MetadataModal = ({ isOpen, onClose }: MetadataModalProps) => {
    const { mapData, dispatch } = useEditor();
    const [form, setForm] = useState<MapMetadata>(mapData.metadata);

    // Sync form with store when opening
    useEffect(() => {
        if (isOpen) setForm(mapData.metadata);
    }, [isOpen, mapData.metadata]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        dispatch({ type: 'UPDATE_METADATA', payload: form });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Beatmap Setup">
            <div className="space-y-6">
                {/* General Info */}
                <div className="space-y-4">
                    <h3 className="text-sm uppercase font-bold text-primary tracking-widest border-b border-border pb-1">General</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted">Artist</label>
                            <input name="artist" value={form.artist} onChange={handleChange} className="w-full bg-input border border-border rounded px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted">Title</label>
                            <input name="title" value={form.title} onChange={handleChange} className="w-full bg-input border border-border rounded px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted">Difficulty Name</label>
                            <input name="difficultyName" value={form.difficultyName} onChange={handleChange} className="w-full bg-input border border-border rounded px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted">Mapper</label>
                            <input name="mapper" value={form.mapper} onChange={handleChange} className="w-full bg-input border border-border rounded px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                        </div>
                    </div>
                </div>

                {/* Files */}
                <div className="space-y-4">
                    <h3 className="text-sm uppercase font-bold text-primary tracking-widest border-b border-border pb-1">Files</h3>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted">Audio Filename</label>
                            <input name="audioFile" value={form.audioFile} onChange={handleChange} className="w-full bg-input border border-border rounded px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted">Background Image</label>
                            <input name="backgroundFile" value={form.backgroundFile} onChange={handleChange} className="w-full bg-input border border-border rounded px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                    <button onClick={onClose} className="px-4 py-2 rounded text-muted hover:text-white transition-colors">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-primary hover:bg-primary-hover text-black font-bold rounded shadow-lg shadow-cyan-500/20 transition-all">Save Changes</button>
                </div>
            </div>
        </Modal>
    );
};