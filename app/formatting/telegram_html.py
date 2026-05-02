from html import escape

PARSE_MODE = "HTML"


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
