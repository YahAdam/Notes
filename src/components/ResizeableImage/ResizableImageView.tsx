import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { ResizableNodeView } from "@tiptap/core";
import { useEffect, useRef } from "react";

export function ResizableImageView(props: NodeViewProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!imageRef.current) return;
    if (typeof props.getPos !== "function") return;

    const view = new ResizableNodeView({
      element: imageRef.current,
      node: props.node,
      editor: props.editor,
      getPos: props.getPos,
      onUpdate: updatedNode => {
        const { width, height } = updatedNode.attrs;

        if (!imageRef.current) return false;

        imageRef.current.style.width =
          typeof width === "number" ? `${width}px` : "300px";

        imageRef.current.style.height =
          typeof height === "number" ? `${height}px` : "auto";

        return true;
      },
      onResize: (width, height) => {
        if (!imageRef.current) return;

        imageRef.current.style.width = `${Math.round(width)}px`;
        imageRef.current.style.height = `${Math.round(height)}px`;
      },
      onCommit: (width, height) => {
        props.updateAttributes({
          width: Math.round(width),
          height: Math.round(height),
        });
      },
      options: {
        directions: ["right", "bottom", "bottom-right"],
        min: {
          width: 80,
          height: 80,
        },
        preserveAspectRatio: true,
      },
    });

    return () => {
      view.destroy();
    };
  }, [props]);

  const { src, alt, title, width, height } = props.node.attrs;

  return (
    <NodeViewWrapper className="resizable-image-node">
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        title={title}
        className="note-image"
        style={{
          width: typeof width === "number" ? `${width}px` : "300px",
          height: typeof height === "number" ? `${height}px` : "auto",
        }}
        draggable={false}
      />
    </NodeViewWrapper>
  );
}
