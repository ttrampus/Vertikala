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
                {(dragProvided, snapshot) => (
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
                    }}
                  >
                    <button
                      type="button"
                      {...dragProvided.dragHandleProps}
                      aria-label="Premakni"
                      title="Povlecite za premik"
                      style={{
                        background: "none", border: "none", cursor: "grab",
                        color: theme.textLow, padding: "10px 2px", display: "flex",
                        alignItems: "center", touchAction: "none",
                      }}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <div style={{ minWidth: 0 }}>{renderItem(item, i)}</div>
                  </div>
                )}
              </Draggable>
            ))}
            {dropProvided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
