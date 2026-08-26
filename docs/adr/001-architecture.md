# ADR-001: Adrax Architecture

**Status:** Proposed

**Date:** 2026-08-26

## Context

Adrax is designed to provide a higher-level interface for managing Android devices through ADB.

The project should abstract the complexity of the ADB command-line interface while keeping access to the capabilities provided by ADB. The architecture must also support multiple connected devices, USB and Wireless ADB connections, device services, automation, logging, and future integrations such as scrcpy.

Adrax will also need to persist user-created data, such as automations and application preferences. These data must survive application restarts and therefore cannot exist only in memory.

The application should not couple its user interface directly to ADB operations or to the storage implementation. Doing so would make the project harder to maintain and would make future changes to the underlying implementations more difficult.

## Decision

Adrax will use a layered architecture that separates the user interface, application services, ADB communication, and persistent storage.

The ADB layer will be responsible for communicating with Android devices and exposing the low-level operations required by the application.

A service layer will provide higher-level operations such as device control, application management, file management, settings, and automation.

The user interface will interact with these services instead of communicating directly with the ADB implementation or the storage layer.

Adrax will use the `adb_client` Rust crate as the initial implementation for communicating with Android devices through the ADB protocol.

The project will keep the ADB implementation behind its own abstraction so that the underlying library can be replaced or extended in the future without requiring major changes to the rest of the application.

Adrax will also provide a dedicated storage layer for persistent application data. SQLite will be used as the initial persistence solution.

Persistent data may include user-created automations, application preferences, and other configuration that should survive application restarts.

Runtime state, such as currently connected devices, active connections, and temporary logs, will remain in memory unless a future architectural decision determines that persistence is necessary.

Application services will interact with storage through repository abstractions rather than accessing SQLite directly. This will keep business logic independent from the database implementation.

## Consequences

This architecture separates the major responsibilities of Adrax and allows each part of the application to evolve independently.

The user interface does not need to know how ADB communication or persistent storage is implemented. Likewise, application services do not need to depend directly on SQLite or the ADB client library.

Using SQLite provides persistent storage without requiring a separate database server, which is appropriate for a local application such as Adrax.

The use of repository abstractions introduces additional structure and code, but it allows the storage implementation to be replaced or extended in the future without requiring major changes to application logic.

The same principle applies to the ADB layer, allowing Adrax to replace `adb_client` or introduce another implementation if project requirements change.

## Notes

This ADR establishes the initial architectural direction of Adrax.

The architecture is intentionally kept flexible because the project is still in early development. Decisions regarding the user interface framework, asynchronous execution, automation architecture, security model, and other major components may be documented in separate ADRs.

Future architectural decisions may supersede or extend this ADR.
