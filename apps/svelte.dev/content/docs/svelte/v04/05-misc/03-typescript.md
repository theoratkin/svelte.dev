---
title: TypeScript
---

You can use TypeScript within Svelte components. IDE extensions like the [Svelte VSCode extension](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) will help you catch errors right in your editor, and [`svelte-check`](https://www.npmjs.com/package/svelte-check) does the same on the command line, which you can integrate into your CI.

## Setup

To use TypeScript within Svelte components, you need to add a preprocessor that will turn TypeScript into JavaScript.

### Using SvelteKit or Vite

The easiest way to get started is scaffolding a new SvelteKit project by typing `npm create svelte@latest`, following the prompts and choosing the TypeScript option.

If you don't need or want all the features SvelteKit has to offer, you can scaffold a Svelte-flavoured Vite project instead by typing `npm create vite@latest` and selecting the `svelte-ts` option.

```ts
/// file: svelte.config.js
// @filename: ambient.d.ts
declare module '@sveltejs/vite-plugin-svelte' {
	import { ResolvedConfig } from 'vite';
	import { InlineConfig } from 'vite/dist/node/config';

	export interface VitePreprocessOptions {
		script?: boolean;
		style?: boolean | InlineConfig | ResolvedConfig;
	}

	export function vitePreprocess(
		options?: VitePreprocessOptions
	): import('svelte/compiler').PreprocessorGroup;
}

// @filename: index.ts
// ---cut---
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: vitePreprocess()
};

export default config;
```

In both cases, a `svelte.config.js` with `vitePreprocess` will be added. Vite/SvelteKit will read from this config file.

### Other build tools

If you're using tools like Rollup or Webpack instead, install their respective Svelte plugins. For Rollup that's [rollup-plugin-svelte](https://github.com/sveltejs/rollup-plugin-svelte) and for Webpack that's [svelte-loader](https://github.com/sveltejs/svelte-loader). For both, you need to install `typescript` and `svelte-preprocess` and add the preprocessor to the plugin config (see the respective READMEs for more info). If you're starting a new project, you can also use the [rollup](https://github.com/sveltejs/template) or [webpack](https://github.com/sveltejs/template-webpack) template to scaffold the setup from a script.

> If you're starting a new project, we recommend using SvelteKit or Vite instead

## `<script lang="ts">`

To use TypeScript inside your Svelte components, add `lang="ts"` to your `script` tags:

```svelte
<script lang="ts">
	let name: string = 'world';

	function greet(name: string) {
		alert(`Hello, ${name}!`);
	}
</script>
```

### Props

Props can be typed directly on the `export let` statement:

```svelte
<script lang="ts">
	export let name: string;
</script>
```

### Slots

Slot and slot prop types are inferred from the types of the slot props passed to them:

```svelte
<script lang="ts">
	export let name: string;
</script>

<slot {name} />

<!-- Later -->
<Comp let:name>
	<!--    ^ Inferred as string -->
	{name}
</Comp>
```

### Events

Events can be typed with `createEventDispatcher`:

```svelte
<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher<{
		event: null; // does not accept a payload
		click: string; // has a required string payload
		type: string | null; // has an optional string payload
	}>();

	function handleClick() {
		dispatch('event');
		dispatch('click', 'hello');
	}

	function handleType() {
		dispatch('event');
		dispatch('type', Math.random() > 0.5 ? 'world' : null);
	}
</script>

<button on:click={handleClick} on:keydown={handleType}>Click</button>
```

## Enhancing built-in DOM types

Svelte provides a best effort of all the HTML DOM types that exist. Sometimes you may want to use experimental attributes or custom events coming from an action. In these cases, TypeScript will throw a type error, saying that it does not know these types. If it's a non-experimental standard attribute/event, this may very well be a missing typing from our [HTML typings](https://github.com/sveltejs/svelte/blob/master/packages/svelte/elements.d.ts). In that case, you are welcome to open an issue and/or a PR fixing it.

In case this is a custom or experimental attribute/event, you can enhance the typings like this:

```ts
/// file: additional-svelte-typings.d.ts
declare namespace svelteHTML {
	// enhance elements
	interface IntrinsicElements {
		'my-custom-element': { someattribute: string; 'on:event': (e: CustomEvent<any>) => void };
	}
	// enhance attributes
	interface HTMLAttributes<T> {
		// If you want to use on:beforeinstallprompt
		'on:beforeinstallprompt'?: (event: any) => any;
		// If you want to use myCustomAttribute={..} (note: all lowercase)
		mycustomattribute?: any; // You can replace any with something more specific if you like
	}
}
```

Then make sure that `d.ts` file is referenced in your `tsconfig.json`. If it reads something like `"include": ["src/**/*"]` and your `d.ts` file is inside `src`, it should work. You may need to reload for the changes to take effect.

Since Svelte version 4.2 / `svelte-check` version 3.5 / VS Code extension version 107.10.0 you can also declare the typings by augmenting the `svelte/elements` module like this:

```ts
/// file: additional-svelte-typings.d.ts
import { HTMLButtonAttributes } from 'svelte/elements';

declare module 'svelte/elements' {
	export interface SvelteHTMLElements {
		'custom-button': HTMLButtonAttributes;
	}

	// allows for more granular control over what element to add the typings to
	export interface HTMLButtonAttributes {
		veryexperimentalattribute?: string;
	}
}

export {}; // ensure this is not an ambient module, else types will be overridden instead of augmented
```

## Experimental advanced typings

A few features are missing from taking full advantage of TypeScript in more advanced use cases like typing that a component implements a certain interface, explicitly typing slots, or using generics. These things are possible using experimental advanced type capabilities. See [this RFC](https://github.com/dummdidumm/rfcs/blob/ts-typedefs-within-svelte-components/text/ts-typing-props-slots-events.md) for more information on how to make use of them.

> The API is experimental and may change at any point

## Limitations

### No TS in markup

You cannot use TypeScript in your template's markup. For example, the following does not work:

```svelte
<script lang="ts">
	let count = 10;
</script>

<h1>Count as string: {count as string}!</h1> <!-- ❌ Does not work -->
{#if count > 4}
	{@const countString: string = count} <!-- ❌ Does not work -->
	{countString}
{/if}
```

### Reactive Declarations

You cannot type your reactive declarations with TypeScript in the way you type a variable. For example, the following does not work:

```svelte
<script lang="ts">
	let count = 0;

	$: doubled: number = count * 2; // ❌ Does not work
</script>
```

You cannot add a `: TYPE` because it's invalid syntax in this position. Instead, you can move the definition to a `let` statement just above:

```svelte
<script lang="ts">
	let count = 0;

	let doubled: number;
	$: doubled = count * 2;
</script>
```

## Types



### ComponentConstructorOptions





<div class="ts-block">

```dts
interface ComponentConstructorOptions<
	Props extends Record<string, any> = Record<string, any>
> {/*…*/}
```

<div class="ts-block-property">

```dts
target: Element | Document | ShadowRoot;
```

<div class="ts-block-property-details"></div>
</div>

<div class="ts-block-property">

```dts
anchor?: Element;
```

<div class="ts-block-property-details"></div>
</div>

<div class="ts-block-property">

```dts
props?: Props;
```

<div class="ts-block-property-details"></div>
</div>

<div class="ts-block-property">

```dts
context?: Map<any, any>;
```

<div class="ts-block-property-details"></div>
</div>

<div class="ts-block-property">

```dts
hydrate?: boolean;
```

<div class="ts-block-property-details"></div>
</div>

<div class="ts-block-property">

```dts
intro?: boolean;
```

<div class="ts-block-property-details"></div>
</div>

<div class="ts-block-property">

```dts
$$inline?: boolean;
```

<div class="ts-block-property-details"></div>
</div></div>

### ComponentEvents



Convenience type to get the events the given component expects. Example:
```html
<script lang="ts">
	 import type { ComponentEvents } from 'svelte';
	 import Component from './Component.svelte';

	 function handleCloseEvent(event: ComponentEvents<Component>['close']) {
			console.log(event.detail);
	 }
</script>

<Component on:close={handleCloseEvent} />
```

<div class="ts-block">

```dts
type ComponentEvents<Component extends SvelteComponent_1> =
	Component extends SvelteComponent<any, infer Events>
		? Events
		: never;
```

</div>

### ComponentProps



Convenience type to get the props the given component expects. Example:
```html
<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import Component from './Component.svelte';

	const props: ComponentProps<Component> = { foo: 'bar' }; // Errors if these aren't the correct props
</script>
```

<div class="ts-block">

```dts
type ComponentProps<Component extends SvelteComponent_1> =
	Component extends SvelteComponent<infer Props>
		? Props
		: never;
```

</div>

### ComponentType



Convenience type to get the type of a Svelte component. Useful for example in combination with
dynamic components using `<svelte:component>`.

Example:
```html
<script lang="ts">
	import type { ComponentType, SvelteComponent } from 'svelte';
	import Component1 from './Component1.svelte';
	import Component2 from './Component2.svelte';

	const component: ComponentType = someLogic() ? Component1 : Component2;
	const componentOfCertainSubType: ComponentType<SvelteComponent<{ needsThisProp: string }>> = someLogic() ? Component1 : Component2;
</script>

<svelte:component this={component} />
<svelte:component this={componentOfCertainSubType} needsThisProp="hello" />
```

<div class="ts-block">

```dts
type ComponentType<
	Component extends SvelteComponent = SvelteComponent
> = (new (
	options: ComponentConstructorOptions<
		Component extends SvelteComponent<infer Props>
			? Props
			: Record<string, any>
	>
) => Component) & {
	/** The custom element version of the component. Only present if compiled with the `customElement` compiler option */
	element?: typeof HTMLElement;
};
```

</div>

### SvelteComponent



Base class for Svelte components with some minor dev-enhancements. Used when dev=true.

Can be used to create strongly typed Svelte components.

#### Example:

You have component library on npm called `component-library`, from which
you export a component called `MyComponent`. For Svelte+TypeScript users,
you want to provide typings. Therefore you create a `index.d.ts`:
```ts
import { SvelteComponent } from "svelte";
export class MyComponent extends SvelteComponent<{foo: string}> {}
```
Typing this makes it possible for IDEs like VS Code with the Svelte extension
to provide intellisense and to use the component like this in a Svelte file
with TypeScript:
```svelte
<script lang="ts">
	import { MyComponent } from "component-library";
</script>
<MyComponent foo={'bar'} />
```

<div class="ts-block">

```dts
class SvelteComponent<
	Props extends Record<string, any> = any,
	Events extends Record<string, any> = any,
	Slots extends Record<string, any> = any
> extends SvelteComponent_1<Props, Events> {/*…*/}
```

<div class="ts-block-property">

```dts
[prop: string]: any;
```

<div class="ts-block-property-details"></div>
</div>

<div class="ts-block-property">

```dts
constructor(options: ComponentConstructorOptions<Props>);
```

<div class="ts-block-property-details"></div>
</div>

<div class="ts-block-property">

```dts
$capture_state(): void;
```

<div class="ts-block-property-details"></div>
</div>

<div class="ts-block-property">

```dts
$inject_state(): void;
```

<div class="ts-block-property-details"></div>
</div></div>

### SvelteComponentTyped

 <blockquote class="tag deprecated"><p>Use <code>SvelteComponent</code> instead. See PR for more information: <a href="https://github.com/sveltejs/svelte/pull/8512">https://github.com/sveltejs/svelte/pull/8512</a></p>
</blockquote>



<div class="ts-block">

```dts
class SvelteComponentTyped<
	Props extends Record<string, any> = any,
	Events extends Record<string, any> = any,
	Slots extends Record<string, any> = any
> extends SvelteComponent<Props, Events, Slots> {}
```

</div>


