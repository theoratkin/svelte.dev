import {
	stringify_expanded_type,
	stringify_module,
	stringify_type,
	type ModuleChild
} from '@sveltejs/site-kit/markdown';
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';
import ts from 'typescript';

// Adjust these as needed for your local setup
const svelte_repo_path = '../../../svelte';
const sveltekit_repo_path = '../../../svelte-kit';

let synced = false;

export async function sync_docs() {
	if (synced) return;

	synced = true;

	const svelte_site_path = `${svelte_repo_path}/sites/svelte.dev`;
	const sveltekit_site_path = `${sveltekit_repo_path}/sites/kit.svelte.dev`;

	// Copy over Svelte docs
	cpSync(
		new URL(`../${svelte_repo_path}/documentation/docs`, import.meta.url).pathname.slice(1),
		'content/docs/svelte/v05',
		{ recursive: true }
	);

	// Copy over SvelteKit docs
	cpSync(
		new URL(`../${sveltekit_repo_path}/documentation/docs`, import.meta.url).pathname.slice(1),
		'content/docs/kit/v02',
		{ recursive: true }
	);

	// Run script to generate type information from Svelte, then load the resulting JS file.
	// Once everything's on svelte.dev simplify this process by using the generated JSON directly.
	const svelte_script_path = fileURLToPath(
		new URL(`../${svelte_site_path}/scripts/type-gen/index.js`, import.meta.url).href
	);

	execSync(`node ${svelte_script_path}`, {
		cwd: path.dirname(path.dirname(path.dirname(svelte_script_path)))
	});

	const { modules: svelte_modules } = await import(
		new URL(`../${svelte_site_path}/src/lib/generated/type-info.js`, import.meta.url).href
	);

	const svelte_v05_path = 'content/docs/svelte/v05/98-reference';
	const files = readdirSync(svelte_v05_path);

	for (const file of files) {
		const filePath = path.join(svelte_v05_path, file);
		let content = readFileSync(filePath, 'utf-8');

		content = content.replace(/<!-- @include (.+?) -->/g, (match, moduleName) => {
			const module = svelte_modules.find((m: any) => m.name === moduleName);
			if (!module) throw new Error('Reference not found in generated types: ' + moduleName);
			return stringify_module(module);
		});

		writeFileSync(filePath, content);
	}

	// Same for SvelteKit
	const sveltekit_script_path = fileURLToPath(
		new URL(`../${sveltekit_site_path}/scripts/types/index.js`, import.meta.url).href
	);

	execSync(`node ${sveltekit_script_path}`, {
		cwd: path.dirname(path.dirname(path.dirname(sveltekit_script_path)))
	});

	// const { modules: sveltekit_modules } = await import(
	// 	'C:/repos/svelte/svelte-kit/sites/kit.svelte.dev/src/lib/generated/type-info.js'
	// );
	const sveltekit_modules = await read_kit_types();

	// TODO JSdoc points to kit.svelte.dev, rewrite those for now
	for (const module of sveltekit_modules) {
		replace_strings(module, (str) =>
			str
				.replace(/(https:\/\/kit.svelte.dev)?\/docs\/([^#)]+)/g, (_, __, slug) =>
					slug === 'cli' || slug === 'modules' || slug === 'types' || slug === 'configuration'
						? `/docs/kit/reference/${slug}`
						: _
				)
				.replace(/\/docs\/kit\/reference\/modules#([^-]+)-([^-]+)-([^-)]+)/g, (_, p1, p2, p3) => {
					if (p1 === '$env') {
						return `/docs/kit/reference/$env-all#${p1}-${p2}-${p3}`;
					} else {
						return `/docs/kit/reference/${p1 === 'sveltejs' ? '@sveltejs' : p1}-${p2}#${p3}`;
					}
				})
				.replace(/\/docs\/cli/g, '/docs/kit/reference/cli')
		);
	}

	const svelte_kit_types = sveltekit_modules.find((m) => m.name === '@sveltejs/kit')!.types;
	const config = svelte_kit_types.find((t) => t.name === 'Config')!;
	const kit_config = svelte_kit_types.find((t) => t.name === 'KitConfig')!;

	sveltekit_modules.find((m) => m.name === '@sveltejs/kit')!.types = svelte_kit_types.filter(
		(t) => t.name !== 'Config' && t.name !== 'KitConfig'
	);

	const kit_v02_path = 'content/docs/kit/v02/98-reference';
	const kit_files = readdirSync(kit_v02_path);

	for (const file of kit_files) {
		const filePath = path.join(kit_v02_path, file);
		let content = readFileSync(filePath, 'utf-8');

		content = content.replace(/<!-- @include (.+?) -->/g, (match, moduleName) => {
			if (moduleName === 'Config') {
				return stringify_type(config as ModuleChild);
			}
			if (moduleName === 'KitConfig') {
				return stringify_expanded_type(kit_config as ModuleChild);
			}

			const module = sveltekit_modules.find((m) => m.name === moduleName);
			if (!module) throw new Error('Reference not found in generated types: ' + moduleName);
			return stringify_module(module as any);
		});

		writeFileSync(filePath, content);
	}

	// const config = sveltekit_modules
	// 	.find((m) => m.name === '@sveltejs/kit')
	// 	.types.find((t) => t.name === 'Config');

	// const kit_config = sveltekit_modules
	// 	.find((m) => m.name === '@sveltejs/kit')
	// 	.types.find((t) => t.name === 'KitConfig');

	// write_module_to_md(
	// 	sveltekit_modules,
	// 	'kit',
	// 	`<!-- @include_start KitConfig -->\n${stringify_expanded_type(kit_config)}\n<!-- @include_end KitConfig -->\n\n` +
	// 		`<!-- @include_start Config -->\n${stringify_type(config)}\n<!-- @include_end Config -->\n\n`
	// );

	// Helper methods

	// function write_module_to_md(modules, name, additional = '') {
	// 	let content =
	// 		'---\ntitle: Generated Reference\n---\n\n' +
	// 		'This file is generated. Do not edit. If you are doing a translation, ' +
	// 		'remove the include comments in the other .md files instead and replace it with the translated output.\n\n';

	// 	for (const module of modules) {
	// 		const generated = stringify_module(module);
	// 		content += `<!-- @include_start ${module.name} -->\n${generated}\n<!-- @include_end ${module.name} -->\n\n`;
	// 	}

	// 	content += additional;

	// 	mkdirSync(`content/docs/${name}/_generated`, { recursive: true });
	// 	writeFileSync(`content/docs/${name}/_generated/reference.md`, content);
	// }

	function replace_strings(obj: any, replace: (str: string) => string) {
		for (let key in obj) {
			if (typeof obj[key] === 'object') {
				replace_strings(obj[key], replace);
			} else if (typeof obj[key] === 'string') {
				obj[key] = replace(obj[key]);
			}
		}
	}
}

// copy-pasted from kit sync script, TODO use for Svelte sync script aswell

interface Extracted {
	name: string;
	comment: string;
	markdown?: string;
	snippet: string;
	deprecated?: string | null;
	children: Extracted[];
	bullets?: string[];
}

async function read_kit_types() {
	const modules: Array<{
		name: string;
		comment: string;
		exports: Extracted[];
		types: Extracted[];
		exempt?: boolean;
	}> = [];
	const kit_base = sveltekit_repo_path + '/packages/kit/';

	{
		const code = read_d_ts_file(kit_base + 'src/types/private.d.ts');
		const node = ts.createSourceFile('private.d.ts', code, ts.ScriptTarget.Latest, true);

		modules.push({
			name: 'Private types',
			comment: '',
			...(await get_types(code, node.statements))
		});
	}

	// const dir = fileURLToPath(
	// 	new URL('../../../../packages/kit/src/types/synthetic', import.meta.url).href
	// );
	const dir = kit_base + 'src/types/synthetic';
	for (const file of readdirSync(dir)) {
		if (!file.endsWith('.md')) continue;

		const comment = strip_origin(read_d_ts_file(`${dir}/${file}`));

		modules.push({
			name: file.replace(/\+/g, '/').slice(0, -3),
			comment,
			exports: [],
			types: [],
			exempt: true
		});
	}

	{
		const code = read_d_ts_file(kit_base + 'types/index.d.ts');
		const node = ts.createSourceFile('index.d.ts', code, ts.ScriptTarget.Latest, true);

		for (const statement of node.statements) {
			if (ts.isModuleDeclaration(statement)) {
				// @ts-ignore
				const name = statement.name.text || statement.name.escapedText;

				// @ts-ignore
				const comment = strip_origin(statement.jsDoc?.[0].comment ?? '');

				modules.push({
					name,
					comment,
					// @ts-ignore
					...(await get_types(code, statement.body?.statements))
				});
			}
		}
	}

	modules.sort((a, b) => (a.name < b.name ? -1 : 1));

	return modules;
}

async function get_types(code: string, statements: ts.NodeArray<ts.Statement>) {
	const exports: Extracted[] = [];
	const types: Extracted[] = [];

	if (statements) {
		for (const statement of statements) {
			const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;

			const export_modifier = modifiers?.find(
				(modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
			);

			if (!export_modifier) continue;

			if (
				ts.isClassDeclaration(statement) ||
				ts.isInterfaceDeclaration(statement) ||
				ts.isTypeAliasDeclaration(statement) ||
				ts.isModuleDeclaration(statement) ||
				ts.isVariableStatement(statement) ||
				ts.isFunctionDeclaration(statement)
			) {
				const name_node = ts.isVariableStatement(statement)
					? statement.declarationList.declarations[0]
					: statement;

				// @ts-ignore no idea why it's complaining here
				const name = name_node.name?.escapedText;

				let start = statement.pos;
				let comment = '';
				let deprecated_notice: string | null = null;

				// @ts-ignore i think typescript is bad at typescript
				if (statement.jsDoc) {
					// @ts-ignore
					const jsDoc = statement.jsDoc[0];

					// `@link` JSDoc tags (and maybe others?) turn this property into an array, which we need to join manually
					if (Array.isArray(jsDoc.comment)) {
						comment = (jsDoc.comment as any[])
							.map(({ name, text }) => (name ? `\`${name.escapedText}\`` : text))
							.join('');
					} else {
						comment = jsDoc.comment;
					}

					if (jsDoc?.tags?.[0]?.tagName?.escapedText === 'deprecated') {
						deprecated_notice = jsDoc.tags[0].comment;
					}

					// @ts-ignore
					start = jsDoc.end;
				}

				const i = code.indexOf('export', start);
				start = i + 6;

				let children: Extracted[] = [];

				let snippet_unformatted = code.slice(start, statement.end).trim();

				if (ts.isInterfaceDeclaration(statement) || ts.isClassDeclaration(statement)) {
					if (statement.members.length > 0) {
						for (const member of statement.members) {
							children.push(munge_type_element(member as any)!);
						}

						children = children.filter(Boolean);

						// collapse `interface Foo {/* lots of stuff*/}` into `interface Foo {…}`
						const first = statement.members.at(0)!;
						const last = statement.members.at(-1)!;

						let body_start = first.pos - start;
						while (snippet_unformatted[body_start] !== '{') body_start -= 1;

						let body_end = last.end - start;
						while (snippet_unformatted[body_end] !== '}') body_end += 1;

						snippet_unformatted =
							snippet_unformatted.slice(0, body_start + 1) +
							'/*…*/' +
							snippet_unformatted.slice(body_end);
					}
				}

				const snippet = (
					await format(snippet_unformatted, {
						parser: 'typescript',
						printWidth: 60,
						useTabs: true,
						singleQuote: true,
						trailingComma: 'none'
					})
				)
					.replace(/\s*(\/\*…\*\/)\s*/g, '/*…*/')
					.trim();

				const collection =
					ts.isVariableStatement(statement) || ts.isFunctionDeclaration(statement)
						? exports
						: types;

				collection.push({
					name,
					comment,
					snippet,
					children,
					deprecated: deprecated_notice
				});
			}
		}

		types.sort((a, b) => (a.name < b.name ? -1 : 1));
		exports.sort((a, b) => (a.name < b.name ? -1 : 1));
	}

	return { types, exports };
}

function munge_type_element(member: ts.TypeElement, depth = 1): Extracted | undefined {
	// @ts-ignore
	const doc = member.jsDoc?.[0];

	if (/private api/i.test(doc?.comment)) return;

	const children: Extracted[] = [];

	// @ts-ignore
	const name = member.name?.escapedText ?? member.name?.getText() ?? 'unknown';
	let snippet = member.getText();

	for (let i = -1; i < depth; i += 1) {
		snippet = snippet.replace(/^\t/gm, '');
	}

	if (
		ts.isPropertySignature(member) &&
		ts.isTypeLiteralNode(member.type!) &&
		member.type.members.some((member) => (member as any).jsDoc?.[0].comment)
	) {
		let a = 0;
		while (snippet[a] !== '{') a += 1;

		snippet = snippet.slice(0, a + 1) + '/*…*/}';

		for (const child of member.type.members) {
			children.push(munge_type_element(child, depth + 1)!);
		}
	}

	const bullets: string[] = [];

	for (const tag of doc?.tags ?? []) {
		const type = tag.tagName.escapedText;

		switch (tag.tagName.escapedText) {
			case 'private':
				bullets.push(`- <span class="tag">private</span> ${tag.comment || ''}`);
				break;

			case 'readonly':
				bullets.push(`- <span class="tag">readonly</span> ${tag.comment || ''}`);
				break;

			case 'param':
				bullets.push(`- \`${tag.name.getText()}\` ${tag.comment || ''}`);
				break;

			case 'default':
				bullets.push(`- <span class="tag">default</span> \`${tag.comment || ''}\``);
				break;

			case 'returns':
				bullets.push(`- <span class="tag">returns</span> ${tag.comment || ''}`);
				break;

			case 'deprecated':
				bullets.push(`- <span class="tag deprecated">deprecated</span> ${tag.comment || ''}`);
				break;

			default:
				console.log(`unhandled JSDoc tag: ${type}`);
		}
	}

	return {
		name,
		snippet,
		comment: (doc?.comment ?? '')
			.replace(/\/\/\/ type: (.+)/g, '/** @type {$1} */')
			.replace(/\/\/\/ errors: (.+)/g, '// @errors: $1') // see read_d_ts_file
			.replace(/^(  )+/gm, (match: string, spaces: string) => {
				return '\t'.repeat(match.length / 2);
			}),
		bullets,
		children
	};
}

/**
 * Type declarations include fully qualified URLs so that they become links when
 * you hover over names in an editor with TypeScript enabled. We need to remove
 * the origin so that they become root-relative, so that they work in preview
 * deployments and when developing locally
 */
function strip_origin(str: string) {
	return str.replace(/https:\/\/kit\.svelte\.dev/g, '');
}

function read_d_ts_file(file: string) {
	// We can't use JSDoc comments inside JSDoc, so we would get ts(7031) errors if
	// we didn't ignore this error specifically for `/// file:` code examples
	const str = readFileSync(file, 'utf-8');

	return str.replace(/(\s*\*\s*)```js([\s\S]+?)```/g, (match, prefix, code) => {
		// For some reason, typescript 5.1> is reading @errors as a jsdoc tag, and splitting it into separate pieces,
		// which is why we use /// errors: instead and then replace it in the end
		return `${prefix}\`\`\`js${prefix}/// errors: 7031${code}\`\`\``;
	});
}

sync_docs();
