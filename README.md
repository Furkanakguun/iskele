# Iskele

Build, package, and push Docker images from Git repositories. Pick a branch, open a Dockerfile module, and run the workflow from one place.

![Dashboard](docs/dashboard.png)

![Module](docs/module.png)

## Data volume

Iskele keeps checkouts on its **own** volume (not a CI job workspace):

```
$ISKELE_DATA_DIR/
  repos/<repo-id>/<branch>/   # git checkouts
  artifacts/                  # tar/zip outputs
  iskele.db                   # users + settings
```

Add a repo with a local git folder or clone URL. Activity shows disk usage; Images can load, export, and prune leftover Docker data.

## License

[MIT](LICENSE)
