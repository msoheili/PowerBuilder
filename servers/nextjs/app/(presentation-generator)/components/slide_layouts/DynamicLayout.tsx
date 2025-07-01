import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import EditableText from "../EditableText";
import ImageEditor from "../ImageEditor";
import AllChart from "./AllChart";
import SlideFooter from "./SlideFooter";

interface DynamicLayoutProps {
  title: string;
  description: string;
  slideId: string | null;
  slideIndex: number;
  customLayout: any;
  images?: string[];
  image_prompts?: string[];
  properties?: any;
  graphData?: any;
}

const DynamicLayout = ({
  title,
  description,
  slideId,
  slideIndex,
  customLayout,
  images = [],
  image_prompts = [],
  properties,
  graphData,
}: DynamicLayoutProps) => {
  const { currentColors } = useSelector((state: RootState) => state.theme);

  const renderElement = (element: any, index: number) => {
    const style = {
      position: 'absolute' as const,
      left: `${element.structure.x}%`,
      top: `${element.structure.y}%`,
      width: `${element.structure.width}%`,
      height: `${element.structure.height}%`,
      fontFamily: currentColors.fontFamily || "Inter, sans-serif",
    };

    switch (element.type) {
      case 'title':
        return (
          <div key={element.id} style={style} className="flex items-center">
            <EditableText
              slideIndex={slideIndex}
              elementId={`slide-${slideIndex}-dynamic-title-${index}`}
              type="title"
              content={element.structure.content || title}
            />
          </div>
        );

      case 'subtitle':
        return (
          <div key={element.id} style={style} className="flex items-center">
            <EditableText
              slideIndex={slideIndex}
              elementId={`slide-${slideIndex}-dynamic-subtitle-${index}`}
              type="heading"
              content={element.structure.content || description}
            />
          </div>
        );

      case 'text':
        return (
          <div key={element.id} style={style} className="flex items-start">
            <EditableText
              slideIndex={slideIndex}
              elementId={`slide-${slideIndex}-dynamic-text-${index}`}
              type="description-body"
              content={element.structure.content || "Enter your text here..."}
            />
          </div>
        );

      case 'bullet-list':
        return (
          <div key={element.id} style={style} className="flex items-start">
            <div className="w-full">
              {element.structure.items && element.structure.items.length > 0 ? (
                <ul className="list-disc list-inside space-y-1">
                  {element.structure.items.map((item: string, itemIndex: number) => (
                    <li key={itemIndex} className="text-sm">
                      <EditableText
                        slideIndex={slideIndex}
                        elementId={`slide-${slideIndex}-dynamic-list-${index}-${itemIndex}`}
                        type="description-body"
                        content={item}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-gray-500">
                  <EditableText
                    slideIndex={slideIndex}
                    elementId={`slide-${slideIndex}-dynamic-list-${index}`}
                    type="description-body"
                    content="• Add list items here"
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 'image':
        return (
          <div key={element.id} style={style} className="flex items-center justify-center">
            <ImageEditor
              elementId={`slide-${slideIndex}-dynamic-image-${index}`}
              slideIndex={slideIndex}
              initialImage={element.structure.src || images[0] || ""}
              title={title}
              promptContent={element.structure.src || image_prompts?.[0]}
              properties={properties}
            />
          </div>
        );

      case 'chart':
        return (
          <div key={element.id} style={style} className="flex items-center justify-center">
            <AllChart 
              chartData={graphData} 
              slideIndex={slideIndex}
            />
          </div>
        );

      case 'icon':
        return (
          <div key={element.id} style={style} className="flex items-center justify-center">
            <div 
              className="w-full h-full flex items-center justify-center rounded-lg"
              style={{ backgroundColor: currentColors.iconBg }}
            >
              <span className="text-2xl">📊</span>
            </div>
          </div>
        );

      case 'divider':
        return (
          <div key={element.id} style={style} className="flex items-center justify-center">
            <div 
              className="w-full h-1 rounded-full"
              style={{ backgroundColor: currentColors.slideDescription }}
            />
          </div>
        );

      default:
        return (
          <div key={element.id} style={style} className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded">
            <span className="text-sm text-gray-500">Unknown element: {element.type}</span>
          </div>
        );
    }
  };

  return (
    <div
      className="slide-container w-full max-w-[1280px] shadow-lg px-3 sm:px-12 lg:px-20 py-[10px] sm:py-[40px] lg:py-[86px] max-h-[720px] flex items-center aspect-video bg-white relative z-20"
      data-slide-element
      data-slide-id={slideId}
      data-slide-index={slideIndex}
      data-slide-type="dynamic"
      data-element-type="slide-container"
      data-element-id={`slide-${slideIndex}-container`}
      style={{
        fontFamily: currentColors.fontFamily || "Inter, sans-serif",
        backgroundColor: currentColors.slideBg,
      }}
    >
      {/* Render custom layout elements */}
      <div className="w-full h-full relative">
        {customLayout?.custom?.map((element: any, index: number) => 
          renderElement(element, index)
        )}
      </div>
      
      <SlideFooter />
    </div>
  );
};

export default DynamicLayout; 