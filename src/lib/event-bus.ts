"use client";

import type { StreamEvent } from "./types";

type Listener = (event: StreamEvent) => void;
type AnyListener = () => void;

/**
 * Lightweight pub/sub so the mock SSE stream drives both the R3F scene
 * and the Event HUD from one source of truth.
 */
class EventBus {
  private listeners = new Set<Listener>();
  private resetListeners = new Set<AnyListener>();
  private history: StreamEvent[] = [];
  private playing = false;
  private scrubIndex = -1;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onReset(fn: AnyListener): () => void {
    this.resetListeners.add(fn);
    return () => this.resetListeners.delete(fn);
  }

  publish(event: StreamEvent) {
    this.history.push(event);
    this.scrubIndex = this.history.length - 1;
    for (const fn of this.listeners) fn(event);
  }

  getHistory(): StreamEvent[] {
    return this.history;
  }

  getScrubIndex(): number {
    return this.scrubIndex;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  setPlaying(v: boolean) {
    this.playing = v;
  }

  reset() {
    this.history = [];
    this.scrubIndex = -1;
    this.playing = false;
    for (const fn of this.resetListeners) fn();
  }

  /** Replay a single historical event (for scrub). Does not append. */
  replayAt(index: number) {
    if (index < 0 || index >= this.history.length) return;
    this.scrubIndex = index;
    for (const fn of this.listeners) fn(this.history[index]);
  }
}

export const eventBus = new EventBus();
