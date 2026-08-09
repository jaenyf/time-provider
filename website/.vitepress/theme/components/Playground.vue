<template>
  <div class="pg-root">
    <aside class="pg-config">
      <div class="pg-field">
        <label for="pg-plugin">Plugin</label>
        <select id="pg-plugin" v-model="selectedPluginKey">
          <option v-for="p in pluginOptions" :key="p.key" :value="p.key">{{ p.label }}</option>
        </select>
        <span class="pg-hint">{{
          supportsLocalTime ? "Supports real local time" : "UTC-only adapter"
        }}</span>
      </div>

      <div class="pg-field" role="group" aria-labelledby="pg-addons-label">
        <label id="pg-addons-label">Addons</label>
        <label class="pg-checkbox" v-for="a in addonOptions" :key="a.key">
          <input type="checkbox" v-model="enabledAddons" :value="a.key" />
          {{ a.label }}
        </label>
        <span class="pg-hint">{{ addonsHint }}</span>
      </div>

      <div class="pg-field">
        <label for="pg-strategy">Clock strategy</label>
        <select id="pg-strategy" v-model="selectedStrategy">
          <option v-for="s in strategies" :key="s.key" :value="s.key">{{ s.label }}</option>
        </select>
        <span class="pg-hint">{{ strategyHint }}</span>
      </div>

      <div class="pg-field" v-if="supportsLocalTime">
        <label for="pg-tz">Local timezone</label>
        <input
          id="pg-tz"
          type="text"
          v-model="timezone"
          list="pg-tz-options"
          placeholder="Etc/UTC"
          @input="useHostTz = false"
        />
        <datalist id="pg-tz-options">
          <option value="Etc/UTC" />
          <option value="America/New_York" />
          <option value="Europe/Paris" />
          <option value="Asia/Tokyo" />
          <option value="Australia/Sydney" />
        </datalist>
        <button class="pg-btn" style="align-self: flex-end" @click="useHostTimezone">
          Use host timezone
        </button>
      </div>

      <div class="pg-field" v-if="selectedStrategy === 'fixed'">
        <label for="pg-fixed">Fixed time (ISO 8601)</label>
        <input id="pg-fixed" type="text" v-model="fixedTime" />
      </div>

      <div class="pg-field" v-if="selectedStrategy === 'manual'">
        <label for="pg-initial">Initial time (ISO 8601)</label>
        <input id="pg-initial" type="text" v-model="initialTime" />
      </div>

      <div
        class="pg-field"
        v-if="selectedStrategy === 'sequential'"
        role="group"
        aria-labelledby="pg-sequential-label"
      >
        <label id="pg-sequential-label">Sequential instants (ISO 8601)</label>
        <div class="pg-seq-list">
          <div class="pg-seq-row" v-for="(_t, i) in sequentialTimes" :key="i">
            <input type="text" v-model="sequentialTimes[i]" :aria-label="`Instant ${i + 1}`" />
            <button
              class="pg-btn"
              :title="`Remove instant ${i + 1}`"
              :aria-label="`Remove instant ${i + 1}`"
              @click="removeSequentialTime(i)"
            >
              ×
            </button>
          </div>
        </div>
        <button class="pg-btn" @click="addSequentialTime">+ Add instant</button>
      </div>

      <p v-if="buildError" class="pg-note" style="color: var(--vp-c-danger-1, #e5484d)">
        {{ buildError }}
      </p>

      <div class="pg-panel">
        <div class="pg-panel-header">
          <span>Equivalent code</span>
          <button
            class="tp-copy"
            :class="{ copied: codeCopied }"
            :title="codeCopied ? 'Copied' : 'Copy'"
            :aria-label="codeCopied ? 'Copied' : 'Copy code'"
            @click="copyEquivalentCode"
          />
        </div>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="pg-code" v-if="codeHtml" v-html="codeHtml"></div>
        <pre v-else class="pg-code"><code>{{ codeSnippet }}</code></pre>
      </div>
    </aside>

    <main class="pg-main">
      <div class="pg-panel" :class="{ 'pg-panel-collapsed': !openPanes.clock }">
        <div class="pg-panel-header">
          <button
            type="button"
            class="pg-panel-toggle"
            :aria-expanded="openPanes.clock"
            aria-controls="pg-pane-clock"
            @click="togglePane('clock')"
          >
            <span class="pg-panel-chevron" aria-hidden="true"></span>
            <span>Clock</span>
          </button>
          <span class="pg-badge">{{ strategyLabel }}</span>
        </div>
        <div class="pg-panel-body" id="pg-pane-clock" v-show="openPanes.clock">
          <div class="pg-readout pg-clock-readout">
            <div class="pg-readout-item">
              <div class="pg-label">clock.utcNow()</div>
              <div class="pg-value">{{ utcReadout }}</div>
              <button
                class="pg-btn"
                style="margin-top: 8px"
                :disabled="!timeProvider"
                @click="readUtc"
              >
                Read utcNow()
              </button>
            </div>
            <div class="pg-readout-item">
              <div class="pg-label">clock.localNow()</div>
              <div class="pg-value">
                {{ supportsLocalTime ? localReadout : "— (UTC-only adapter)" }}
              </div>
              <button
                class="pg-btn"
                style="margin-top: 8px"
                :disabled="!timeProvider || !supportsLocalTime"
                @click="readLocal"
              >
                Read localNow()
              </button>
            </div>
            <div class="pg-readout-item" v-if="selectedStrategy === 'sequential'">
              <div class="pg-label">Remaining instants</div>
              <div class="pg-value">{{ remainingSequential }}</div>
            </div>
            <div class="pg-readout-item" v-if="selectedStrategy === 'manual'">
              <div class="pg-label">clock.advance(...)</div>
              <div class="pg-advance-row">
                <label class="pg-input-label">
                  <span>amount</span>
                  <input type="number" v-model.number="advanceAmount" />
                </label>
                <label class="pg-input-label">
                  <span>unit</span>
                  <select v-model="advanceUnit">
                    <option value="milliseconds">ms</option>
                    <option value="seconds">seconds</option>
                    <option value="minutes">minutes</option>
                    <option value="hours">hours</option>
                    <option value="days">days</option>
                    <option value="months">months</option>
                    <option value="years">years</option>
                  </select>
                </label>
                <button class="pg-btn pg-btn-brand" :disabled="!timeProvider" @click="advance">
                  Advance
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="pg-panel" :class="{ 'pg-panel-collapsed': !openPanes.scheduler }">
        <div class="pg-panel-header">
          <button
            type="button"
            class="pg-panel-toggle"
            :aria-expanded="openPanes.scheduler"
            aria-controls="pg-pane-scheduler"
            @click="togglePane('scheduler')"
          >
            <span class="pg-panel-chevron" aria-hidden="true"></span>
            <span>Scheduler</span>
          </button>
          <span class="pg-badge">{{ schedulerModeLabel }}</span>
        </div>
        <div class="pg-panel-body" id="pg-pane-scheduler" v-show="openPanes.scheduler">
          <div class="pg-timer-form">
            <label class="pg-input-label">
              <span>label</span>
              <input type="text" v-model="timerLabel" placeholder="Tick" style="width: 110px" />
            </label>

            <label class="pg-input-label">
              <span>method</span>
              <select v-model="timerKind">
                <option value="interval">setInterval</option>
                <option value="timeout">setTimeout</option>
                <option value="recurring">setRecurring</option>
              </select>
            </label>

            <label class="pg-input-label" v-if="timerKind !== 'recurring'">
              <span>delay (ms)</span>
              <input type="number" v-model.number="timerDelay" style="width: 100px" min="0" />
            </label>

            <template v-else>
              <label class="pg-input-label">
                <span>initial delay (ms)</span>
                <input
                  type="number"
                  v-model.number="recurringInitialDelay"
                  style="width: 110px"
                  min="0"
                />
              </label>
              <label class="pg-input-label">
                <span>backoff factor</span>
                <input
                  type="number"
                  v-model.number="recurringFactor"
                  style="width: 100px"
                  min="0"
                  step="0.5"
                />
              </label>
              <label class="pg-input-label">
                <span>stop after (runs)</span>
                <input
                  type="number"
                  v-model.number="recurringMaxRuns"
                  style="width: 110px"
                  min="1"
                  :max="RECURRING_MAX_RUNS"
                />
              </label>
            </template>

            <button
              class="pg-btn pg-btn-brand"
              :disabled="!timeProvider"
              @click="addSchedulerTimer"
            >
              Add timer
            </button>
          </div>
          <div class="pg-timer-list">
            <div class="pg-timer-row" v-for="row in schedulerRows" :key="row.id">
              <span
                ><span class="pg-timer-kind">{{ row.kind }}</span
                >{{ describeTimer(row) }}</span
              >
              <button class="pg-btn" @click="removeTimer(row)">Clear</button>
            </div>
          </div>
          <p class="pg-note">
            On <strong>system</strong>, timers fire for real, asynchronously. On
            <strong>manual</strong>/<strong>sequential</strong>, they fire synchronously, in-line,
            the moment <code>advance()</code>/<code>utcNow()</code>/<code>localNow()</code> makes
            them due. On <strong>fixed</strong>, they never fire. <code>setRecurring</code> re-reads
            its period from what the run itself returns — here, the previous delay times the backoff
            factor — and returns <code>false</code> on the last run to stop.
          </p>
        </div>
      </div>

      <div
        class="pg-panel"
        v-if="hasAnimationFrameAddon"
        :class="{ 'pg-panel-collapsed': !openPanes.frame }"
      >
        <div class="pg-panel-header">
          <button
            type="button"
            class="pg-panel-toggle"
            :aria-expanded="openPanes.frame"
            aria-controls="pg-pane-frame"
            @click="togglePane('frame')"
          >
            <span class="pg-panel-chevron" aria-hidden="true"></span>
            <span>Animation Frame</span>
          </button>
          <span class="pg-badge">{{ schedulerModeLabel }}</span>
        </div>
        <div class="pg-panel-body" id="pg-pane-frame" v-show="openPanes.frame">
          <div class="pg-timer-form">
            <label class="pg-input-label">
              <span>label</span>
              <input type="text" v-model="frameLabel" placeholder="Frame" style="width: 110px" />
            </label>
            <button class="pg-btn pg-btn-brand" :disabled="!timeProvider" @click="requestFrame">
              Request frame
            </button>
          </div>
          <div class="pg-timer-list pg-timer-list-frames">
            <div class="pg-timer-row" v-for="row in frameRows" :key="row.id">
              <span
                ><span class="pg-timer-kind">{{ row.kind }}</span
                >{{ describeTimer(row) }}</span
              >
              <button class="pg-btn" @click="removeTimer(row)">Cancel</button>
            </div>
          </div>
          <p class="pg-note">
            <code>requestAnimationFrame</code> fires once, whenever a frame becomes due for the
            current strategy — asynchronously on <strong>system</strong>, in-line on
            <strong>manual</strong>/<strong>sequential</strong>, never on <strong>fixed</strong>.
          </p>
        </div>
      </div>

      <div class="pg-panel" v-if="hasCronAddon" :class="{ 'pg-panel-collapsed': !openPanes.cron }">
        <div class="pg-panel-header">
          <button
            type="button"
            class="pg-panel-toggle"
            :aria-expanded="openPanes.cron"
            aria-controls="pg-pane-cron"
            @click="togglePane('cron')"
          >
            <span class="pg-panel-chevron" aria-hidden="true"></span>
            <span>Cron</span>
          </button>
          <span class="pg-badge">{{ schedulerModeLabel }}</span>
        </div>
        <div class="pg-panel-body" id="pg-pane-cron" v-show="openPanes.cron">
          <div class="pg-timer-form">
            <label class="pg-input-label">
              <span>label</span>
              <input type="text" v-model="cronLabel" placeholder="Nightly" style="width: 110px" />
            </label>

            <div class="pg-input-label">
              <span id="pg-cron-mode-label">input mode</span>
              <div class="pg-seg" role="group" aria-labelledby="pg-cron-mode-label">
                <button
                  type="button"
                  class="pg-seg-btn"
                  :class="{ active: cronInputMode === 'expression' }"
                  :aria-pressed="cronInputMode === 'expression'"
                  @click="cronInputMode = 'expression'"
                >
                  Expression
                </button>
                <button
                  type="button"
                  class="pg-seg-btn"
                  :class="{ active: cronInputMode === 'builder' }"
                  :aria-pressed="cronInputMode === 'builder'"
                  @click="cronInputMode = 'builder'"
                >
                  Builder
                </button>
              </div>
            </div>

            <label class="pg-input-label" v-if="cronInputMode === 'expression'">
              <span>expression</span>
              <input
                type="text"
                v-model="cronExpression"
                style="width: 140px"
                placeholder="* * * * *"
              />
            </label>

            <button class="pg-btn pg-btn-brand" :disabled="!timeProvider" @click="addCronSchedule">
              Add schedule
            </button>
          </div>
          <div v-if="cronInputMode === 'builder'" class="pg-cron-builder">
            <div class="pg-cron-preview">
              <div>
                <span class="pg-cron-preview-label">Equivalent expression</span>
                <code>{{ cronBuilderExpression }}</code>
              </div>
              <div>
                <span class="pg-cron-preview-label">ICronSpec</span>
                <pre class="pg-cron-preview-json"><code>{{ cronBuilderJson }}</code></pre>
              </div>
            </div>

            <div class="pg-cron-field" v-for="field in CRON_FIELDS" :key="field.key">
              <div class="pg-cron-field-header">
                <span>{{ field.label }}</span>
                <label class="pg-checkbox">
                  <input type="checkbox" v-model="cronBuilder[field.key].wildcard" />
                  Every value
                </label>
              </div>

              <div v-if="!cronBuilder[field.key].wildcard" class="pg-cron-atom-list">
                <div
                  class="pg-cron-atom-row"
                  v-for="atom in cronBuilder[field.key].atoms"
                  :key="atom.id"
                >
                  <select
                    v-model="atom.mode"
                    class="pg-cron-atom-mode"
                    :aria-label="`${field.label} entry mode`"
                  >
                    <option value="value">Value</option>
                    <option value="range">Range</option>
                  </select>

                  <template v-if="atom.mode === 'value'">
                    <select v-if="field.names" v-model="atom.value" :aria-label="field.label">
                      <option v-for="n in field.names" :key="n" :value="n">{{ n }}</option>
                    </select>
                    <input
                      v-else
                      type="number"
                      v-model="atom.value"
                      :min="field.min"
                      :max="field.max"
                      :aria-label="field.label"
                    />
                  </template>

                  <template v-else>
                    <template v-if="field.names">
                      <select v-model="atom.from" :aria-label="`${field.label} range start`">
                        <option v-for="n in field.names" :key="n" :value="n">{{ n }}</option>
                      </select>
                      <span class="pg-cron-range-sep">–</span>
                      <select v-model="atom.to" :aria-label="`${field.label} range end`">
                        <option v-for="n in field.names" :key="n" :value="n">{{ n }}</option>
                      </select>
                    </template>
                    <template v-else>
                      <input
                        type="number"
                        v-model="atom.from"
                        :min="field.min"
                        :max="field.max"
                        :aria-label="`${field.label} range start`"
                      />
                      <span class="pg-cron-range-sep">–</span>
                      <input
                        type="number"
                        v-model="atom.to"
                        :min="field.min"
                        :max="field.max"
                        :aria-label="`${field.label} range end`"
                      />
                    </template>
                    <input
                      type="number"
                      v-model="atom.step"
                      min="1"
                      placeholder="step"
                      class="pg-cron-step"
                      :aria-label="`${field.label} range step`"
                    />
                  </template>

                  <button
                    class="pg-btn"
                    :title="`Remove ${field.label} entry`"
                    :aria-label="`Remove ${field.label} entry`"
                    @click="removeCronAtom(field, atom.id)"
                  >
                    ×
                  </button>
                </div>
                <button class="pg-btn" @click="addCronAtom(field)">+ Add {{ field.label }}</button>
              </div>
            </div>
          </div>
          <div class="pg-timer-list pg-timer-list-cron">
            <div class="pg-timer-row" v-for="row in cronRows" :key="row.id">
              <span
                ><span class="pg-timer-kind">{{ row.kind }}</span
                >{{ describeTimer(row) }}</span
              >
              <button class="pg-btn" @click="removeTimer(row)">Unschedule</button>
            </div>
          </div>
          <p class="pg-note">
            A cron schedule repeats on the next minute the expression matches, in the runtime's
            local timezone (<code>Etc/UTC</code> for a UTC-only plugin), and follows the same firing
            model as the scheduler above — asynchronously on <strong>system</strong>, in-line on
            <strong>manual</strong>/<strong>sequential</strong>, never on <strong>fixed</strong>.
          </p>
        </div>
      </div>

      <div class="pg-panel" v-if="hasEtaAddon" :class="{ 'pg-panel-collapsed': !openPanes.eta }">
        <div class="pg-panel-header">
          <button
            type="button"
            class="pg-panel-toggle"
            :aria-expanded="openPanes.eta"
            aria-controls="pg-pane-eta"
            @click="togglePane('eta')"
          >
            <span class="pg-panel-chevron" aria-hidden="true"></span>
            <span>ETA</span>
          </button>
          <span class="pg-badge">{{ etaStatusLabel }}</span>
        </div>
        <div class="pg-panel-body" id="pg-pane-eta" v-show="openPanes.eta">
          <div class="pg-timer-form">
            <div class="pg-input-label">
              <span id="pg-eta-controls-label">controls</span>
              <div class="pg-eta-actions" role="group" aria-labelledby="pg-eta-controls-label">
                <button
                  class="pg-btn pg-btn-brand"
                  :disabled="!canStartEta"
                  @click="startEtaTracker"
                >
                  Start
                </button>
                <button class="pg-btn" :disabled="!etaTracker" @click="etaDoneAction">
                  done()
                </button>
                <button class="pg-btn" :disabled="!etaTracker" @click="etaAbandonAction">
                  abandon()
                </button>
              </div>
            </div>
          </div>

          <div class="pg-timer-form">
            <label class="pg-input-label">
              <span>mode</span>
              <select v-model="etaMode" :disabled="!!etaTracker">
                <option value="known-total">Known total</option>
                <option value="stages">Stages</option>
                <option value="duration">Estimated duration</option>
              </select>
            </label>

            <label class="pg-input-label" v-if="etaMode === 'known-total'">
              <span>total</span>
              <input
                type="number"
                v-model.number="etaTotal"
                style="width: 90px"
                placeholder="e.g. 1000000"
                :disabled="!!etaTracker"
              />
            </label>

            <label class="pg-input-label" v-if="etaMode === 'duration'">
              <span>expected duration</span>
              <input
                type="number"
                v-model.number="etaDurationMs"
                style="width: 110px"
                placeholder="ms"
                :disabled="!!etaTracker"
              />
            </label>

            <label class="pg-input-label" v-if="etaMode !== 'duration'">
              <span>algorithm</span>
              <select v-model="etaAlgorithm" :disabled="!!etaTracker">
                <option value="complete">Complete</option>
                <option value="windowed">Windowed</option>
                <option value="smoothed">Smoothed</option>
              </select>
            </label>

            <label class="pg-input-label">
              <span>notification interval</span>
              <input
                type="number"
                v-model.number="etaNotificationInterval"
                style="width: 110px"
                placeholder="ms"
                :disabled="!!etaTracker"
              />
            </label>
          </div>

          <div class="pg-seq-list pg-eta-stages" v-if="etaMode === 'stages'">
            <div class="pg-seq-row pg-eta-stages-header">
              <span class="pg-caption">weight (relative to the other stages)</span>
              <span class="pg-caption">total (this stage's own unit)</span>
              <span class="pg-eta-stages-header-spacer"></span>
            </div>
            <div class="pg-seq-row" v-for="(_p, i) in etaStages" :key="i">
              <input
                type="number"
                v-model.number="etaStages[i].weight"
                placeholder="weight"
                :aria-label="`Stage ${i + 1} weight`"
                :disabled="!!etaTracker"
              />
              <input
                type="number"
                v-model.number="etaStages[i].total"
                placeholder="total"
                :aria-label="`Stage ${i + 1} total`"
                :disabled="!!etaTracker"
              />
              <button
                class="pg-btn"
                :title="`Remove stage ${i + 1}`"
                :aria-label="`Remove stage ${i + 1}`"
                :disabled="!!etaTracker || etaStages.length <= 1"
                @click="removeEtaStage(i)"
              >
                ×
              </button>
            </div>
            <button class="pg-btn" :disabled="!!etaTracker" @click="addEtaStage">
              + Add stage
            </button>
          </div>

          <div class="pg-timer-form" v-if="etaTracker && etaMode !== 'duration'">
            <label class="pg-input-label">
              <span>chunk to add</span>
              <input type="number" v-model.number="etaProgressChunk" style="width: 90px" />
            </label>
            <button class="pg-btn" @click="etaProgress">progress(chunk)</button>
            <label class="pg-input-label">
              <span>total completed so far</span>
              <input type="number" v-model.number="etaProgressToValue" style="width: 90px" />
            </label>
            <button class="pg-btn" @click="etaProgressToAction">progressTo(done)</button>
            <button
              class="pg-btn"
              v-if="etaMode === 'stages'"
              :disabled="etaSnapshot?.currentStageIndex >= etaStages.length - 1"
              @click="etaNextStage"
            >
              nextStage()
            </button>
          </div>

          <div class="pg-readout pg-eta-readout" v-if="etaSnapshot">
            <div class="pg-readout-item" v-if="etaMode !== 'duration'">
              <div class="pg-label">
                {{ etaMode === "stages" ? "stagePercentage" : "percentage" }}
              </div>
              <div class="pg-value">{{ etaPercentage.toFixed(1) }}%</div>
            </div>
            <div class="pg-readout-item" v-if="etaMode === 'stages'">
              <div class="pg-label">stage</div>
              <div class="pg-value">
                {{ etaSnapshot.currentStageIndex + 1 }} / {{ etaSnapshot.stageCount }}
              </div>
            </div>
            <div class="pg-readout-item" v-if="etaMode !== 'duration'">
              <div class="pg-label">rate</div>
              <div class="pg-value">
                {{ etaSnapshot.rate !== undefined ? etaSnapshot.rate.toFixed(6) : "—" }}
              </div>
            </div>
            <div class="pg-readout-item">
              <div class="pg-label">eta</div>
              <div class="pg-value">
                {{ etaSnapshot.eta !== undefined ? new Date(etaSnapshot.eta).toISOString() : "—" }}
              </div>
            </div>
            <div class="pg-readout-item">
              <div class="pg-label">remainingMilliseconds</div>
              <div class="pg-value">
                {{
                  etaSnapshot.remainingMilliseconds !== undefined
                    ? etaSnapshot.remainingMilliseconds
                    : "—"
                }}
              </div>
            </div>
          </div>

          <p class="pg-note">
            <code>progress()</code>/<code>progressTo()</code> never notify by themselves - snapshots
            are delivered strictly on the notification interval above, plus one final notification
            after <code>done()</code>/<code>abandon()</code>.
          </p>
        </div>
      </div>

      <div class="pg-panel" :class="{ 'pg-panel-collapsed': !openPanes.log }">
        <div class="pg-panel-header">
          <button
            type="button"
            class="pg-panel-toggle"
            :aria-expanded="openPanes.log"
            aria-controls="pg-pane-log"
            @click="togglePane('log')"
          >
            <span class="pg-panel-chevron" aria-hidden="true"></span>
            <span>Event log</span>
          </button>
          <button class="pg-btn" @click="clearLog">Clear</button>
        </div>
        <div class="pg-panel-body" id="pg-pane-log" v-show="openPanes.log">
          <div class="pg-log" ref="logEl">
            <div
              class="pg-log-row"
              :class="`pg-log-${row.kind}`"
              v-for="row in reversedLog"
              :key="row.id"
            >
              <span class="pg-log-time">{{ row.time }}</span>
              <span class="pg-log-msg">{{ row.msg }}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, shallowRef, watch } from "vue";
