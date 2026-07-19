# Axon release

Axon publishes its CLI through npm. The npm package is a small wrapper that selects one of the Windows, Linux, or macOS binary packages for the current machine.

## Windows development machines

Install and sign in once:

```powershell
wsl --install -d Ubuntu
npm login
```

Then, from a clean Axon checkout on `dev`, publish every platform with:

```powershell
bun run release:all:patch
```

Use `release:all:minor` for a minor release. To check the local prerequisites without building or publishing:

```powershell
bun run release:all:dry-run
```

The command creates a temporary Linux build checkout in WSL, builds all CLI targets there, copies only `packages/axon/dist` back to the Windows checkout, and publishes all platform packages plus `@wanghuimvp/axon`.

## Linux and macOS development machines

Install Bun, run `npm login`, then execute:

```bash
bash script/release-all.sh --bump patch
```

## Verification

After publishing, verify the wrapper and a package from each operating system:

```powershell
npm view @wanghuimvp/axon version dist-tags --json
npm view axon-windows-x64 version
npm view axon-linux-x64 version
npm view axon-darwin-arm64 version
```

Do not use `.github/workflows/publish.yml` for Axon npm releases. It is an upstream desktop-release workflow that requires Blacksmith, Azure signing, and Apple signing credentials.
