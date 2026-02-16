/********************************************************************************
 * Copyright (C) 2026 Alessandro Di Diego
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 *
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import { ContainerModule } from '@theia/core/shared/inversify';
import { CliContribution } from '@theia/core/lib/node/cli';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { IdleTimeoutState, IdleTimeoutCliContribution, IdleTimeoutBackendContribution } from './idle-timeout-contribution';

export default new ContainerModule(bind => {
    bind(IdleTimeoutState).toSelf().inSingletonScope();
    bind(IdleTimeoutCliContribution).toSelf().inSingletonScope();
    bind(CliContribution).toService(IdleTimeoutCliContribution);
    bind(IdleTimeoutBackendContribution).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(IdleTimeoutBackendContribution);
});
