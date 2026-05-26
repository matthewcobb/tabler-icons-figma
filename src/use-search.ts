import Fuse from 'fuse.js'
import { useState, useEffect } from 'preact/hooks'

import { icons } from './icons.json'

function useSearch(query: string, category: string, variant: 'outline' | 'filled') {
	const values = Object.values(icons)
	const [results, setResults] = useState(values)

	const filterResult = new Fuse(values, {
		threshold: 0.2,
		keys: ['name', 'tags', 'category']
	})

	useEffect(() => {
		const matchesFilters = (icon: typeof values[number]) => {
			if (category !== '' && icon.category !== category) return false
			if (variant === 'filled' && !icon.filled) return false
			if (variant === 'outline' && !icon.outline) return false
			return true
		}

		if (query.trim()) {
			setResults(filterResult.search(query.trim()).map(result => result.item).filter(matchesFilters))
		} else {
			setResults(values.filter(matchesFilters))
		}
	}, [query, category, variant])

	return results
}

export default useSearch