import { createTimeProvider } from "@time-provider/core";
import { createTimeProvider as createDeterministicTimeProvider } from "@time-provider/core/deterministic";
import { plugin as nativePlugin } from "@time-provider/plugin-native";
import { plugin as nativeDeterministicPlugin } from "@time-provider/plugin-native/deterministic";
import { plugin as dayjsPlugin } from "@time-provider/plugin-dayjs";
import { plugin as dayjsDeterministicPlugin } from "@time-provider/plugin-dayjs/deterministic";
import { plugin as luxonPlugin } from "@time-provider/plugin-luxon";
import { plugin as luxonDeterministicPlugin } from "@time-provider/plugin-luxon/deterministic";
import { plugin as momentPlugin } from "@time-provider/plugin-moment";
import { plugin as momentDeterministicPlugin } from "@time-provider/plugin-moment/deterministic";
import { plugin as momentTimezonePlugin } from "@time-provider/plugin-moment-timezone";
import { plugin as momentTimezoneDeterministicPlugin } from "@time-provider/plugin-moment-timezone/deterministic";
// plugin-temporal assumes a global `Temporal` is already available - browsers/Node don't
// ship the TC39 proposal natively yet, so seed it from the polyfill before either plugin
// is ever asked to actually read a Temporal.ZonedDateTime (module load is safe either way).
import { Temporal } from "@js-temporal/polyfill";
if (typeof globalThis !== "undefined" && !("Temporal" in globalThis)) {
  (globalThis as unknown as { Temporal: unknown }).Temporal = Temporal;
}
import { plugin as temporalPlugin } from "@time-provider/plugin-temporal";
import { plugin as temporalDeterministicPlugin } from "@time-provider/plugin-temporal/deterministic";
import { addon as animationFrameAddon } from "@time-provider/addon-animation-frame";
import { addon as animationFrameDeterministicAddon } from "@time-provider/addon-animation-frame/deterministic";
import { addon as cronAddon } from "@time-provider/addon-cron";
import { addon as cronDeterministicAddon } from "@time-provider/addon-cron/deterministic";
import { addon as etaAddon } from "@time-provider/addon-eta";
import { addon as etaDeterministicAddon } from "@time-provider/addon-eta/deterministic";
import { highlightTs } from "../shiki";

