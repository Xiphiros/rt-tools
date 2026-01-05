import { useEffect } from 'react';
import { useEditor } from '../store/EditorContext';
import { snapTime, getActiveTimingPoint } from '../utils/timing';

export const useShortcuts = () => {
    const { dispatch, audio, playback, mapData, settings } = useEditor();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            const key = e.key.toLowerCase();
            const isCtrl = e.ctrlKey || e.metaKey; 
            const isShift = e.shiftKey;

            // PLAYBACK
            if (e.code === 'Space') {
                e.preventDefault();
                if (playback.isPlaying) audio.pause();
                else audio.play();
                return;
            }

            // NOTE DURATION (Shift + Arrow)
            // Allows tweaking existing notes' length
            if (isShift && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
                e.preventDefault();
                const activeLayers = new Set(mapData.layers.filter(l => !l.locked).map(l => l.id));
                const selectedNotes = mapData.notes.filter(n => n.selected && activeLayers.has(n.layerId));
                
                if (selectedNotes.length === 0) return;

                const tp = getActiveTimingPoint(playback.currentTime, mapData.timingPoints);
                const bpm = tp ? tp.bpm : 120;
                const msPerBeat = 60000 / bpm;
                const step = msPerBeat / settings.snapDivisor;
                const direction = e.code === 'ArrowRight' ? 1 : -1;

                selectedNotes.forEach(note => {
                    const currentDuration = note.duration || 0;
                    let newDuration = currentDuration + (step * direction);
                    if (newDuration < step / 2) newDuration = 0; 
                    const type = newDuration > 0 ? 'hold' : 'tap';
                    
                    dispatch({
                        type: 'UPDATE_NOTE',
                        payload: { 
                            id: note.id, 
                            changes: { duration: newDuration, type } 
                        }
                    });
                });
                return;
            }

            // SEEK (Arrow)
            if (!isShift && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
                e.preventDefault();
                const direction = e.code === 'ArrowRight' ? 1 : -1;
                const tp = getActiveTimingPoint(playback.currentTime, mapData.timingPoints);
                const bpm = tp ? tp.bpm : 120;
                const msPerBeat = 60000 / bpm;
                const step = msPerBeat / settings.snapDivisor;
                
                const rawTarget = playback.currentTime + (step * direction);
                const cleanTarget = snapTime(rawTarget, mapData.timingPoints, settings.snapDivisor);
                
                audio.seek(cleanTarget);
                return;
            }

            // SELECT ALL
            if (isCtrl && key === 'a') {
                e.preventDefault();
                const visibleLayers = new Set(mapData.layers.filter(l => l.visible).map(l => l.id));
                const allIds = mapData.notes
                    .filter(n => visibleLayers.has(n.layerId))
                    .map(n => n.id);
                dispatch({ type: 'SELECT_NOTES', payload: { ids: allIds, append: false } });
                return;
            }

            // UNDO/REDO
            if (isCtrl && !isShift && key === 'z') {
                e.preventDefault();
                dispatch({ type: 'UNDO' });
                return;
            }
            if ((isCtrl && key === 'y') || (isCtrl && isShift && key === 'z')) {
                e.preventDefault();
                dispatch({ type: 'REDO' });
                return;
            }

            // DELETE
            if (key === 'delete' || key === 'backspace') {
                e.preventDefault();
                const activeLayers = new Set(mapData.layers.filter(l => !l.locked).map(l => l.id));
                const selectedIds = mapData.notes
                    .filter(n => n.selected && activeLayers.has(n.layerId))
                    .map(n => n.id);
                    
                if (selectedIds.length > 0) {
                    dispatch({ type: 'REMOVE_NOTES', payload: selectedIds });
                }
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [dispatch, audio, playback, mapData, settings]);
};