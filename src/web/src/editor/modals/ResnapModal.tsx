import { useState, useMemo } from 'react';
import { Modal } from '../../components/ui/Modal';
import { useEditor } from '../store/EditorContext';
import { snapTime } from '../utils/timing';
import { COMMON_SNAPS } from '../utils/snapColors';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagic } from '@fortawesome/free-solid-svg-icons';

interface ResnapModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ResnapModal = ({ isOpen, onClose }: ResnapModalProps) => {
    const { mapData, dispatch } = useEditor();
    const [targetDivisor, setTargetDivisor] = useState(4); // Default 1/4

    // Analyze impact
    const selectedNotes = mapData.notes.filter(n => n.selected);
    const hasSelection = selectedNotes.length > 0;
    const targetNotes = hasSelection ? selectedNotes : mapData.notes;

    const stats = useMemo(() => {
        let movedCount = 0;
        let maxDrift = 0;

        targetNotes.forEach(note => {
            const newTime = snapTime(note.time, mapData.timingPoints, targetDivisor);
            const diff = Math.abs(newTime - note.time);
            if (diff > 0.001) {
                movedCount++;
                if (diff > maxDrift) maxDrift = diff;
            }
        });

        return { movedCount, maxDrift, total: targetNotes.length };
    }, [targetNotes, mapData.timingPoints, targetDivisor]);

    const handleConfirm = () => {
        // Bulk update
        targetNotes.forEach(note => {
            const newTime = snapTime(note.time, mapData.timingPoints, targetDivisor);
            if (Math.abs(newTime - note.time) > 0.001) {
                dispatch({
                    type: 'UPDATE_NOTE',
                    payload: { id: note.id, changes: { time: newTime } }
                });
            }
        });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Quantize Notes">
            <div className="space-y-6">
                <div className="bg-input/30 p-4 rounded-lg border border-border">
                    <p className="text-sm text-muted mb-2">
                        This tool will align {hasSelection ? "selected" : "all"} notes to the nearest grid snap.
                    </p>
                    <div className="flex items-center gap-4 mt-4">
                        <label className="text-sm font-bold text-white">Target Snap:</label>
                        <select 
                            className="bg-input border border-border rounded px-3 py-1.5 text-sm font-bold focus:outline-none focus:border-primary"
                            value={targetDivisor}
                            onChange={(e) => setTargetDivisor(Number(e.target.value))}
                        >
                            {COMMON_SNAPS.map(v => (
                                <option key={v} value={v}>1/{v}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <h4 className="text-xs uppercase font-bold text-muted tracking-wider">Preview</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-card border border-border p-3 rounded flex flex-col items-center">
                            <span className="text-2xl font-bold text-primary">{stats.movedCount}</span>
                            <span className="text-xs text-muted">Notes will move</span>
                        </div>
                        <div className="bg-card border border-border p-3 rounded flex flex-col items-center">
                            <span className="text-2xl font-bold text-warning">{stats.maxDrift.toFixed(1)}ms</span>
                            <span className="text-xs text-muted">Max Drift</span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <button onClick={onClose} className="px-4 py-2 rounded text-muted hover:text-white transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirm}
                        className="px-6 py-2 bg-primary hover:bg-primary-hover text-black font-bold rounded shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
                        disabled={stats.movedCount === 0}
                    >
                        <FontAwesomeIcon icon={faMagic} />
                        <span>Apply Fix</span>
                    </button>
                </div>
            </div>
        </Modal>
    );
};