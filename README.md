# Content Agent

Telegram bot that generates advanced ML, AI, and mathematics post ideas, then turns a selected topic into a detailed technical post ready to copy and publish.

The bot uses MiniMax through the Anthropic-compatible LangChain client and `python-telegram-bot` for the Telegram interface.

## Features

- Suggests 10 advanced ML/math topics on demand.
- Lets the user choose a topic by replying with `1-10`.
- Generates a detailed 200-250 word technical post with equations and hashtags.
- Formats Telegram output so headings, bold text, and standalone equations are readable and copyable.
- Uses external logging config to keep production logs clean and avoid noisy HTTP request URLs.

## Project Structure

```text
.
├── app/
│   ├── agents/             # Topic/post/image generation logic
│   ├── channels/           # Telegram now, future web/app adapters
│   ├── formatting/         # Telegram HTML and future plain/web formatters
│   ├── config.py           # Environment and path config
│   └── logging_setup.py
├── telegram_bot.py         # Thin Telegram entrypoint
├── logging.conf            # Production-friendly console logging config
├── requirements.txt        # Python dependencies
├── .env.example            # Safe environment variable template
├── .gitignore              # Keeps secrets, venvs, caches, and logs out of git
└── README.md
```

## Requirements

- Python 3.10+
- Telegram bot token from [BotFather](https://t.me/BotFather)
- MiniMax API key

## Setup

Create and activate a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create your local `.env` from the example:

```bash
cp .env.example .env
```

Fill in the required values:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
MINIMAX_API_KEY=your_minimax_api_key
```

Optional logging override:

```env
LOGGING_CONFIG=/absolute/path/to/logging.conf
```

## Running

Start the bot:

```bash
source .venv/bin/activate
python telegram_bot.py
```

You should see an app-level log like:

```text
INFO __main__ - bot is running
```

## Usage

1. Open your bot in Telegram.
2. Send `/start`.
3. Send any message to request topics.
4. Reply with a number from `1` to `10`.
5. Copy the generated message directly and post it.

Commands:

- `/start` - Reset state and show the welcome message.
- `/help` - Show usage instructions.

## Output Formatting

The Telegram channel sends messages using HTML parse mode. Generated posts are lightly cleaned for Telegram:

- `# Title` becomes a bold title.
- `*bold text*` becomes real bold text.
- `$$...$$`, `\(...\)`, and `\[...\]` math blocks are shown as copyable code.
- Real hashtags like `#MachineLearning` remain unchanged.

The formatter is intentionally small. It avoids trying to fully parse Markdown or LaTeX, which keeps the bot easier to maintain.

## Architecture

The project separates core content generation from delivery channels:

- `app/agents/` owns model calls and content generation.
- `app/channels/` owns user-facing adapters like Telegram. A web app or API can be added here without changing generation logic.
- `app/formatting/` owns channel-specific output formatting.
- `app/config.py` and `app/logging_setup.py` keep environment and logging concerns out of product logic.

This keeps the current Telegram bot small while leaving room for a website, mobile app, image generation, or API layer later.

## Logging

Logging is configured through `logging.conf` by default. The config:

- Logs app events at `INFO`.
- Suppresses noisy `httpx` and `httpcore` request logs below `WARNING`.
- Prevents Telegram bot tokens from appearing in normal request logs.

Useful app events include:

- Bot startup
- `/start` and `/help`
- Topic suggestion requests
- Topic selection
- Generated post delivery
- Invalid topic selections
- Exceptions with stack traces

To customize logging, edit `logging.conf` or set `LOGGING_CONFIG` in `.env`.

## Deployment Notes

For simple long-running usage, run the bot inside `tmux` or `screen`.

For server deployment, use a process manager such as `systemd`, Docker, or PM2. Make sure the process environment contains the same variables as `.env`, or run from the project directory where `.env` is available.

Example `systemd` service:

```ini
[Unit]
Description=ML/Maths Content Telegram Bot
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/agents
ExecStart=/path/to/agents/.venv/bin/python telegram_bot.py
Restart=always
RestartSec=5
EnvironmentFile=/path/to/agents/.env

[Install]
WantedBy=multi-user.target
```

## Security

- Never commit `.env`.
- Do not paste bot tokens or API keys into issues, logs, screenshots, or chats.
- Rotate any token that has been exposed.
- Keep `httpx`/`httpcore` below `INFO` in production logs because request URLs may include secrets.