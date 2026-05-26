import '!./ui.css'

import {
  Container,
  Divider,
  render,
  Text,
  Muted,
  VerticalSpace,
  SearchTextbox,
  DropdownOption,
  Dropdown,
  SegmentedControl,
  Checkbox,
  Link,
} from "@create-figma-plugin/ui";
import {
	emit,
} from '@create-figma-plugin/utilities'

import { h, JSX } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { version, icons } from './icons.json'
import useSearch from './use-search'

const PAGE_SIZE = 120
const MIN_WIDTH = 260
const MIN_HEIGHT = 320

function ResizeHandle() {
  function handlePointerDown(event: JSX.TargetedPointerEvent<HTMLDivElement>) {
    event.preventDefault()
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)

    const onMove = (e: PointerEvent) => {
      const width = Math.max(MIN_WIDTH, Math.round(e.clientX + 4))
      const height = Math.max(MIN_HEIGHT, Math.round(e.clientY + 4))
      emit('RESIZE', { width, height })
    }

    const onUp = (e: PointerEvent) => {
      target.releasePointerCapture(e.pointerId)
      target.removeEventListener('pointermove', onMove)
      target.removeEventListener('pointerup', onUp)
      target.removeEventListener('pointercancel', onUp)
    }

    target.addEventListener('pointermove', onMove)
    target.addEventListener('pointerup', onUp)
    target.addEventListener('pointercancel', onUp)
  }

  return (
    <div
      class="resize-handle"
      onPointerDown={handlePointerDown}
      aria-label="Resize plugin window"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M13 5L5 13" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
        <path d="M13 9L9 13" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
        <path d="M13 13L13 13" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
      </svg>
    </div>
  )
}

type Variant = 'outline' | 'filled'

type Icon = {
	name: string,
	category: string,
	tags: (string | number | null)[],
	outline: string | null,
	filled: string | null,
}

function IconButton({
  icon,
  stroke,
  variant,
  outlineStroke,
  wrapInFrame,
}: {
  icon: Icon;
  stroke: string;
  variant: Variant;
  outlineStroke: boolean;
  wrapInFrame: boolean;
}) {
  const baseSvg = variant === 'filled' ? icon.filled : icon.outline;
  if (!baseSvg) return null;

  const svg = variant === 'outline'
    ? baseSvg.replace('stroke-width="2"', `stroke-width="${stroke}"`)
    : baseSvg;

  const handleClick = (name: string, category: string, svg: string) => {
    emit("SUBMIT", {
      name,
      category,
      svg,
      variant,
      outlineStroke,
      wrapInFrame,
    });
  };

  return (
    <button
      key={`${icon.name}-${variant}`}
      aria-label={icon.name}
      onClick={() => handleClick(icon.name, icon.category, svg)}
      class="icon-button"
      dangerouslySetInnerHTML={{ __html: svg }}
    ></button>
  );
}

