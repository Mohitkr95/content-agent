from functools import lru_cache

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage

from app.config import get_required_env


@lru_cache(maxsize=1)
def get_llm():
    return ChatAnthropic(
        model="MiniMax-M2.7",
        anthropic_api_key=get_required_env("MINIMAX_API_KEY"),
        base_url="https://api.minimax.io/anthropic",
    )


def get_topic_suggestions():
    """Get 10 advanced ML/Maths topic suggestions."""
    response = get_llm().invoke([
        SystemMessage(content="""You are a creative content strategist for ML/AI and Mathematics.
Suggest EXACTLY 10 advanced, highly technical topics for Twitter/X posts about ML or Mathematics.

These should be:
- Deep technical topics that impress ML practitioners
- Cover cutting-edge research areas (transformers, diffusion, RL, optimization, etc.)
- Mathematical in nature (information theory, linear algebra, probability, etc.)
- Each under 12 words

Format your response as a numbered list (1-10), one topic per line. Nothing else.""",
        ),
        HumanMessage(content="Give me 10 advanced ML/Maths topics")
    ])

    content = response.content
    topics = []

    if isinstance(content, list):
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                text = block.get("text", "")
                for line in text.split("\n"):
                    line = line.strip()
                    if line and len(topics) < 10 and line[0].isdigit():
                        parts = line.split(".", 1)
                        topic = parts[1].strip() if len(parts) > 1 else line
                        topics.append(topic)
                break

    if len(topics) < 10:
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                text = block.get("text", "")
                lines = [line.strip() for line in text.split("\n") if line.strip()]
                topics = lines[:10]
                break

    return topics[:10]


def generate_post_from_topic(topic):
    """Generate a detailed 200-250 word Twitter thread post from topic."""
    response = get_llm().invoke([
        SystemMessage(content=f"""You are an expert at creating detailed, educational Twitter posts about ML and Mathematics.

Create a comprehensive post (200-250 words) about this topic: {topic}

Requirements:
- Be deeply technical and educational with real mathematical content
- Include equations using standard notation (e.g., f(x), ∇, ∂, ∈, ⊂, ∑)
- Include 2-3 relevant hashtags at the end
- Be detailed enough that someone learns something concrete

IMPORTANT: Write 200-250 words with equations and technical depth. This is a detailed educational post!""",
        ),
        HumanMessage(content=f"Write detailed post about: {topic}")
    ])

    content = response.content
    if isinstance(content, list):
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                text = block.get("text", "")
                text = text.replace("**", "*")
                text = text.replace("—", "-").replace("–", "-")
                return text
    return str(content)