type Strategy = "system" | "fixed" | "manual" | "sequential";
// What the Scheduler panel's own dropdown offers - one entry per IScheduler method.
type SchedulerTimerKind = "timeout" | "interval" | "recurring";
// Plus the two addon-backed panels, which register through their own facade rather than
// `.scheduler`, but end up in the same row list so a rebuild can clear everything at once.
type TimerKind = SchedulerTimerKind | "raf" | "cron";

interface PluginOption {
  key: string;
  label: string;
  importName: string;
  // The system and deterministic entry points each export their own plugin instance - a system
  // plugin only type-checks against `createTimeProvider` from "@time-provider/core", and a
  // deterministic one only against "@time-provider/core/deterministic". See /guide/mental-model.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  systemPlugin: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deterministicPlugin: any;
}

const pluginOptions: PluginOption[] = [
  {
    key: "native",
    label: "Native Date",
    importName: "plugin-native",
    systemPlugin: nativePlugin,
    deterministicPlugin: nativeDeterministicPlugin,
  },
  {
    key: "dayjs",
    label: "Day.js",
    importName: "plugin-dayjs",
    systemPlugin: dayjsPlugin,
    deterministicPlugin: dayjsDeterministicPlugin,
  },
  {
    key: "luxon",
    label: "Luxon",
    importName: "plugin-luxon",
    systemPlugin: luxonPlugin,
    deterministicPlugin: luxonDeterministicPlugin,
  },
  {
    key: "moment",
    label: "Moment.js",
    importName: "plugin-moment",
    systemPlugin: momentPlugin,
    deterministicPlugin: momentDeterministicPlugin,
  },
  {
    key: "moment-timezone",
    label: "Moment.js + moment-timezone",
    importName: "plugin-moment-timezone",
    systemPlugin: momentTimezonePlugin,
    deterministicPlugin: momentTimezoneDeterministicPlugin,
  },
  {
    key: "temporal",
    label: "Temporal",
    importName: "plugin-temporal",
    systemPlugin: temporalPlugin,
    deterministicPlugin: temporalDeterministicPlugin,
  },
];

