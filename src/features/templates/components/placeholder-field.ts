import { Node, mergeAttributes } from "@tiptap/core";

export interface PlaceholderFieldOptions {
  HTMLAttributes: Record<string, unknown>;
}

export const PLACEHOLDER_FIELDS = [
  { key: "recipient_name", label: "Recipient Name" },
  { key: "certificate_number", label: "Certificate Number" },
  { key: "issued_date", label: "Issued Date" },
  { key: "organization_name", label: "Organization Name" },
  { key: "event_name", label: "Event Name" },
  { key: "event_date", label: "Event Date" },
  { key: "event_location", label: "Event Location" },
  { key: "event_organizer", label: "Event Organizer" },
  { key: "certificate_title", label: "Certificate Title" },
  { key: "expiry_date", label: "Expiry Date" },
  { key: "qr_code", label: "QR Code" },
] as const;

export type PlaceholderFieldKey = (typeof PLACEHOLDER_FIELDS)[number]["key"];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    placeholderField: {
      insertPlaceholderField: (key: PlaceholderFieldKey) => ReturnType;
    };
  }
}

export const PlaceholderField = Node.create<PlaceholderFieldOptions>({
  name: "placeholderField",

  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return {
      HTMLAttributes: {
        class: "cert-placeholder",
      },
    };
  },

  addAttributes() {
    return {
      field: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-field"),
        renderHTML: (attributes) => {
          if (!attributes.field) return {};
          return { "data-field": attributes.field };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-placeholder-field]",
        getAttrs: (element) => {
          if (typeof element === "string") return {};
          const field = (element as HTMLElement).getAttribute("data-field");
          return { field };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const field = node.attrs.field as PlaceholderFieldKey;
    const label =
      PLACEHOLDER_FIELDS.find((f) => f.key === field)?.label ?? field;

    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-placeholder-field": "",
        "data-field": field,
        contenteditable: "false",
        title: `Placeholder: ${label} ({{${field}}})`,
      }),
      `{{${field}}}`,
    ];
  },

  renderText({ node }) {
    return `{{${node.attrs.field}}}`;
  },

  addCommands() {
    return {
      insertPlaceholderField:
        (key) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { field: key },
          }),
    };
  },
});
