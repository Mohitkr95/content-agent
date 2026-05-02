import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


def get_env(name, default=None):
    return os.getenv(name, default)


def get_required_env(name):
    value = get_env(name)
    if not value:
        raise RuntimeError(f"{name} not found")
    return value


def get_logging_config_path():
    return Path(get_env("LOGGING_CONFIG", BASE_DIR / "logging.conf"))