interface AddonOption {
  key: string;
  label: string;
  // Local identifier used for this addon's import/`.use(...)` call in the generated "equivalent
  // code" snippet - distinct per addon so two addons enabled together don't both import as the
  // same `addon` binding.
  varName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  systemAddon: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deterministicAddon: any;
  importName: string;
}

const addonOptions: AddonOption[] = [
  {
    key: "animation-frame",
    label: "Animation Frame API",
    varName: "animationFrameAddon",
    systemAddon: animationFrameAddon,
    deterministicAddon: animationFrameDeterministicAddon,
    importName: "addon-animation-frame",
  },
  {
    key: "cron",
    label: "Cron",
    varName: "cronAddon",
    systemAddon: cronAddon,
    deterministicAddon: cronDeterministicAddon,
    importName: "addon-cron",
  },
  {
    key: "eta",
    label: "ETA",
    systemAddon: etaAddon,
    deterministicAddon: etaDeterministicAddon,
    importName: "addon-eta",
    varName: "etaAddon",
  },
];

// The builder's own model of one ICronSpec field (minute/hour/dayOfMonth/month/dayOfWeek) -
// mirrors the library's CronFieldSpec shape ("*" | value | range | array of either) closely
// enough to derive both a real ICronSpec and its equivalent cron expression string from the
// same state.
interface CronFieldMeta {
  key: "minute" | "hour" | "dayOfMonth" | "month" | "dayOfWeek";
  label: string;
  min: number;
  max: number;
  names?: readonly string[];
}

