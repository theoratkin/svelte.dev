import { index } from '$lib/server/content';
import { error } from '@sveltejs/kit';

export const prerender = true;

export async function load({ params }) {
	const [name, version] = params.path.split('/');
	const page = index[`docs/${name}/${version}`];

	if (!page) {
		error(404, 'Not found');
	}

	const regex = new RegExp(`^docs/${name}/v\\d+`);
	const versions = new Set<string>();

	// TODO temporary hack to show how the menu looks like, remove
	if (name === 'svelte') {
		versions.add('v3');
		versions.add('v4');
	} else if (name === 'kit') {
		versions.add('v1');
	}

	for (const key in index) {
		if (regex.test(key)) {
			versions.add(key.split('/')[2]);
		}
	}

	return {
		sections: page.children,
		version,
		versions: Array.from(versions)
	};
}
