<script lang="ts">
  import Heroicon from '@martinse/svelte-heroicons';
  import { x } from "@martinse/svelte-heroicons/dist/solid";

  import { createEventDispatcher, onDestroy } from 'svelte';

	const dispatch = createEventDispatcher();
	const close = () => dispatch('close');
</script>

<div class="modal-backdrop">
  <div class="modal w-1/3"
    role="dialog"
    aria-labelledby="modalTitle"
    aria-describedby="modalDescription"
  >
    <header
      class="modal-header text-lg"
      id="modalTitle"
    >
      <slot name="header">
        This is the default tile!
      </slot>
      <button
        type="button"
        class="btn-close"
        on:click={close}
        aria-label="Close modal"
      >
        <Heroicon icon={x} class="h-6 w-6" />
      </button>
    </header>

    <section
      class="modal-body"
      id="modalDescription"
    >
      <slot name="body">
        This is the default body!
      </slot>
    </section>

    <footer class="modal-footer">
      <slot name="footer">
        This is the default footer!
      </slot>
    </footer>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(0, 0, 0, 0.3);
    display: flex;
    justify-content: center;
    align-items: center;

    z-index: 9001; /* over nine thousand! */
  }

  .modal {
    background: #FFFFFF;
    overflow-x: auto;
    display: flex;
    flex-direction: column;
  }

  .modal-header,
  .modal-footer {
    padding: 15px;
    display: flex;
  }

  .modal-header {
    position: relative;
    border-bottom: 1px solid #eeeeee;
    justify-content: space-between;
  }

  .modal-footer {
    border-top: 1px solid #eeeeee;
    flex-direction: column;
  }

  .modal-body {
    position: relative;
    padding: 20px 10px;
  }

  .btn-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
  }
</style>