const CRON_FIELDS: CronFieldMeta[] = [
  { key: "minute", label: "Minute", min: 0, max: 59 },
  { key: "hour", label: "Hour", min: 0, max: 23 },
  { key: "dayOfMonth", label: "Day of month", min: 1, max: 31 },
  {
    key: "month",
    label: "Month",
    min: 1,
    max: 12,
    names: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
  },
  {
    key: "dayOfWeek",
    label: "Day of week",
    min: 0,
    max: 6,
    names: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
  },
];

interface CronAtom {
  id: number;
  mode: "value" | "range";
  // Bound to either a <select> (always a string - a MonthName/DayOfWeekName) or a native
  // <input type="number"> - Vue 3.4+ auto-casts those v-model bindings to an actual number, so
  // these can't be typed as plain `string` even though `makeCronAtom` seeds them as strings.
  value: string | number;
  from: string | number;
  to: string | number;
  step: string | number;
}
interface CronFieldState {
  wildcard: boolean;
  atoms: CronAtom[];
}

const strategies: { key: Strategy; label: string }[] = [
  { key: "system", label: "System" },
  { key: "fixed", label: "Fixed" },
  { key: "manual", label: "Manual" },
  { key: "sequential", label: "Sequential" },
];

const strategyHints: Record<Strategy, string> = {
  system: "Real time, real timers.",
  fixed: "Always the same instant. Timers never fire.",
  manual: "Advances only via advance(). Timers fire in-line when due.",
  sequential: "Each read consumes the next instant. Timers fire in-line when due.",
};

const schedulerModeLabels: Record<Strategy, string> = {
  system: "async · real timers",
  fixed: "never fires",
  manual: "sync · in-line",
  sequential: "sync · in-line",
};

const selectedPluginKey = ref("native");
const enabledAddons = ref<string[]>([]);
const selectedStrategy = ref<Strategy>("manual");
const timezone = ref("Etc/UTC");
const useHostTz = ref(false);
const fixedTime = ref("2026-01-01T00:00:00.000Z");
const initialTime = ref("2026-01-01T00:00:00.000Z");
const sequentialTimes = ref<string[]>([
  "2026-01-01T00:00:01.000Z",
  "2026-01-01T00:00:02.000Z",
  "2026-01-01T00:00:03.000Z",
]);

const advanceAmount = ref(1);
const advanceUnit = ref<
  "milliseconds" | "seconds" | "minutes" | "hours" | "days" | "months" | "years"
>("seconds");

const timerLabel = ref("Tick");
const timerKind = ref<SchedulerTimerKind>("interval");
const timerDelay = ref(1000);

// A recurring schedule computes its next delay from the run that just happened, so the playground
// needs a rule for that: start at `recurringInitialDelay`, multiply by `recurringFactor` after
// every run (factor 1 behaves exactly like setInterval), and return `false` once
// `recurringMaxRuns` runs have happened. The run cap is mandatory rather than optional: on a
// manual clock a single advance() drains everything already due, so an unbounded schedule with a
// small delay would spin in-line until the browser gave up.
const RECURRING_MAX_RUNS = 1000;
const recurringInitialDelay = ref(1000);
const recurringFactor = ref(2);
const recurringMaxRuns = ref(5);

const frameLabel = ref("Frame");

const cronLabel = ref("Nightly");
const cronExpression = ref("* * * * *");

const cronInputMode = ref<"expression" | "builder">("expression");
let cronAtomId = 1;
function makeCronAtom(field: CronFieldMeta): CronAtom {
  const initial = field.names ? field.names[0] : String(field.min);
  return { id: cronAtomId++, mode: "value", value: initial, from: initial, to: initial, step: "" };
}
const cronBuilder = reactive<Record<CronFieldMeta["key"], CronFieldState>>(
  Object.fromEntries(CRON_FIELDS.map((f) => [f.key, { wildcard: true, atoms: [] }])) as Record<
    CronFieldMeta["key"],
    CronFieldState
  >,
);
function addCronAtom(field: CronFieldMeta) {
  cronBuilder[field.key].atoms.push(makeCronAtom(field));
}
function removeCronAtom(field: CronFieldMeta, atomId: number) {
  const state = cronBuilder[field.key];
  state.atoms = state.atoms.filter((a) => a.id !== atomId);
}

function cronFieldExpression(state: CronFieldState): string {
  if (state.wildcard || state.atoms.length === 0) return "*";
  return state.atoms
    .map((atom) => {
      if (atom.mode === "value") return String(atom.value).trim() || "*";
      const step = String(atom.step).trim();
      return step ? `${atom.from}-${atom.to}/${step}` : `${atom.from}-${atom.to}`;
    })
    .join(",");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cronFieldSpecValue(field: CronFieldMeta, state: CronFieldState): any {
  if (state.wildcard || state.atoms.length === 0) return "*";
  // Names (month/dayOfWeek) are entered via <select>, always a valid name string already; a
  // numeric field's value arrives as a number (Vue 3.4+ auto-casts type="number" v-model
  // bindings) or occasionally still a numeric string, so normalize either through Number().
  const endpoint = (raw: string | number) => (field.names ? raw : Number(raw));
  const atoms = state.atoms.map((atom) => {
    if (atom.mode === "value") return endpoint(atom.value);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const range: any = { from: endpoint(atom.from), to: endpoint(atom.to) };
    const step = String(atom.step).trim();
    if (step) range.step = Number(step);
    return range;
  });
  return atoms.length === 1 ? atoms[0] : atoms;
}

const cronBuilderExpression = computed(() =>
  CRON_FIELDS.map((f) => cronFieldExpression(cronBuilder[f.key])).join(" "),
);
const cronBuilderSpec = computed(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spec: Record<string, any> = {};
  for (const f of CRON_FIELDS) {
    spec[f.key] = cronFieldSpecValue(f, cronBuilder[f.key]);
  }
  return spec;
});
const cronBuilderJson = computed(() => JSON.stringify(cronBuilderSpec.value, null, 2));

type EtaMode = "known-total" | "stages" | "duration";
type EtaAlgorithm = "complete" | "windowed" | "smoothed";

const etaMode = ref<EtaMode>("known-total");
const etaTotal = ref(100);
const etaStages = ref<{ weight: number; total: number }[]>([
  { weight: 1, total: 100 },
  { weight: 1, total: 100 },
]);
const etaDurationMs = ref(5000);
const etaNotificationInterval = ref(1000);
const etaAlgorithm = ref<EtaAlgorithm>("windowed");
const etaProgressChunk = ref(10);
const etaProgressToValue = ref(50);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const etaTracker = shallowRef<any>(null);
// shallowRef, not ref: the snapshot classes use private (#-prefixed) fields for their lazy
// getters - wrapping one in Vue's deep reactive Proxy makes those getters run with `this` bound
// to the proxy instead of the real instance, and private-field access throws in that case
// ("Cannot read private member ... from an object whose class did not declare it").
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const etaSnapshot = shallowRef<any>(null);
const etaStatusLabel = computed(() => etaSnapshot.value?.status ?? "idle");
// IStagedEtaProgressSnapshot doesn't declare `percentage` - only the stage-scoped
// `stagePercentage` - see its doc comment for why.
const etaPercentage = computed(() =>
  etaMode.value === "stages" ? etaSnapshot.value?.stagePercentage : etaSnapshot.value?.percentage,
);

