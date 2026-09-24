export declare function isPortAvailable(port: number): Promise<boolean>;
export declare function findAvailablePort(startPort: number, maxAttempts?: number): Promise<number>;
