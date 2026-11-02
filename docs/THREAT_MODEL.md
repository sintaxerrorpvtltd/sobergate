# Threat model

SoberGate alpha is an experimental command-input filter, not a security boundary. It mitigates accidental direct commands submitted through `sg exec` or its own simple prompt. Its intended user is cooperative and wants friction before external actions. A malicious or autonomous process is outside this version's protection.

## What is checked

While LOCKED, direct commands passed to `sg exec` or typed into `sg shell` must match a small local allowlist. Unknown commands, absolute paths, shell interpreters, package managers, remote CLIs and compound shell syntax are refused. GUARD currently denies those commands as well; it has no confirmation flow.

## What is not protected

* Other shells, current Codex, already running processes, native agent tools, browser actions, MCP, GUI, and direct APIs are not intercepted.
* Allowed commands can invoke hooks or helpers, read/write special files, or be replaced via PATH. Local code, tests, builds, package scripts, and git hooks may make network requests or publish. This is not safe against a malicious repository or agent.
* State is user-writable and unsigned, and the system clock can be changed. No daemon, keychain, tamper resistance, cooldown, or emergency override exists.
* A lock applies only to invocations using the same `SOBERGATE_HOME` or home directory. It does not activate protection system-wide.
* Journal records attempted program names and decisions, not a complete audit. Program names may themselves contain sensitive information. Arguments are intentionally omitted; pending items are reminders, not replayable instructions.

## Required before trusting an agent session

A separately verified OS sandbox with restricted network and credential access, agent-specific interception of all tool calls, isolation from writable policy/state, and tests covering native APIs, subprocesses and MCP. Enforce production IAM and branch protections independently. No current adapter satisfies these requirements.
