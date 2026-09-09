import { createPortal } from "react-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";

// Reorderable list of form rows. Dragging is bound to a grip handle rather
// than the whole row on purpose — if the row itself were the drag handle you
// could not select text inside its inputs.
//
// Rows are keyed by the throwaway __k added by withKeys(), never by array
// index: dnd needs an id that survives the reorder, and an index does not.
export default function DraggableList({ items, onReorder, droppableId, renderItem, theme }) {
  const handleDragEnd = (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const next = Array.from(items);
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    onReorder(next);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId={droppableId}>
        {(dropProvided) => (
          <div ref={dropProvided.innerRef} {...dropProvided.droppableProps}>
            {items.map((item, i) => (
              <Draggable key={item.__k ?? i} draggableId={String(item.__k ?? i)} index={i}>
                {(dragProvided, snapshot) => {
                  const row = (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr",
                        gap: "10px",
                        alignItems: "start",
                        marginBottom: "10px",
                        borderRadius: "8px",
                        background: snapshot.isDragging ? theme.bgCard : "transparent",
                        boxShadow: snapshot.isDragging ? "0 8px 24px rgba(0,0,0,0.28)" : "none",
                        ...dragProvided.draggableProps.style,
                        // Above the modal (z-index 100) once portalled to <body>.
                        ...(snapshot.isDragging ? { zIndex: 200 } : null),
                      }}
                    >
                      <button
                        type="button"
                        {...dragProvided.dragHandleProps}
                        aria-label="Premakni"
                        title="Povlecite za premik"
                        style={{
                          background: "none", border: "none",
                          cursor: snapshot.isDragging ? "grabbing" : "grab",
                          color: theme.textLow, padding: "10px 2px", display: "flex",
                          alignItems: "center", touchAction: "none",
                        }}
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                      <div style={{ minWidth: 0 }}>{renderItem(item, i)}</div>
                    </div>
                  );

                  // The library positions the dragged row with position:fixed.
                  // The edit modal sets backdrop-filter and has its own
                  // scrollbar, and backdrop-filter makes that element the
                  // containing block for fixed descendants — so the row was
                  // placed relative to the scrolled modal instead of the
                  // viewport, floating above the cursor by the scroll amount.
                  // Portalling to <body> while dragging escapes that.
                  return snapshot.isDragging ? createPortal(row, document.body) : row;
                }}
              </Draggable>
            ))}
            {dropProvided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
