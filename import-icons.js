#!/usr/bin/env node

'use strict'

const fs = require('node:fs')

const prepareSvgFile = (svg) => {
	return svg
			.replace(/\n/g, '')
			.replace(/>\s+</g, '><')
			.replace(/<path stroke="none" d="M0 0h24v24H0z" fill="none"\s?\/>/, '')
			;
}

const iconsPkg = require('./node_modules/@tabler/icons/package.json')

const readSvg = (variant, name) => {
	const path = `./node_modules/@tabler/icons/icons/${variant}/${name}.svg`
	if (!fs.existsSync(path)) return null
	return prepareSvgFile(fs.readFileSync(path).toString())
}

const generateIconsJSON = (jsonFile, filename) => {
	const files = JSON.parse(fs.readFileSync(jsonFile))

	const svgList = []

	for (const iconName in files) {
		const iconData = files[iconName]
		const styles = iconData.styles || {}

		const outline = styles.outline ? readSvg('outline', iconName) : null
		const filled = styles.filled ? readSvg('filled', iconName) : null

		if (!outline && !filled) continue

		svgList.push({
			name: iconName,
			category: iconData.category,
			tags: iconData.tags,
			outline,
			filled,
		})
	}

	const svgData = {
		version: iconsPkg.version,
		icons: svgList,
	}

	fs.writeFileSync(filename, JSON.stringify(svgData))
}

generateIconsJSON('./node_modules/@tabler/icons/icons.json', `./src/icons.json`)
