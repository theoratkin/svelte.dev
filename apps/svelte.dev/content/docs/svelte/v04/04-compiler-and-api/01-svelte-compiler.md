---
title: 'svelte/compiler'
---

Typically, you won't interact with the Svelte compiler directly, but will instead integrate it into your build system using a bundler plugin. The bundler plugin that the Svelte team most recommends and invests in is [vite-plugin-svelte](https://github.com/sveltejs/vite-plugin-svelte). The [SvelteKit](https://kit.svelte.dev/) framework provides a setup leveraging `vite-plugin-svelte` to build applications as well as a [tool for packaging Svelte component libraries](https://kit.svelte.dev/docs/packaging). Svelte Society maintains a list of [other bundler plugins](https://sveltesociety.dev/packages?category=bundler-plugins) for additional tools like Rollup and Webpack.

Nonetheless, it's useful to understand how to use the compiler, since bundler plugins generally expose compiler options to you.

## compile

<div class="ts-block">

```dts
function compile(
	source: string,
	options?: CompileOptions
): CompileResult;
```

</div>

This is where the magic happens. `svelte.compile` takes your component source code, and turns it into a JavaScript module that exports a class.

```js
// @filename: ambient.d.ts
declare global {
	var source: string
}

export {}

// @filename: index.ts
// ---cut---
import { compile } from 'svelte/compiler';

const result = compile(source, {
	// options
});
```

