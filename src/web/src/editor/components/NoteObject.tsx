import React from 'react';
import { EditorNote } from '../types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripLinesVertical } from '@fortawesome/free-solid-svg-icons';

interface NoteObjectProps {
    note: EditorNote;
    zoom: number; // pixels per second
    rowHeight: number;
    onClick: (e: React.MouseEvent, note: EditorNote) => void;
    onContextMenu: (e: React.MouseEvent, note: EditorNote) => void;
}

export const NoteObject = ({ note, zoom, rowHeight, onClick, onContextMenu }: NoteObjectProps) => {
    // Position Calculation
    const left = (note.time / 1000) * zoom;
    const width = note.type === 'hold' && note.duration 
        ? (note.duration / 1000) * zoom 
        : 24; // Standard width for tap note

    const top = note.column * rowHeight;
    
    // Style variants
    const isSelected = note.selected;
    const baseColor = isSelected ? 'bg-primary border-white' : 'bg-card-hover border-primary';

    return (
        <div
            className={`absolute rounded-md border-2 shadow-sm cursor-pointer hover:brightness-110 transition-all group z-10 flex items-center justify-center ${baseColor}`}
            style={{
                left,
                top: top + 4, // Padding within row
                width: Math.max(width, 10), // Prevent invisible notes
                height: rowHeight - 8,
                borderColor: isSelected ? '#fff' : undefined
            }}
            onMouseDown={(e) => {
                e.stopPropagation();
                onClick(e, note);
            }}
            onContextMenu={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onContextMenu(e, note);
            }}
        >
            {/* Note Key Label */}
            <span className="text-xs font-bold text-white select-none pointer-events-none drop-shadow-md">
                {note.key.toUpperCase()}
            </span>

            {/* Resize Handle for Holds (Visual Only for now) */}
            {note.type === 'hold' && (
                <div className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/20 flex items-center justify-center">
                   <FontAwesomeIcon icon={faGripLinesVertical} className="text-[8px] text-white/50" />
                </div>
            )}
        </div>
    );
};