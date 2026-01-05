import { useEffect } from 'react';
import { useEditor } from '../store/EditorContext';
import { useHitsounds } from './useHitsounds';
import { KEY_TO_ROW } from '../../gameplay/constants';
import { snapTime, getActiveTimingPoint } from '../utils/timing';

export const useShortcuts = () => {
    const { dispatch, audio, playback, mapData, settings, activeLayerId, defaultHitsounds } = useEditor();
    const { play } = useHitsounds();

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
            if (isShift && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
                e.preventDefault();
                // Filter selected notes to only those in UNLOCKED layers
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
                // Select only from visible/unlocked layers? Usually select all means visible.
                const visibleLayers = new Set(mapData.layers.filter(l => l.visible).map(l => l.id));
                const allIds = mapData.notes
                    .filter(n => visibleLayers.has(n.layerId))
                    .map(n => n.id);
                dispatch({ type: 'SELECT_NOTES', payload: { ids: allIds, append: false } });
                return;
            }

            // PLACE NOTE
            if (!isCtrl && !e.repeat) {
                const row = KEY_TO_ROW[key];
                if (row !== undefined) {
                    e.preventDefault();
                    
                    // Check if active layer is locked
                    const activeLayer = mapData.layers.find(l => l.id === activeLayerId);
                    if (activeLayer && activeLayer.locked) {
                        return;
                    }

                    // Play feedback with current defaults
                    play(defaultHitsounds);

                    const rawTime = playback.currentTime;
                    const time = settings.snappingEnabled
                        ? snapTime(rawTime, mapData.timingPoints, settings.snapDivisor)
                        : rawTime;

                    const newId = crypto.randomUUID();

                    dispatch({
                        type: 'ADD_NOTE',
                        payload: {
                            id: newId,
                            time: time,
                            column: row,
                            key: key,
                            type: 'tap',
                            hitsound: { ...defaultHitsounds },
                            layerId: activeLayerId
                        }
                    });

                    dispatch({
                        type: 'SELECT_NOTES',
                        payload: { ids: [newId], append: false }
                    });
                    
                    return;
                }
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
                // Filter out locked notes
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
    }, [dispatch, audio, playback, mapData, settings, play, activeLayerId, defaultHitsounds]);
};