<script lang="ts">
	import { page } from '$app/stores';
	import { DocsContents } from '@sveltejs/site-kit/docs';

	let { data, children } = $props();

	const pageData = $derived($page.data.document);
	const title = $derived(pageData?.metadata.title);
	const category = $derived(pageData?.category);
	const is_old_version = $derived(data.versions.indexOf(data.version) !== data.versions.length - 1);

	let show_versions = $state(false);
	let ul = $state<HTMLElement>();
	$effect(() => {
		// TODO proper keyboard navigation and focus management and stuff
		if (show_versions) {
			(ul!.firstElementChild as HTMLElement).focus();

			const esc_handler = (e: KeyboardEvent) => {
				if (e.key === 'Escape') {
					show_versions = false;
				}
			};
			document.addEventListener('keydown', esc_handler);

			const click_outside_handler = (e: Event) => {
				if (!ul!.contains(e.target as Node)) {
					show_versions = false;
				}
			};
			// without setTimeout, the click event will be triggered immediately by the opening click
			setTimeout(() => document.addEventListener('click', click_outside_handler));

			return () => {
				document.removeEventListener('keydown', esc_handler);
				document.removeEventListener('click', click_outside_handler);
			};
		}
	});
</script>

<div class="container">
	<div class="toc-container" style="order: 1">
		<div class="dropdown">
			<button class="dropdown-button" onclick={() => (show_versions = !show_versions)}>
				{data.version}&nbsp;
				<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M7 10l5 5 5-5H7z" fill="currentColor"></path>
				</svg>
			</button>
			{#if show_versions}
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events -->
				<ul bind:this={ul} class="dropdown-content" onclick={() => (show_versions = false)}>
					{#each data.versions as version}
						<li class:other={version !== data.version}>
							<a href="../../{version}">{version}</a>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<DocsContents contents={data.sections} />
	</div>

	<div class="page content">
		{#if is_old_version}
			<div class="text old-version">
				<blockquote>
					<p>
						This documentation is for version {data.version.substring(1)}.
						<a href="../../{data.versions.at(-1)}">Go to the latest docs.</a>
					</p>
				</blockquote>
			</div>
		{/if}
		{#if category}
			<p class="category">{category}</p>
		{/if}
		{#if title}
			<h1>{title}</h1>
		{/if}

		{@render children()}
	</div>
</div>

<style>
	.container {
		--sidebar-menu-width: 28rem;
		--sidebar-width: var(--sidebar-menu-width);
		--ts-toggle-height: 4.2rem;

		display: flex;
		flex-direction: column;
	}

	.dropdown-button {
		display: flex;
		border: 1px solid var(--sk-back-5);
		border-radius: 0.4rem;
		padding: 0.5rem 1.3rem;
		background-color: var(--sk-back-1);
	}

	.dropdown {
		padding: 1rem 3.2rem;
	}

	.dropdown-content {
		position: absolute;
		background-color: var(--sk-back-1);
		margin: 0;
		z-index: 1;
		list-style: none;

		a {
			display: block;
			padding: 0.5rem 1.3rem;
			width: 6.7rem;
			color: var(--sk-text-3);
		}
	}

	.page {
		padding: var(--sk-page-padding-top) var(--sk-page-padding-side);

		min-width: 0 !important;
	}

	.page :global(:where(h2, h3) code) {
		all: unset;
	}

	.old-version {
		margin-bottom: 2rem;
	}

	.category {
		font: 700 var(--sk-text-s) var(--sk-font);
		text-transform: uppercase;
		letter-spacing: 0.12em;
		margin: 0 0 0.5em;
		color: var(--sk-text-3);
	}

	@media (min-width: 832px) {
		.content {
			padding-left: calc(var(--sidebar-width) + var(--sk-page-padding-side));
		}
	}

	.toc-container {
		background: var(--sk-back-3);
		display: none;
	}

	@media (min-width: 832px) {
		.toc-container {
			display: block;
			width: var(--sidebar-width);
			height: calc(100vh - var(--sk-nav-height) - var(--sk-banner-bottom-height));
			position: fixed;
			left: 0;
			top: var(--sk-nav-height);
			overflow: hidden;
		}

		.toc-container::before {
			content: '';
			position: fixed;
			width: 0;
			height: 100%;
			top: 0;
			left: calc(var(--sidebar-width) - 1px);
			border-right: 1px solid var(--sk-back-5);
		}

		.page {
			padding-left: calc(var(--sidebar-width) + var(--sk-page-padding-side));
		}
	}

	@media (min-width: 1200px) {
		.container {
			--sidebar-width: max(28rem, 23vw);
			flex-direction: row;
		}

		.page {
			--on-this-page-display: block;
			padding: var(--sk-page-padding-top) calc(var(--sidebar-width) + var(--sk-page-padding-side));
			margin: 0 auto;
			width: var(--sk-line-max-width);
			box-sizing: content-box;
		}
	}
</style>
