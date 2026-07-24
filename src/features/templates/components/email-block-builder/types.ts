export type EmailBlockType =
  | "header"
  | "text"
  | "image"
  | "button"
  | "divider"
  | "spacer"
  | "columns";

export interface HeaderBlockProps {
  text: string;
  level: "h1" | "h2" | "h3";
  color: string;
  align: "left" | "center" | "right";
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
}

export interface TextBlockProps {
  content: string;
  color: string;
  fontSize: number;
  align: "left" | "center" | "right";
  lineHeight: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
}

export interface ImageBlockProps {
  src: string;
  alt: string;
  width: number;
  align: "left" | "center" | "right";
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
}

export interface ButtonBlockProps {
  text: string;
  href: string;
  bgColor: string;
  textColor: string;
  borderRadius: number;
  align: "left" | "center" | "right";
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
}

export interface DividerBlockProps {
  color: string;
  thickness: number;
  style: "solid" | "dashed" | "dotted";
  widthPercent: number;
  align: "left" | "center" | "right";
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
}

export interface SpacerBlockProps {
  height: number;
}

export interface ColumnItem {
  id: string;
  widthPercent: number;
  blocks: EmailBlock[];
}

export interface ColumnsBlockProps {
  columnCount: 2 | 3;
  columns: ColumnItem[];
  gap: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
}

export type BlockPropsMap = {
  header: HeaderBlockProps;
  text: TextBlockProps;
  image: ImageBlockProps;
  button: ButtonBlockProps;
  divider: DividerBlockProps;
  spacer: SpacerBlockProps;
  columns: ColumnsBlockProps;
};

export interface EmailBlock<T extends EmailBlockType = EmailBlockType> {
  id: string;
  type: T;
  props: BlockPropsMap[T];
  hidden?: boolean;
  locked?: boolean;
}
