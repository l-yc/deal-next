<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  import { renderMarkdown } from "../lib/Renderer";
  import { meta } from "../lib/Stores";

  const dispatch = createEventDispatcher();
  const click = () => dispatch('click');

  export let style: string;
  export let content: string;
  export let index: number;
  export let isNav: boolean = false;
</script>

<div
  class="slide slide-{index} {isNav ? 'slide-nav' : ''}"
  style={style}
  on:click={click}
>
  {@html renderMarkdown(content)}
  <div class="slide-footer">
    <div class="slide-footer-text">{$meta.title} / {$meta.author}</div>
    <div class="slide-number">{index}</div>
  </div>
</div>

<style lang="postcss" windi:safelist>
  .slide {
    @apply border-2 border-black;
  }

  .slide-nav {
    @apply absolute border-grey border-2 flex-shrink-0 cursor-pointer hover:(filter brightness-90);
  }
</style>