import React, { useState, useRef, useEffect } from 'react';

interface CustomLayout {
  id: string;
  name: string;
  type: string;
  structure: {
    x: number;
    y: number;
    width: number;
    height: number;
    content?: string;
    items?: string[];
    src?: string;
    chartType?: string;
    [key: string]: any;
  };
  preview: string;
}

interface DraggableElementProps {
  element: CustomLayout;
  onUpdate: (updatedElement: CustomLayout) => void;
  onRemove: () => void;
}

const DraggableElement: React.FC<DraggableElementProps> = ({ element, onUpdate, onRemove }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!elementRef.current || !containerRef.current) return;
    
    const elementRect = elementRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    
    const offsetX = e.clientX - elementRect.left;
    const offsetY = e.clientY - elementRect.top;
    
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerPadding = 16; // 4 * 4px padding
    
    const availableWidth = containerRect.width - containerPadding;
    const availableHeight = containerRect.height - containerPadding;
    
    const newX = ((e.clientX - containerRect.left - dragOffset.x) / availableWidth) * 100;
    const newY = ((e.clientY - containerRect.top - dragOffset.y) / availableHeight) * 100;
    
    // Constrain to container bounds
    const constrainedX = Math.max(0, Math.min(100 - element.structure.width, newX));
    const constrainedY = Math.max(0, Math.min(100 - element.structure.height, newY));
    
    onUpdate({
      ...element,
      structure: {
        ...element.structure,
        x: constrainedX,
        y: constrainedY,
      },
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset, element.structure.width, element.structure.height]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
    >
      <div
        ref={elementRef}
        className={`absolute border-2 border-blue-300 bg-blue-50 bg-opacity-50 rounded p-2 cursor-move hover:border-blue-500 hover:bg-blue-100 transition-all ${
          isDragging ? 'z-50 opacity-80' : ''
        }`}
        style={{
          left: `${element.structure.x}%`,
          top: `${element.structure.y}%`,
          width: `${element.structure.width}%`,
          height: `${element.structure.height}%`,
          minWidth: '60px',
          minHeight: '40px',
          userSelect: 'none',
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium truncate">{element.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="text-red-500 hover:text-red-700 text-xs ml-1"
          >
            ×
          </button>
        </div>
        <div className="text-xs text-gray-600">
          {element.structure.width.toFixed(0)}% × {element.structure.height.toFixed(0)}%
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {element.structure.x.toFixed(0)}, {element.structure.y.toFixed(0)}
        </div>
      </div>
    </div>
  );
};

export default DraggableElement; 