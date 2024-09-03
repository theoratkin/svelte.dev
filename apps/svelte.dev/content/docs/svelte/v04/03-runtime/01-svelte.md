---
title: svelte
---

The `svelte` package exposes [lifecycle functions](https://learn.svelte.dev/tutorial/onmount) and the [context API](https://learn.svelte.dev/tutorial/context-api).

## `onMount`

<div class="ts-block">

```dts
function onMount<T>(
	fn: () =>
		| NotFunction<T>
		| Promise<NotFunction<T>>
		| (() => any)
): void;
```

</div>

The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM. It must be called during the component's initialisation (but doesn't need to live _inside_ the component; it can be called from an external module).

`onMount` does not run inside a [server-side component](/docs/server-side-component-api).

```svelte
<script>
	import { onMount } from 'svelte';

	onMount(() => {
		console.log('the component has mounted');
	});
</script>
```

If a function is returned from `onMount`, it will be called when the component is unmounted.

```svelte
<script>
	import { onMount } from 'svelte';

	onMount(() => {
		const interval = setInterval(() => {
			console.log('beep');
		}, 1000);

		return () => clearInterval(interval);
	});
</script>
```

> This behaviour will only work when the function passed to `onMount` _synchronously_ returns a value. `async` functions always return a `Promise`, and as such cannot _synchronously_ return a function.

## `beforeUpdate`

<div class="ts-block">

```dts
function beforeUpdate(fn: () => any): void;
```

</div>

Schedules a callback to run immediately before the component is updated after any state change.

> The first time the callback runs will be before the initial `onMount`

```svelte
<script>
	import { beforeUpdate } from 'svelte';

	beforeUpdate(() => {
		console.log('the component is about to update');
	});
</script>
```

## `afterUpdate`

<div class="ts-block">

```dts
function afterUpdate(fn: () => any): void;
```

</div>

Schedules a callback to run immediately after the component has been updated.

> The first time the callback runs will be after the initial `onMount`

```svelte
<script>
	import { afterUpdate } from 'svelte';

	afterUpdate(() => {
		console.log('the component just updated');
	});
</script>
```

## `onDestroy`

<div class="ts-block">

```dts
function onDestroy(fn: () => any): void;
```

</div>

Schedules a callback to run immediately before the component is unmounted.

Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the only one that runs inside a server-side component.

```svelte
<script>
	import { onDestroy } from 'svelte';

	onDestroy(() => {
		console.log('the component is being destroyed');
	});
</script>
```

## `tick`

<div class="ts-block">

```dts
function tick(): Promise<void>;
```

</div>

Returns a promise that resolves once any pending state changes have been applied, or in the next microtask if there are none.

```svelte
<script>
	import { beforeUpdate, tick } from 'svelte';

	beforeUpdate(async () => {
		console.log('the component is about to update');
		await tick();
		console.log('the component just updated');
	});
</script>
```

## `setContext`

<div class="ts-block">

```dts
function setContext<T>(key: any, context: T): T;
```

</div>

Associates an arbitrary `context` object with the current component and the specified `key` and returns that object. The context is then available to children of the component (including slotted content) with `getContext`.

Like lifecycle functions, this must be called during component initialisation.

```svelte
<script>
	import { setContext } from 'svelte';

	setContext('answer', 42);
</script>
```

> Context is not inherently reactive. If you need reactive values in context then you can pass a store into context, which _will_ be reactive.

## `getContext`

<div class="ts-block">

```dts
function getContext<T>(key: any): T;
```

</div>

Retrieves the context that belongs to the closest parent component with the specified `key`. Must be called during component initialisation.

```svelte
<script>
	import { getContext } from 'svelte';

	const answer = getContext('answer');
</script>
```

## `hasContext`

<div class="ts-block">

```dts
function hasContext(key: any): boolean;
```

</div>

Checks whether a given `key` has been set in the context of a parent component. Must be called during component initialisation.

```svelte
<script>
	import { hasContext } from 'svelte';

	if (hasContext('answer')) {
		// do something
	}
</script>
```

## `getAllContexts`

<div class="ts-block">

```dts
function getAllContexts<
	T extends Map<any, any> = Map<any, any>
>(): T;
```

</div>

Retrieves the whole context map that belongs to the closest parent component. Must be called during component initialisation. Useful, for example, if you programmatically create a component and want to pass the existing context to it.

```svelte
<script>
	import { getAllContexts } from 'svelte';

	const contexts = getAllContexts();
</script>
```

## `createEventDispatcher`

<div class="ts-block">

```dts
function createEventDispatcher<
	EventMap extends Record<string, any> = any
>(): EventDispatcher<EventMap>;
```

</div>

Creates an event dispatcher that can be used to dispatch [component events](/docs/component-directives#on-eventname). Event dispatchers are functions that can take two arguments: `name` and `detail`.

Component events created with `createEventDispatcher` create a [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent). These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture). The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail) property and can contain any type of data.

```svelte
<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();
</script>

<button on:click={() => dispatch('notify', 'detail value')}>Fire Event</button>
```

Events dispatched from child components can be listened to in their parent. Any data provided when the event was dispatched is available on the `detail` property of the event object.

```svelte
<script>
	function callbackFunction(event) {
		console.log(`Notify fired! Detail: ${event.detail}`);
	}
</script>

<Child on:notify={callbackFunction} />
```

Events can be cancelable by passing a third parameter to the dispatch function. The function returns `false` if the event is cancelled with `event.preventDefault()`, otherwise it returns `true`.

```svelte
<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	function notify() {
		const shouldContinue = dispatch('notify', 'detail value', { cancelable: true });
		if (shouldContinue) {
			// no one called preventDefault
		} else {
			// a listener called preventDefault
		}
	}
</script>
```

You can type the event dispatcher to define which events it can receive. This will make your code more type safe both within the component (wrong calls are flagged) and when using the component (types of the events are now narrowed). See [here](typescript#script-lang-ts-events) how to do it.

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


