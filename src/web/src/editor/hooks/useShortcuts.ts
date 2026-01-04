import { useEffect } from 'react';
import { useEditor } from '../store/EditorContext';
import { KEY_TO_ROW } from '../../gameplay/constants';
import { snapTime } from '../utils/timing';

export const useShortcuts = () => {
    const { dispatch, audio, playback, mapData, settings } = useEditor();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 1. IGNORE INPUTS
            // If the user is typing in a text field, we shouldn't trigger editor shortcuts
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            const key = e.key.toLowerCase();
            const isCtrl = e.ctrlKey || e.metaKey; // Windows Ctrl or Mac Cmd
            const isShift = e.shiftKey;

            // --- PLAYBACK (Space) ---
            if (e.code === 'Space') {
                e.preventDefault();
                if (playback.isPlaying) audio.pause();
                else audio.play();
                return;
            }

            // --- NOTE PLACEMENT (Gameplay Keys) ---
            // Only process if not holding Ctrl (to avoid conflicts with shortcuts like Ctrl+S, Ctrl+Z)
            if (!isCtrl && !e.repeat) {
                // Check if the pressed key is mapped to a row
                // KEY_TO_ROW maps 'q' -> 0, 'a' -> 1, etc.
                const row = KEY_TO_ROW[key];
                
                if (row !== undefined) {
                    e.preventDefault();

                    // Calculate Insertion Time
                    // Use Snap logic if enabled
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
                    
                    // Optional: Trigger a hitsound here in the future
                    return;
                }
            }

            // --- UNDO (Ctrl + Z) ---
            if (isCtrl && !isShift && key === 'z') {
                e.preventDefault();
                dispatch({ type: 'UNDO' });
                return;
            }

            // --- REDO (Ctrl + Y) OR (Ctrl + Shift + Z) ---
            if ((isCtrl && key === 'y') || (isCtrl && isShift && key === 'z')) {
                e.preventDefault();
                dispatch({ type: 'REDO' });
                return;
            }

            // --- SAVE (Ctrl + S) ---
            if (isCtrl && key === 's') {
                e.preventDefault();
                // Handled by Auto-save usually, but explicit save action can be added here
                console.log("Manual Save triggered");
                return;
            }

            // --- DELETE (Delete / Backspace) ---
            if (key === 'delete' || key === 'backspace') {
                e.preventDefault();
                // We need to know WHICH notes are selected to delete them.
                // The current editor reducer expects an ID list.
                // Since selection state is in mapData.notes (via .selected property),
                // we calculate the IDs here.
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
    }, [dispatch, audio, playback, mapData, settings]); // Dependencies updated to include mapData/settings for snapping
};