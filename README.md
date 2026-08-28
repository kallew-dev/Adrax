# Adrax

[![Version](https://img.shields.io/badge/version-0.1.0-blue)](https://github.com/kallew-dev/Adrax)
[![Rust](https://img.shields.io/badge/Rust-1.97-orange?logo=rust)](https://www.rust-lang.org/)
[![GitHub Stars](https://img.shields.io/github/stars/kallew-dev/Adrax)](https://github.com/kallew-dev/Adrax)
[![GitHub Issues](https://img.shields.io/github/issues/kallew-dev/Adrax)](https://github.com/kallew-dev/Adrax/issues)
---

**Adrax** is an proprietary Android device management tool built in Rust around the Android Debug Bridge (ADB).

Its purpose is to provide a simpler and more intuitive way to interact with Android devices without requiring users to work directly with the ADB command-line interface. Adrax abstracts common ADB operations into a unified interface while keeping the flexibility and power of ADB underneath.

Adrax is designed to handle both USB and Wireless ADB connections, allowing users to connect, manage, and switch between multiple Android devices from a single application.

The project also aims to provide a more convenient way to perform everyday device operations such as controlling volume and power, managing applications and files, accessing Android settings, and executing custom commands.

Automation is another important part of Adrax. Users will eventually be able to create custom workflows for repetitive tasks, such as opening an application, navigating to specific content, performing searches, or executing sequences of Android commands.

Adrax will also integrate **scrcpy** through its **Self-screen** interface, providing a convenient way to access and control the device screen while keeping the underlying connection management inside the application.

The project is currently in early development. The `0.1.0` release represents the beginning of the Adrax project, with the core ADB infrastructure being developed before the higher-level features are introduced.

Technical details, architecture, development notes, and deeper documentation will be maintained separately in the `docs` directory.

## Contributing

Adrax is a proprietary project. Contributions are currently accepted by invitation only.

If you are interested in contributing to Adrax, please contact the project maintainers before submitting code, documentation, or other materials.

Any contribution must be authorized and may be subject to a separate agreement defining the rights, ownership, and terms applicable to the contribution.

## License

Adrax is proprietary software. All rights reserved.

Use, modification, distribution, or commercial exploitation of the source code requires explicit permission from the copyright holder.
