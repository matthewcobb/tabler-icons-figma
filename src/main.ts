import { on, showUI } from "@create-figma-plugin/utilities";

const SIZE_KEY = 'tabler-icons-window-size';
const DEFAULT_SIZE = { width: 300, height: 400 };
const MIN_SIZE = { width: 260, height: 320 };

export default async function () {
  const saved = await figma.clientStorage.getAsync(SIZE_KEY).catch(() => null);
  const initial = saved && typeof saved.width === 'number' && typeof saved.height === 'number'
    ? saved
    : DEFAULT_SIZE;

  showUI({
    width: Math.max(MIN_SIZE.width, Math.round(initial.width)),
    height: Math.max(MIN_SIZE.height, Math.round(initial.height)),
  });

  on("RESIZE", (size: { width: number; height: number }) => {
    const width = Math.max(MIN_SIZE.width, Math.round(size.width));
    const height = Math.max(MIN_SIZE.height, Math.round(size.height));
    figma.ui.resize(width, height);
    figma.clientStorage.setAsync(SIZE_KEY, { width, height }).catch(() => {});
  });

  function findContainer(): (BaseNode & ChildrenMixin) | null {
    for (const node of figma.currentPage.selection) {
      if ('appendChild' in node && 'type' in node) {
        if (
          node.type === 'FRAME' ||
          node.type === 'GROUP' ||
          node.type === 'COMPONENT' ||
          node.type === 'COMPONENT_SET' ||
          node.type === 'SECTION'
        ) {
          return node as BaseNode & ChildrenMixin;
        }
      }
    }
    return null;
  }

  function slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function handleSubmit(data: { name: string; category: string; svg: string; variant: 'outline' | 'filled'; outlineStroke: boolean; wrapInFrame: boolean }) {
    const wrapper = figma.createNodeFromSvg(data.svg);
    let vector = figma.flatten(wrapper.children, wrapper);

    if (data.variant === 'outline' && data.outlineStroke) {
      const stroke = vector.outlineStroke();
      if (stroke) {
        wrapper.appendChild(stroke);
        vector.remove();
        vector = stroke;
      }
    }

    vector.name = 'Vector';

    const container = findContainer() ?? figma.currentPage;
    const node: SceneNode = data.wrapInFrame ? wrapper : vector;

    if (data.wrapInFrame) {
      const categorySlug = data.category ? slugify(data.category) : '';
      const iconName = data.variant === 'filled' ? `${data.name}-filled` : data.name;
      wrapper.name = categorySlug ? `${categorySlug}/${iconName}` : iconName;
      wrapper.fills = [];
      wrapper.clipsContent = false;
    }

    container.appendChild(node);

    if (!data.wrapInFrame) {
      wrapper.remove();
    }

    if (
      container.type === 'FRAME' ||
      container.type === 'COMPONENT' ||
      container.type === 'COMPONENT_SET' ||
      container.type === 'INSTANCE'
    ) {
      const layoutContainer = container as FrameNode;
      if (layoutContainer.layoutMode === 'NONE') {
        node.x = Math.round((layoutContainer.width - node.width) / 2);
        node.y = Math.round((layoutContainer.height - node.height) / 2);
      }
    } else if (container.type === 'PAGE' || container.type === 'SECTION' || container.type === 'GROUP') {
      node.x = Math.round(figma.viewport.center.x);
      node.y = Math.round(figma.viewport.center.y);
    }

    figma.currentPage.selection = [node];
  }

  on("SUBMIT", handleSubmit);
}
