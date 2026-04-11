<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { HELP_CATEGORIES, NEED_CATEGORIES } from '../lib/categories'
  import type { PinType } from '../lib/categories'
  import { createPin } from '../lib/pins'
  import { isInNZ } from '../lib/geo'

  export let initialPosition: { lat: number; lng: number } | null = null

  const dispatch = createEventDispatcher<{ close: void; created: void }>()

  type Step = 'type' | 'category' | 'details'
  let step: Step = 'type'
  let pinType: PinType | null = null
  let category: string | null = null
  let title = ''
  let description = ''
  let lat: number = initialPosition?.lat ?? 0
  let lng: number = initialPosition?.lng ?? 0
  let hasLocation = initialPosition !== null
  let submitting = false
  let errorMsg = ''

  $: categories = pinType === 'help' ? HELP_CATEGORIES : NEED_CATEGORIES

  function chooseType(t: PinType) {
    pinType = t
    step = 'category'
  }

  function chooseCategory(id: string) {
    category = id
    step = 'details'
  }

  function back() {
    if (step === 'details') step = 'category'
    else if (step === 'category') step = 'type'
  }

  function tryLocate() {
    errorMsg = ''
    if (!navigator.geolocation) {
      errorMsg = 'Geolocation is not available on this device.'
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        lat = pos.coords.latitude
        lng = pos.coords.longitude
        hasLocation = isInNZ(lat, lng)
        if (!hasLocation) {
          errorMsg = 'Detected location is outside New Zealand.'
        }
      },
      err => {
        errorMsg = `Could not get location: ${err.message}. Close this and long-press on the map to drop a pin manually.`
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  async function submit() {
    if (!pinType || !category || !hasLocation) return
    submitting = true
    errorMsg = ''
    try {
      await createPin({
        type: pinType,
        category,
        title: title.trim(),
        description: description.trim(),
        lat,
        lng,
      })
      dispatch('created')
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Failed to submit. Try again.'
      submitting = false
    }
  }
</script>

<div
  class="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
  on:click|self={() => dispatch('close')}
  role="presentation"
>
  <div
    class="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[92vh]"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="bg-red-600 text-white px-4 py-2 text-xs font-medium text-center sm:rounded-t-2xl"
    >
      Community map. NOT official.
      <strong>Call 111</strong> in any emergency.
    </div>

    <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
      <div class="font-semibold text-base">
        {#if step === 'type'}Add a pin{/if}
        {#if step === 'category'}Choose a category{/if}
        {#if step === 'details'}Describe it{/if}
      </div>
      <button
        type="button"
        class="text-gray-500 hover:text-gray-800 text-2xl leading-none px-2"
        on:click={() => dispatch('close')}
        aria-label="Close"
      >
        ×
      </button>
    </div>

    <div class="overflow-y-auto p-4 flex-1">
      {#if step === 'type'}
        <p class="text-sm text-gray-600 mb-3">What kind of pin is this?</p>
        <div class="grid gap-3">
          <button
            type="button"
            class="border-2 border-green-600 text-green-700 hover:bg-green-50 active:bg-green-100 rounded-xl p-4 text-left"
            on:click={() => chooseType('help')}
          >
            <div class="font-semibold text-base">I have help to offer</div>
            <div class="text-xs text-gray-600 mt-1">
              Shelter, fuel, food, charging, wifi, medical, other
            </div>
          </button>
          <button
            type="button"
            class="border-2 border-orange-600 text-orange-700 hover:bg-orange-50 active:bg-orange-100 rounded-xl p-4 text-left"
            on:click={() => chooseType('need')}
          >
            <div class="font-semibold text-base">I want to report a need or issue</div>
            <div class="text-xs text-gray-600 mt-1">
              Outage, no signal, road closed, hazard, supplies needed
            </div>
          </button>
        </div>
      {/if}

      {#if step === 'category'}
        <p class="text-sm text-gray-600 mb-3">Pick the closest match.</p>
        <div class="grid gap-2">
          {#each categories as c (c.id)}
            <button
              type="button"
              class="border border-gray-300 hover:bg-gray-50 active:bg-gray-100 rounded-lg p-3 text-left"
              on:click={() => chooseCategory(c.id)}
            >
              <span class="font-medium text-sm">{c.label}</span>
            </button>
          {/each}
        </div>
      {/if}

      {#if step === 'details'}
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1" for="pin-title">
              Short title <span class="text-gray-400">(required, max 80)</span>
            </label>
            <input
              id="pin-title"
              type="text"
              bind:value={title}
              maxlength="80"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Z Petrol Hastings — fuel available"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1" for="pin-desc">
              Details <span class="text-gray-400">(optional, max 280)</span>
            </label>
            <textarea
              id="pin-desc"
              bind:value={description}
              maxlength="280"
              rows="3"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Hours, conditions, warnings, anything useful."
            ></textarea>
            <div class="text-right text-xs text-gray-400 mt-1">{description.length} / 280</div>
          </div>

          <div class="bg-gray-50 border border-gray-200 rounded-md p-3">
            <div class="text-xs font-medium text-gray-700 mb-1">Location</div>
            {#if hasLocation}
              <div class="text-sm font-mono text-gray-800">
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </div>
              <button
                type="button"
                class="text-xs text-blue-600 hover:underline mt-1"
                on:click={tryLocate}
              >
                Re-detect my location
              </button>
            {:else}
              <button
                type="button"
                class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-md w-full"
                on:click={tryLocate}
              >
                Use my location
              </button>
              <p class="text-xs text-gray-500 mt-2">
                Or close this and long-press on the map to drop a pin manually.
              </p>
            {/if}
          </div>

          <p class="text-xs text-gray-500">
            Do not include phone numbers, emails, or names. AidLink is public and stores no
            personal information.
          </p>

          {#if errorMsg}
            <div class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2">
              {errorMsg}
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <div class="px-4 py-3 border-t border-gray-200 flex justify-between items-center gap-2">
      {#if step !== 'type'}
        <button
          type="button"
          class="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 disabled:opacity-50"
          on:click={back}
          disabled={submitting}
        >
          ← Back
        </button>
      {:else}
        <span></span>
      {/if}
      {#if step === 'details'}
        <button
          type="button"
          class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-md text-sm"
          on:click={submit}
          disabled={!title.trim() || !hasLocation || submitting}
        >
          {submitting ? 'Submitting…' : 'Submit pin'}
        </button>
      {/if}
    </div>
  </div>
</div>
