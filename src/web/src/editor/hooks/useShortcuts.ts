import { useEffect } from 'react';
import { useEditor } from '../store/EditorContext';

export const useShortcuts = () => {
    const { dispatch, audio, playback } = useEditor();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 1. IGNORE INPUTS
            // If the user is typing in a text field, we shouldn't trigger editor shortcuts
            // except maybe for things like Escape (to blur) or Ctrl+S (to save form)
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
                // TODO: Trigger Save Action
                console.log("Save triggered via shortcut");
                return;
            }

            // --- SELECT ALL (Ctrl + A) ---
            if (isCtrl && key === 'a') {
                e.preventDefault();
                // Select All logic would go here if we implemented getting all IDs from store
                // For now, we leave it to prevent browser default select all
                return;
            }

            // --- DELETE (Delete / Backspace) ---
            // Note: Handled in EditorTimeline usually, but can be global here if we expose selection in context
            // Keeping it in EditorTimeline for now to access mapData.notes efficiently without re-rendering this hook too often
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [dispatch, audio, playback.isPlaying]);
};