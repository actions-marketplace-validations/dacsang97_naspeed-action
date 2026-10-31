# naspeed-action

GitHub Action for [naspeed](https://github.com/dacsang97/naspeed), the
transparent `RUSTC_WRAPPER` build cache. One step:

1. downloads the naspeed release for the runner (Linux and macOS, x64 and
   arm64), verifies its checksum and keeps it in the runner tool cache;
2. runs `naspeed setup`, so every later `cargo` call in the job goes through
   naspeed (`ns` is on `PATH` too);
3. restores the naspeed store from the GitHub Actions cache and, at the end of
   a successful job, exports it and saves it again.

## Usage

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: dtolnay/rust-toolchain@stable # install Rust first
      - uses: dacsang97/naspeed-action@v1
      - run: cargo build --locked
      - run: ns test # cargo test + test result cache
```

By default the store is saved only by pushes to the default branch. Pull
requests, forks included, restore it but never write it, so a pull request
cannot plant artifacts that `main` builds would pick up later.

Give each kind of job its own `cache-key`, so a release build does not evict
the store a test job relies on:

```yaml
- uses: dacsang97/naspeed-action@v1
  with:
    cache-key: release
    setup-args: --cross --install-targets
```

Only put naspeed on `PATH`, without touching cargo's config or the cache:

```yaml
- uses: dacsang97/naspeed-action@v1
  with:
    install-only: true
```

## Inputs

| Name           | Default               | Description                                                                 |
| -------------- | --------------------- | --------------------------------------------------------------------------- |
| `version`      | `latest`              | `latest`, an exact version (`0.1.0` or `v0.1.0`) or a semver range (`~0.1`) |
| `store`        | `~/.naspeed`          | naspeed store directory                                                     |
| `setup-args`   |                       | Extra arguments for `naspeed setup`, e.g. `--cross --install-targets`       |
| `install-only` | `false`               | Only install naspeed; no `naspeed setup`, no cache                          |
| `cache`        | `true`                | Restore the store from the Actions cache (and save it, see `cache-save`)    |
| `cache-key`    | `naspeed`             | Cache key prefix; use one per kind of job                                   |
| `cache-save`   | `auto`                | `auto` (pushes to the default branch only), `true` or `false`               |
| `cache-max-gb` | `3`                   | Size cap of the exported store (GitHub allows 10 GB per repository)         |
| `token`        | `${{ github.token }}` | Token used to look up naspeed releases                                      |

## Outputs

| Name                | Description                            |
| ------------------- | -------------------------------------- |
| `version`           | Installed naspeed version              |
| `path`              | Path of the naspeed binary             |
| `cache-hit`         | `true` when a saved store was restored |
| `cache-matched-key` | Key of the restored cache entry        |

## Cache keys

Entries are saved as
`<cache-key>-<os>-<arch>-<rustc version>-<hash of **/Cargo.lock>-<run id>-<attempt>-<job>`.
Keys are immutable, so every saved run is a new entry; a restore takes the
newest entry with the same lockfile, then falls back to any entry for the same
compiler. GitHub evicts the least recently used entries past 10 GB.

The exported store travels in `~/.naspeed-ci`, the same directory the
workflows from `ns ci init` use.

## Development

The toolchain is [Vite+](https://viteplus.dev/) (`vp`); its settings live in
`vite.config.ts`.

```sh
vp install
vp check           # format (Oxfmt), lint (Oxlint) and type check; --fix to apply
vp test
vp pack            # rebuilds dist/index.js; commit it with the sources
```

Releases are tagged `v1.x.y`; the `release major tag` workflow moves `v1`.

## License

Apache-2.0
