import { EditorNote, TimingPoint } from '../types';

/**
 * Standard Binary Search Lower Bound.
 * Returns the index of the first element where predicate(element) is true.
 * Used to find the start index of visible elements.
 */
export function binarySearchLowerBound<T>(
    arr: T[], 
    predicate: (item: T) => boolean
): number {
    let left = 0;
    let right = arr.length;

    while (left < right) {
        const mid = Math.floor((left + right) / 2);
        if (predicate(arr[mid])) {
            right = mid;
        } else {
            left = mid + 1;
        }
    }
    return left;
}

/**
 * Efficiently slices the note array to return only items within the time range.
 * @param notes Sorted array of EditorNotes
 * @param startMs Viewport start time (minus buffer)
 * @param endMs Viewport end time (plus buffer)
 */
export function getVisibleNotes(notes: EditorNote[], startMs: number, endMs: number): EditorNote[] {
    if (notes.length === 0) return [];

    // Find first note that ends AFTER the start window
    // (Note.time + duration) >= startMs
    const startIndex = binarySearchLowerBound(notes, (n) => {
        const noteEnd = n.type === 'hold' ? n.time + (n.duration || 0) : n.time;
        return noteEnd >= startMs;
    });

    // Find first note that starts AFTER the end window
    // Note.time > endMs
    // We can optimization the search by starting from startIndex
    // However, JS slice is fast enough if we just find the bounds.
    
    // Scan forward from startIndex to find the cut-off
    // Usually the window size is small, so linear scan from startIndex is faster than a second binary search
    // But for massive zoom-outs, binary search is safer.
    
    let endIndex = startIndex;
    // Heuristic: If we expect many notes, binary search the end. 
    // If we are zoomed in, linear is fine. Let's stick to simple slicing for now.
    // To be strictly robust, we search for the upper bound.
    
    let left = startIndex;
    let right = notes.length;
    
    while(left < right) {
        const mid = Math.floor((left + right) / 2);
        if (notes[mid].time > endMs) {
            right = mid;
        } else {
            left = mid + 1;
        }
    }
    endIndex = left;

    return notes.slice(startIndex, endIndex);
}

/**
 * Filter timing points relevant to the current window.
 * We must always include the active timing point immediately PRECEDING the window
 * to ensure grids render correctly at the start of the visible area.
 */
export function getVisibleTimingPoints(points: TimingPoint[], startMs: number, endMs: number): TimingPoint[] {
    if (points.length === 0) return [];

    // Find the timing point active at startMs
    // We search for the first point > startMs, then back up one
    let firstIndex = binarySearchLowerBound(points, p => p.time > startMs);
    firstIndex = Math.max(0, firstIndex - 1);

    // Find the last point relevant (starts before endMs)
    let lastIndex = binarySearchLowerBound(points, p => p.time > endMs);
    
    return points.slice(firstIndex, lastIndex);
}