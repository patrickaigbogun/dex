# FAQ and Glossary

## FAQ

### Is Dex a full-stack framework?

Dex is better described as a composable framework toolkit.
It gives you core building blocks rather than hiding everything behind one runtime.

### Do I have to use every package?

No.
Use only what your app needs.
The packages are intentionally modular.

### Where do routes come from?

From your `web/pages` files.
The router generator converts these into route metadata used by the runtime.

### Why keep generated files out of manual editing?

Generated files are outputs, not source-of-truth inputs.
Editing them directly creates drift and confusion.

### What does the registry store?

In your current roadmap model: metadata for discovery/validation (versions, hashes, mappings), not full template storage.

### Why is security emphasized in templates?

Templates can become a supply chain path.
Validation and fingerprint checks help keep installation/update behavior trustworthy.

### What does `dex tag` solve?

It automates repetitive version-tag updates so maintainers can release with fewer manual steps and fewer mistakes.

## Glossary

### Dex project
An application or template structured using Dex conventions and packages.

### File-based routing
Routing derived from filesystem structure instead of manually maintained route tables.

### Generated metadata
Machine-created routing/layout files used at runtime.

### SPA fallback
Server behavior that returns app HTML for non-asset routes so client routing can render deep links.

### Registry
Service responsible for template discovery and metadata validation.

### Template manifest (`composer.json`)
Structured JSON definition describing template metadata, versioning, and composition details.

### SHA fingerprint
Hash value used to detect integrity or modification changes.

### SemVer
Versioning format `MAJOR.MINOR.PATCH` with predictable bump rules.
