import logging
import logging.config

from app.config import get_logging_config_path


def setup_logging():
    config_path = get_logging_config_path()
    if config_path.exists():
        logging.config.fileConfig(config_path, disable_existing_loggers=False)
        return

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s:%(name)s:%(message)s",
    )
