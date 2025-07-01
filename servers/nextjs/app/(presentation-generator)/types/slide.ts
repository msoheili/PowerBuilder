export type TextType =
  | "title"
  | "heading 1"
  | "heading 2"
  | "heading 3"
  | "heading 4"
  | "normal text";
export interface TextSize {
  fontSize: number;
  lineHeight: number;
  fontWeight: string;
}

interface SlideContent {
  title: string;
  body: string | Array<{ heading: string; description: string }>;
  description?: string;
  graph?: any;
  diagram?: any;
  infographics?: any;
  image_prompts?: string[];
  icon_queries?: Array<{ queries: string[] }>;
  customLayout?: {
    custom: Array<{
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
    }>;
  };
}

export interface Slide {
  id: string | null;
  index: number;
  type: number;
  design_index: number | null;
  images: string[] | null;
  properties: null | any;
  icons: string[] | null;
  graph_id: string | null;
  presentation?: string;
  content: SlideContent;
}