function Plugin() {
	const [search, setSearch] = useState<string>('')
	const [category, setCategory] = useState<string>('')
	const [variant, setVariant] = useState<Variant>('outline')
	const [outlineStroke, setOutlineStroke] = useState<boolean>(true);
	const [wrapInFrame, setWrapInFrame] = useState<boolean>(false);

	const stroke = '2'

	const results = useSearch(search, category, variant)
	const [limit, setLimit] = useState<number>(PAGE_SIZE)
	const sentinelRef = useRef<HTMLDivElement>(null)
	const contentRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		setLimit(PAGE_SIZE)
		if (contentRef.current) contentRef.current.scrollTop = 0
	}, [search, category, variant])

	useEffect(() => {
		const sentinel = sentinelRef.current
		if (!sentinel) return

		const observer = new IntersectionObserver((entries) => {
			if (entries.some(e => e.isIntersecting)) {
				setLimit(prev => prev + PAGE_SIZE)
			}
		}, { root: contentRef.current, rootMargin: '400px 0px' })

		observer.observe(sentinel)
		return () => observer.disconnect()
	}, [])

	function handleInput(event: JSX.TargetedEvent<HTMLInputElement>) {
		setSearch(event.currentTarget.value)
	}

	function handleCategoryChange(event: JSX.TargetedEvent<HTMLInputElement>) {
		setCategory(event.currentTarget.value)
	}

	function handleVariantChange(event: JSX.TargetedEvent<HTMLInputElement>) {
		setVariant(event.currentTarget.value as Variant)
	}

	function handleOutlineChange(event: JSX.TargetedEvent<HTMLInputElement>) {
    setOutlineStroke(event.currentTarget.checked);
  }

	function handleWrapChange(event: JSX.TargetedEvent<HTMLInputElement>) {
    setWrapInFrame(event.currentTarget.checked);
  }

	let c: string[] = []
	icons.forEach((i) => {
		if(i.category != '' && c.indexOf(i.category) === -1) {
			c.push(i.category)
		}
	})

	c.sort()

	const categories: Array<DropdownOption> = [
		{ value: '', text: 'All categories' },
	]

	c.forEach((i) => {
		categories.push({
			value: i,
			text: i
		})
	})

	const variantOptions = [
		{ value: 'outline', children: 'Outline' },
		{ value: 'filled', children: 'Filled' },
	]

	return (
    <div class="app">
      <div class="search">
        <SearchTextbox
          onInput={handleInput}
          placeholder={`Search ${icons.length} icons`}
          value={search}
        />
        <Divider />
        <Container space="extraSmall">
          <VerticalSpace space="extraSmall" />
          <Dropdown
            onChange={handleCategoryChange}
            options={categories}
            value={category}
          />
          <VerticalSpace space="extraSmall" />
          <SegmentedControl
            onChange={handleVariantChange}
            options={variantOptions}
            value={variant}
          />
          <VerticalSpace space="extraSmall" />
        </Container>
        <Divider />
      </div>
      <div class="content" ref={contentRef}>
      <Container space="small">
        <VerticalSpace space="small" />
        {(() => {
          const visible = results.slice(0, limit) as Icon[]
          const groups: Array<{ category: string; icons: Icon[] }> = []
          const indexByCategory = new Map<string, number>()
          for (const icon of visible) {
            const cat = icon.category || 'Other'
            let idx = indexByCategory.get(cat)
            if (idx === undefined) {
              idx = groups.length
              indexByCategory.set(cat, idx)
              groups.push({ category: cat, icons: [] })
            }
            groups[idx].icons.push(icon)
          }
          return groups.map((group) => (
            <div key={group.category} class="category-group">
              <div class="category-heading">{group.category}</div>
              <div class="grid">
                {group.icons.map((icon) => (
                  <IconButton
                    icon={icon}
                    stroke={stroke}
                    variant={variant}
                    outlineStroke={outlineStroke}
                    wrapInFrame={wrapInFrame}
                  />
                ))}
              </div>
            </div>
          ))
        })()}
        {results.length === 0 && (
          <div>
            <VerticalSpace space="medium" />
            <Text align="center">
              <Muted>Sorry, we don't have any icon to match your query.</Muted>
            </Text>
            <VerticalSpace space="large" />
          </div>
        )}
        <div ref={sentinelRef} />
        {results.length > limit && (
          <div>
            <VerticalSpace space="medium" />
            <Text align="center">
              <Muted>Loading more&hellip;</Muted>
            </Text>
          </div>
        )}
      </Container>
      </div>
      <div className="footer">
        <Divider />
        <Container space="medium">
          <VerticalSpace space="small" />
          <Checkbox
            onChange={handleOutlineChange}
            value={outlineStroke}
            disabled={variant === 'filled'}
          >
            <Text>Paste icons as outline</Text>
          </Checkbox>
          <VerticalSpace space="small" />
          <Checkbox
            onChange={handleWrapChange}
            value={wrapInFrame}
          >
            <Text>Wrap in 24×24 frame</Text>
          </Checkbox>
          <VerticalSpace space="small" />
          <Text align="right">
            <Muted>v{version} &middot; </Muted>
            <Link
              href="https://tabler-icons.io/?utm_source=figma-plugin"
              target="_blank"
            >
              Tabler Icons
            </Link>
          </Text>
          <VerticalSpace space="small" />
        </Container>
      </div>
      <ResizeHandle />
    </div>
  );
}

export default render(Plugin)
