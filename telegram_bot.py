import os
import logging
import logging.config
from html import escape
from pathlib import Path
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

from agent import get_topic_suggestions, generate_post_from_topic

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent


def setup_logging():
    config_path = Path(os.getenv("LOGGING_CONFIG", BASE_DIR / "logging.conf"))
    if config_path.exists():
        logging.config.fileConfig(config_path, disable_existing_loggers=False)
        return

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s:%(name)s:%(message)s",
    )


setup_logging()
logger = logging.getLogger(__name__)

user_state = {}
HTML = "HTML"


def reset_state(user_id):
    user_state[user_id] = {"topics": [], "awaiting_topic_selection": False}


def clean_text(text):
    """Clean text before escaping it for Telegram HTML."""
    text = text.replace("—", "-").replace("–", "-")
    text = text.replace("**", "*")
    text = text.replace("<b>", "").replace("</b>", "")
    text = text.replace("<i>", "").replace("</i>", "")
    text = text.replace("<code>", "").replace("</code>", "")
    return text


def html_text(text):
    return escape(clean_text(text))


def looks_like_section_heading(line):
    if not line.endswith(":"):
        return False
    if line.startswith("*") and line.endswith("*"):
        return True
    return len(line) <= 45 and not line.lower().startswith(("consider ", "where ", "here ", "this "))


def strip_outer_asterisks(line):
    if line.startswith("*") and line.endswith("*") and len(line) > 2:
        return line[1:-1].strip()
    return line


def has_math_wrappers(line):
    return line.startswith(("$$", r"\[", r"\("))


def strip_math_wrappers(line):
    if line.startswith("$$") and line.endswith("$$"):
        return line[2:-2].strip()
    if line.startswith(r"\[") and line.endswith(r"\]"):
        return line[2:-2].strip()
    if line.startswith(r"\(") and line.endswith(r"\)"):
        return line[2:-2].strip()
    return line


def is_math_line(line):
    if line.lower().startswith(("for ", "where ", "here ", "this ", "unlike ")):
        return False

    math_tokens = ("=", "≈", "∑", "^", "²", "||", r"\in", r"\geq", r"\leq")
    return len(line) <= 220 and any(token in line for token in math_tokens)


def format_inline_markdown(line):
    parts = []
    remaining = line

    while "*" in remaining:
        before, marker, after = remaining.partition("*")
        bold_text, closing_marker, rest = after.partition("*")

        parts.append(escape(before))
        if closing_marker and bold_text.strip():
            parts.append(f"<b>{escape(bold_text)}</b>")
            remaining = rest
        else:
            parts.append(escape(marker + after))
            remaining = ""

    parts.append(escape(remaining))
    return "".join(parts)


def format_post_body(post):
    lines = clean_text(post).splitlines()
    formatted_lines = []
    first_content_line = True

    for line in lines:
        stripped = line.strip()
        if not stripped:
            formatted_lines.append("")
            continue

        raw_line = strip_outer_asterisks(stripped)
        plain_line = strip_math_wrappers(raw_line)
        if stripped.startswith("# "):
            heading = stripped.lstrip("#").strip()
            formatted_lines.append(f"<b>{escape(heading)}</b>")
            first_content_line = False
        elif has_math_wrappers(raw_line) or is_math_line(plain_line):
            formatted_lines.append(f"<code>{escape(plain_line)}</code>")
            first_content_line = False
        elif first_content_line:
            formatted_lines.append(f"<b>{format_inline_markdown(plain_line)}</b>")
            first_content_line = False
        elif looks_like_section_heading(stripped):
            formatted_lines.append(f"<b>{format_inline_markdown(plain_line)}</b>")
        else:
            formatted_lines.append(format_inline_markdown(stripped))

    return "\n".join(formatted_lines).strip()


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    reset_state(user_id)
    logger.info("start command received user_id=%s", user_id)
    await update.message.reply_text(
        "👋 <b>ML Content Generator</b>\n\n"
        "I create detailed technical posts for Twitter.\n\n"
        "Send me any message to get 10 advanced topics!",
        parse_mode=HTML,
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logger.info("help command received user_id=%s", update.effective_user.id)
    await update.message.reply_text(
        "📝 <b>How it works:</b>\n\n"
        "1. Send me any message\n"
        "2. I'll show 10 advanced topics\n"
        "3. Reply with a number (1-10)\n"
        "4. I'll generate a detailed post!",
        parse_mode=HTML,
    )


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    user_message = update.message.text.strip()

    if user_id not in user_state:
        reset_state(user_id)

    state = user_state[user_id]

    if state["awaiting_topic_selection"] and state["topics"]:
        try:
            choice = int(user_message)
            if 1 <= choice <= 10:
                topic = state["topics"][choice - 1]
                logger.info(
                    "topic selected user_id=%s choice=%s topic=%r",
                    user_id,
                    choice,
                    topic,
                )
                await update.message.reply_text("⏳ Creating your detailed post...")

                post = generate_post_from_topic(topic)
                topic_clean = html_text(topic)
                post_clean = format_post_body(post)

                response = f"{topic_clean}\n\n{post_clean}"
                await update.message.reply_text(response, parse_mode=HTML)
                logger.info(
                    "post sent user_id=%s topic=%r response_chars=%s",
                    user_id,
                    topic,
                    len(response),
                )
                reset_state(user_id)
            else:
                logger.info("invalid topic choice user_id=%s choice=%s", user_id, choice)
                await update.message.reply_text("Please reply with a number 1-10")
        except ValueError:
            logger.info("non-numeric topic choice user_id=%s message=%r", user_id, user_message)
            await update.message.reply_text("Please reply with a number 1-10")
        return

    logger.info("topic suggestions requested user_id=%s", user_id)
    await update.message.reply_text("🔍 Finding advanced ML topics...")
    try:
        topics = get_topic_suggestions()
        state["topics"] = topics
        state["awaiting_topic_selection"] = True
        logger.info("topic suggestions ready user_id=%s count=%s", user_id, len(topics))

        response = "📋 <b>CHOOSE A TOPIC:</b>\n\n"
        for i, topic in enumerate(topics, 1):
            topic_clean = html_text(topic)
            response += f"<b>{i}.</b> {topic_clean}\n\n"

        response += "\n━━━━━━━━━━━━━━━━━━━━\n"
        response += "Reply with a <b>number (1-10)</b> to select"
        await update.message.reply_text(response, parse_mode=HTML)

    except Exception:
        logger.exception("failed to get topic suggestions user_id=%s", user_id)
        await update.message.reply_text("❌ Error. Try again.")


def main():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        logger.error("TELEGRAM_BOT_TOKEN not found")
        return

    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    logger.info("bot is running")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()