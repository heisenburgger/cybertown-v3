import { marked } from 'marked'

export const renderer = new marked.Renderer()

renderer.link = function ({ href, title, text }) {
	const target = 'target="_blank" rel="noopener noreferrer"'
	const titleAttr = title ? `title="${title}"` : ''
	return `<a href="${href}" ${titleAttr} ${target}>${text}</a>`
}

const tableRenderer = renderer.table
renderer.table = function (table) {
	const output = tableRenderer.call(this, table)
	return `<div class="table-wrapper scroller">${output}</div>`
}

renderer.image = function ({ href, title, text }) {
	const target = 'target="_blank" rel="noopener noreferrer"'
	const titleAttr = title ? `title="${title}"` : ''
	return `<a href="${href}" ${titleAttr} ${target}>${text}</a>`
}

renderer.paragraph = function ({ text }) {
	const onlyEmojis = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)+$/u.test(
		text.trim()
	)
	if (onlyEmojis) {
		return `<p style="font-size: 1.6em;">${text}</p>`
	}
	return `<p>${text}</p>`
}
