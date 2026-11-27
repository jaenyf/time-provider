import type {
  EpochMilliseconds,
  IMoveOptions,
  TimezoneDefinition,
  ITimeConverter,
  MoveKind,
  MonotonicKind,
} from "../../types/types.ts";
import { BaseDeterministicRuntime } from "./BaseDeterministicRuntime.ts";

const DEFAULT_MONOTONIC: Record<MoveKind, MonotonicKind> = {
  flow: "running",
  sleep: "running",
  snap: "paused",
};

/** Base class for deterministic sequential runtimes. */

export abstract class BaseSequentialRuntime<TDate> extends BaseDeterministicRuntime<TDate> {
  /** Epoch timestamps consumed one per clock read; the last repeats. */
  protected _sequentialMoves: { time: number; as: IMoveOptions["as"] }[];
  #sequentialIndex = 0;
  #hasBeenRead = false;
  #timePausedFromDepth: number;

  /**
   * @param localTimezone The runtime timezone.
   * @param sequentialMoves Timestamps consumed one per clock read.
   * @param converter The runtime time converter.
   * @param timePausedFromDepth Callback nesting from which a clock read stops consuming a timestamp.
   */
  constructor(
    localTimezone: TimezoneDefinition,
    sequentialMoves: {
      time: string | EpochMilliseconds | number | TDate;
      as?: IMoveOptions["as"];
    }[],
    converter: ITimeConverter<TDate>,
    timePausedFromDepth: number = Infinity,
  ) {
    super(localTimezone, converter);
    this.#timePausedFromDepth = timePausedFromDepth;
    this._sequentialMoves = this.initializeSequentialMoves(sequentialMoves);
    this.startMonotonicClock();
  }

  private initializeSequentialMoves(
    sequentialMoves: {
      time: string | EpochMilliseconds | number | TDate;
      as?: IMoveOptions["as"];
    }[],
  ): { time: number; as: IMoveOptions["as"] }[] {
    const moves: { time: number; as: IMoveOptions["as"] }[] = sequentialMoves.map((move) => ({
      time: this.convertToEpochTimestampImpl(move.time) as number,
      as: move.as,
    }));

    for (let i = 1; i < moves.length; i++) {
      this.validateSequentialMove(moves[i], moves[i - 1]);
    }

    return moves;
  }

  private validateSequentialMove(
    current: { time: number; as: IMoveOptions["as"] },
    previous: { time: number; as: IMoveOptions["as"] },
  ): void {
    const backward = current.time < previous.time;

    if (current.as === undefined) {
      current.as = backward ? "snap" : "flow";
      return;
    }

    if (backward && current.as !== "snap") {
      throw new Error(`A clock can't ${current.as} backward. Use { as: "snap" }`);
    }
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

    if (
      this.#hasBeenRead &&
      index < moves.length - 1 &&
      this.callbackDepth < this.#timePausedFromDepth
    ) {
      const next = moves[index + 1];
      const target = next.time as EpochMilliseconds;

      next.time = moves[index].time;
      this.#sequentialIndex++;

      const as = next.as as MoveKind;
      this.moveClockWithOptions(target, as, DEFAULT_MONOTONIC[as]);
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
    const monotonic = options?.monotonic ?? DEFAULT_MONOTONIC[as];

    return this.moveClockWithOptions(targetTimestamp, as, monotonic);
  }

  private moveClockWithOptions(
    targetTimestamp: EpochMilliseconds,
    as: MoveKind,
    monotonic: MonotonicKind,
  ): this {
    this.assertValidMoveOptions(as, monotonic);
    const delta = targetTimestamp - this.timestampNow();
    this.assertMoveIsAllowed(as, delta);

    this.applyMove(targetTimestamp, as, monotonic, delta);
    return this;
  }

  private assertMoveIsAllowed(as: MoveKind, delta: number): void {
    if (delta < 0 && as !== "snap") {
      throw new Error(`A clock can't ${as} backward. Use { as: "snap" }`);
    }
  }

  private assertValidMoveOptions(as: MoveKind, monotonic: MonotonicKind): void {
    if (!this.isValidMonotonic(as, monotonic)) {
      throw new Error(`Invalid move options (as: '${as}', monotonic: '${monotonic}')`);
    }
  }

  private applyMove(
    targetTimestamp: EpochMilliseconds,
    as: MoveKind,
    monotonic: MonotonicKind,
    delta: number,
  ): void {
    if (as === "flow") {
      this.flowTo(targetTimestamp);
      return;
    }

    if (monotonic === "paused") this.snapWallClockTime(delta);

    this._sequentialMoves[this.#sequentialIndex].time = targetTimestamp;
    this.mayRunDueCallbacks(true);
  }

  private isValidMonotonic(as: MoveKind, monotonic: MonotonicKind): boolean {
    switch (as) {
      case "flow":
        return monotonic === "running";
      case "sleep":
        return true;
      case "snap":
        return monotonic === "paused";
    }
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