const selectedPlugin = computed(
  () => pluginOptions.find((p) => p.key === selectedPluginKey.value) ?? pluginOptions[0],
);
const supportsLocalTime = computed(() =>
  Boolean(selectedPlugin.value.systemPlugin.supportsLocalTime),
);
const hasAnimationFrameAddon = computed(() => enabledAddons.value.includes("animation-frame"));
const hasCronAddon = computed(() => enabledAddons.value.includes("cron"));
const hasEtaAddon = computed(() => enabledAddons.value.includes("eta"));
const enabledAddonList = computed(() =>
  addonOptions.filter((a) => enabledAddons.value.includes(a.key)),
);
const addonsHint = computed(() => {
  const hints: string[] = [];
  if (hasAnimationFrameAddon.value) hints.push(".animation in the Animation Frame panel");
  if (hasCronAddon.value) hints.push(".cron in the Cron panel");
  if (hasEtaAddon.value) hints.push(".eta in the ETA panel");
  return hints.length > 0 ? hints.join(" · ") : "Adds extra facades to the built provider";
});
const strategyHint = computed(() => strategyHints[selectedStrategy.value]);
const strategyLabel = computed(
  () => strategies.find((s) => s.key === selectedStrategy.value)?.label ?? selectedStrategy.value,
);
const schedulerModeLabel = computed(() => schedulerModeLabels[selectedStrategy.value]);

