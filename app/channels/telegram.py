import logging

from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

from app.agents.content import generate_post_from_topic, get_topic_suggestions
from app.config import get_required_env
from app.formatting.telegram_html import PARSE_MODE, format_post_body, html_text

logger = logging.getLogger(__name__)

user_state = {}


def reset_state(user_id):
    user_state[user_id] = {"topics": [], "awaiting_topic_selection": False}


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    reset_state(user_id)
    logger.info("start command received user_id=%s", user_id)
    await update.message.reply_text(
        "👋 <b>ML Content Generator</b>\n\n"
        "I create detailed technical posts for Twitter.\n\n"
        "Send me any message to get 10 advanced topics!",
        parse_mode=PARSE_MODE,
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logger.info("help command received user_id=%s", update.effective_user.id)
    await update.message.reply_text(
        "📝 <b>How it works:</b>\n\n"
        "1. Send me any message\n"
        "2. I'll show 10 advanced topics\n"
        "3. Reply with a number (1-10)\n"
        "4. I'll generate a detailed post!",
        parse_mode=PARSE_MODE,
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
                await update.message.reply_text(response, parse_mode=PARSE_MODE)
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
        await update.message.reply_text(response, parse_mode=PARSE_MODE)

    except Exception:
        logger.exception("failed to get topic suggestions user_id=%s", user_id)
        await update.message.reply_text("❌ Error. Try again.")


def build_application():
    token = get_required_env("TELEGRAM_BOT_TOKEN")
    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    return app
