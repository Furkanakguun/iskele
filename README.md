# Iskele

Build, package, and push Docker images from Git repositories. Pick a branch, open a Dockerfile module, and run the workflow from one place.

![Dashboard](docs/dashboard.png)

![Module](docs/module.png)

## Demo data

The public repo ships with a **fictional** seed project (`NIMBUS` / Nimbus Cart) so the UI and API work without a real Git server. Replace it with your own repos when you connect credentials.

## Data volume

Iskele keeps checkouts on its **own** volume (not the Jenkins job workspace):

```
$ISKELE_DATA_DIR/
  repos/<repo-id>/<branch>/   # git checkouts
  artifacts/                  # tar/zip outputs
  iskele.db                   # users + settings
```

On Jenkins, mount a dedicated host path or named volume (see `docker-compose.yml`). Settings → **Disk usage** shows Iskele footprint, per-branch checkout size, Docker image totals, and host free space.

## License

[MIT](LICENSE)
