/********************************************************************************
 * Copyright (C) 2026 Alessandro Di Diego
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 *
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import { inject, injectable } from '@theia/core/shared/inversify';
import { CliContribution } from '@theia/core/lib/node/cli';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { Application, Request, Response, NextFunction } from '@theia/core/shared/express';
import { MaybePromise } from '@theia/core/lib/common/types';

/**
 * Shared state for idle timeout feature.
 */
@injectable()
export class IdleTimeoutState {
    idleTimeoutSeconds: number = 0;
    lastActivity: number = Date.now();

    heartbeat(): void {
        this.lastActivity = Date.now();
    }
}

/**
 * CLI contribution that adds --idle-timeout flag.
 */
@injectable()
export class IdleTimeoutCliContribution implements CliContribution {

    @inject(IdleTimeoutState)
    protected readonly idleState: IdleTimeoutState;

    configure(conf: Parameters<CliContribution['configure']>[0]): void {
        conf.option('idle-timeout', {
            description: 'Shut down the server after this many seconds of inactivity. Set to 0 to disable (default).',
            type: 'number',
            default: 0,
            nargs: 1,
        });
    }

    setArguments(args: Parameters<CliContribution['setArguments']>[0]): MaybePromise<void> {
        const timeout = args['idle-timeout'];
        if (typeof timeout === 'number' && timeout > 0) {
            this.idleState.idleTimeoutSeconds = timeout;
            console.log(`Idle timeout enabled: ${this.idleState.idleTimeoutSeconds} seconds`);
        }
    }
}

/**
 * Backend contribution that monitors HTTP activity and shuts down on idle.
 */
@injectable()
export class IdleTimeoutBackendContribution implements BackendApplicationContribution {

    @inject(IdleTimeoutState)
    protected readonly idleState: IdleTimeoutState;

    protected idleTimer?: ReturnType<typeof setInterval>;

    configure(app: Application): void {
        // Only set up middleware if idle timeout is configured
        // Note: CLI args are processed before configure() is called
        if (this.idleState.idleTimeoutSeconds <= 0) {
            return;
        }

        // Middleware to track activity on every HTTP request
        app.use((_req: Request, _res: Response, next: NextFunction) => {
            this.idleState.heartbeat();
            next();
        });

        // Start the idle timer
        this.startIdleTimer();
    }

    /**
     * Start the idle timeout timer.
     */
    protected startIdleTimer(): void {
        if (this.idleTimer) {
            clearInterval(this.idleTimer);
        }

        // Check at least every minute, or at the timeout interval
        const checkInterval = Math.min(this.idleState.idleTimeoutSeconds * 1000, 60000);

        this.idleTimer = setInterval(() => {
            const idleMs = Date.now() - this.idleState.lastActivity;
            const timeoutMs = this.idleState.idleTimeoutSeconds * 1000;

            if (idleMs >= timeoutMs) {
                process.stderr.write(`Idle timeout of ${this.idleState.idleTimeoutSeconds} seconds exceeded. Shutting down.\n`);
                // eslint-disable-next-line no-process-exit
                process.exit(0);
            }
        }, checkInterval);

        // Don't prevent Node from exiting if this is the only timer
        if (this.idleTimer.unref) {
            this.idleTimer.unref();
        }
    }

    onStop(): void {
        if (this.idleTimer) {
            clearInterval(this.idleTimer);
            this.idleTimer = undefined;
        }
    }
}
