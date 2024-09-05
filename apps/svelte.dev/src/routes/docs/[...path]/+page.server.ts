import { docs } from '$lib/server/content';
import { render_content } from '$lib/server/renderer';
import { error } from '@sveltejs/kit';

export function entries() {
	// Older versions aren't crawlable, so we need to make SvelteKit aware of them
	return Object.keys(docs.topics).map((path) => ({ path }));
}

export async function load({ params, parent }) {
	const document = docs.pages[params.path];

	if (!document) {
		await parent(); // this may end up being a redirect
		error(404);
	}

	return {
		document: {
			...document,
			body: await render_content(document.file, document.body, !document.latest)
		}
	};
}
