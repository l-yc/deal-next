<script lang="ts">
  import { renderMarkdown } from "../lib/Renderer";

  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
  const click = () => dispatch('click');

  export let style: string;
  export let content: string;
  export let meta: Record<string, any>;
  export let index: number;
  export let isNav: boolean = false;
</script>

<div
  id="preview"
  class="slide {index === 1 ? 'first' : ''} {isNav ? 'slide-nav' : ''}"
  style={style}
  on:click={click}
>
  {@html renderMarkdown(content)}
  <div class="slide-footer">
    <div class="slide-footer-text">{meta.title} / {meta.author}</div>
    <div class="slide-number">{index}</div>
  </div>
</div>

<style lang="postcss" windi:safelist>
  #preview {
    @apply border-2 border-black;
  }

  .slide-nav {
    @apply absolute border-grey border-2 flex-shrink-0 cursor-pointer hover:(filter brightness-90);
  }
</style>