import React from "react";

interface DynamicMiniProps {
  title: string;
  customLayout: any;
}

const DynamicMini = ({ title, customLayout }: DynamicMiniProps) => {
  return (
    <div className="w-full h-[120px] bg-white p-3 relative overflow-hidden">
      {customLayout?.custom?.length > 0 ? (
        <div className="w-full h-full relative">
          {customLayout.custom.slice(0, 3).map((element: any, index: number) => (
            <div
              key={element.id}
              className="absolute border border-gray-300 bg-gray-100 rounded"
              style={{
                left: `${element.structure.x}%`,
                top: `${element.structure.y}%`,
                width: `${element.structure.width}%`,
                height: `${element.structure.height}%`,
              }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-xs text-gray-600">{element.name}</span>
              </div>
            </div>
          ))}
          {customLayout.custom.length > 3 && (
            <div className="absolute bottom-1 right-1 bg-blue-500 text-white text-xs px-1 rounded">
              +{customLayout.custom.length - 3}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="text-xs mb-1">Dynamic Layout</div>
            <div className="text-xs">No elements</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicMini; 