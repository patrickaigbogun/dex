export * from './tasks';
/**
 * Spawned process metadata for a managed task.
 */
export type Spawned = {
    name: string;
    proc: ReturnType<typeof Bun.spawn>;
};
/**
 * Spawn a set of tasks and terminate the group if any exits non-zero.
 */
export declare function spawnGroup(tasks: Array<{
    name: string;
    cmd: string[];
}>): {
    shutdown: (code?: number) => void;
    processes: Spawned[];
};
