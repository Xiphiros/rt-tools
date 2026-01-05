import { useEffect } from 'react';
import { useEditor } from '../store/EditorContext';
import { KEY_TO_ROW } from '../../gameplay/constants';
import { snapTime, getActiveTimingPoint } from '../utils/timing';

export const useShortcuts = () => {
    const { dispatch, audio, playback, mapData, settings } = useEditor();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 1. IGNORE INPUTS
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            const key = e.key.toLowerCase();
            const isCtrl = e.ctrlKey || e.metaKey; 
            const isShift = e.shiftKey;

            // --- PLAYBACK (Space) ---
            if (e.code === 'Space') {
                e.preventDefault();
                if (playback.isPlaying) audio.pause();
                else audio.play();
                return;
            }

            // --- NOTE DURATION ADJUSTMENT (Shift + Arrows) ---
            if (isShift && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
                e.preventDefault();
                
                const selectedNotes = mapData.notes.filter(n => n.selected);
                if (selectedNotes.length === 0) return;

                // Calculate Step
                const tp = getActiveTimingPoint(playback.currentTime, mapData.timingPoints);
                const bpm = tp ? tp.bpm : 120;
                const msPerBeat = 60000 / bpm;
                const step = msPerBeat / settings.snapDivisor;
                const direction = e.code === 'ArrowRight' ? 1 : -1;

                selectedNotes.forEach(note => {
                    const currentDuration = note.duration || 0;
                    let newDuration = currentDuration + (step * direction);
                    
                    // Snap the END time to grid if possible, or just delta?
                    // Simple delta is usually more predictable for "extending"
                    
                    // Logic: If shrinking a tap (0 duration), do nothing or ensure it stays 0
                    if (newDuration < step / 2) newDuration = 0; 
                    
                    // Switch types
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

            // --- NAVIGATION (Arrows) ---
            // Only if NOT Shift (Shift is for duration)
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

            // --- SELECT ALL (Ctrl + A) ---
            if (isCtrl && key === 'a') {
                e.preventDefault();
                const allIds = mapData.notes.map(n => n.id);
                dispatch({ type: 'SELECT_NOTES', payload: { ids: allIds, append: false } });
                return;
            }

            // --- NOTE PLACEMENT (Gameplay Keys) ---
            if (!isCtrl && !e.repeat) {
                const row = KEY_TO_ROW[key];
                if (row !== undefined) {
                    e.preventDefault();
                    const rawTime = playback.currentTime;
                    const time = settings.snappingEnabled
                        ? snapTime(rawTime, mapData.timingPoints, settings.snapDivisor)
                        : rawTime;

                    const newId = crypto.randomUUID();

                    // 1. Add Note
                    dispatch({
                        type: 'ADD_NOTE',
                        payload: {
                            id: newId,
                            time: time,
                            column: row,
                            key: key,
                            type: 'tap'
                        }
                    });

                    // 2. Auto-Select it (for immediate Shift+Arrow extension)
                    dispatch({
                        type: 'SELECT_NOTES',
                        payload: { ids: [newId], append: false }
                    });
                    
                    return;
                }
            }

            // --- UNDO/REDO ---
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

            // --- DELETE ---
            if (key === 'delete' || key === 'backspace') {
                e.preventDefault();
                const selectedIds = mapData.notes
                    .filter(n => n.selected)
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