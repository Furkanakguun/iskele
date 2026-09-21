# Iskele

Build, package, and push Docker images from Git repositories. Pick a branch, open a Dockerfile module, and run the workflow from one place.

![Dashboard](docs/dashboard.png)

![Module](docs/module.png)


## Data volume

Iskele keeps checkouts on its **own** volume:

```
$ISKELE_DATA_DIR/
  repos/<repo-id>/<branch>/   # git checkouts
  artifacts/                  # tar/zip outputs
  iskele.db                   # users + settings
```

On Jenkins, mount a dedicated host path or named volume (see `docker-compose.yml`). Settings **Disk usage** shows Iskele footprint, per-branch checkout size, Docker image totals, and host free space.

## License

[MIT](LICENSE)
