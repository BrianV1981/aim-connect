# A.I.M. Agents Amendment Protocol

The `AGENTS.md` file is the absolute core system prompt and foundational operating structure for the A.I.M. ecosystem. 

## The Re-bake Mandate
If you are tasked with amending, adding, or modifying any rule inside the global `AGENTS.md` file, you **MUST** ensure that the newly modified rules are permanently embedded into the memory pool.

If you fail to do this, newly spawned agents will operate with an outdated understanding of the system, and will hallucinate rules that no longer exist.

## The Protocol
Whenever `AGENTS.md` is updated, you must execute the following command to completely wipe and rebuild the `memory_lance` vector database:

```bash
python3 .aim_core/bootstrap_brain.py --clean
```

This ensures the new constraints and amendments inside `AGENTS.md` are correctly vectorized, chunked, and indexed via Tantivy FTS, making them immediately available to the Hybrid Search Engine.
