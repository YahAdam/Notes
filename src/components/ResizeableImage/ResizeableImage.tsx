import Image from "@tiptap/extension-image";
import { ResizableNodeView } from "@tiptap/core";

export const ResizableImage = Image.extend({
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: element => {
          const value = element.getAttribute("width");
          return value ? Number(value) : null;
        },
        renderHTML: attributes =>
          attributes.width ? { width: attributes.width } : {},
      },
      height: {
        default: null,
        parseHTML: element => {
          const value = element.getAttribute("height");
          return value ? Number(value) : null;
        },
        renderHTML: attributes =>
          attributes.height ? { height: attributes.height } : {},
      },
    };
  },

  addNodeView() {
    return ({ node, getPos, HTMLAttributes, editor }) => {
      const img = document.createElement("img");

      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        if (value == null) return;
        if (key === "width" || key === "height") return;
        img.setAttribute(key, String(value));
      });

      img.draggable = false;
      img.addEventListener("dragstart", event => {
        event.preventDefault();
      });

      if (typeof node.attrs.width === "number") {
        img.style.width = `${node.attrs.width}px`;
      } else {
        img.style.maxWidth = "100%";
        img.style.height = "auto";
      }

      if (typeof node.attrs.height === "number") {
        img.style.height = `${node.attrs.height}px`;
      }

      return new ResizableNodeView({
        element: img,
        node,
        editor,
        getPos,
        onResize: (width, height) => {
          img.style.width = `${Math.round(width)}px`;
          img.style.height = `${Math.round(height)}px`;
        },
        onCommit: (width, height) => {
          editor.commands.updateAttributes("image", {
            width: Math.round(width),
            height: Math.round(height),
          });
        },
        onUpdate: updatedNode => {
          if (updatedNode.type !== node.type) return false;

          const nextWidth = updatedNode.attrs.width;
          const nextHeight = updatedNode.attrs.height;

          img.style.width =
            typeof nextWidth === "number" ? `${nextWidth}px` : "";
          img.style.height =
            typeof nextHeight === "number" ? `${nextHeight}px` : "auto";

          return true;
        },
        options: {
          directions: ["bottom-right", "bottom-left", "top-right", "top-left"],
          min: {
            width: 50,
            height: 50,
          },
          preserveAspectRatio: false,
        },
      });
    };
  },
});