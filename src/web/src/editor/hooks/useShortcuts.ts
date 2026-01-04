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

            // --- NAVIGATION (Arrows) ---
            if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
                e.preventDefault();
                const direction = e.code === 'ArrowRight' ? 1 : -1;
                
                // Calculate Snap Step
                const tp = getActiveTimingPoint(playback.currentTime, mapData.timingPoints);
                const bpm = tp ? tp.bpm : 120;
                const msPerBeat = 60000 / bpm;
                const step = msPerBeat / settings.snapDivisor;

                // Move and Re-Snap
                const rawTarget = playback.currentTime + (step * direction);
                // We re-snap to ensure we don't drift due to floating point math
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

                    dispatch({
                        type: 'ADD_NOTE',
                        payload: {
                            id: crypto.randomUUID(),
                            time: time,
                            column: row,
                            key: key,
                            type: 'tap'
                        }
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