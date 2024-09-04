<script lang="ts">
	import { page } from '$app/stores';
	import TSToggle from './TSToggle.svelte';
	import type { Document } from '../types';

	interface Props {
		contents: Document[];
		versions: string[];
		version: string;
		show_ts_toggle?: boolean;
	}

	let { contents, versions, version, show_ts_toggle = true }: Props = $props();

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

<nav aria-label="Docs">
	<ul class="sidebar">
		<li class="dropdown">
			<button class="dropdown-button" onclick={() => (show_versions = !show_versions)}>
				{version}&nbsp;
				<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M7 10l5 5 5-5H7z" fill="currentColor"></path>
				</svg>
			</button>
			{#if show_versions}
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events -->
				<ul bind:this={ul} class="dropdown-content" onclick={() => (show_versions = false)}>
					{#each versions as version}
						<li class:other={version !== version}>
							<a href="../{version}">{version}</a>
						</li>
					{/each}
				</ul>
			{/if}
		</li>
		{#each contents ?? [] as section}
			<li>
				<span class="section">
					{section.metadata.title}
				</span>

				<ul>
					{#each section.children as { metadata, slug }}
						<li>
							<a
								data-sveltekit-preload-data
								class="page"
								class:active={`/${slug}` === $page.url.pathname}
								href="/{slug}"
							>
								{metadata.title}
							</a>
						</li>
					{/each}
				</ul>
			</li>
		{/each}
	</ul>
</nav>

{#if show_ts_toggle}
	<div class="ts-toggle">
		<TSToggle />
	</div>
{/if}

<style>
	nav {
		top: 0;
		left: 0;
		color: var(--sk-text-3);
		position: relative;
	}

	.sidebar {
		padding: 3.2rem;
		font-family: var(--sk-font);
		height: 100%;
		bottom: auto;
		width: 100%;
		/* columns: 2; */
		margin: 0;
	}

	.dropdown {
		margin-bottom: 3rem;
	}

	.dropdown-button {
		display: flex;
		border: 1px solid var(--sk-back-5);
		border-radius: 0.4rem;
		padding: 0.5rem 1.3rem;
		background-color: var(--sk-back-1);
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

	li {
		display: block;
		line-height: 1.2;
		margin: 0;
		margin-bottom: 4rem;
	}

	li:last-child {
		margin-bottom: 0;
	}

	a {
		position: relative;
		transition: color 0.2s;
		border-bottom: none;
		padding: 0;
		color: var(--sk-text-3);
		user-select: none;
	}

	.section {
		display: block;
		padding-bottom: 0.8rem;
		font-size: var(--sk-text-s);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-weight: 600;
	}

	.page {
		display: block;
		font-size: 1.6rem;
		font-family: var(--sk-font);
		padding-bottom: 0.6em;
	}

	.active {
		font-weight: 700;
		color: var(--sk-text-1);
	}

	ul ul,
	ul ul li {
		margin: 0;
	}

	.ts-toggle {
		position: fixed;
		width: var(--sidebar-width);
		bottom: var(--sk-banner-bottom-height);
		left: 0;
		z-index: 1;
		margin-right: 0;
		border-top: 1px solid var(--sk-back-4);
		border-right: 1px solid var(--sk-back-5);
		background-color: var(--sk-back-3);
	}

	@media (max-width: 831px) {
		.sidebar {
			padding: 1rem;
			padding-top: 1rem;
		}

		li {
			margin-bottom: 2.5rem;
		}

		a {
			border-radius: var(--sk-border-radius);
			line-height: 1;
			vertical-align: center;
			padding: 0.9rem 0.75rem !important;
			transition: 0.1s ease;
			transition-property: background-color, color;
		}

		a:hover {
			text-decoration: none;

			background-color: var(--sk-back-4);
		}

		.active {
			background-color: hsla(var(--sk-theme-1-hsl), 0.1) !important;
			color: var(--sk-theme-1) !important;
			font-weight: 400;
		}

		.ts-toggle {
			display: none;
		}
	}

	@media (min-width: 832px) {
		.sidebar {
			columns: 1;
			padding-left: 3.2rem;
			padding-right: 0;
			padding-top: calc(var(--sk-page-padding-top) - 5rem);
			width: var(--sidebar-menu-width);
			margin: 0 0 0 auto;
		}

		nav {
			max-height: calc(100vh - var(--ts-toggle-height) - var(--sk-nav-height));
			overflow-x: hidden;
			overflow-y: auto;
		}

		.active::after {
			--size: 1rem;
			content: '';
			position: absolute;
			width: var(--size);
			height: var(--size);
			top: -0.1rem;
			right: calc(-0.5 * var(--size));
			background-color: var(--sk-back-1);
			border-left: 1px solid var(--sk-back-5);
			border-bottom: 1px solid var(--sk-back-5);
			transform: translateY(0.2rem) rotate(45deg);
			z-index: 2;
		}
	}
</style>
