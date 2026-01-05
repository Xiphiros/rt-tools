import { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { useEditor } from '../store/EditorContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPalette, faCheck } from '@fortawesome/free-solid-svg-icons';

interface LayerColorModalProps {
    isOpen: boolean;
    onClose: () => void;
    layerId: string | null;
}

const PRESET_COLORS = [
    '#38bdf8', // Sky (Default)
    '#c084fc', // Purple
    '#f472b6', // Pink
    '#4ade80', // Green
    '#fbbf24', // Amber
    '#ef4444', // Red
    '#94a3b8', // Slate
    '#2dd4bf', // Teal
];

export const LayerColorModal = ({ isOpen, onClose, layerId }: LayerColorModalProps) => {
    const { mapData, dispatch } = useEditor();
    const [color, setColor] = useState('#38bdf8');
    
    // Load current color when modal opens
    useEffect(() => {
        if (isOpen && layerId) {
            const layer = mapData.layers.find(l => l.id === layerId);
            if (layer) {
                setColor(layer.color);
            }
        }
    }, [isOpen, layerId, mapData.layers]);

    const handleSave = () => {
        if (layerId) {
            dispatch({
                type: 'UPDATE_LAYER',
                payload: { id: layerId, changes: { color } }
            });
        }
        onClose();
    };

    if (!layerId) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Layer Color">
            <div className="space-y-6">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <div 
                            className="w-16 h-16 rounded-lg border-2 border-white/20 shadow-inner"
                            style={{ backgroundColor: color }}
                        />
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-bold text-muted uppercase tracking-wider">Hex Code</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="bg-input border border-border rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-primary flex-1"
                                />
                                <input 
                                    type="color" 
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="w-10 h-10 p-1 bg-card border border-border rounded cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted uppercase tracking-wider">Presets</label>
                        <div className="flex flex-wrap gap-3">
                            {PRESET_COLORS.map(preset => (
                                <button
                                    key={preset}
                                    onClick={() => setColor(preset)}
                                    className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                                        color.toLowerCase() === preset.toLowerCase() 
                                        ? 'border-white scale-110 shadow-lg' 
                                        : 'border-transparent hover:scale-105'
                                    }`}
                                    style={{ backgroundColor: preset }}
                                >
                                    {color.toLowerCase() === preset.toLowerCase() && (
                                        <FontAwesomeIcon icon={faCheck} className="text-black/50 text-xs" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <button onClick={onClose} className="px-4 py-2 rounded text-muted hover:text-white transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-6 py-2 bg-primary hover:bg-primary-hover text-black font-bold rounded shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
                    >
                        <FontAwesomeIcon icon={faPalette} />
                        <span>Update Color</span>
                    </button>
                </div>
            </div>
        </Modal>
    );
};