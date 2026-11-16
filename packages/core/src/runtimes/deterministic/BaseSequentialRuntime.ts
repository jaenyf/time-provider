import type { EpochMilliseconds } from "../../deterministic.ts";
import type { IMoveOptions, TimezoneDefinition, ITimeConverter } from "../../types/types.ts";
import { BaseDeterministicRuntime } from "./BaseDeterministicRuntime.ts";

const MOVE_KINDS: readonly string[] = ["flow", "sleep", "snap"];

/** Base class for deterministic sequential runtimes. */

export abstract class BaseSequentialRuntime<TDate> extends BaseDeterministicRuntime<TDate> {
  /** Epoch timestamps consumed one per clock read; the last repeats. */
  protected _sequentialMoves: { time: number; as: IMoveOptions["as"] }[];
  #sequentialIndex = 0;
  #hasBeenRead = false;

  /**
   * @param localTimezone The runtime timezone.
   * @param sequentialMoves Timestamps consumed one per clock read.
   * @param converter The runtime time converter.
   */
  constructor(
    localTimezone: TimezoneDefinition,
    sequentialMoves: {
      time: string | EpochMilliseconds | number | TDate;
      as?: IMoveOptions["as"];
    }[],
    converter: ITimeConverter<TDate>,
  ) {
    super(localTimezone, converter);
    const moves = sequentialMoves.map((move) => ({
      time: this.convertToEpochTimestampImpl(move.time) as number,
      as: move.as,
    }));
    for (let i = 1; i < moves.length; i++) {
      const backward = moves[i].time < moves[i - 1].time;
      if (moves[i].as === undefined) moves[i].as = backward ? "snap" : "flow";
      else if (backward && moves[i].as !== "snap") {
        throw new Error(`A clock can't ${moves[i].as} backward. Use { as: "snap" }`);
      }
    }
    this._sequentialMoves = moves;

    this.startMonotonicClock();
  }

  localNowImpl(): TDate {
    const nowSpec = this.consumeNextSequentialMove();
    this.mayRunDueCallbacks();
    // Already a validated epoch-milliseconds value (see timestampNowImpl below) - no need to
    // round-trip it back through toInstant()'s spec-object validation.
    return this.convertToLocalDateImpl(this.localTimezone, nowSpec.time as EpochMilliseconds);
  }

  utcNowImpl(): TDate {
    const nowSpec = this.consumeNextSequentialMove();
    this.mayRunDueCallbacks();
    return this.convertToUtcDateImpl(nowSpec.time as EpochMilliseconds);
  }

  /** Returns the current sequence value without consuming it or running callbacks. */
  timestampNowImpl(): EpochMilliseconds {
    // _sequentialTimestamps entries are already validated epoch-milliseconds values (populated via
    // convertToEpochTimestampImpl, which itself validates) - no need to re-validate them here by
    // round-tripping through toInstant()'s spec-object form.
    return (
      this._sequentialMoves.length > 0 ? this._sequentialMoves[this.#sequentialIndex].time : 0
    ) as EpochMilliseconds;
  }

  private consumeNextSequentialMove(): { time: number; as?: IMoveOptions["as"] } {
    const moves = this._sequentialMoves;
    const index = this.#sequentialIndex;
    if (this.#hasBeenRead && index < moves.length - 1) {
      const next = moves[index + 1];
      const target = next.time as EpochMilliseconds;
      next.time = moves[index].time;
      this.#sequentialIndex++;
      this.moveClock(target, { as: next.as });
    }
    this.#hasBeenRead = true;
    return moves[this.#sequentialIndex] ?? { time: 0 };
  }
  /**
   * Moves the clock to `targetTimestamp`.
   * @throws If the options are invalid or conflict, or a flow or sleep goes backward.
   */
  protected moveClock(targetTimestamp: EpochMilliseconds, options?: IMoveOptions): this {
    const as = options?.as ?? "flow";
    const monotonic = options?.monotonic ?? (as === "snap" ? "paused" : "running");
    if (
      !MOVE_KINDS.includes(as) ||
      (monotonic !== "running" && monotonic !== "paused") ||
      (as === "flow" && monotonic === "paused") ||
      (as === "snap" && monotonic === "running")
    ) {
      throw new Error(`Invalid move options (as: '${as}', monotonic: '${monotonic}')`);
    }
    const delta = targetTimestamp - this.timestampNow();
    if (delta < 0 && as !== "snap") {
      throw new Error(`A clock can't ${as} backward. Use { as: "snap" }`);
    }
    if (as === "flow") {
      this.flowTo(targetTimestamp);
      return this;
    }
    if (monotonic === "paused") this.snapWallClockTime(delta);
    this._sequentialMoves[this.#sequentialIndex].time = targetTimestamp;
    this.mayRunDueCallbacks(true);
    return this;
  }

  /** Moves the clock to `targetTimestamp`, firing each due callback at its due time. */
  protected flowTo(targetTimestamp: EpochMilliseconds): void {
    // Each due callback must see its own due time, or a self-rescheduling chain fires once per move.
    let lastSet = this._sequentialMoves[this.#sequentialIndex].time;
    this.drainDueAdvancing(targetTimestamp, (runAt) => {
      this._sequentialMoves[this.#sequentialIndex].time = lastSet = runAt;
    });
    if (this._sequentialMoves[this.#sequentialIndex].time === lastSet)
      this._sequentialMoves[this.#sequentialIndex].time = targetTimestamp;
  }
}
