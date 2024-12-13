// Copyright (c) Microsoft Corporation. All rights reserved.
// Program.cs

var app = await Microsoft.AutoGen.AgentHost.Host.StartAsync(local: false, useGrpc: true);
await app.WaitForShutdownAsync();
