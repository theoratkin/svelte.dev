<script>
	let w = $state();
	let h = $state();
	let size = $state(42);
	let text = $state('edit me');
</script>

<input type="range" bind:value={size} />
<input bind:value={text} />

<p>size: {w}px x {h}px</p>

<div bind:clientWidth={w} bind:clientHeight={h}>
	<span style="font-size: {size}px">{text}</span>
</div>

<style>
	input {
		display: block;
	}
	div {
		display: inline-block;
	}
</style>
