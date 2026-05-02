import logging

from app.channels.telegram import build_application
from app.logging_setup import setup_logging

logger = logging.getLogger(__name__)


def main():
    setup_logging()
    app = build_application()
    logger.info("bot is running")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()