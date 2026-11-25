import importlib.util
from pathlib import Path


def load_wsl_merge_module(repo_root: Path):
    target = repo_root / "scripts" / "windows" / "wsl_config_merge.py"
    spec = importlib.util.spec_from_file_location("wsl_config_merge", target)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module
