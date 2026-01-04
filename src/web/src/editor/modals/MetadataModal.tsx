import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { useEditor } from '../store/EditorContext';
import { MapMetadata } from '../types';
import { saveFileToProject } from '../utils/opfs';

interface MetadataModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const MetadataModal = ({ isOpen, onClose }: MetadataModalProps) => {
    const { mapData, dispatch, reloadAssets, activeProjectId } = useEditor();
    const [form, setForm] = useState<MapMetadata>(mapData.metadata);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (isOpen) setForm(mapData.metadata);
    }, [isOpen, mapData.metadata]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'audio' | 'image') => {
        if (!e.target.files || e.target.files.length === 0 || !activeProjectId) return;
        
        const file = e.target.files[0];
        const filename = file.name;
        
        setUploading(true);
        try {
            await saveFileToProject(activeProjectId, filename, file);
            
            if (type === 'audio') {
                setForm(prev => ({ ...prev, audioFile: filename }));
            } else {
                setForm(prev => ({ ...prev, backgroundFile: filename }));
            }
        } finally {
            setUploading(false);
        }
    };

    const handleSave = () => {
        dispatch({ type: 'UPDATE_METADATA', payload: form });
        reloadAssets(); 
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Beatmap Setup">
            <div className="space-y-6">
                {!activeProjectId && (
                    <div className="bg-danger/20 text-danger p-3 rounded text-sm font-bold border border-danger/50">
                        Warning: No active project. Changes will not be saved to disk.
                    </div>
                )}

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

                <div className="space-y-4">
                    <h3 className="text-sm uppercase font-bold text-primary tracking-widest border-b border-border pb-1">Assets</h3>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted">Audio File</label>
                            <div className="flex gap-2">
                                <input 
                                    readOnly 
                                    value={form.audioFile} 
                                    className="flex-1 bg-input/50 border border-border rounded px-3 py-2 text-sm text-muted" 
                                />
                                <label className={`cursor-pointer px-4 py-2 bg-input border border-border hover:bg-white/5 rounded text-sm font-medium transition-colors ${!activeProjectId ? 'opacity-50 pointer-events-none' : ''}`}>
                                    Browse
                                    <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileChange(e, 'audio')} disabled={!activeProjectId} />
                                </label>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted">Background Image</label>
                            <div className="flex gap-2">
                                <input 
                                    readOnly 
                                    value={form.backgroundFile} 
                                    className="flex-1 bg-input/50 border border-border rounded px-3 py-2 text-sm text-muted" 
                                />
                                <label className={`cursor-pointer px-4 py-2 bg-input border border-border hover:bg-white/5 rounded text-sm font-medium transition-colors ${!activeProjectId ? 'opacity-50 pointer-events-none' : ''}`}>
                                    Browse
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'image')} disabled={!activeProjectId} />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                    <button onClick={onClose} className="px-4 py-2 rounded text-muted hover:text-white transition-colors">Cancel</button>
                    <button 
                        onClick={handleSave} 
                        disabled={uploading}
                        className="px-6 py-2 bg-primary hover:bg-primary-hover text-black font-bold rounded shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
                    >
                        {uploading ? 'Uploading...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};