// Each pane in the main column can be folded away to keep the ones being worked with in view.
// Collapsing only hides the pane's body (`v-show`), so a timer registered from a pane keeps
// running - and keeps logging - while it's folded.
const openPanes = reactive({
  clock: true,
  scheduler: true,
  frame: true,
  cron: true,
  eta: true,
  log: true,
});
function togglePane(key: keyof typeof openPanes) {
  openPanes[key] = !openPanes[key];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const timeProvider = shallowRef<any>(null);
const buildError = ref("");
const utcReadout = ref("—");
const localReadout = ref("—");
const remainingSequential = ref<number | null>(null);

const logEl = ref<HTMLElement | null>(null);
const LOG_TOP_THRESHOLD = 4;

let nextId = 1;
const log = ref<{ id: number; time: string; kind: string; msg: string }[]>([]);
// Rendered newest-first (`.pg-log` is a normal, non-reversed flex column), so `logEl`'s scrollTop
// keeps the standard, cross-browser-consistent meaning: 0 is pinned to the top (newest entry).
const reversedLog = computed(() => log.value.slice().reverse());

function pushLog(kind: string, msg: string) {
  const el = logEl.value;
  const wasAtTop = !el || el.scrollTop <= LOG_TOP_THRESHOLD;
  const prevScrollHeight = el?.scrollHeight ?? 0;

  log.value.push({ id: nextId++, time: new Date().toLocaleTimeString(), kind, msg });
  if (log.value.length > 300) log.value.shift();

  void nextTick(() => {
    if (!el) return;
    if (wasAtTop) {
      // Pin to the newest entry.
      el.scrollTop = 0;
    } else {
      // The new entry is inserted above whatever the user is currently reading - shift scrollTop
      // by the resulting height delta so that content stays visually in place.
      el.scrollTop += el.scrollHeight - prevScrollHeight;
    }
  });
}

function clearLog() {
  log.value = [];
}

interface TimerRow {
  id: number;
  kind: TimerKind;
  label: string;
  delayMs: number;
  expression?: string;
  // Recurring only, and mutated by the schedule's own callback so the row tracks it live.
  runs?: number;
  maxRuns?: number;
  nextDelayMs?: number;
  stopped?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handle: any;
}
const timerRows = ref<TimerRow[]>([]);

const schedulerRows = computed(() =>
  timerRows.value.filter((r) => r.kind !== "raf" && r.kind !== "cron"),
);
const frameRows = computed(() => timerRows.value.filter((r) => r.kind === "raf"));
const cronRows = computed(() => timerRows.value.filter((r) => r.kind === "cron"));

function describeTimer(row: TimerRow): string {
  switch (row.kind) {
    case "timeout":
      return `"${row.label}" once, ${row.delayMs}ms out`;
    case "interval":
      return `"${row.label}" every ${row.delayMs}ms`;
    case "recurring":
      if (row.stopped) return `"${row.label}" stopped after ${row.runs}/${row.maxRuns} runs`;
      return row.runs === 0
        ? `"${row.label}" first run ${row.delayMs}ms out, up to ${row.maxRuns} runs`
        : `"${row.label}" run ${row.runs}/${row.maxRuns}, next in ${row.nextDelayMs}ms`;
    case "raf":
      return `"${row.label}" pending frame`;
    default:
      return `"${row.label}" (${row.expression})`;
  }
}

function cancelTimer(row: TimerRow) {
  const provider = timeProvider.value;
  if (row.kind === "interval") provider.scheduler.clearInterval(row.handle);
  else if (row.kind === "recurring") provider.scheduler.clearRecurring(row.handle);
  else if (row.kind === "raf") provider.animation.cancelAnimationFrame(row.handle);
  else if (row.kind === "cron") provider.cron.unschedule(row.handle);
  else provider.scheduler.clearTimeout(row.handle);
}

function clearAllTimers() {
  if (!timeProvider.value) return;
  for (const row of timerRows.value) cancelTimer(row);
  timerRows.value = [];
}

function clearEtaTracker() {
  // On the system strategy this stops a real, native setInterval - without this, rebuilding the
  // provider (e.g. switching plugins) would otherwise leak it, still ticking against a runtime
  // that's no longer reachable from anywhere else.
  if (etaTracker.value) {
    try {
      etaTracker.value.abandon();
    } catch {
      /* already ended */
    }
  }
  etaTracker.value = null;
  etaSnapshot.value = null;
}

function formatValue(value: unknown, isLocal: boolean): string {
  if (value === null || value === undefined) return String(value);
  const v = value as Record<string, unknown>;
  if (isLocal && typeof v.format === "function") return (v.format as () => string)();
  if (typeof v.toISO === "function") return (v.toISO as () => string)();
  if (typeof v.toISOString === "function") return (v.toISOString as () => string)();
  if (typeof v.toString === "function") return String(v);
  return String(value);
}

function useHostTimezone() {
  try {
    timezone.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
    useHostTz.value = true;
  } catch {
    /* Intl unavailable - leave timezone as-is */
  }
}

function buildProvider() {
  clearAllTimers();
  clearEtaTracker();
  buildError.value = "";
  utcReadout.value = "—";
  localReadout.value = "—";
  remainingSequential.value = null;
  log.value = [];

  try {
    // System is built from `createTimeProvider` ("@time-provider/core"); fixed/manual/sequential
    // are built from the separate deterministic entry point, each with its own plugin instance -
    // see /guide/mental-model for why the two are split rather than one unified builder.
    const isSystem = selectedStrategy.value === "system";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let builder: any = isSystem
      ? createTimeProvider.for(selectedPlugin.value.systemPlugin)
      : createDeterministicTimeProvider.for(selectedPlugin.value.deterministicPlugin);

    if (supportsLocalTime.value) {
      builder = useHostTz.value
        ? builder.withHostTimezone()
        : builder.withTimezone(timezone.value.trim() || "Etc/UTC");
    }

    for (const addon of addonOptions) {
      if (enabledAddons.value.includes(addon.key)) {
        builder = builder.use(isSystem ? addon.systemAddon : addon.deterministicAddon);
      }
    }

    if (selectedStrategy.value === "fixed") {
      builder = builder.asFixed().withFixedTime(fixedTime.value.trim());
    } else if (selectedStrategy.value === "manual") {
      builder = builder.asManual().withInitialTime(initialTime.value.trim());
    } else if (selectedStrategy.value === "sequential") {
      builder = builder.asSequential();
      const times = sequentialTimes.value.map((t) => t.trim()).filter(Boolean);
      for (const t of times) builder = builder.withSequentialTime(t);
      remainingSequential.value = times.length;
    }

    timeProvider.value = builder.create();
    const addonSuffix = enabledAddonList.value.map((a) => ` + ${a.label} addon`).join("");
    pushLog(
      "tick",
      `Built ${selectedPlugin.value.label} · ${selectedStrategy.value} provider${addonSuffix}`,
    );
  } catch (e) {
    buildError.value = e instanceof Error ? e.message : String(e);
    timeProvider.value = null;
  }
}

function readUtc() {
  if (!timeProvider.value) return;
  try {
    const v = timeProvider.value.clock.utcNow();
    utcReadout.value = formatValue(v, false);
    if (selectedStrategy.value === "sequential" && remainingSequential.value !== null) {
      remainingSequential.value = Math.max(0, remainingSequential.value - 1);
    }
    pushLog("tick", `utcNow() → ${utcReadout.value}`);
  } catch (e) {
    pushLog("error", e instanceof Error ? e.message : String(e));
  }
}

function readLocal() {
  if (!timeProvider.value || !supportsLocalTime.value) return;
  try {
    const v = timeProvider.value.clock.localNow();
    localReadout.value = formatValue(v, true);
    if (selectedStrategy.value === "sequential" && remainingSequential.value !== null) {
      remainingSequential.value = Math.max(0, remainingSequential.value - 1);
    }
    pushLog("tick", `localNow() → ${localReadout.value}`);
  } catch (e) {
    pushLog("error", e instanceof Error ? e.message : String(e));
  }
}

function advance() {
  if (!timeProvider.value) return;
  try {
    const options = { [advanceUnit.value]: advanceAmount.value };
    timeProvider.value.clock.advance(options);
    pushLog("tick", `advance(${JSON.stringify(options)})`);
  } catch (e) {
    pushLog("error", e instanceof Error ? e.message : String(e));
  }
}

// A cleared `<input type="number">` leaves v-model.number holding the raw string, so every delay
// read out of one goes through this rather than straight into the scheduler.
function positiveNumber(value: number, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function dropTimerRow(id: number) {
  timerRows.value = timerRows.value.filter((r) => r.id !== id);
}

function addSchedulerTimer() {
  if (!timeProvider.value) return;
  const kind = timerKind.value;
  const label = timerLabel.value.trim() || "timer";
  const id = nextId++;

  try {
    if (kind === "recurring") {
      addRecurringTimer(id, label);
      return;
    }

    const delay = positiveNumber(timerDelay.value, 0);
    const callback = () => {
      pushLog(kind, `"${label}" fired (${delay}ms)`);
      if (kind === "timeout") dropTimerRow(id);
    };
    const handle =
      kind === "interval"
        ? timeProvider.value.scheduler.setInterval(callback, delay)
        : timeProvider.value.scheduler.setTimeout(callback, delay);

    timerRows.value.push({ id, kind, label, delayMs: delay, handle });
    pushLog("tick", `Registered ${kind} "${label}" (${delay}ms)`);
  } catch (e) {
    pushLog("error", e instanceof Error ? e.message : String(e));
  }
}

function addRecurringTimer(id: number, label: string) {
  const initialDelay = positiveNumber(recurringInitialDelay.value, 0);
  const factor = positiveNumber(recurringFactor.value, 1);
  const maxRuns = Math.min(
    RECURRING_MAX_RUNS,
    Math.max(1, Math.round(positiveNumber(recurringMaxRuns.value, 5))),
  );

  let delay = initialDelay;
  const callback = (): number | false => {
    const row = timerRows.value.find((r) => r.id === id);
    const runs = (row?.runs ?? 0) + 1;
    if (runs >= maxRuns) {
      if (row) {
        row.runs = runs;
        row.stopped = true;
      }
      pushLog("recurring", `"${label}" run ${runs}/${maxRuns} → returned false, stopped`);
      return false;
    }
    delay = Math.round(delay * factor);
    if (row) {
      row.runs = runs;
      row.nextDelayMs = delay;
    }
    pushLog("recurring", `"${label}" run ${runs}/${maxRuns} → returned ${delay}ms`);
    return delay;
  };

  // Pushed before scheduling: on a manual/sequential clock an initial delay of 0 is already due,
  // so `setRecurring` runs the callback in-line before it ever returns a handle - the row has to
  // exist by then for that first run to be counted against it.
  timerRows.value.push({
    id,
    kind: "recurring",
    label,
    delayMs: initialDelay,
    runs: 0,
    maxRuns,
    nextDelayMs: initialDelay,
    handle: null,
  });
  const handle = timeProvider.value.scheduler.setRecurring(callback, initialDelay);
  const row = timerRows.value.find((r) => r.id === id);
  if (row) row.handle = handle;
  pushLog(
    "tick",
    `Registered recurring "${label}" (${initialDelay}ms, ×${factor}, ${maxRuns} runs)`,
  );
}

function requestFrame() {
  if (!timeProvider.value) return;
  const label = frameLabel.value.trim() || "frame";
  const id = nextId++;
  try {
    const handle = timeProvider.value.animation.requestAnimationFrame(() => {
      pushLog("raf", `"${label}" frame fired`);
      dropTimerRow(id);
    });
    timerRows.value.push({ id, kind: "raf", label, delayMs: 0, handle });
    pushLog("tick", `Requested animation frame "${label}"`);
  } catch (e) {
    pushLog("error", e instanceof Error ? e.message : String(e));
  }
}

function addCronSchedule() {
  if (!timeProvider.value) return;
  const label = cronLabel.value.trim() || "cron";
  const isBuilder = cronInputMode.value === "builder";
  const expression = isBuilder
    ? cronBuilderExpression.value
    : cronExpression.value.trim() || "* * * * *";
  const id = nextId++;
  try {
    const handle = timeProvider.value.cron.schedule(
      isBuilder ? cronBuilderSpec.value : expression,
      () => pushLog("cron", `"${label}" fired (${expression})`),
    );
    timerRows.value.push({ id, kind: "cron", label, delayMs: 0, expression, handle });
    pushLog("tick", `Registered cron "${label}" (${expression})`);
  } catch (e) {
    pushLog("error", e instanceof Error ? e.message : String(e));
  }
}

function removeTimer(row: TimerRow) {
  if (!timeProvider.value) return;
  cancelTimer(row);
  dropTimerRow(row.id);
  pushLog("tick", `Cleared "${row.label}"`);
}

function addSequentialTime() {
  const fallback = "2026-01-01T00:00:00.000Z";
  const last = sequentialTimes.value[sequentialTimes.value.length - 1];
  const lastDate = last ? new Date(last) : new Date(NaN);
  const base = Number.isNaN(lastDate.getTime()) ? new Date(fallback) : lastDate;
  sequentialTimes.value.push(new Date(base.getTime() + 1000).toISOString());
}

function removeSequentialTime(index: number) {
  sequentialTimes.value.splice(index, 1);
}

function addEtaStage() {
  etaStages.value.push({ weight: 1, total: 100 });
}

function removeEtaStage(index: number) {
  etaStages.value.splice(index, 1);
}

// v-model.number leaves a cleared/non-numeric input as the raw string instead of coercing it.
function isValidEtaNumber(value: number): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

// Reset a cleared/invalid field to a sane default rather than letting it reach the addon. A
// value the user genuinely typed (including 0) is a real number and passes through untouched.
function coerceEtaNumber(value: number, fallback: number): number {
  return isValidEtaNumber(value) ? value : fallback;
}

const canStartEta = computed(() => {
  if (!timeProvider.value || etaTracker.value) return false;
  if (!isValidEtaNumber(etaNotificationInterval.value)) return false;
  if (etaMode.value === "known-total") return isValidEtaNumber(etaTotal.value);
  if (etaMode.value === "duration") return isValidEtaNumber(etaDurationMs.value);
  return etaStages.value.every((s) => isValidEtaNumber(s.weight) && isValidEtaNumber(s.total));
});

function startEtaTracker() {
  if (!canStartEta.value) return;
  etaSnapshot.value = null;
  try {
    const builder = timeProvider.value.eta.estimate();
    const notify = (snapshot: { status: string; percentage?: number }) => {
      etaSnapshot.value = snapshot;
      const pct = snapshot.percentage !== undefined ? ` · ${snapshot.percentage.toFixed(1)}%` : "";
      pushLog("eta", `[eta] ${snapshot.status}${pct}`);
    };

    if (etaMode.value === "known-total") {
      etaTracker.value = builder
        .withKnownTotal(etaTotal.value)
        .withNotificationInterval(etaNotificationInterval.value)
        .withAlgorithm(etaAlgorithm.value)
        .start(notify);
    } else if (etaMode.value === "stages") {
      etaTracker.value = builder
        .withStages(etaStages.value.map((p) => ({ weight: p.weight, total: p.total })))
        .withNotificationInterval(etaNotificationInterval.value)
        .withAlgorithm(etaAlgorithm.value)
        .start(notify);
    } else {
      etaTracker.value = builder
        .withEstimatedDuration(etaDurationMs.value)
        .withNotificationInterval(etaNotificationInterval.value)
        .start(notify);
    }
    pushLog("tick", `Started .eta.estimate() (${etaMode.value})`);
  } catch (e) {
    pushLog("error", e instanceof Error ? e.message : String(e));
  }
}

function etaProgress() {
  if (!etaTracker.value) return;
  etaProgressChunk.value = coerceEtaNumber(etaProgressChunk.value, 10);
  try {
    etaTracker.value.progress(etaProgressChunk.value);
  } catch (e) {
    pushLog("error", e instanceof Error ? e.message : String(e));
  }
}

function etaProgressToAction() {
  if (!etaTracker.value) return;
  etaProgressToValue.value = coerceEtaNumber(etaProgressToValue.value, 50);
  try {
    etaTracker.value.progressTo(etaProgressToValue.value);
  } catch (e) {
    pushLog("error", e instanceof Error ? e.message : String(e));
  }
}

function etaNextStage() {
  if (!etaTracker.value) return;
  try {
    etaTracker.value.nextStage();
  } catch (e) {
    pushLog("error", e instanceof Error ? e.message : String(e));
  }
}

function etaDoneAction() {
  if (!etaTracker.value) return;
  etaTracker.value.done();
  etaTracker.value = null;
}

function etaAbandonAction() {
  if (!etaTracker.value) return;
  etaTracker.value.abandon();
  etaTracker.value = null;
}

// Any of these fully redefine what the provider *is* (or its initial state), so rebuilding is the
// only correct response to a change - equivalent to what the old "Build provider" button did,
// which is why that button was removed in favor of just reacting to these directly.
watch(
  [
    selectedPluginKey,
    enabledAddons,
    selectedStrategy,
    timezone,
    useHostTz,
    fixedTime,
    initialTime,
    sequentialTimes,
  ],
  () => buildProvider(),
  { deep: true, immediate: true },
);

const codeSnippet = computed(() => {
  const p = selectedPlugin.value;
  const isSystem = selectedStrategy.value === "system";

  const calls = [".for(plugin)"];
  if (supportsLocalTime.value && useHostTz.value) {
    calls.push(`.withHostTimezone() // currently: ${timezone.value.trim()}`);
  } else if (
    supportsLocalTime.value &&
    timezone.value.trim() &&
    timezone.value.trim() !== "Etc/UTC"
  ) {
    calls.push(`.withTimezone("${timezone.value.trim()}")`);
  }
  for (const a of enabledAddonList.value) {
    calls.push(`.use(${a.varName})`);
  }
  if (selectedStrategy.value === "fixed") {
    calls.push(".asFixed()", `.withFixedTime("${fixedTime.value.trim()}")`);
  } else if (selectedStrategy.value === "manual") {
    calls.push(".asManual()", `.withInitialTime("${initialTime.value.trim()}")`);
  } else if (selectedStrategy.value === "sequential") {
    calls.push(".asSequential()");
    for (const t of sequentialTimes.value.map((x) => x.trim()).filter(Boolean)) {
      calls.push(`.withSequentialTime("${t}")`);
    }
  }
  calls.push(".create();");

  const chain = ["createTimeProvider", ...calls].join("\n  ");

  const coreImport = isSystem
    ? `import { createTimeProvider } from "@time-provider/core";`
    : `import { createTimeProvider } from "@time-provider/core/deterministic";`;
  const pluginImport = isSystem
    ? `import { plugin } from "@time-provider/${p.importName}";`
    : `import { plugin } from "@time-provider/${p.importName}/deterministic";`;
  const addonImports = enabledAddonList.value
    .map(
      (a) =>
        `\nimport { addon as ${a.varName} } from "@time-provider/${a.importName}${isSystem ? "" : "/deterministic"}";`,
    )
    .join("");

  return `${coreImport}\n${pluginImport}${addonImports}\nconst timeProvider = ${chain}`;
});

const codeHtml = ref("");
watch(
  codeSnippet,
  async (code) => {
    codeHtml.value = await highlightTs(code);
  },
  { immediate: true },
);

const codeCopied = ref(false);
let codeCopyResetTimer: ReturnType<typeof setTimeout> | undefined;
async function copyEquivalentCode() {
  try {
    await navigator.clipboard.writeText(codeSnippet.value);
  } catch {
    // Clipboard API unavailable (e.g. an insecure context) - fall back to the legacy copy command.
    const textarea = document.createElement("textarea");
    textarea.value = codeSnippet.value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
  codeCopied.value = true;
  clearTimeout(codeCopyResetTimer);
  codeCopyResetTimer = setTimeout(() => {
    codeCopied.value = false;
  }, 1500);
}

onBeforeUnmount(() => clearAllTimers());
</script>
