import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { useEditor } from '../store/EditorContext';
import { TimingPoint } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';

interface TimingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TimingModal = ({ isOpen, onClose }: TimingModalProps) => {
    const { mapData, dispatch, playback } = useEditor();
    const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

    const handleAdd = () => {
        const newPoint: TimingPoint = {
            id: crypto.randomUUID(),
            time: playback.currentTime, // Add at current playhead
            bpm: 120,
            meter: 4,
            kiai: false
        };
        dispatch({ type: 'ADD_TIMING_POINT', payload: newPoint });
        setSelectedPointId(newPoint.id);
    };

    const handleUpdate = (id: string, field: keyof TimingPoint, value: number | boolean) => {
        dispatch({
            type: 'UPDATE_TIMING_POINT',
            payload: { id, changes: { [field]: value } }
        });
    };

    const handleRemove = (id: string) => {
        if (mapData.timingPoints.length <= 1) return; // Prevent deleting last point
        dispatch({ type: 'REMOVE_TIMING_POINT', payload: id });
        if (selectedPointId === id) setSelectedPointId(null);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Timing Points">
            <div className="flex flex-col h-[500px]">
                {/* Toolbar */}
                <div className="flex gap-2 mb-4">
                    <button 
                        onClick={handleAdd}
                        className="px-3 py-1.5 bg-success/20 text-success hover:bg-success/30 rounded border border-success/50 text-sm font-bold flex items-center gap-2"
                    >
                        <FontAwesomeIcon icon={faPlus} /> Add Point at Current Time
                    </button>
                    <div className="text-xs text-muted flex items-center ml-auto">
                        Points must be sorted by time (auto-handled)
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 bg-input/30 rounded-lg border border-border overflow-hidden flex flex-col">
                    <div className="grid grid-cols-12 gap-2 p-3 bg-input border-b border-border text-xs font-bold text-muted uppercase tracking-wider">
                        <div className="col-span-3">Time (ms)</div>
                        <div className="col-span-3">BPM</div>
                        <div className="col-span-2">Meter</div>
                        <div className="col-span-2">Kiai</div>
                        <div className="col-span-2 text-right">Actions</div>
                    </div>
                    
                    <div className="overflow-y-auto flex-1">
                        {mapData.timingPoints.map(tp => (
                            <div 
                                key={tp.id}
                                className={`grid grid-cols-12 gap-2 p-3 border-b border-border/50 items-center text-sm hover:bg-white/5 transition-colors ${selectedPointId === tp.id ? 'bg-primary/10' : ''}`}
                                onClick={() => setSelectedPointId(tp.id)}
                            >
                                <div className="col-span-3 font-mono text-primary">
                                    <input 
                                        type="number" 
                                        className="bg-transparent w-full focus:outline-none focus:text-white"
                                        value={tp.time}
                                        onChange={(e) => handleUpdate(tp.id, 'time', Number(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-3">
                                    <input 
                                        type="number" 
                                        className="bg-input border border-border rounded px-2 py-1 w-20 text-center"
                                        value={tp.bpm}
                                        onChange={(e) => handleUpdate(tp.id, 'bpm', Number(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <input 
                                        type="number" 
                                        className="bg-input border border-border rounded px-2 py-1 w-12 text-center"
                                        value={tp.meter}
                                        onChange={(e) => handleUpdate(tp.id, 'meter', Number(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <input 
                                        type="checkbox" 
                                        checked={tp.kiai}
                                        onChange={(e) => handleUpdate(tp.id, 'kiai', e.target.checked)}
                                        className="accent-primary"
                                    />
                                </div>
                                <div className="col-span-2 text-right">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleRemove(tp.id); }}
                                        className="text-danger hover:text-danger-light p-2 transition-colors disabled:opacity-30"
                                        disabled={mapData.timingPoints.length <= 1}
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
};