Refer to [CompileOptions](#types-compileoptions) for all the available options.

The returned `result` object contains the code for your component, along with useful bits of metadata.

```ts
// @filename: ambient.d.ts
declare global {
	const source: string;
}

export {};

// @filename: main.ts
import { compile } from 'svelte/compiler';
// ---cut---
const { js, css, ast, warnings, vars, stats } = compile(source);
```

Refer to [CompileResult](#types-compileresult) for a full description of the compile result.

## parse

<div class="ts-block">

```dts
function parse(
	template: string,
	options?: ParserOptions
): Ast;
```

</div>

The `parse` function parses a component, returning only its abstract syntax tree. Unlike compiling with the `generate: false` option, this will not perform any validation or other analysis of the component beyond parsing it. Note that the returned AST is not considered public API, so breaking changes could occur at any point in time.

```js
// @filename: ambient.d.ts
declare global {
	var source: string;
}

export {};

// @filename: main.ts
// ---cut---
import { parse } from 'svelte/compiler';

const ast = parse(source, { filename: 'App.svelte' });
```

## preprocess

<div class="ts-block">

```dts
function preprocess(
	source: string,
	preprocessor: PreprocessorGroup | PreprocessorGroup[],
	options?:
		| {
				filename?: string | undefined;
		  }
		| undefined
): Promise<Processed>;
```

</div>

A number of [official and community-maintained preprocessing plugins](https://sveltesociety.dev/packages?category=preprocessors) are available to allow you to use Svelte with tools like TypeScript, PostCSS, SCSS, and Less.

You can write your own preprocessor using the `svelte.preprocess` API.

The `preprocess` function provides convenient hooks for arbitrarily transforming component source code. For example, it can be used to convert a `<style lang="sass">` block into vanilla CSS.

The first argument is the component source code. The second is an array of _preprocessors_ (or a single preprocessor, if you only have one), where a preprocessor is an object with a `name` which is required, and `markup`, `script` and `style` functions, each of which is optional.

The `markup` function receives the entire component source text, along with the component's `filename` if it was specified in the third argument.

The `script` and `style` functions receive the contents of `<script>` and `<style>` elements respectively (`content`) as well as the entire component source text (`markup`). In addition to `filename`, they get an object of the element's attributes.

Each `markup`, `script` or `style` function must return an object (or a Promise that resolves to an object) with a `code` property, representing the transformed source code. Optionally they can return an array of `dependencies` which represents files to watch for changes, and a `map` object which is a sourcemap mapping back the transformation to the original code. `script` and `style` preprocessors can optionally return a record of attributes which represent the updated attributes on the script/style tag.

> Preprocessor functions should return a `map` object whenever possible or else debugging becomes harder as stack traces can't link to the original code correctly.

```ts
// @filename: ambient.d.ts
declare global {
	var source: string;
}

export {};

// @filename: main.ts
// ---cut---
import { preprocess } from 'svelte/compiler';
import MagicString from 'magic-string';

const { code } = await preprocess(
	source,
	{
		markup: ({ content, filename }) => {
			const pos = content.indexOf('foo');
			if (pos < 0) {
				return { code: content };
			}
			const s = new MagicString(content, { filename });
			s.overwrite(pos, pos + 3, 'bar', { storeName: true });
			return {
				code: s.toString(),
				map: s.generateMap()
			};
		}
	},
	{
		filename: 'App.svelte'
	}
);
```

If a `dependencies` array is returned, it will be included in the result object. This is used by packages like [vite-plugin-svelte](https://github.com/sveltejs/vite-plugin-svelte) and [rollup-plugin-svelte](https://github.com/sveltejs/rollup-plugin-svelte) to watch additional files for changes, in the case where your `<style>` tag has an `@import` (for example).

```ts
/// file: preprocess-sass.js
// @filename: ambient.d.ts
declare global {
	var source: string;
}

export {};

// @filename: sass.d.ts
declare module 'sass' {
	export function render(
		options: {
			file: string;
			data: string;
			includePaths: string[];
		},
		callback: (err: Error, result: Result) => void
	): Result;

	export interface Result {
		css: {
			toString(): string;
		};
		stats: {
			includedFiles: string[];
		};
	}
}

// @filename: main.ts
// @errors: 2322 2345 2339
/// <reference types="@types/node" />
// ---cut---
import { preprocess } from 'svelte/compiler';
import MagicString from 'magic-string';
import sass from 'sass';
import { dirname } from 'path';

const { code } = await preprocess(
	source,
	{
		name: 'my-fancy-preprocessor',
		markup: ({ content, filename }) => {
			// Return code as is when no foo string present
			const pos = content.indexOf('foo');
			if (pos < 0) {
				return;
			}

			// Replace foo with bar using MagicString which provides
			// a source map along with the changed code
			const s = new MagicString(content, { filename });
			s.overwrite(pos, pos + 3, 'bar', { storeName: true });

			return {
				code: s.toString(),
				map: s.generateMap({ hires: true, file: filename })
			};
		},
		style: async ({ content, attributes, filename }) => {
			// only process <style lang="sass">
			if (attributes.lang !== 'sass') return;

			const { css, stats } = await new Promise((resolve, reject) =>
				sass.render(
					{
						file: filename,
						data: content,
						includePaths: [dirname(filename)]
					},
					(err, result) => {
						if (err) reject(err);
						else resolve(result);
					}
				)
			);

			// remove lang attribute from style tag
			delete attributes.lang;

			return {
				code: css.toString(),
				dependencies: stats.includedFiles,
				attributes
			};
		}
	},
	{
		filename: 'App.svelte'
	}
);
```

Multiple preprocessors can be used together. The output of the first becomes the input to the second. Within one preprocessor, `markup` runs first, then `script` and `style`.

> In Svelte 3, all `markup` functions ran first, then all `script` and then all `style` preprocessors. This order was changed in Svelte 4.

```js
/// file: multiple-preprocessor.js
// @errors: 2322
// @filename: ambient.d.ts
declare global {
	var source: string;
}

export {};

// @filename: main.ts
// ---cut---
import { preprocess } from 'svelte/compiler';

const { code } = await preprocess(source, [
	{
		name: 'first preprocessor',
		markup: () => {
			console.log('this runs first');
		},
		script: () => {
			console.log('this runs second');
		},
		style: () => {
			console.log('this runs third');
		}
	},
	{
		name: 'second preprocessor',
		markup: () => {
			console.log('this runs fourth');
		},
		script: () => {
			console.log('this runs fifth');
		},
		style: () => {
			console.log('this runs sixth');
		}
	}
], {
	filename: 'App.svelte'
});
```

## walk



The `walk` function provides a way to walk the abstract syntax trees generated by the parser, using the compiler's own built-in instance of [estree-walker](https://github.com/Rich-Harris/estree-walker).

The walker takes an abstract syntax tree to walk and an object with two optional methods: `enter` and `leave`. For each node, `enter` is called (if present). Then, unless `this.skip()` is called during `enter`, each of the children are traversed, and then `leave` is called on the node.

```js
/// file: compiler-walk.js
// @filename: ambient.d.ts
declare global {
	var ast: import('estree').Node;
	function do_something(node: import('estree').Node): void;
	function do_something_else(node: import('estree').Node): void;
	function should_skip_children(node: import('estree').Node): boolean;
}

export {};

// @filename: main.ts
// @errors: 7006
// ---cut---
import { walk } from 'svelte/compiler';

walk(ast, {
	enter(node, parent, prop, index) {
		do_something(node);
		if (should_skip_children(node)) {
			this.skip();
		}
	},
	leave(node, parent, prop, index) {
		do_something_else(node);
	}
});
```

## VERSION

<div class="ts-block">

```dts
const VERSION: string;
```

</div>

The current version, as set in package.json.

```js
import { VERSION } from 'svelte/compiler';
console.log(`running svelte version ${VERSION}`);
```

## Types



### CompileOptions





<div class="ts-block">

```dts
interface CompileOptions {/*…*/}
```

<div class="ts-block-property">

```dts
name?: string;
```

<div class="ts-block-property-details">

<div class="ts-block-property-bullets">

- <span class="tag">default</span> `'Component'`

</div>

Sets the name of the resulting JavaScript class (though the compiler will rename it if it would otherwise conflict with other variables in scope).
It will normally be inferred from `filename`

</div>
</div>

<div class="ts-block-property">

```dts
filename?: string;
```

<div class="ts-block-property-details">

<div class="ts-block-property-bullets">

- <span class="tag">default</span> `null`

</div>

Used for debugging hints and sourcemaps. Your bundler plugin will set it automatically.

</div>
</div>

<div class="ts-block-property">

```dts
generate?: 'dom' | 'ssr' | false;
```

<div class="ts-block-property-details">

<div class="ts-block-property-bullets">

- <span class="tag">default</span> `'dom'`

</div>

If `"dom"`, Svelte emits a JavaScript class for mounting to the DOM.
If `"ssr"`, Svelte emits an object with a `render` method suitable for server-side rendering.
If `false`, no JavaScript or CSS is returned; just metadata.

</div>
</div>

<div class="ts-block-property">

```dts
errorMode?: 'throw' | 'warn';
```

<div class="ts-block-property-details">

<div class="ts-block-property-bullets">

- <span class="tag">default</span> `'throw'`

</div>

If `"throw"`, Svelte throws when a compilation error occurred.
If `"warn"`, Svelte will treat errors as warnings and add them to the warning report.

</div>
</div>

<div class="ts-block-property">

```dts
varsReport?: 'full' | 'strict' | false;
```

<div class="ts-block-property-details">

<div class="ts-block-property-bullets">

- <span class="tag">default</span> `'strict'`

</div>

If `"strict"`, Svelte returns a variables report with only variables that are not globals nor internals.
If `"full"`, Svelte returns a variables report with all detected variables.
If `false`, no variables report is returned.

</div>
</div>

<div class="ts-block-property">

```dts
sourcemap?: object | string;
```

<div class="ts-block-property-details">

<div class="ts-block-property-bullets">

- <span class="tag">default</span> `null`

</div>

An initial sourcemap that will be merged into the final output sourcemap.
This is usually the preprocessor sourcemap.

</div>
</div>

<div class="ts-block-property">

```dts
enableSourcemap?: EnableSourcemap;
```

<div class="ts-block-property-details">

<div class="ts-block-property-bullets">

- <span class="tag">default</span> `true`

</div>

If `true`, Svelte generate sourcemaps for components.
Use an object with `js` or `css` for more granular control of sourcemap generation.

</div>
</div>

<div class="ts-block-property">

```dts
outputFilename?: string;
```

<div class="ts-block-property-details">

<div class="ts-block-property-bullets">

- <span class="tag">default</span> `null`

</div>

Used for your JavaScript sourcemap.

</div>
</div>

<div class="ts-block-property">

```dts
cssOutputFilename?: string;
```

<div class="ts-block-property-details">

<div class="ts-block-property-bullets">

- <span class="tag">default</span> `null`

</div>

Used for your CSS sourcemap.

</div>
</div>

<div class="ts-block-property">

```dts
sveltePath?: string;
```

<div class="ts-block-property-details">

<div class="ts-block-property-bullets">

- <span class="tag">default</span> `'svelte'`

</div>

The location of the `svelte` package.
Any imports from `svelte` or `svelte/[module]` will be modified accordingly.

</div>
</div>

<div class="ts-block-property">

```dts
dev?: boolean;
```

<div class="ts-block-property-details">

<div class="ts-block-property-bullets">

- <span class="tag">default</span> `false`

</div>

If `true`, causes extra code to be added to components that will perform runtime checks and provide debugging information during development.

</div>
</div>

<div class="ts-block-property">

```dts
accessors?: boolean;
```

<div class="ts-block-property-details">

<div class="ts-block-property-bullets">

- <span class="tag">default</span> `false`

</div>

If `true`, getters and setters will be created for the component's props. If `false`, they will only be created for readonly exported values (i.e. those declared with `const`, `class` and `function`). If compiling with `customElement: true` this option defaults to `true`.

</div>
</div>

<div class="ts-block-property">

```dts
immutable?: boolean;
```

<div class="ts-block-property-details">

<div class="ts-block-property-bullets">

- <span class="tag">default</span> `false`

</div>

If `true`, tells the compiler that you promise not to mutate any objects.
This allows it to be less conservative about checking whether values have changed.

</div>
</div>

<div class="ts-block-property">

```dts
hydratable?: boolean;
```

<div class="ts-block-property-details">

<div class="ts-block-property-bullets">

- <span class="tag">default</span> `false`

</div>

If `true` when generating DOM code, enables the `hydrate: true` runtime option, which allows a component to upgrade existing DOM rather than creating new DOM from scratch.
When generating SSR code, this adds markers to `<head>` elements so that hydration knows which to replace.

</div>
</div>

<div class="ts-block-property">

```dts
legacy?: boolean;
```

<div class="ts-block-property-details">

<div class="ts-block-property-bullets">

- <span class="tag">default</span> `false`

</div>

If `true`, generates code that will work in IE9 and IE10, which don't support things like `element.dataset`.

</div>
</div>

<div class="ts-block-property">

```dts
customElement?: boolean;
```

<div class="ts-block-property-details">

<div class="ts-block-property-bullets">

- <span class="tag">default</span> `false`

</div>

If `true`, tells the compiler to generate a custom element constructor instead of a regular Svelte component.

</div>
</div>

<div class="ts-block-property">

```dts
tag?: string;
```

<div class="ts-block-property-details">

<div class="ts-block-property-bullets">

- <span class="tag">default</span> `null`

</div>

A `string` that tells Svelte what tag name to register the custom element with.
It must be a lowercase alphanumeric string with at least one hyphen, e.g. `"my-element"`.

</div>
</div>

<div class="ts-block-property">

```dts
css?: 'injected' | 'external' | 'none' | boolean;
```

<div class="ts-block-property-details">

- `'injected'` (formerly `true`), styles will be included in the JavaScript class and injected at runtime for the components actually rendered.
- `'external'` (formerly `false`), the CSS will be returned in the `css` field of the compilation result. Most Svelte bundler plugins will set this to `'external'` and use the CSS that is statically generated for better performance, as it will result in smaller JavaScript bundles and the output can be served as cacheable `.css` files.
- `'none'`, styles are completely avoided and no CSS output is generated.

</div>
</div>

<div class="ts-block-property">

```dts
loopGuardTimeout?: number;
```

<div class="ts-block-property-details">

<div class="ts-block-property-bullets">

- <span class="tag">default</span> `0`

</div>

A `number` that tells Svelte to break the loop if it blocks the thread for more than `loopGuardTimeout` ms.
This is useful to prevent infinite loops.
**Only available when `dev: true`**.

</div>
</div>

<div class="ts-block-property">

```dts
namespace?: string;
```

<div class="ts-block-property-details">

<div class="ts-block-property-bullets">

- <span class="tag">default</span> `'html'`

</div>

The namespace of the element; e.g., `"mathml"`, `"svg"`, `"foreign"`.

</div>
</div>

<div class="ts-block-property">

```dts
cssHash?: CssHashGetter;
```

<div class="ts-block-property-details">

<div class="ts-block-property-bullets">

- <span class="tag">default</span> `undefined`

</div>

A function that takes a `{ hash, css, name, filename }` argument and returns the string that is used as a classname for scoped CSS.
It defaults to returning `svelte-${hash(css)}`.

</div>
</div>

<div class="ts-block-property">

```dts
preserveComments?: boolean;
```

<div class="ts-block-property-details">

<div class="ts-block-property-bullets">

- <span class="tag">default</span> `false`

</div>

If `true`, your HTML comments will be preserved during server-side rendering. By default, they are stripped out.

</div>
</div>

<div class="ts-block-property">

```dts
preserveWhitespace?: boolean;
```

<div class="ts-block-property-details">

<div class="ts-block-property-bullets">

- <span class="tag">default</span> `false`

</div>

If `true`, whitespace inside and between elements is kept as you typed it, rather than removed or collapsed to a single space where possible.

</div>
</div>

<div class="ts-block-property">

```dts
discloseVersion?: boolean;
```

<div class="ts-block-property-details">

<div class="ts-block-property-bullets">

- <span class="tag">default</span> `true`

</div>

If `true`, exposes the Svelte major version in the browser by adding it to a `Set` stored in the global `window.__svelte.v`.

</div>
</div></div>

### CompileResult



The returned shape of `compile` from `svelte/compiler`

<div class="ts-block">

```dts
interface CompileResult {/*…*/}
```

<div class="ts-block-property">

```dts
js: {/*…*/}
```

<div class="ts-block-property-details">

The resulting JavaScript code from compling the component

<div class="ts-block-property-children"><div class="ts-block-property">

```dts
code: string;
```

<div class="ts-block-property-details">

Code as a string

</div>
</div>
<div class="ts-block-property">

```dts
map: any;
```

<div class="ts-block-property-details">

A source map

</div>
</div></div>

</div>
</div>

<div class="ts-block-property">

```dts
css: CssResult;
```

<div class="ts-block-property-details">

The resulting CSS code from compling the component

</div>
</div>

<div class="ts-block-property">

```dts
ast: Ast;
```

<div class="ts-block-property-details">

The abstract syntax tree representing the structure of the component

</div>
</div>

<div class="ts-block-property">

```dts
warnings: Warning[];
```

<div class="ts-block-property-details">

An array of warning objects that were generated during compilation. Each warning has several properties:
- code is a string identifying the category of warning
- message describes the issue in human-readable terms
- start and end, if the warning relates to a specific location, are objects with line, column and character properties
- frame, if applicable, is a string highlighting the offending code with line numbers

</div>
</div>

<div class="ts-block-property">

```dts
vars: Var[];
```

<div class="ts-block-property-details">

An array of the component's declarations used by tooling in the ecosystem (like our ESLint plugin) to infer more information

</div>
</div>

<div class="ts-block-property">

```dts
stats: {
	timings: {
		total: number;
	};
};
```

<div class="ts-block-property-details">

An object used by the Svelte developer team for diagnosing the compiler. Avoid relying on it to stay the same!

</div>
</div></div>

### CssHashGetter





<div class="ts-block">

```dts
type CssHashGetter = (args: {
	name: string;
	filename: string | undefined;
	css: string;
	hash: (input: string) => string;
}) => string;
```

</div>

### EnableSourcemap





<div class="ts-block">

```dts
type EnableSourcemap =
	| boolean
	| { js: boolean; css: boolean };
```

</div>

### MarkupPreprocessor



A markup preprocessor that takes a string of code and returns a processed version.

<div class="ts-block">

```dts
type MarkupPreprocessor = (options: {
	/**
	 * The whole Svelte file content
	 */
	content: string;
	/**
	 * The filename of the Svelte file
	 */
	filename?: string;
}) => Processed | void | Promise<Processed | void>;
```

</div>

### Preprocessor



A script/style preprocessor that takes a string of code and returns a processed version.

<div class="ts-block">

```dts
type Preprocessor = (options: {
	/**
	 * The script/style tag content
	 */
	content: string;
	/**
	 * The attributes on the script/style tag
	 */
	attributes: Record<string, string | boolean>;
	/**
	 * The whole Svelte file content
	 */
	markup: string;
	/**
	 * The filename of the Svelte file
	 */
	filename?: string;
}) => Processed | void | Promise<Processed | void>;
```

</div>

### PreprocessorGroup



A preprocessor group is a set of preprocessors that are applied to a Svelte file.

<div class="ts-block">

```dts
interface PreprocessorGroup {/*…*/}
```

<div class="ts-block-property">

```dts
name?: string;
```

<div class="ts-block-property-details">

Name of the preprocessor. Will be a required option in the next major version

</div>
</div>

<div class="ts-block-property">

```dts
markup?: MarkupPreprocessor;
```

<div class="ts-block-property-details"></div>
</div>

<div class="ts-block-property">

```dts
style?: Preprocessor;
```

<div class="ts-block-property-details"></div>
</div>

<div class="ts-block-property">

```dts
script?: Preprocessor;
```

<div class="ts-block-property-details"></div>
</div></div>

### Processed



The result of a preprocessor run. If the preprocessor does not return a result, it is assumed that the code is unchanged.

<div class="ts-block">

```dts
interface Processed {/*…*/}
```

<div class="ts-block-property">

```dts
code: string;
```

<div class="ts-block-property-details">

The new code

</div>
</div>

<div class="ts-block-property">

```dts
map?: string | object;
```

<div class="ts-block-property-details">

A source map mapping back to the original code

</div>
</div>

<div class="ts-block-property">

```dts
dependencies?: string[];
```

<div class="ts-block-property-details">

A list of additional files to watch for changes

</div>
</div>

<div class="ts-block-property">

```dts
attributes?: Record<string, string | boolean>;
```

<div class="ts-block-property-details">

Only for script/style preprocessors: The updated attributes to set on the tag. If undefined, attributes stay unchanged.

</div>
</div>

<div class="ts-block-property">

```dts
toString?: () => string;
```

<div class="ts-block-property-details"></div>
</div></div>

### SveltePreprocessor



Utility type to extract the type of a preprocessor from a preprocessor group

<div class="ts-block">

```dts
interface SveltePreprocessor<
	PreprocessorType extends keyof PreprocessorGroup,
	Options = any
> {/*…*/}
```

<div class="ts-block-property">

```dts
(options?: Options): Required<Pick<PreprocessorGroup, PreprocessorType>>;
```

<div class="ts-block-property-details"></div>
</div></div>


