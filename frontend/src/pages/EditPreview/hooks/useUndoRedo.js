import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for undo/redo functionality
 * Tracks history of slide changes and allows reverting to previous states
 */
export const useUndoRedo = (editedSlides, setEditedSlides, maxHistory = 50) => {
  // History stacks
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  
  // Ref to track if current change is from undo/redo (to avoid adding to history)
  const isUndoRedoAction = useRef(false);
  
  // Ref to store the previous slides state for comparison
  const prevSlidesRef = useRef(null);
  
  // Debounce timer ref for grouping rapid changes
  const debounceTimerRef = useRef(null);
  const pendingStateRef = useRef(null);

  /**
   * Save current state to undo stack (debounced to group rapid changes)
   */
  const saveToHistory = useCallback((previousState) => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }
    
    if (!previousState || previousState.length === 0) return;
    
    setUndoStack(prev => {
      const newStack = [...prev, JSON.parse(JSON.stringify(previousState))];
      // Limit history size
      if (newStack.length > maxHistory) {
        return newStack.slice(-maxHistory);
      }
      return newStack;
    });
    
    // Clear redo stack when new action is performed
    setRedoStack([]);
  }, [maxHistory]);

  /**
   * Track changes to editedSlides and save to history
   */
  useEffect(() => {
    // Skip if this is an undo/redo action
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      prevSlidesRef.current = editedSlides;
      return;
    }

    // Skip if slides haven't been initialized yet
    if (!editedSlides || editedSlides.length === 0) {
      return;
    }

    // Skip if this is the initial load
    if (prevSlidesRef.current === null) {
      prevSlidesRef.current = editedSlides;
      return;
    }

    // Check if slides actually changed (deep comparison)
    const prevJson = JSON.stringify(prevSlidesRef.current);
    const currentJson = JSON.stringify(editedSlides);
    
    if (prevJson === currentJson) {
      return;
    }

    // Debounce to group rapid changes (like typing)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Store the state before changes started
    if (!pendingStateRef.current) {
      pendingStateRef.current = prevSlidesRef.current;
    }

    debounceTimerRef.current = setTimeout(() => {
      if (pendingStateRef.current) {
        saveToHistory(pendingStateRef.current);
        pendingStateRef.current = null;
      }
      prevSlidesRef.current = editedSlides;
    }, 500); // 500ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [editedSlides, saveToHistory]);

  /**
   * Undo last action
   */
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;

    // Save current state to redo stack
    const currentState = JSON.parse(JSON.stringify(editedSlides));
    setRedoStack(prev => [...prev, currentState]);

    // Pop from undo stack and restore
    const previousState = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));

    // Mark this as an undo action to prevent adding to history
    isUndoRedoAction.current = true;
    prevSlidesRef.current = previousState;
    setEditedSlides(previousState);
  }, [undoStack, editedSlides, setEditedSlides]);

  /**
   * Redo last undone action
   */
  const redo = useCallback(() => {
    if (redoStack.length === 0) return;

    // Save current state to undo stack
    const currentState = JSON.parse(JSON.stringify(editedSlides));
    setUndoStack(prev => [...prev, currentState]);

    // Pop from redo stack and restore
    const nextState = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));

    // Mark this as a redo action to prevent adding to history
    isUndoRedoAction.current = true;
    prevSlidesRef.current = nextState;
    setEditedSlides(nextState);
  }, [redoStack, editedSlides, setEditedSlides]);

  /**
   * Check if undo is available
   */
  const canUndo = undoStack.length > 0;

  /**
   * Check if redo is available
   */
  const canRedo = redoStack.length > 0;

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
    pendingStateRef.current = null;
    prevSlidesRef.current = editedSlides;
  }, [editedSlides]);

  /**
   * Keyboard shortcuts for undo/redo
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check if user is typing in an input or textarea
      const activeElement = document.activeElement;
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable
      );

      // Ctrl+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      
      // Ctrl+Y or Ctrl+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    undoStackSize: undoStack.length,
    redoStackSize: redoStack.length
  };
};

export default useUndoRedo;
