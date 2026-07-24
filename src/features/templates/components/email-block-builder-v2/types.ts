export type EmailBlockType = 
  | "header" 
  | "text" 
  | "image" 
  | "button" 
  | "divider" 
  | "spacer"
  | "columns";

export interface BaseBlockProps {
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
}

export interface HeaderBlockProps extends BaseBlockProps {
  text: string;
  level: "h1" | "h2" | "h3";
  color: string;
  align: "left" | "center" | "right";
}

export interface TextBlockProps extends BaseBlockProps {
  content: string;
  color: string;
  fontSize: number;
  align: "left" | "center" | "right";
  lineHeight: number;
}

export interface ImageBlockProps extends BaseBlockProps {
  src: string;
  alt: string;
  width: number;
  align: "left" | "center" | "right";
}

export interface ButtonBlockProps extends BaseBlockProps {
  text: string;
  href: string;
  bgColor: string;
  textColor: string;
  borderRadius: number;
  align: "left" | "center" | "right";
}

export interface DividerBlockProps extends BaseBlockProps {
  color: string;
  thickness: number;
  style: "solid" | "dashed" | "dotted";
  widthPercent: number;
  align: "left" | "center" | "right";
}

export interface SpacerBlockProps extends BaseBlockProps {
  height: number;
}

export interface ColumnBlock {
  id: string;
  widthPercent: number;
  blocks: EmailBlock[];
}

export interface ColumnsBlockProps extends BaseBlockProps {
  columnCount: 2 | 3;
  gap: number;
  columns: ColumnBlock[];
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

export type AnyEmailBlock = EmailBlock<EmailBlockType>;

export const EMAIL_PLACEHOLDER_FIELDS = [
  { key: "recipient_name", label: "Recipient Name" },
  { key: "certificate_number", label: "Certificate Number" },
  { key: "issued_date", label: "Issue Date" },
  { key: "download_url", label: "Download URL" },
  { key: "verify_url", label: "Verify URL" },
  { key: "org_name", label: "Organization Name" },
] as const;

export type PlaceholderKey = typeof EMAIL_PLACEHOLDER_FIELDS[number]["key"];