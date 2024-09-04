import { docs } from '$lib/server/content';
import { error, redirect } from '@sveltejs/kit';

export const prerender = true;

export async function load({ params }) {
	const [name, version, page] = params.path.split('/');
	const topic = docs.topics[`${name}/${version}`];

	if (!topic) {
		if (!version) {
			// maybe clicked on a link like docs/svelte -> redirect to the latest version
			const latest = Object.values(docs.topics).find(
				(doc) => doc.slug.startsWith(`${name}/`) && doc.latest
			)!;

			if (latest) {
				redirect(307, `/${latest.children[0].children[0].slug}`);
			}
		}

		error(404, 'Not found');
	}

	if (!page) {
		// clicked on a link like docs/svelte/v5 -> redirect to first page
		redirect(307, `/${topic.children[0].children[0].slug}`);
	}

	const versions: string[] = [];

	for (const key in docs.topics) {
		if (key.startsWith(`${name}/`)) {
			versions.push(key.split('/')[1]);
		}
	}

	return {
		sections: topic.children,
		version,
		versions
	};
}
